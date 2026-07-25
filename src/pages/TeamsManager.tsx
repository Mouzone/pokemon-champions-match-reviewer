import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../lib/types';
import { AppContext } from '../AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { parsePokepaste, getShowdownSpriteName } from '../lib/pokepaste';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

export default function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [pasteText, setPasteText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
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

  const handleEditClick = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setPasteText(team.paste_text || '');
    setOpenMenuId(null);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team');
    }
  };

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pasteText) return;

    setLoading(true);

    try {
      if (editingTeamId) {
        const { error } = await supabase.from('teams').update({
          name,
          paste_text: pasteText
        }).eq('id', editingTeamId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('teams').insert([
          { 
            name, 
            paste_text: pasteText
          }
        ]);
        if (error) throw error;
      }

      setName('');
      setPasteText('');
      setEditingTeamId(null);
      setIsCreateModalOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error saving team');
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
          onClick={() => {
            setEditingTeamId(null);
            setName('');
            setPasteText('');
            setIsCreateModalOpen(true);
          }}
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
          teams.map(team => {
            const parsedTeam = team.paste_text ? parsePokepaste(team.paste_text) : [];
            return (
            <div key={team.id} style={{ borderBottom: '2px solid var(--text-primary)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>{team.name}</h3>
                
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem' }}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {openMenuId === team.id && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      right: 0, 
                      backgroundColor: 'var(--bg-base)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      borderRadius: '8px',
                      zIndex: 10,
                      minWidth: '150px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      <button 
                        onClick={() => handleEditClick(team)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', 
                          padding: '0.5rem 1rem', background: 'none', border: 'none', 
                          cursor: 'pointer', width: '100%', textAlign: 'left',
                          color: 'var(--text-primary)', fontWeight: 600
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Pencil size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => { setOpenMenuId(null); handleDeleteTeam(team.id); }}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', 
                          padding: '0.5rem 1rem', background: 'none', border: 'none', 
                          cursor: 'pointer', width: '100%', textAlign: 'left',
                          color: 'var(--danger)', fontWeight: 600
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {parsedTeam.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {parsedTeam.map((p, i) => (
                    <div key={i} title={p.name} style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(p.name)}.png`} 
                        alt={p.name} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {team.paste_text && (
                  <div style={{ flex: '1 1 300px' }}>
                    <pre style={{ 
                      padding: '1.25rem', 
                      backgroundColor: 'var(--bg-surface-hover)',
                      borderRadius: '8px', 
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                      margin: 0,
                      maxHeight: '350px',
                      overflowY: 'auto'
                    }}>
                      {team.paste_text}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <div className="modal-header">
          <h2>{editingTeamId ? 'Edit Team' : 'Create New Team'}</h2>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmitTeam} className="flex flex-col gap-4">
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
                {loading ? 'Saving...' : editingTeamId ? 'Save Changes' : 'Create Team'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
