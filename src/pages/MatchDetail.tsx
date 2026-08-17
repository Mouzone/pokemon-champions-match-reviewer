import { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { db, auth, storage } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import type { Match, Team } from '../lib/types';

import { MarkdownEditor } from '../components/MarkdownEditor';

import { OpponentTeamTab } from '../components/OpponentTeamTab';

interface MatchDetailProps {
  match: Match & { teams: Team };
  allTeams: Team[];
  notesCache: Record<string, any>;
  updateNotesCache: (matchId: string, data: any) => void;
  onMatchUpdate?: (updated: (Match & { teams: Team }) | null) => void;
}

type TurnData = { events: string; notes: string; knowns: string; assumptions: string; id?: string; timestamp?: number | null };

interface RawNote {
  id: string;
  tab: 'select' | 'battle' | 'improvements';
  turn_number?: number | null;
  actual_note?: string;
  correct_note?: string;
  timestamp?: number | null;
}

export default function MatchDetail({ match, allTeams, notesCache, updateNotesCache, onMatchUpdate }: MatchDetailProps) {
  const [activeTab, setActiveTab] = useState<'reference' | 'notes' | 'improvements'>('reference');

  const [, setLoading] = useState(false);


  const [improvementsNote, setImprovementsNote] = useState('');
  const [currentTurn, setCurrentTurn] = useState(0); // 0 = Turn 0, 1+ = Battle Turn
  
  // ReactPlayer renders the video; we grab the real <video> DOM element for event hooks
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Refs so callbacks always read the latest value without stale closures
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCalculatedTurnRef = useRef<number>(-1);
  const [timestampInput, setTimestampInput] = useState('');
  
  const [loaded, setLoaded] = useState(false);
  const saveTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveImpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [turnNotes, setTurnNotes] = useState<{ [turn: number]: TurnData }>({});
  // Mirror turnNotes in a ref so event callbacks always see the latest data
  const turnNotesRef = useRef<{ [turn: number]: TurnData }>({});
  const [, setSaving] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  useEffect(() => {
    if (match.video_url?.startsWith('gs://')) {
      getDownloadURL(storageRef(storage, match.video_url))
        .then(setVideoSrc)
        .catch(console.error);
    } else {
      setVideoSrc(match.video_url || '');
    }
  }, [match.video_url]);

  const fetchNotes = async () => {
    if (notesCache[match.id]) {
      const cached = notesCache[match.id];
      setTurnNotes(cached.turnNotes);
      turnNotesRef.current = cached.turnNotes;
      setImprovementsNote(cached.improvementsNote);
      setLoaded(true);
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'match_notes'), where('userId', '==', auth.currentUser.uid), where('match_id', '==', match.id));
      const snap = await getDocs(q);
      const notesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as RawNote));

      const tNotes: { [turn: number]: TurnData } = {};
      let impNote = '';
      notesData.forEach((n) => {
        if (n.tab === 'improvements') {
          impNote = n.actual_note || '';
          setImprovementsNote(impNote);
        } else if (n.tab === 'select' || n.tab === 'battle') {
          const turnNum = n.tab === 'select' ? 0 : n.turn_number;
          if (turnNum !== null && turnNum !== undefined) {
            let parsedData: TurnData = { 
              events: '', 
              notes: '', 
              knowns: '', 
              assumptions: '', 
              id: n.id, 
              timestamp: n.timestamp !== undefined ? n.timestamp : (turnNum === 0 ? 0 : null) 
            };
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
      turnNotesRef.current = tNotes;
      updateNotesCache(match.id, { turnNotes: tNotes, improvementsNote: impNote });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (loaded) {
      updateNotesCache(match.id, { turnNotes, improvementsNote });
    }
  }, [turnNotes, improvementsNote, loaded, match.id, updateNotesCache]);


  const syncTurnToTime = useCallback((timeSeconds: number) => {
    const notes = turnNotesRef.current;
    const sortedTurns = Object.keys(notes)
      .map(Number)
      .filter(t => notes[t]?.timestamp !== null && notes[t]?.timestamp !== undefined)
      .sort((a, b) => notes[a].timestamp! - notes[b].timestamp!);

    if (sortedTurns.length === 0) return;

    let calculatedTurn = sortedTurns[0];
    for (const t of sortedTurns) {
      if (timeSeconds >= notes[t].timestamp!) {
        calculatedTurn = t;
      }
    }

    if (calculatedTurn !== lastCalculatedTurnRef.current) {
      lastCalculatedTurnRef.current = calculatedTurn;
      setCurrentTurn(calculatedTurn);
    }
  }, []);

  const doSeek = (time: number) => {
    isSeekingRef.current = true;
    const vid = internalVideoRef.current;
    if (vid) {
      vid.currentTime = time;
    }
    // Immediately sync notes to the seek target — don't wait for timeupdate
    syncTurnToTime(time);
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 1500);
  };

  const handleTurnChange = (newTurn: number) => {
    setCurrentTurn(newTurn);
    lastCalculatedTurnRef.current = newTurn;

    // Auto-seek video if timestamp exists
    const notes = turnNotesRef.current;
    if (notes[newTurn] && notes[newTurn].timestamp !== null && notes[newTurn].timestamp !== undefined) {
      doSeek(notes[newTurn].timestamp!);
    }

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
          [newTurn]: { events: '', notes: '', knowns: initialKnowns, assumptions: initialAssumptions, timestamp: newTurn === 0 ? 0 : null }
        };
      }
      return prev;
    });
  };

  const saveTurnNoteToDb = async (turn: number, data: TurnData) => {
    setSaving(true);
    const payload = JSON.stringify({
      events: data.events || '',
      notes: data.notes || '',
      knowns: data.knowns || '',
      assumptions: data.assumptions || ''
    });
    
    if (turn === 0) {
      await upsertNote('select', undefined, payload, '', data.timestamp);
    } else {
      await upsertNote('battle', turn, payload, '', data.timestamp);
    }
    
    setSaving(false);
  };

  const handleTurnNoteChange = (box: keyof TurnData, val: string) => {
    setTurnNotes(prev => {
      const next = { ...prev };
      next[currentTurn] = { ...(next[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' }), [box]: val };
      turnNotesRef.current = next;
      
      if (saveTurnTimeoutRef.current) clearTimeout(saveTurnTimeoutRef.current);
      
      const turnToSave = currentTurn;
      const dataToSave = next[currentTurn];
      
      saveTurnTimeoutRef.current = setTimeout(() => {
        saveTurnNoteToDb(turnToSave, dataToSave);
      }, 1500);
      
      return next;
    });
  };

  const handleImprovementsChange = (val: string) => {
    setImprovementsNote(val);
    
    if (saveImpTimeoutRef.current) clearTimeout(saveImpTimeoutRef.current);
    saveImpTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await upsertNote('improvements', undefined, val, '');
      setSaving(false);
    }, 1500);
  };

  const upsertNote = async (tab: string, turn?: number, actual?: string, correct?: string, timestamp?: number | null) => {
    try {
      if (!auth.currentUser) return;
      let q = query(collection(db, 'match_notes'), where('userId', '==', auth.currentUser.uid), where('match_id', '==', match.id), where('tab', '==', tab));
      if (turn !== undefined) {
        q = query(q, where('turn_number', '==', turn));
      }

      const snap = await getDocs(q);
      const existing = snap.docs.length > 0 ? snap.docs[0] : null;

      if (existing) {
        await updateDoc(doc(db, 'match_notes', existing.id), { actual_note: actual, correct_note: correct, timestamp: timestamp !== undefined ? timestamp : null });
      } else {
        await addDoc(collection(db, 'match_notes'), { match_id: match.id, tab, turn_number: turn || null, actual_note: actual, correct_note: correct, timestamp: timestamp !== undefined ? timestamp : null, userId: auth.currentUser.uid });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentTurnData = turnNotes[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' };

  useEffect(() => {
    if (currentTurnData.timestamp !== undefined && currentTurnData.timestamp !== null) {
      setTimestampInput(`${Math.floor(currentTurnData.timestamp / 60)}:${String(Math.floor(currentTurnData.timestamp % 60)).padStart(2, '0')}`);
    } else {
      setTimestampInput('');
    }
  }, [currentTurn, currentTurnData.timestamp]);

  const handleTimestampBlur = () => {
    let newTs: number | null = null;
    if (timestampInput) {
      const parts = timestampInput.split(':');
      if (parts.length === 2) {
        newTs = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      } else {
        newTs = parseInt(parts[0]) || 0;
      }
    }
    
    if (newTs !== currentTurnData.timestamp) {
      setTurnNotes(prev => {
        const next = { ...prev };
        next[currentTurn] = { ...(next[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' }), timestamp: newTs };
        turnNotesRef.current = next;
        
        if (saveTurnTimeoutRef.current) clearTimeout(saveTurnTimeoutRef.current);
        const turnToSave = currentTurn;
        const dataToSave = next[currentTurn];
        // Save immediately for timestamps so quick refreshes don't lose the manual entry
        saveTurnNoteToDb(turnToSave, dataToSave);
        
        return next;
      });
      
      if (newTs !== null) {
        doSeek(newTs);
      }
    }
  };

  // After ReactPlayer mounts, find the inner <video> element and wire up native events.
  // We poll briefly because ReactPlayer renders async (especially for YouTube iframes).
  const attachVideoListeners = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const vid = container.querySelector('video');
    if (!vid) return;

    if (internalVideoRef.current === vid) return; // already attached
    internalVideoRef.current = vid;

    const onTimeUpdate = () => {
      if (!isSeekingRef.current) syncTurnToTime(vid.currentTime);
    };
    const onSeeked = () => {
      isSeekingRef.current = false;
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      syncTurnToTime(vid.currentTime);
    };
    const onPlay = () => { isSeekingRef.current = false; };

    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('seeked', onSeeked);
    vid.addEventListener('play', onPlay);

    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('play', onPlay);
      internalVideoRef.current = null;
    };
  }, [syncTurnToTime]);

  useEffect(() => {
    if (!videoSrc) return;
    // Poll until the <video> element appears inside the ReactPlayer container
    let cleanup: (() => void) | undefined;
    let attempts = 0;
    const interval = setInterval(() => {
      cleanup = attachVideoListeners();
      attempts++;
      if (cleanup || attempts > 20) clearInterval(interval);
    }, 200);
    return () => {
      clearInterval(interval);
      cleanup?.();
    };
  }, [videoSrc, attachVideoListeners]);


  return (
    <div className="match-detail-container">
      
      {/* Left side: Video Player + Chapter Bar */}
      <div style={{ flex: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          className="match-detail-video"
          style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#000',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {videoSrc ? (
            <div
              ref={playerContainerRef}
              style={{ position: 'absolute', inset: 0 }}
            >
              <ReactPlayer
                src={videoSrc}
                controls
                width="100%"
                height="100%"
              />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No video available
            </div>
          )}
        </div>
      </div>

      {/* Right side: Annotation Tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, paddingRight: '0.5rem', marginTop: '0.5rem' }}>
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start</span>
                <input 
                  type="text" 
                  placeholder="MM:SS"
                  className="input-field"
                  style={{ width: '60px', padding: '0.25rem 0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  onBlur={handleTimestampBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTimestampBlur();
                      e.currentTarget.blur();
                    }
                  }}
                />
                <button
                  title="Set to current video time"
                  onClick={() => {
                    const currentTime = internalVideoRef.current?.currentTime || 0;
                    setTurnNotes(prev => {
                      const next = { ...prev };
                      next[currentTurn] = { ...(next[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' }), timestamp: currentTime };
                      
                      if (saveTurnTimeoutRef.current) clearTimeout(saveTurnTimeoutRef.current);
                      saveTurnNoteToDb(currentTurn, next[currentTurn]);
                      return next;
                    });
                    setTimestampInput(`${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            <div className="notes-editor-container" style={{ display: 'flex', gap: '0.75rem', flex: 1, minHeight: 0 }}>
              
              {/* Left Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '4px' }}>
                {/* Underline tab selectors */}
                <div className="hide-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
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
                    value={String(currentTurnData[leftBox] || '')} 
                    onChange={val => handleTurnNoteChange(leftBox, val)} 
                    placeholder={`Write your ${leftBox} here...`}
                  />
                </div>
              </div>

              {/* Right Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '4px' }}>
                <div className="hide-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
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
                    value={String(currentTurnData[rightBox] || '')} 
                    onChange={val => handleTurnNoteChange(rightBox, val)} 
                    placeholder={`Write your ${rightBox} here...`}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'improvements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <MarkdownEditor 
                value={improvementsNote} 
                onChange={handleImprovementsChange} 
                placeholder="Summarize key takeaways..."
              />
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

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
