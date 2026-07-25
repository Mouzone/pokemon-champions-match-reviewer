import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '../lib/supabase';
import type { Match, Team } from '../lib/types';

import { Button } from '../components/ui/Button';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { ReferenceTab } from '../components/ReferenceTab';
import { OpponentTeamTab } from '../components/OpponentTeamTab';

interface MatchDetailProps {
  match: Match & { teams: Team };
  onMatchUpdate?: (updated: Match & { teams: Team }) => void;
}

type TurnData = { events: string; notes: string; knowns: string; assumptions: string; id?: string };

export default function MatchDetail({ match, onMatchUpdate }: MatchDetailProps) {
  const [activeTab, setActiveTab] = useState<'reference' | 'notes' | 'improvements'>('reference');
  const [referenceSubTab, setReferenceSubTab] = useState<'myTeam' | 'opponent'>('myTeam');
  const [loading, setLoading] = useState(true);


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

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data: notesData } = await supabase.from('match_notes').select('*').eq('match_id', match.id);
    
    if (notesData) {
      const tNotes: any = {};
      notesData.forEach(n => {
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
    let query = supabase.from('match_notes').select('id').eq('match_id', match.id).eq('tab', tab);
    if (turn !== undefined) query = query.eq('turn_number', turn);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase.from('match_notes').update({ actual_note: actual, correct_note: correct }).eq('id', existing.id);
    } else {
      await supabase.from('match_notes').insert([{ match_id: match.id, tab, turn_number: turn, actual_note: actual, correct_note: correct }]);
    }
  };

  const currentTurnData = turnNotes[currentTurn] || { events: '', notes: '', knowns: '', assumptions: '' };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Loading notes...</p></div>;

  return (
    <div className="match-detail-container">
      
      {/* Left side: Video Player */}
      <div className="match-detail-video" style={{ flex: '1 1 40%', marginTop: '4.2rem' }}>
        <div style={{ backgroundColor: '#000', overflow: 'hidden', border: '2px solid var(--text-primary)', display: 'flex', justifyContent: 'center' }}>
          <ReactPlayer 
            src={match.video_url} 
            controls 
            width="100%" 
            height="auto"
            style={{ aspectRatio: '16/9', maxHeight: '400px' }}
          />
        </div>
      </div>

      {/* Right side: Annotation Tabs */}
      <div style={{ flex: '2 1 50%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="tabs-header" style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--text-primary)' }}>
          <button className={`tab-btn ${activeTab === 'reference' ? 'active' : ''}`} onClick={() => setActiveTab('reference')}>Reference</button>
          <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
          <button className={`tab-btn ${activeTab === 'improvements' ? 'active' : ''}`} onClick={() => setActiveTab('improvements')}>Improvements</button>
        </div>

        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase', fontWeight: 900 }}>Turn:</h3>
              <select 
                value={currentTurn} 
                onChange={e => handleTurnChange(Number(e.target.value))}
                className="input-field"
                style={{ width: 'fit-content', padding: '0.25rem 0.15rem 0.25rem 0.4rem', textAlign: 'center' }}
              >
                <option value={0}>0</option>
                {[...Array(20)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>

            <div className="notes-editor-container">
              
              {/* Left Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <select 
                  value={leftBox}
                  onChange={e => setLeftBox(e.target.value as keyof TurnData)}
                  style={{ 
                    fontWeight: 800, 
                    textTransform: 'uppercase', 
                    marginBottom: '0.5rem', 
                    border: 'none', 
                    background: 'transparent',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                >
                  {boxOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div style={{ flex: 1 }}>
                  <MarkdownEditor 
                    value={currentTurnData[leftBox] || ''} 
                    onChange={val => setTurnNotes(prev => ({ ...prev, [currentTurn]: { ...prev[currentTurn], [leftBox]: val } }))} 
                    placeholder={`Write your ${leftBox} here...`}
                  />
                </div>
              </div>

              {/* Right Box */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <select 
                  value={rightBox}
                  onChange={e => setRightBox(e.target.value as keyof TurnData)}
                  style={{ 
                    fontWeight: 800, 
                    textTransform: 'uppercase', 
                    marginBottom: '0.5rem', 
                    border: 'none', 
                    background: 'transparent',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                >
                  {boxOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div style={{ flex: 1 }}>
                  <MarkdownEditor 
                    value={currentTurnData[rightBox] || ''} 
                    onChange={val => setTurnNotes(prev => ({ ...prev, [currentTurn]: { ...prev[currentTurn], [rightBox]: val } }))} 
                    placeholder={`Write your ${rightBox} here...`}
                  />
                </div>
              </div>

            </div>

            <div style={{ marginTop: 'auto' }}>
              <Button onClick={saveTurnNote} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '1rem' }}>{saving ? 'Saving...' : 'SAVE TURN NOTES'}</Button>
            </div>
          </div>
        )}

        {activeTab === 'improvements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
            <div style={{ flex: 1 }}>
              <MarkdownEditor 
                value={improvementsNote} 
                onChange={setImprovementsNote} 
                placeholder="Summarize key takeaways..."
              />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button onClick={saveImprovementsNote} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '1rem' }}>{saving ? 'Saving...' : 'SAVE NOTES'}</Button>
            </div>
          </div>
        )}

        {activeTab === 'reference' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minHeight: '400px' }}>
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => setReferenceSubTab('myTeam')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  color: referenceSubTab === 'myTeam' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: referenceSubTab === 'myTeam' ? '3px solid var(--text-primary)' : '3px solid transparent'
                }}
              >
                My Team
              </button>
              <button 
                onClick={() => setReferenceSubTab('opponent')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  color: referenceSubTab === 'opponent' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: referenceSubTab === 'opponent' ? '3px solid var(--text-primary)' : '3px solid transparent'
                }}
              >
                Opponent
              </button>
            </div>
            
            {referenceSubTab === 'myTeam' ? (
              <ReferenceTab pasteText={match.teams?.paste_text || ''} />
            ) : (
              <OpponentTeamTab 
                matchId={match.id} 
                initialTeam={match.opponent_team || []}
                onUpdate={(newTeam) => {
                  if (onMatchUpdate) {
                    onMatchUpdate({ ...match, opponent_team: newTeam });
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
