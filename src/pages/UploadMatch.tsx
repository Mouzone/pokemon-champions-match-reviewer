import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Team, Result } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { PokemonSearch } from '../components/PokemonSearch';
import { getShowdownSpriteName } from '../lib/pokepaste';

export default function UploadMatch({ onSuccess }: { onSuccess?: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [playedAt, setPlayedAt] = useState('');
  const [opponentPokemon, setOpponentPokemon] = useState<{ name: string, id: string }[]>([]);
  const [result, setResult] = useState<Result>('win');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
    // Default to current time for playedAt
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setPlayedAt(now.toISOString().slice(0,16));
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (data) {
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0].id);
    }
  };

  const handleAddPokemon = (pokemon: { name: string, id: string }) => {
    if (opponentPokemon.length < 6 && !opponentPokemon.find(p => p.name === pokemon.name)) {
      setOpponentPokemon([...opponentPokemon, pokemon]);
    }
  };

  const removePokemon = (name: string) => {
    setOpponentPokemon(opponentPokemon.filter(p => p.name !== name));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl || !selectedTeam) {
      alert('Please provide a YouTube URL and select a team.');
      return;
    }
    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      alert('Please provide a valid YouTube URL (must contain youtube.com or youtu.be).');
      return;
    }
    setLoading(true);

    try {
      // 2. Insert match record
      const { error: dbError } = await supabase.from('matches').insert([
        {
          played_at: new Date(playedAt).toISOString(),
          opponent_team: opponentPokemon,
          own_team_id: selectedTeam,
          result: result,
          video_url: videoUrl
        }
      ]);

      if (dbError) throw dbError;

      alert('Match uploaded successfully!');
      if (onSuccess) {
        onSuccess();
      }
      // Reset form
      setVideoUrl('');
      setOpponentPokemon([]);
      setResult('win');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Error uploading match: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-header">
        <h2>Upload Match</h2>
      </div>
      <div className="modal-body">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          
          <div className="input-wrapper">
            <label className="input-label">YouTube URL</label>
            <input 
              type="url" 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)} 
              placeholder="e.g. https://youtube.com/watch?v=..."
              className="input-field" 
              required 
            />
          </div>

          <Input 
            label="Date and Time Played" 
            type="datetime-local" 
            value={playedAt} 
            onChange={(e) => setPlayedAt(e.target.value)} 
            required 
          />

          <div className="input-wrapper">
            <label className="input-label">Your Team</label>
            <select 
              className="input-field" 
              value={selectedTeam} 
              onChange={(e) => setSelectedTeam(e.target.value)}
              required
            >
              <option value="" disabled>Select a team...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="input-wrapper">
            <label className="input-label">Opponent's Team (Optional, select up to 6)</label>
            <PokemonSearch onSelect={handleAddPokemon} />
            
            {opponentPokemon.length > 0 && (
              <div className="flex gap-2" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {opponentPokemon.map(p => (
                  <div key={p.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--bg-base)',
                    padding: '0.5rem',
                    borderBottom: '2px solid var(--text-primary)'
                  }}>
                    <img src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} alt={p.name} style={{ width: 48, height: 48, objectFit: 'contain' }} onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
                    }}/>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{p.name.replace('-', ' ')}</span>
                    <button type="button" onClick={() => removePokemon(p.name)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 700 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-wrapper">
            <label className="input-label">Result</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['win', 'loss', 'tie'] as const).map(res => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResult(res)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '2px solid',
                    borderColor: result === res ? 'var(--text-primary)' : '#e5e7eb',
                    background: result === res ? 'var(--text-primary)' : 'var(--bg-surface)',
                    color: result === res ? 'var(--bg-base)' : 'var(--text-secondary)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading || !videoUrl || !selectedTeam}>
            {loading ? 'Processing...' : 'Upload Match'}
          </Button>
          {loading && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Saving match...
              </p>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
