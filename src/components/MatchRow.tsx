import React, { useMemo } from 'react';
import type { Match, Team } from '../lib/types';
import { parsePokepaste } from '../lib/pokepaste';
import { PokemonIcon } from './PokemonIcon';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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
      try {
        await deleteDoc(doc(db, 'matches', match.id));
        onDelete(match.id);
      } catch (error: any) {
        alert(`Error deleting match: ${error.message}`);
      }
    }
  };

  const dateStr = new Date(match.played_at).toLocaleDateString();
  const timeStr = new Date(match.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={`match-row result-${match.result} ${expanded ? 'expanded' : ''}`}
      onClick={() => onToggle(match.id)}
    >
      <div className="match-row-indicator"></div>
      
      <div className="match-metadata" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className={`match-result-badge ${match.result}`}>
            {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'T'}
          </span>
          <div className="match-date-time text-muted" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            <span>{dateStr}</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </div>

      {/* My Team */}
      <div className="team-left" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, width: '100%' }}>
          <div className="pokemon-grid">
            {Array.from({length: 6}).map((_, i) => {
              const p = myTeam[i];
              return (
                <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(36px, 4.5vw, 56px)', height: 'clamp(36px, 4.5vw, 56px)' }}>
                  {p ? <PokemonIcon name={p.name} className="pokemon-icon" /> : null}
                </div>
              );
            })}
          </div>
          <span className="match-team-name" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={match.teams?.name}>
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
      <div className="team-right" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, width: '100%' }}>
          <div className="pokemon-grid">
            {Array.from({length: 6}).map((_, i) => {
              const p = opponentTeam[i];
              return (
                <div key={i} title={p?.name || ''} className="pokemon-icon-wrapper" style={{ zIndex: 6 - i, width: 'clamp(36px, 4.5vw, 56px)', height: 'clamp(36px, 4.5vw, 56px)' }}>
                  {p ? <PokemonIcon name={p.name} className="pokemon-icon" /> : null}
                </div>
              );
            })}
          </div>
          <span className="match-team-name" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'transparent', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', userSelect: 'none' }}>
            &nbsp;
          </span>
        </div>
      </div>

      <div className="match-actions">
        <button 
          onClick={handleDelete}
          className="match-action-btn delete-btn"
          title="Delete Match"
        >
          <Trash2 size={18} />
        </button>

        <button 
          className="match-action-btn expand-btn"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
    </div>
  );
});
