import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ProcessingJob {
  id: string;
  file_path: string;
  status: 'processing' | 'completed' | 'failed';
  started_at: any;
  error?: string;
}

export function GlobalProgress() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!currentUser) {
        setJobs([]);
        return;
      }

      const q = query(
        collection(db, 'processing_jobs'),
        where('status', '==', 'processing'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const activeJobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ProcessingJob));
        
        setJobs(activeJobs);
        
        if (activeJobs.length > 0) {
          setMinimized(false);
        }
      }, (error) => {
        console.error("GlobalProgress snapshot error:", error);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  if (jobs.length === 0) return null;

  return (
    <div className={`global-progress-widget ${minimized ? 'minimized' : ''}`}>
      <div className="progress-header" onClick={() => setMinimized(!minimized)}>
        <div className="progress-title">
          {jobs.length} upload{jobs.length > 1 ? 's' : ''} processing
        </div>
        <button className="minimize-btn">
          {minimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      
      {!minimized && (
        <div className="progress-list">
          {jobs.map(job => {
            const fileName = job.file_path.split('/').pop() || 'Unknown Video';
            return (
              <div key={job.id} className="progress-item">
                <Loader2 size={18} className="spin-icon" />
                <div className="progress-item-details">
                  <div className="progress-filename" title={fileName}>{fileName}</div>
                  <div className="progress-status">AI Review in progress...</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
