import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PokemonSearch } from './PokemonSearch';
import { getShowdownSpriteName, formatPokeApiName } from '../lib/pokepaste';
import { TypeIcons } from './TypeIcons';

const typeCache: Record<string, string[]> = {};

interface OpponentTeamTabProps {
  matchId: string;
  initialTeam: { name: string, id: string }[];
  onUpdate?: (newTeam: { name: string, id: string }[]) => void;
}

export function OpponentTeamTab({ matchId, initialTeam, onUpdate }: OpponentTeamTabProps) {
  const [team, setTeam] = useState<({ name: string, id: string } | null)[]>(() => {
    const padded: ({ name: string, id: string } | null)[] = [...(initialTeam || [])];
    while(padded.length < 6) padded.push(null);
    return padded.slice(0, 6);
  });
  const [teamWithTypes, setTeamWithTypes] = useState<(({ name: string, id: string } & { types?: string[] }) | null)[]>(team);

  useEffect(() => {
    async function fetchTypes() {
      const enriched = await Promise.all(team.map(async (p) => {
        if (!p) return null;
        if (typeCache[p.name]) {
          return { ...p, types: typeCache[p.name] };
        }
        try {
          let fetchName = formatPokeApiName(p.name);
          if (fetchName.includes('ogerpon')) fetchName = 'ogerpon';
          if (fetchName === 'morpeko') fetchName = 'morpeko-full-belly';
          
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${fetchName}`);
          if (res.ok) {
            const data = await res.json();
            const types = data.types.map((t: any) => t.type.name);
            typeCache[p.name] = types;
            return { ...p, types };
          }
        } catch (e) {
          console.error('Failed to fetch types for', p.name, e);
        }
        return p;
      }));
      setTeamWithTypes(enriched);
    }
    fetchTypes();
  }, [team]);

  const handleAdd = async (index: number, pokemon: { name: string, id: string }) => {
    if (team.find(p => p && p.name === pokemon.name)) return;
    const newTeam = [...team];
    newTeam[index] = pokemon;
    setTeam(newTeam);
    // Save with nulls so the anchor persists on reload.
    if (onUpdate) onUpdate(newTeam as any);
    await updateDoc(doc(db, 'matches', matchId), { opponent_team: newTeam });
  };

  const handleRemove = async (index: number) => {
    const newTeam = [...team];
    newTeam[index] = null;
    setTeam(newTeam);
    if (onUpdate) onUpdate(newTeam as any);
    
    await updateDoc(doc(db, 'matches', matchId), { opponent_team: newTeam });
  };

  // Create an array of 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '0.5rem',
        width: '100%',
        flex: 1,
        minHeight: 0
      }}>
        {slots.map(index => {
          const p = teamWithTypes[index];

          if (p) {
            return (
              <div key={index} style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                minWidth: 0,
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => handleRemove(index)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    zIndex: 10,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    color: 'var(--loss-text)',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  title="Remove"
                >
                  ✕
                </button>
                <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <img 
                    src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
                    alt={p.name}
                    style={{ width: '100%', height: '100%', maxWidth: '50px', maxHeight: '50px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {p.types?.map((t: string) => {
                      const Icon = TypeIcons[t.toLowerCase()];
                      return Icon ? (
                        <span key={t} title={t} style={{ display: 'flex' }}>
                          <Icon />
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <span style={{ textTransform: 'capitalize', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'block' }} title={p.name.replace('-', ' ')}>
                  {p.name.replace('-', ' ')}
                </span>
              </div>
            );
          }

          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              backgroundColor: 'transparent',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              minWidth: 0
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.55rem', marginBottom: '2px', color: 'var(--text-muted)' }}>Empty</span>
              <div style={{ width: '100%', transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                <PokemonSearch onSelect={(pokemon) => handleAdd(index, pokemon)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
