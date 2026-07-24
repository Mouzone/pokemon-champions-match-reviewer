import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/Input';
import './ui/ui.css';

interface PokemonListResult {
  name: string;
  url: string;
}

interface PokemonSearchProps {
  onSelect: (pokemon: { name: string, id: string }) => void;
}

export function PokemonSearch({ onSelect }: PokemonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PokemonListResult[]>([]);
  const [allPokemon, setAllPokemon] = useState<PokemonListResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch all pokemon names once for client-side filtering
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1500')
      .then(res => res.json())
      .then(data => setAllPokemon(data.results))
      .catch(err => console.error('Error fetching pokemon:', err));
      
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      const filtered = allPokemon.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
      setResults(filtered);
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, allPokemon]);

  return (
    <div className="pokemon-search-container" style={{ position: 'relative' }} ref={dropdownRef}>
      <Input
        placeholder="Type a Pokemon name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.length > 1) setShowDropdown(true); }}
      />
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginTop: '0.25rem',
          zIndex: 50,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {results.map((p) => (
            <div
              key={p.name}
              style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}
              onClick={() => {
                const id = p.url.split('/').filter(Boolean).pop() || '';
                onSelect({ name: p.name, id });
                setQuery('');
                setShowDropdown(false);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {p.name.replace('-', ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
