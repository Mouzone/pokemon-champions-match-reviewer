import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, where } from 'firebase/firestore';
import type { Match, Team } from '../lib/types';

import { Button } from '../components/ui/Button';
import { MarkdownEditor } from '../components/MarkdownEditor';

import { OpponentTeamTab } from '../components/OpponentTeamTab';

interface MatchDetailProps {
  match: Match & { teams: Team };
  onMatchUpdate?: (updated: (Match & { teams: Team }) | null) => void;
}

type TurnData = { events: string; notes: string; knowns: string; assumptions: string; id?: string };

export default function MatchDetail({ match, onMatchUpdate }: MatchDetailProps) {
  const [activeTab, setActiveTab] = useState<'reference' | 'notes' | 'improvements'>('reference');

  const [loading, setLoading] = useState(true);
  const [allTeams, setAllTeams] = useState<Team[]>([]);


  const [improvementsNote, setImprovementsNote] = useState('');
  const [currentTurn, setCurrentTurn] = useState(0); // 0 = Turn 0, 1+ = Battle Turn
  
  const [turnNotes, setTurnNotes] = useState<{ [turn: number]: TurnData }>({});
  const [saving, setSaving] = useState(false);

  const [leftBox, setLeftBox] = useState<keyof TurnData>('events');
  const [rightBox, setRightBox] = useState<keyof TurnData>('notes');

  const boxOptions = [
    { value: 'events', label: 'EVENTS' },
    { value: 'notes', label: 'NOTES' },
    { value: 'knowns', label: 'KNOWNS' },
    { value: 'assumptions', label: 'ASSUMPTIONS' },
  ];

  const [videoSrc, setVideoSrc] = useState<string>('');

  useEffect(() => {
    fetchNotes();
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  useEffect(() => {
    if (match.video_url?.startsWith('gs://')) {
      import('firebase/storage').then(({ getStorage, ref, getDownloadURL }) => {
        const storage = getStorage();
        getDownloadURL(ref(storage, match.video_url)).then(setVideoSrc).catch(console.error);
      });
    } else {
      setVideoSrc(match.video_url || '');
    }
  }, [match.video_url]);

  const fetchTeams = async () => {
    try {
      const q = query(collection(db, 'teams'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setAllTeams(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'match_notes'), where('match_id', '==', match.id));
      const snap = await getDocs(q);
      const notesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const tNotes: any = {};
      notesData.forEach((n: any) => {
        if (n.tab === 'improvements') {
          setImprovementsNote(n.actual_note || '');
        } else if (n.tab === 'select' || n.tab === 'battle') {
          const turnNum = n.tab === 'select' ? 0 : n.turn_number;
          if (turnNum !== null && turnNum !== undefined) {
            let parsedData: TurnData = { events: '', notes: '', knowns: '', assumptions: '', id: n.id };
            try {
              if (n.actual_note?.startsWith('{')) {
                const p = JSON.parse(n.actual_note);
                parsedData.events = p.events || '';
                parsedData.notes = p.notes || '';
                parsedData.knowns = p.knowns || '';
                parsedData.assumptions = p.assumptions || '';
              } else {
                parsedData.events = n.actual_note || '';
                parsedData.notes = n.correct_note || '';
              }
            } catch {
              parsedData.events = n.actual_note || '';
              parsedData.notes = n.correct_note || '';
            }
            tNotes[turnNum] = parsedData;
          }
        }
      });
      setTurnNotes(tNotes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleTurnChange = (newTurn: number) => {
    setCurrentTurn(newTurn);
    setTurnNotes(prev => {
      if (!prev[newTurn]) {
        let latestTurn = newTurn - 1;
        while (latestTurn >= 0 && !prev[latestTurn]) {
          latestTurn--;
        }
        let initialKnowns = '';
        let initialAssumptions = '';
        if (latestTurn >= 0 && prev[latestTurn]) {
          initialKnowns = prev[latestTurn].knowns;
          initialAssumptions = prev[latestTurn].assumptions;
        }
        return {
          ...prev,
          [newTurn]: { events: '', notes: '', knowns: initialKnowns, assumptions: initialAssumptions }
        };
      }
      return prev;
    });
  };

  const saveImprovementsNote = async () => {
    setSaving(true);
    await upsertNote('improvements', undefined, improvementsNote, '');
    setSaving(false);
  };

  const saveTurnNote = async () => {
    setSaving(true);
    const dataToSave = turnNotes[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' };
    const payload = JSON.stringify({
      events: dataToSave.events,
      notes: dataToSave.notes,
      knowns: dataToSave.knowns,
      assumptions: dataToSave.assumptions
    });
    
    if (currentTurn === 0) {
      await upsertNote('select', undefined, payload, '');
    } else {
      await upsertNote('battle', currentTurn, payload, '');
    }
    
    setSaving(false);
  };

  const upsertNote = async (tab: string, turn?: number, actual?: string, correct?: string) => {
    try {
      let q = query(collection(db, 'match_notes'), where('match_id', '==', match.id), where('tab', '==', tab));
      if (turn !== undefined) {
        q = query(q, where('turn_number', '==', turn));
      }

      const snap = await getDocs(q);
      const existing = snap.docs.length > 0 ? snap.docs[0] : null;

      if (existing) {
        await updateDoc(doc(db, 'match_notes', existing.id), { actual_note: actual, correct_note: correct });
      } else {
        await addDoc(collection(db, 'match_notes'), { match_id: match.id, tab, turn_number: turn || null, actual_note: actual, correct_note: correct });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentTurnData = turnNotes[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Loading notes...</p></div>;

  return (
    <div className="match-detail-container">
      
      {/* Left side: Video Player */}
      <div className="match-detail-video" style={{ flex: 1.5, minWidth: 0, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--bg-base)', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          {videoSrc ? (
            <ReactPlayer 
              src={videoSrc} 
              controls 
              width="100%" 
              height="100%"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading video...
            </div>
          )}
        </div>
      </div>

      {/* Right side: Annotation Tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, paddingRight: '0.5rem' }}>
        <div className="tabs-header" style={{ marginBottom: '0.5rem', borderBottom: '2px solid var(--border-color)', display: 'flex' }}>
          <button className={`tab-btn ${activeTab === 'reference' ? 'active' : ''}`} onClick={() => setActiveTab('reference')}>Details</button>
          <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
          <button className={`tab-btn ${activeTab === 'improvements' ? 'active' : ''}`} onClick={() => setActiveTab('improvements')}>Improvements</button>
        </div>

        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
            
            {/* Turn selector - compact inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ margin: 0, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Turn</span>
              <select 
                value={currentTurn} 
                onChange={e => handleTurnChange(Number(e.target.value))}
                className="select-field"
                style={{ width: '60px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
              >
                <option value={0}>0</option>
                {[...Array(20)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>

            <div className="notes-editor-container" style={{ display: 'flex', gap: '0.75rem', flex: 1, minHeight: 0 }}>
              
              {/* Left Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '4px' }}>
                {/* Underline tab selectors */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                  {boxOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setLeftBox(o.value as keyof TurnData)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        border: 'none',
                        borderBottom: `2px solid ${leftBox === o.value ? 'var(--primary)' : 'transparent'}`,
                        marginBottom: '-1px',
                        background: 'transparent',
                        color: leftBox === o.value ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <MarkdownEditor 
                    value={currentTurnData[leftBox] || ''} 
                    onChange={val => setTurnNotes(prev => ({ ...prev, [currentTurn]: { ...prev[currentTurn], [leftBox]: val } }))} 
                    placeholder={`Write your ${leftBox} here...`}
                  />
                </div>
              </div>

              {/* Right Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '4px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                  {boxOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setRightBox(o.value as keyof TurnData)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        border: 'none',
                        borderBottom: `2px solid ${rightBox === o.value ? 'var(--primary)' : 'transparent'}`,
                        marginBottom: '-1px',
                        background: 'transparent',
                        color: rightBox === o.value ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <MarkdownEditor 
                    value={currentTurnData[rightBox] || ''} 
                    onChange={val => setTurnNotes(prev => ({ ...prev, [currentTurn]: { ...prev[currentTurn], [rightBox]: val } }))} 
                    placeholder={`Write your ${rightBox} here...`}
                  />
                </div>
              </div>

            </div>

            <div>
              <Button onClick={saveTurnNote} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>{saving ? 'Saving...' : 'SAVE TURN NOTES'}</Button>
            </div>
          </div>
        )}

        {activeTab === 'improvements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <MarkdownEditor 
                value={improvementsNote} 
                onChange={setImprovementsNote} 
                placeholder="Summarize key takeaways..."
              />
            </div>
            <div>
              <Button onClick={saveImprovementsNote} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>{saving ? 'Saving...' : 'SAVE NOTES'}</Button>
            </div>
          </div>
        )}

        {activeTab === 'reference' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={match.result || ''}
                onChange={async (e) => {
                  const newResult = e.target.value;
                  try {
                    await updateDoc(doc(db, 'matches', match.id), { result: newResult || null });
                    if (onMatchUpdate) onMatchUpdate({ ...match, result: newResult as any });
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="select-field"
                style={{ flex: 0.6, padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="">Result</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="tie">Tie</option>
              </select>

              <select 
                value={match.own_team_id || ''}
                onChange={async (e) => {
                  const newTeamId = e.target.value;
                  try {
                    await updateDoc(doc(db, 'matches', match.id), { own_team_id: newTeamId || null });
                    if (onMatchUpdate) {
                      const newTeam = allTeams.find(t => t.id === newTeamId) || null;
                      onMatchUpdate({ ...match, own_team_id: newTeamId || null, teams: newTeam as any });
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="select-field"
                style={{ flex: 2, padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="">Select Team</option>
                {allTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <OpponentTeamTab 
                matchId={match.id} 
                initialTeam={match.opponent_team || []}
                onUpdate={(newTeam) => {
                  if (onMatchUpdate) {
                    onMatchUpdate({ ...match, opponent_team: newTeam as any });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
