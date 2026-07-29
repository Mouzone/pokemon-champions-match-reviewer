import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
    try {
      const q = query(collection(db, 'teams'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0) {
        setTeamId(fetchedTeams[0].id);
      }
    } catch (err) {
      console.error('Error fetching teams', err);
    }
  };

  const handleSave = async () => {
    if (!url) {
      setError('YouTube URL is required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'matches'), {
        played_at: new Date().toISOString(),
        video_url: url,
        result: result,
        own_team_id: teamId || null,
        opponent_team: [],
        created_at: serverTimestamp()
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
