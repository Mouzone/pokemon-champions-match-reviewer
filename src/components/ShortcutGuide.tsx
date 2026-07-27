

export function ShortcutGuide() {
  return (
    <>
      <div className="modal-header">
        <h2>Automated Upload Setup</h2>
      </div>
      <div className="modal-body" style={{ lineHeight: '1.6' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How to Set Up the iOS Shortcut</h3>
        
        <ol style={{ marginLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li><strong>Create a new Shortcut</strong> in the Shortcuts app.</li>
          <li><strong>Add Action: Select Photos</strong> (Configure to include only "Videos").</li>
          <li><strong>Add Action: Encode Media</strong> (Resize to 720p, HEVC).</li>
          <li>
            <strong>Add Action: Get Contents of URL</strong> with your endpoint:
            <br />
            <code style={{ background: 'var(--bg-surface)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.9em', display: 'inline-block', marginTop: '0.5rem' }}>
              https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-match
            </code>
          </li>
          <li>
            <strong>Configure the URL Action:</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Method: <strong>POST</strong></li>
              <li>Header: <code>Authorization</code> = <code>Bearer YOUR_SUPABASE_ANON_KEY</code></li>
              <li>Request Body: <strong>Form</strong> (pass the <strong>Encoded Media</strong>).</li>
            </ul>
          </li>
          <li>
            <strong>Add Action: Show Result</strong> (Optional) - Pass it the "Contents of URL" to verify the upload response.
          </li>
        </ol>
      </div>
    </>
  );
}
