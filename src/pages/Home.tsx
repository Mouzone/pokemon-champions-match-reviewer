import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot, limit, where } from 'firebase/firestore';
import type { Match, Team } from '../lib/types';
import { MatchRow } from '../components/MatchRow';

// Lazy-load MatchDetail so react-player (+ dashjs/hls.js, ~1MB) is split out
// of the initial bundle and only loaded when a match is expanded.
const MatchDetail = lazy(() => import('./MatchDetail'));

interface MatchDetailWrapperProps {
  match: Match & { teams: Team };
  expandedMatchId: string | null;
  allTeams: Team[];
  notesCache: Record<string, any>;
  updateNotesCache: (matchId: string, data: any) => void;
  onMatchUpdate: (updated: (Match & { teams: Team }) | null) => void;
}

function MatchDetailWrapper({ match, expandedMatchId, allTeams, notesCache, updateNotesCache, onMatchUpdate }: MatchDetailWrapperProps) {
  const isExpanded = expandedMatchId === match.id;
  const [shouldRender, setRender] = useState(isExpanded);

  useEffect(() => {
    if (isExpanded) {
      setRender(true);
    } else {
      const t = setTimeout(() => setRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [isExpanded]);

  return (
    <div className={`match-detail-wrapper ${isExpanded ? 'expanded' : ''}`}>
      <div className="match-detail-inner">
        {shouldRender && (
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">Loading…</div>}>
            <MatchDetail
              match={match}
              allTeams={allTeams}
              notesCache={notesCache}
              updateNotesCache={updateNotesCache}
              onMatchUpdate={onMatchUpdate}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<(Match & { teams: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  
  const [limitCount, setLimitCount] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  // Cache for match notes to prevent refetching when expanding/retracting
  const notesCache = useRef<Record<string, any>>({});

  const toggleMatch = (id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  };

  // Callback ref: binds the IntersectionObserver to the sentinel whenever it
  // (re)mounts, instead of relying on a stale ref.current dependency.
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setLimitCount(prev => prev + 5);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    // Cleanup when the node unmounts or the callback re-runs.
    return () => observer.disconnect();
  }, [hasMore]);

  // Fetch teams once on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'teams'), where('userId', '==', auth.currentUser.uid));
        const teamsSnap = await getDocs(q);
        const teamsList = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
        setAllTeams(teamsList);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setTeamsLoaded(true);
      }
    };
    fetchTeams();
  }, []);

  // Listen to matches
  useEffect(() => {
    if (!teamsLoaded) return;

    let unsubscribeMatches: () => void;
    const teamsMap: Record<string, Team> = {};
    allTeams.forEach(t => teamsMap[t.id] = t);

    try {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, 'matches'), 
        where('userId', '==', auth.currentUser.uid), 
        orderBy('played_at', 'desc'), 
        limit(limitCount)
      );
      unsubscribeMatches = onSnapshot(q, (matchesSnap) => {
        const rawMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
        const fetchedMatches = rawMatches.map(m => ({
          ...m,
          teams: m.own_team_id ? teamsMap[m.own_team_id] : (null as unknown as Team)
        }));

        fetchedMatches.sort((a: any, b: any) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        setMatches(fetchedMatches);
        
        if (matchesSnap.docs.length < limitCount) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error fetching matches:', error);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribeMatches) unsubscribeMatches();
    };
  }, [teamsLoaded, allTeams, limitCount]);

  return (
    <div className="page-container">
      
      <div className="flex flex-col" style={{ gap: '0.75rem', marginTop: '1rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem', minHeight: '40vh' }}>
            <p className="text-muted text-center">No matches recorded yet. Click the + button to get started!</p>
          </div>
        ) : (
          matches.map(match => (
            <div key={match.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <MatchRow 
                match={match} 
                expanded={expandedMatchId === match.id} 
                onToggle={toggleMatch} 
                onDelete={(id) => {
                  setMatches(matches.filter(m => m.id !== id));
                  if (expandedMatchId === id) setExpandedMatchId(null);
                }} 
              />
              
              <MatchDetailWrapper 
                match={match}
                expandedMatchId={expandedMatchId}
                allTeams={allTeams}
                notesCache={notesCache.current}
                updateNotesCache={(matchId, data) => { notesCache.current[matchId] = data; }}
                onMatchUpdate={(updated) => {
                  if (updated === null) {
                    setMatches(matches.filter(m => m.id !== match.id));
                    if (expandedMatchId === match.id) setExpandedMatchId(null);
                  } else {
                    setMatches(matches.map(m => m.id === updated.id ? updated : m));
                  }
                }}
              />
            </div>
          ))
        )}

        {/* Infinite Scroll Sentinel */}
        {matches.length > 0 && hasMore && (
          <div ref={sentinelRef} style={{ padding: '1rem', textAlign: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading more matches...</span>
          </div>
        )}
        
        {matches.length > 0 && !hasMore && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>No more matches to load.</span>
          </div>
        )}
      </div>
    </div>
  );
}
