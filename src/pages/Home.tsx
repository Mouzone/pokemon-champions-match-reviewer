import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, Team } from '../lib/types';
import { AppContext } from '../AppContext';
import { Modal } from '../components/ui/Modal';
import UploadMatch from './UploadMatch';
import MatchDetail from './MatchDetail';
import { parsePokepaste, getShowdownSpriteName } from '../lib/pokepaste';

export default function Home() {
  const [matches, setMatches] = useState<(Match & { teams: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDrawerOpen, setIsDrawerOpen } = useContext(AppContext);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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
      setMatches(data as any || []);
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
          matches.map(match => {
            const myTeam = parsePokepaste(match.teams?.paste_text || '');
            
            return (
            <div key={match.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                className="match-row"
                onClick={() => toggleMatch(match.id)}
                style={{ 
                  borderLeft: `6px solid ${match.result === 'win' ? '#4384f5' : match.result === 'loss' ? '#e84057' : '#888888'}`,
                  backgroundColor: match.result === 'win' ? '#ecf2ff' : match.result === 'loss' ? '#fff1f3' : '#f4f4f5',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <div className="match-metadata">
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <h3 style={{ textTransform: 'uppercase', color: match.result === 'win' ? '#4384f5' : match.result === 'loss' ? '#e84057' : '#888888', margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>
                      {match.result}
                    </h3>
                    <div className="match-date-time" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', margin: '0.25rem 0 0 0', opacity: 0.8, lineHeight: 1.4 }}>
                      <span>{new Date(match.played_at).toLocaleDateString()}</span>
                      <span>{new Date(match.played_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="match-teams">
                  {/* My Team */}
                  <div className="team-left" style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <div className="pokemon-grid">
                        {Array.from({length: 6}).map((_, i) => {
                          const p = myTeam[i];
                          return (
                            <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(32px, 5.2vw, 64px)', height: 'clamp(32px, 5.2vw, 64px)' }}>
                              {p ? (
                                <img 
                                  src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
                                  alt={p.name} 
                                  className="pokemon-icon"
                                  onError={(e) => (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ 
                        position: 'absolute', 
                        bottom: '-1rem', 
                        left: 0, 
                        right: 0, 
                        textAlign: 'center', 
                        fontSize: '0.75rem', 
                        opacity: 0.8, 
                        fontWeight: 600, 
                        letterSpacing: '0.5px', 
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {match.teams?.name}
                      </span>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="vs-badge">
                    <span>VS</span>
                  </div>

                  {/* Opponent Team */}
                  <div className="team-right" style={{ flex: 1, paddingLeft: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <div className="pokemon-grid">
                        {Array.from({length: 6}).map((_, i) => {
                          const p = match.opponent_team[i];
                          return (
                            <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(32px, 5.2vw, 64px)', height: 'clamp(32px, 5.2vw, 64px)' }}>
                              {p ? (
                                <img 
                                  src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
                                  alt={p.name} 
                                  className="pokemon-icon"
                                  onError={(e) => (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="match-toggle">
                  <button style={{ 
                    padding: '0.5rem', 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    fontWeight: 700
                  }}>
                    {expandedMatchId === match.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>
              
              {expandedMatchId === match.id && (
                <MatchDetail match={match} onMatchUpdate={(updated) => setMatches(matches.map(m => m.id === updated.id ? updated : m))} />
              )}
            </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
        <UploadMatch onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchMatches();
        }} />
      </Modal>
    </div>
  );
}
