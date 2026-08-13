import { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { Plus, List, Users, Upload, PlusCircle, LogOut, Smartphone } from 'lucide-react';
import { Modal } from './ui/Modal';
import { ShortcutGuide } from './ShortcutGuide';

export function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const { setIsUploadModalOpen, setIsCreateTeamModalOpen } = useContext(AppContext);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <div className={`fab-backdrop ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} />
      <div className="fab-container" ref={menuRef}>
        <div className={`fab-menu ${isOpen ? 'open' : ''}`}>
          <button 
            className="fab-item"
            onClick={() => handleAction(() => navigate('/'))}
            title="Match History"
          >
            <List size={18} /> Match History
          </button>
          
          <button 
            className="fab-item"
            onClick={() => handleAction(() => setIsUploadModalOpen(true))}
            title="Manual Upload"
          >
            <Upload size={18} /> Manual Upload
          </button>

          <button 
            className="fab-item"
            onClick={() => handleAction(() => setIsShortcutModalOpen(true))}
            title="Mobile Upload Setup"
          >
            <Smartphone size={18} /> Mobile Upload Setup
          </button>
          
          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }}></div>

          <button 
            className="fab-item"
            onClick={() => handleAction(() => navigate('/teams'))}
            title="Teams Manager"
          >
            <Users size={18} /> Teams Manager
          </button>
          
          <button 
            className="fab-item"
            onClick={() => handleAction(() => setIsCreateTeamModalOpen(true))}
            title="Create Team"
          >
            <PlusCircle size={18} /> Create Team
          </button>
          
          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }}></div>

          <button 
            className="fab-item fab-item-danger"
            onClick={() => handleAction(() => auth.signOut())}
            title="Logout"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        <button 
          className={`fab-main ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Close Menu" : "Open Menu"}
        >
          <Plus size={32} />
        </button>
      </div>

      <Modal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)}>
        <ShortcutGuide />
      </Modal>
    </>
  );
}
