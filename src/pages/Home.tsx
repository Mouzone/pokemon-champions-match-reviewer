import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import type { Match, Team } from '../lib/types';
import MatchDetail from './MatchDetail';
import { MatchRow } from '../components/MatchRow';

export default function Home() {
  const [matches, setMatches] = useState<(Match & { teams: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const toggleMatch = (id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    let unsubscribeMatches: () => void;
    let teamsMap: Record<string, Team> = {};

    const setupListeners = async () => {
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        teamsSnap.docs.forEach(d => {
          teamsMap[d.id] = { id: d.id, ...d.data() } as Team;
        });

        const q = query(collection(db, 'matches'), orderBy('played_at', 'desc'));
        unsubscribeMatches = onSnapshot(q, (matchesSnap) => {
          const rawMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
          const fetchedMatches = rawMatches.map(m => ({
            ...m,
            teams: m.own_team_id ? teamsMap[m.own_team_id] : (null as unknown as Team)
          }));

          fetchedMatches.sort((a: any, b: any) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
          setMatches(fetchedMatches);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching matches:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up listeners:', error);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeMatches) unsubscribeMatches();
    };
  }, []);

  return (
    <div className="page-container">
      
      <div className="flex flex-col" style={{ gap: '0.75rem', marginTop: '1rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
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
              
              {expandedMatchId === match.id && (
                <MatchDetail match={match} onMatchUpdate={(updated) => {
                  if (updated === null) {
                    setMatches(matches.filter(m => m.id !== match.id));
                    setExpandedMatchId(null);
                  } else {
                    setMatches(matches.map(m => m.id === updated.id ? updated : m));
                  }
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
