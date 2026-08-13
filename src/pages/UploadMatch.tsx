import { useState, useEffect, useRef } from 'react';
import { db, storage, functions, auth } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import type { Team } from '../lib/types';
import { Button } from '../components/ui/Button';

interface UploadMatchProps {
  onSuccess?: () => void;
}

interface StorageFile {
  name: string;
  fullPath: string;
  url: string;
}

export default function UploadMatch({ onSuccess }: UploadMatchProps) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'storage'>('youtube');
  
  // YouTube Tab State
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<'win' | 'loss' | 'tie'>('win');
  const [teamId, setTeamId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Storage Tab State
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  
  // Shared State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (activeTab === 'storage' && files.length === 0) {
      fetchStorageFiles();
    }
  }, [activeTab, files.length]);

  const fetchTeams = async () => {
    try {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'teams'), where('userId', '==', auth.currentUser.uid), orderBy('created_at', 'desc'));
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

  const fetchStorageFiles = async () => {
    setLoadingFiles(true);
    try {
      if (!auth.currentUser) return;
      const videosRef = ref(storage, `videos/${auth.currentUser.uid}`);
      const res = await listAll(videosRef);
      
      const filePromises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url
        };
      });
      
      const fileList = await Promise.all(filePromises);
      // Sort to show newest first if possible, but listAll isn't ordered. 
      // We'll just sort by name descending as iOS shortcuts typically use timestamps in the name
      fileList.sort((a, b) => b.name.localeCompare(a.name));
      
      setFiles(fileList);
    } catch (err) {
      console.error('Error fetching storage files', err);
      setError('Could not fetch storage files.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSaveYouTube = async () => {
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
        userId: auth.currentUser?.uid,
        created_at: serverTimestamp()
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProcessStorageFile = async (filePath: string) => {
    setSaving(true);
    setError(null);
    try {
      const manualProcessMatch = httpsCallable(functions, 'manualProcessMatch');
      await manualProcessMatch({ filePath });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Manual process error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const VideoPreview = ({ src }: { src: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const handleTimeUpdate = () => {
      if (videoRef.current && videoRef.current.currentTime > 20) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
    
    return (
      <video 
        ref={videoRef}
        src={src} 
        controls 
        style={{ width: '100%', borderRadius: '8px', marginTop: '10px', backgroundColor: '#000' }} 
        onTimeUpdate={handleTimeUpdate}
      />
    );
  };

  return (
    <>
      <div className="modal-header">
        <h2>Manual Match Upload</h2>
      </div>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            YouTube Link
          </button>
          <button 
            className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            Storage Browser
          </button>
        </div>

        {error && <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{error}</div>}

        {activeTab === 'youtube' && (
          <>
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
              <Button className="btn-primary" onClick={handleSaveYouTube} disabled={saving}>
                {saving ? 'Saving...' : 'Save Match'}
              </Button>
            </div>
          </>
        )}

        {activeTab === 'storage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loadingFiles ? (
                <div>Loading videos from storage...</div>
              ) : files.length === 0 ? (
              <div>No videos found in storage.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {files.map(file => (
                  <div key={file.fullPath} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '500', wordBreak: 'break-all', paddingRight: '1rem' }}>{file.name}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <Button 
                          onClick={() => setPreviewFile(previewFile === file.fullPath ? null : file.fullPath)}
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        >
                          {previewFile === file.fullPath ? 'Hide Preview' : 'Preview'}
                        </Button>
                        <Button 
                          className="btn-primary" 
                          onClick={() => handleProcessStorageFile(file.fullPath)} 
                          disabled={saving}
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        >
                          Process AI
                        </Button>
                      </div>
                    </div>
                    {previewFile === file.fullPath && (
                      <VideoPreview src={file.url} />
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
