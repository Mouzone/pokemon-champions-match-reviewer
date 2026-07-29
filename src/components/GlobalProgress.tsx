import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
    // Listen to all jobs in the last 24 hours to show recently completed/failed as well, 
    // or just listen to active processing. For simplicity, we just listen to everything 
    // and filter in memory, or just listen to 'processing' and recently completed.
    // Let's just grab the 5 most recent jobs to keep the widget relevant.
    
    // We will listen to all 'processing' jobs
    const q = query(
      collection(db, 'processing_jobs'),
      where('status', '==', 'processing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeJobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProcessingJob));
      setJobs(activeJobs);
      
      // Auto-maximize if there are new active jobs
      if (activeJobs.length > 0) {
        setMinimized(false);
      }
    });

    return () => unsubscribe();
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
