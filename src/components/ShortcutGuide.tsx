

export function ShortcutGuide() {
  return (
    <>
      <div className="modal-header">
        <h2>Automated Upload Setup</h2>
      </div>
      <div className="modal-body" style={{ lineHeight: '1.6' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>How to Set Up the iOS Shortcut</h3>
        
        <ol style={{ marginLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li>Open the <strong>Shortcuts</strong> app on your iPhone and tap <strong>+</strong> to create a new shortcut.</li>
          <li>Add Action: <strong>Select Photos</strong><br/><span style={{ fontSize: '0.9em', opacity: 0.8 }}>(Tap the arrow next to it, set <em>Include</em> to <em>Videos Only</em>)</span></li>
          <li>Add Action: <strong>Encode Media</strong><br/><span style={{ fontSize: '0.9em', opacity: 0.8 }}>(Tap the arrow next to it, set <em>Size</em> to <em>720p</em> and turn on <em>HEVC</em> to save bandwidth)</span></li>
          <li>Add Action: <strong>Current Date</strong></li>
          <li>Add Action: <strong>Format Date</strong><br/><span style={{ fontSize: '0.9em', opacity: 0.8 }}>(Set Date Format to <em>Custom</em> and type: <code>yyyy-MM-dd_HH-mm-ss</code>)</span></li>
          <li>Add Action: <strong>URL</strong><br/>
              <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Paste this exact URL, inserting the <em>Formatted Date</em> variable at the end:</span><br/>
              <code style={{ wordBreak: 'break-all', display: 'block', margin: '0.5rem 0', padding: '0.5rem', backgroundColor: 'var(--bg-surface-hover)' }}>
                https://firebasestorage.googleapis.com/v0/b/pokemon-champions-match-reviewer.firebasestorage.app/o?name=videos/Match_[Formatted Date].mp4
              </code>
          </li>
          <li>Add Action: <strong>Get Contents of URL</strong><br/>
              <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Tap the arrow to configure the request:</span>
              <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Headers:</strong> Add new header. Key: <code>Content-Type</code>, Text: <code>video/mp4</code></li>
                <li><strong>Request Body:</strong> File</li>
                <li><strong>File:</strong> Tap and select the <em>Encoded Media</em> variable</li>
              </ul>
          </li>
          <li><strong>Done!</strong> When you run this shortcut, it will compress your video and push it directly to your backend. Vertex AI will automatically trigger to analyze it!</li>
        </ol>
      </div>
    </>
  );
}
