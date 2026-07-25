import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());

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
    if (!videoFile || !selectedTeam) {
      alert('Please select a video and a team.');
      return;
    }
    setLoading(true);
    setCompressionProgress(0);
    setStatusText('Preparing to compress...');

    try {
      const ffmpeg = ffmpegRef.current;
      
      if (!ffmpeg.loaded) {
        setStatusText('Loading compression engine...');
        ffmpeg.on('progress', ({ progress }) => {
          setCompressionProgress(Math.round(progress * 100));
        });
        
        ffmpeg.on('log', ({ message }) => {
          console.log(message);
        });

        // Use unpkg to bypass Vite's asset handling and avoid COOP/COEP issues
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      setStatusText('Compressing video (this takes a moment)...');
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      
      // Compress: 720p height, 30fps, CRF 28
      await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'scale=-2:720', '-r', '30', '-c:v', 'libx264', '-crf', '28', 'output.mp4']);
      
      setStatusText('Reading compressed video...');
      const fileData = await ffmpeg.readFile('output.mp4');
      const data = fileData as Uint8Array;
      const safeData = new Uint8Array(data);
      const compressedFile = new File([safeData], videoFile.name, { type: 'video/mp4' });

      setStatusText('Uploading to server...');

      // 1. Upload video to Supabase Storage
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `matches/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);
      const videoUrl = publicUrlData.publicUrl;

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
      setVideoFile(null);
      setOpponentPokemon([]);
      setResult('win');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Error uploading match: ' + err.message);
    } finally {
      setLoading(false);
      setStatusText('');
      setCompressionProgress(0);
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
            <label className="input-label">Screen Recording</label>
            <input 
              type="file" 
              accept="video/*" 
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
              className="input-field" 
              style={{ paddingTop: '0.4rem' }}
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

          <Button type="submit" disabled={loading || !videoFile || !selectedTeam}>
            {loading ? (statusText || 'Processing...') : 'Upload Match'}
          </Button>
          {loading && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              {compressionProgress > 0 && statusText.includes('Compressing') && (
                <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', margin: '0.5rem 0' }}>
                  <div style={{ width: `${compressionProgress}%`, backgroundColor: 'var(--text-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                </div>
              )}
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Please do not close this window while the video is processing.
              </p>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
