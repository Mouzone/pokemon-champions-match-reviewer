

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
            <strong>Add Action: Firebase Upload</strong> or use the <strong>Firebase REST API</strong> to upload the encoded video directly to your Firebase Storage bucket (e.g. <code>matchreviewer-automation.firebasestorage.app</code>).
            <br />
            <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Note: You can use the "Upload File" action if using a third-party app that integrates with Firebase, or send a PUT request to the Firebase Storage REST API with the encoded video.</span>
          </li>
          <li>
            <strong>That's it!</strong> The Cloud Function will automatically trigger when the upload completes and start analyzing the match with Vertex AI.
          </li>
        </ol>
      </div>
    </>
  );
}
