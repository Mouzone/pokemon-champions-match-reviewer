import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PokemonSearch } from './PokemonSearch';
import { getShowdownSpriteName, formatPokeApiName } from '../lib/pokepaste';

interface OpponentTeamTabProps {
  matchId: string;
  initialTeam: { name: string, id: string }[];
  onUpdate?: (newTeam: { name: string, id: string }[]) => void;
}

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898',
  steel: '#B7B7CE', fairy: '#D685AD',
};

export function OpponentTeamTab({ matchId, initialTeam, onUpdate }: OpponentTeamTabProps) {
  const [team, setTeam] = useState<({ name: string, id: string } | null)[]>(() => {
    const padded = [...(initialTeam || [])];
    while(padded.length < 6) padded.push(null);
    return padded.slice(0, 6);
  });
  const [teamWithTypes, setTeamWithTypes] = useState<(typeof team[0] & { types?: string[] })[]>([]);

  useEffect(() => {
    async function fetchTypes() {
      const enriched = await Promise.all(team.map(async (p) => {
        if (!p) return null;
        try {
          let fetchName = formatPokeApiName(p.name);
          if (fetchName.includes('ogerpon')) fetchName = 'ogerpon';
          
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${fetchName}`);
          if (res.ok) {
            const data = await res.json();
            return { ...p, types: data.types.map((t: any) => t.type.name) };
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
    if (onUpdate) onUpdate(newTeam.filter(Boolean) as any); // Or keep nulls if we want to save them. Let's keep nulls.
    
    // Actually, save with nulls so the anchor persists on reload.
    // However, onUpdate might expect non-null in MatchDetail, but Home handles nulls now.
    if (onUpdate) onUpdate(newTeam as any);
    await supabase.from('matches').update({ opponent_team: newTeam }).eq('id', matchId);
  };

  const handleRemove = async (index: number) => {
    const newTeam = [...team];
    newTeam[index] = null;
    setTeam(newTeam);
    if (onUpdate) onUpdate(newTeam as any);
    
    await supabase.from('matches').update({ opponent_team: newTeam }).eq('id', matchId);
  };

  // Create an array of 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '260px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-surface)',
        border: 'none',
        flex: 1
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
                padding: '1rem',
                backgroundColor: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <button
                  onClick={() => handleRemove(index)}
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}
                  title="Remove"
                >
                  ✕
                </button>
                <img 
                  src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
                  alt={p.name}
                  style={{ width: 70, height: 70, objectFit: 'contain', marginBottom: '0.5rem' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
                  }}
                />
                <span style={{ textTransform: 'capitalize', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }} title={p.name.replace('-', ' ')}>
                  {p.name.replace('-', ' ')}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {p.types?.map((t: string) => (
                    <span key={t} style={{ 
                      backgroundColor: TYPE_COLORS[t.toLowerCase()] || '#777', 
                      color: 'white', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px', 
                      fontSize: '0.65rem', 
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              backgroundColor: 'var(--bg-base)',
              border: '2px dashed var(--text-secondary)',
              borderRadius: '8px',
              opacity: 0.8
            }}>
              <span style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Add Pokemon</span>
              <div style={{ width: '100%', maxWidth: '160px' }}>
                <PokemonSearch onSelect={(pokemon) => handleAdd(index, pokemon)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
