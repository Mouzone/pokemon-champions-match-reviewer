import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, Team } from '../lib/types';
import { AppContext } from '../AppContext';
import { Modal } from '../components/ui/Modal';
import UploadMatch from './UploadMatch';
import { ShortcutGuide } from '../components/ShortcutGuide';
import MatchDetail from './MatchDetail';
import { MatchRow } from '../components/MatchRow';

export default function Home() {
  const [matches, setMatches] = useState<(Match & { teams: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDrawerOpen, setIsDrawerOpen } = useContext(AppContext);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const toggleMatch = (id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    // Fetch matches joined with team data
    const { data, error } = await supabase
      .from('matches')
      .select('*, teams(*)')
      .order('played_at', { ascending: false });

    if (error) {
      console.error('Error fetching matches:', error);
    } else {
      let fetchedMatches = data as any || [];
      // Explicit JS sorting to guarantee the most recent matches appear at the top
      fetchedMatches.sort((a: any, b: any) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
      setMatches(fetchedMatches);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ margin: 0, padding: 0, borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIsDrawerOpen(!isDrawerOpen)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            ☰
          </button>
          Match History
        </h1>
        <button 
          onClick={() => setIsShortcutModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            padding: '0.25rem'
          }}
          title="Setup iOS Shortcut"
        >
          ⓘ Automated Upload Setup
        </button>
      </div>
      
      <div className="flex flex-col" style={{ gap: '0.5rem' }}>
        {/* Upload Match Placeholder Card */}
        <div 
          onClick={() => setIsUploadModalOpen(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem',
            border: '2px dashed var(--text-primary)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
            minHeight: '120px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)' }}>+</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">No matches recorded yet. Click the plus button above to get started!</p>
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

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
        <UploadMatch onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchMatches();
        }} />
      </Modal>

      <Modal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)}>
        <ShortcutGuide />
      </Modal>
    </div>
  );
}
