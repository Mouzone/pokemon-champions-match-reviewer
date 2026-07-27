import React from 'react';

export default function UploadMatch() {
  return (
    <>
      <div className="modal-header">
        <h2>Automated Upload Setup</h2>
      </div>
      <div className="modal-body" style={{ lineHeight: '1.6' }}>
        <p style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          We've completely overhauled how you upload matches. You no longer need to manually copy YouTube links or fill out forms here. Everything is now automated directly from your iPhone!
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>How to Set Up the iOS Shortcut</h3>
        
        <ol style={{ marginLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li>
            <strong>Open the Shortcuts app</strong> on your iPhone and create a new Shortcut.
          </li>
          <li>
            <strong>Add Action: Select Photos</strong> - Configure it to only include "Videos".
          </li>
          <li>
            <strong>Add Action: Encode Media</strong> - Set it to resize the video to 720p with HEVC turned on (this shrinks the 1GB video to a manageable size).
          </li>
          <li>
            <strong>Add Action: Get Contents of URL</strong> - This is the magic step. Set the URL to your Supabase Edge Function endpoint: 
            <br />
            <code style={{ background: 'var(--bg-surface)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.9em', display: 'inline-block', marginTop: '0.5rem' }}>
              https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-match
            </code>
          </li>
          <li>
            <strong>Configure the URL Action:</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Change Method to <strong>POST</strong></li>
              <li>Add Header: <code>Authorization</code> = <code>Bearer YOUR_SUPABASE_ANON_KEY</code></li>
              <li>Add Request Body: Set it to "Form" or "JSON" passing the <strong>Encoded Media</strong> and your chosen Team ID.</li>
            </ul>
          </li>
        </ol>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderLeft: '4px solid var(--primary)', borderRadius: '0 4px 4px 0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>How it works under the hood</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            When you run the shortcut, it instantly compresses your screen recording and sends it to your Supabase server. Our custom Edge Function then analyzes the video with Gemini AI, automatically uploads it to your YouTube channel, and saves all the match details into your database without you having to lift a finger.
          </p>
        </div>
      </div>
    </>
  );
}
