import { useState, useEffect } from 'react';
import { parsePokepaste, formatPokeApiName, getShowdownSpriteName, calculateStat, type ParsedPokemon } from '../lib/pokepaste';

interface ReferenceTabProps {
  pasteText: string;
}

export function ReferenceTab({ pasteText }: ReferenceTabProps) {
  const [team, setTeam] = useState<(ParsedPokemon & { baseStats?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rightPane, setRightPane] = useState<'stats' | 'moves'>('stats');

  useEffect(() => {
    async function loadStats() {
      const parsed = parsePokepaste(pasteText);
      
      const enriched = await Promise.all(parsed.map(async (p) => {
        try {
          // PokeAPI sometimes uses specific suffixes for forms
          let fetchName = formatPokeApiName(p.name);
          if (fetchName.includes('ogerpon')) fetchName = 'ogerpon';
          if (fetchName.includes('urshifu')) fetchName = fetchName.replace('-rapid-strike', '-rapid-strike-style').replace('-single-strike', '-single-strike-style');
          
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${fetchName}`);
          if (res.ok) {
            const data = await res.json();
            const baseStats = {
              hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat,
              atk: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
              def: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
              spa: data.stats.find((s: any) => s.stat.name === 'special-attack').base_stat,
              spd: data.stats.find((s: any) => s.stat.name === 'special-defense').base_stat,
              spe: data.stats.find((s: any) => s.stat.name === 'speed').base_stat,
            };
            const types = data.types.map((t: any) => t.type.name);

            // Fetch move types
            const enrichedMoves = await Promise.all(p.moves.map(async (m) => {
              try {
                // Remove trailing spaces, hyphens for PokeAPI
                let moveId = formatPokeApiName(m);
                const moveRes = await fetch(`https://pokeapi.co/api/v2/move/${moveId}`);
                if (moveRes.ok) {
                  const moveData = await moveRes.json();
                  return { name: m, type: moveData.type.name };
                }
              } catch (e) {
                console.error('Failed to fetch move', m, e);
              }
              return { name: m, type: 'normal' };
            }));

            return { ...p, baseStats, types, enrichedMoves };
          }
        } catch (e) {
          console.error('Failed to fetch stats for', p.name, e);
        }
        return p;
      }));
      setTeam(enriched);
      setLoading(false);
    }
    loadStats();
  }, [pasteText]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading reference stats from PokeAPI...</div>;
  if (team.length === 0) return <div style={{ padding: '2rem', textAlign: 'center' }}>No Pokepaste data found for this team.</div>;

  const statNames = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  
  const p = team[currentIndex];

  const TYPE_COLORS: Record<string, string> = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898',
    steel: '#B7B7CE', fairy: '#D685AD',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
      
      {/* Carousel Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '0.25rem' }}>
        {team.map((pokemon, idx) => (
          <div 
            key={idx} 
            onClick={() => setCurrentIndex(idx)}
            style={{ 
              cursor: 'pointer',
              opacity: idx === currentIndex ? 1 : 0.4,
              border: idx === currentIndex ? '3px solid black' : '3px solid transparent',
              borderRadius: '50%',
              padding: '4px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: idx === currentIndex ? 50 : 40,
              height: idx === currentIndex ? 50 : 40,
            }}
          >
            <img 
              src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(pokemon.name)}.png`} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt={pokemon.name}
            />
          </div>
        ))}
      </div>

      <div className="ref-tab-container" style={{ border: '3px solid black', display: 'flex', backgroundColor: 'var(--bg-surface)', minHeight: '260px' }}>
        
        {/* Header Info */}
        <div className="ref-pane-left">
          <img 
            src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
            alt={p.name}
            style={{ width: 85, height: 85, objectFit: 'contain', marginBottom: '0.25rem' }}
          />
          <h4 style={{ margin: 0, textTransform: 'uppercase', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '1px' }}>{p.name}</h4>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0 1rem 0' }}>
            {(p as any).types?.map((t: string) => (
              <span key={t} style={{ 
                backgroundColor: TYPE_COLORS[t.toLowerCase()] || '#777', 
                color: 'white', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 800,
                textTransform: 'uppercase',
                textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
              }}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ width: '100%', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#555', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem' }}>Item</span>
              <span style={{ fontWeight: 800 }}>{p.item}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#555', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem' }}>Ability</span>
              <span style={{ fontWeight: 800 }}>{p.ability}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#555', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem' }}>Nature</span>
              <span style={{ fontWeight: 800 }}>{p.nature}</span>
            </div>
          </div>
        </div>

        {/* Right Pane (Stats or Moves) */}
        <div className="ref-pane-right">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '3px solid black', padding: '0 0.5rem 0.5rem 0.5rem' }}>
            <button 
              onClick={() => setRightPane(prev => prev === 'stats' ? 'moves' : 'stats')}
              style={{ padding: '0 0.5rem', cursor: 'pointer', background: 'transparent', border: 'none', fontWeight: 900, fontSize: '1.25rem' }}
            >
              &larr;
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {rightPane}
            </div>
            <button 
              onClick={() => setRightPane(prev => prev === 'stats' ? 'moves' : 'stats')}
              style={{ padding: '0 0.5rem', cursor: 'pointer', background: 'transparent', border: 'none', fontWeight: 900, fontSize: '1.25rem' }}
            >
              &rarr;
            </button>
          </div>

          {rightPane === 'stats' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'center', padding: '0 1.5rem' }}>
              {statNames.map(stat => {
                const base = (p as any).baseStats ? (p as any).baseStats[stat] : 0;
                const ev = p.evs[stat as keyof typeof p.evs];
                const realStat = (p as any).baseStats ? calculateStat(base, ev, p.ivs[stat], 50, stat, p.nature) : '?';
                
                // Showdown-style color coding based on base stat
                const hue = Math.floor((base || 0) * 180 / 255);
                const statColor = base ? `hsl(${hue}, 85%, 45%)` : '#4384f5';
                
                return (
                  <div key={stat} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 35px', gap: '0.4rem', fontSize: '1rem', alignItems: 'center' }}>
                    <div style={{ textTransform: 'uppercase', fontWeight: 800, color: '#555', fontSize: '0.8rem' }}>{stat}</div>
                    <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((base / 255) * 100, 100)}%`, height: '100%', backgroundColor: statColor }} />
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: statColor, fontSize: '1.1rem' }}>{realStat}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1.5rem' }}>
              {(p as any).enrichedMoves?.map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#f3f4f6', fontSize: '0.95rem', fontWeight: 700, borderRadius: '4px' }}>
                  <span style={{ 
                    backgroundColor: TYPE_COLORS[m.type.toLowerCase()] || '#777', 
                    color: 'white', 
                    padding: '0.15rem 0.4rem', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {m.type}
                  </span>
                  {m.name}
                </div>
              )) || p.moves.map((m, i) => (
                <div key={i} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#f3f4f6', fontSize: '0.95rem', fontWeight: 700, borderRadius: '4px' }}>
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
