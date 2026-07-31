import React, { useState, useEffect, useContext } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Team } from '../lib/types';
import { AppContext } from '../AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { parsePokepaste } from '../lib/pokepaste';
import { PokemonIcon } from '../components/PokemonIcon';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

const TeamCard = ({ team, onEdit, onDelete, openMenuId, setOpenMenuId }: any) => {
  const [showExport, setShowExport] = useState(false);
  const parsedTeam = team.paste_text ? parsePokepaste(team.paste_text) : [];

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem', transition: 'transform 0.3s, box-shadow 0.3s' }} className="interactive">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ textTransform: 'uppercase', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '1px' }}>{team.name}</h3>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <MoreVertical size={20} />
          </button>

          {openMenuId === team.id && (
            <div style={{ 
              position: 'absolute', top: '100%', right: 0, 
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-md)',
              zIndex: 10, minWidth: '160px',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
              <button 
                onClick={() => onEdit(team)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--text-primary)', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-active)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Pencil size={16} /> Edit
              </button>
              <button 
                onClick={() => { setOpenMenuId(null); onDelete(team.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--loss-color)', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {parsedTeam.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {parsedTeam.map((p, i) => (
            <div key={i} title={p.name} style={{ width: 'clamp(56px, 12vw, 76px)', aspectRatio: '1/1', backgroundColor: 'var(--bg-active)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PokemonIcon name={p.name} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button 
          onClick={() => setShowExport(!showExport)}
          className="tab-btn"
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', borderBottom: '1px solid var(--border-color)' }}
        >
          {showExport ? 'Hide Export Data' : 'Show Export Data'}
        </button>
      </div>

      {showExport && team.paste_text && (
        <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s' }}>
          <pre style={{ padding: '1.25rem', backgroundColor: 'var(--bg-active)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0, maxHeight: '300px', overflowY: 'auto' }}>
            {team.paste_text}
          </pre>
        </div>
      )}
    </div>
  );
};

export default function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [pasteText, setPasteText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { isCreateTeamModalOpen, setIsCreateTeamModalOpen } = useContext(AppContext);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, 'teams'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(fetchedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleEditClick = (team: Team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setPasteText(team.paste_text || '');
    setOpenMenuId(null);
    setIsCreateTeamModalOpen(true);
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
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
        await updateDoc(doc(db, 'teams', editingTeamId), {
          name,
          paste_text: pasteText
        });
      } else {
        await addDoc(collection(db, 'teams'), {
          name,
          paste_text: pasteText,
          created_at: serverTimestamp()
        });
      }

      setName('');
      setPasteText('');
      setEditingTeamId(null);
      setIsCreateTeamModalOpen(false);
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
      {/* Page Header Removed */}

      <div className="flex flex-col" style={{ gap: '0.5rem', marginTop: '1rem' }}>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted text-center">No teams created yet. Use the FAB to create one!</p>
          </div>
        ) : (
          teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team} 
              onEdit={handleEditClick} 
              onDelete={handleDeleteTeam} 
              openMenuId={openMenuId} 
              setOpenMenuId={setOpenMenuId} 
            />
          ))
        )}
      </div>

      <Modal isOpen={isCreateTeamModalOpen} onClose={() => setIsCreateTeamModalOpen(false)}>
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
