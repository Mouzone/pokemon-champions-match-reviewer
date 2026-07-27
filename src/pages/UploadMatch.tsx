import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../lib/types';
import { Button } from '../components/ui/Button';

interface UploadMatchProps {
  onSuccess?: () => void;
}

export default function UploadMatch({ onSuccess }: UploadMatchProps) {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<'win' | 'loss' | 'tie'>('win');
  const [teamId, setTeamId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (data) {
      setTeams(data as Team[]);
      if (data.length > 0) {
        setTeamId(data[0].id);
      }
    }
  };

  const handleSave = async () => {
    if (!url) {
      setError('YouTube URL is required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    const { error: insertError } = await supabase.from('matches').insert([{
      played_at: new Date().toISOString(),
      video_url: url,
      result: result,
      own_team_id: teamId || null,
      opponent_team: []
    }]);

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      if (onSuccess) onSuccess();
    }
  };

  return (
    <>
      <div className="modal-header">
        <h2>Manual Match Upload</h2>
      </div>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {error && <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{error}</div>}
        
        <div>
          <label className="input-label">YouTube URL</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="https://youtube.com/watch?v=..." 
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="input-label">Match Result</label>
          <select 
            className="input-field"
            value={result}
            onChange={e => setResult(e.target.value as any)}
          >
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="tie">Tie</option>
          </select>
        </div>

        <div>
          <label className="input-label">My Team</label>
          <select 
            className="input-field"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            <option value="">-- No Team Selected --</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Match'}
          </Button>
        </div>
      </div>
    </>
  );
}
