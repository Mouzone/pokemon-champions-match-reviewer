import React, { useMemo } from 'react';
import type { Match, Team } from '../lib/types';
import { parsePokepaste } from '../lib/pokepaste';
import { PokemonIcon } from './PokemonIcon';
import { supabase } from '../lib/supabase';

interface MatchRowProps {
  match: Match & { teams: Team };
  expanded: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MatchRow: React.FC<MatchRowProps> = React.memo(({ match, expanded, onToggle, onDelete }) => {
  const myTeam = useMemo(() => parsePokepaste(match.teams?.paste_text || ''), [match.teams?.paste_text]);
  const opponentTeam = match.opponent_team || [];

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this match record? This cannot be undone.")) {
      const { error } = await supabase.from('matches').delete().eq('id', match.id);
      if (!error) {
        onDelete(match.id);
      } else {
        alert(`Error deleting match: ${error.message}`);
      }
    }
  };

  return (
    <div 
      className={`match-row result-${match.result}`}
      onClick={() => onToggle(match.id)}
    >
      <div className="match-metadata">
        <div style={{ minWidth: 0, width: '100%' }}>
          <h3 className={`match-result-title ${match.result}`}>
            {match.result}
          </h3>
          <div className="match-date-time" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', margin: '0.25rem 0 0 0', opacity: 0.8, lineHeight: 1.4 }}>
            <span>{new Date(match.played_at).toLocaleDateString()}</span>
            <span>{new Date(match.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <div className="match-teams">
        {/* My Team */}
        <div className="team-left" style={{ flex: 1, paddingRight: '0.25rem' }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div className="pokemon-grid">
              {Array.from({length: 6}).map((_, i) => {
                const p = myTeam[i];
                return (
                  <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(40px, 5.5vw, 68px)', height: 'clamp(40px, 5.5vw, 68px)' }}>
                    {p ? <PokemonIcon name={p.name} className="pokemon-icon" /> : null}
                  </div>
                );
              })}
            </div>
            <span className="match-team-name">
              {match.teams?.name}
            </span>
          </div>
        </div>

        {/* VS */}
        <div className="match-toggle">
          <div className="vs-badge">
            <span>VS</span>
          </div>
        </div>

        {/* Opponent Team */}
        <div className="team-right" style={{ flex: 1, paddingLeft: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="pokemon-grid">
              {Array.from({length: 6}).map((_, i) => {
                const p = opponentTeam[i];
                return (
                  <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(40px, 5.5vw, 68px)', height: 'clamp(40px, 5.5vw, 68px)' }}>
                    {p ? <PokemonIcon name={p.name} className="pokemon-icon" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="match-actions">
        <button 
          onClick={handleDelete}
          className="match-action-btn delete-btn"
          title="Delete Match"
        >
          ✕
        </button>

        <button 
          className={`match-action-btn expand-btn ${match.result}`}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>
    </div>
  );
});
