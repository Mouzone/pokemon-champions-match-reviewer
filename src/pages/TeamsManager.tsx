import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../lib/types';
import { AppContext } from '../App';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export default function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [pasteText, setPasteText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { setIsDrawerOpen } = useContext(AppContext);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setFetching(true);
    const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching teams:', error);
    } else {
      setTeams(data || []);
    }
    setFetching(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pasteText) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('teams').insert([
        { 
          name, 
          paste_text: pasteText
        }
      ]);

      if (error) throw error;

      setName('');
      setPasteText('');
      setIsCreateModalOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Error creating team');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !name || !pasteText;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, padding: 0, borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIsDrawerOpen(true)} style={{ background: 'none', border: 'none', fontSize: '1.75rem', cursor: 'pointer', padding: 0, color: 'var(--text-primary)' }}>☰</button>
          TEAMS
        </h1>
      </div>

      <div className="flex flex-col" style={{ gap: '0.5rem' }}>
        {/* Create Team Placeholder Card */}
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem',
            border: '2px dashed var(--text-primary)',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
            minHeight: '120px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)' }}>+</span>
        </div>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">No teams created yet. Click the plus button above to create one!</p>
          </div>
        ) : (
          teams.map(team => (
            <div key={team.id} style={{ borderBottom: '2px solid var(--text-primary)', padding: '1rem' }}>
              <h3 style={{ textTransform: 'uppercase', fontWeight: 700 }}>{team.name}</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {team.paste_text && (
                  <div style={{ flex: '1 1 300px' }}>
                    <pre style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--bg-surface-hover)', 
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      margin: 0,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {team.paste_text}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <div className="modal-header">
          <h2>Create New Team</h2>
        </div>
        <div className="modal-body">
          <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
            <Input 
              label="Team Name" 
              placeholder="e.g. VGC 2024 Tailwind" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
            
            <div className="input-wrapper">
              <label className="input-label">Pokepaste (Required)</label>
              <textarea 
                className="input-field" 
                rows={10} 
                placeholder="Paste your Showdown team here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                required
              ></textarea>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Button type="submit" disabled={isSubmitDisabled} className="btn-primary" style={{ width: '100%' }}>
                {loading ? 'Uploading & Creating...' : 'Create Team'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
