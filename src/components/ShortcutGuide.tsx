import { useState } from 'react';
import { auth } from '../lib/firebase';

const STORAGE_BUCKET = 'matchreviewer-automation.firebasestorage.app';
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY';

function CopyableCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', margin: '0.5rem 0' }}>
      <code
        style={{
          wordBreak: 'break-all',
          display: 'block',
          padding: '0.5rem 2.5rem 0.5rem 0.5rem',
          backgroundColor: 'var(--bg-surface-hover)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82em',
          lineHeight: 1.5,
        }}
      >
        {children}
      </code>
      <button
        onClick={handleCopy}
        title="Copy"
        style={{
          position: 'absolute',
          top: '0.3rem',
          right: '0.3rem',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          padding: '0.15rem 0.35rem',
          fontSize: '0.7rem',
          color: copied ? 'var(--primary)' : 'var(--text-muted)',
          transition: 'color 0.2s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function ShortcutGuide() {
  const uid = auth.currentUser?.uid ?? 'YOUR_USER_ID';
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=videos%2F${uid}%2F`;

  const tabStyle = (tab: 'ios' | 'android'): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
    background: 'transparent',
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <>
      <div className="modal-header">
        <h2>Automated Upload Setup</h2>
      </div>
      <div className="modal-body" style={{ lineHeight: '1.6' }}>

        {/* UID Banner */}
        <div style={{
          background: 'var(--bg-surface-hover)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
            Your User ID (used in all URLs below)
          </span>
          <CopyableCode>{uid}</CopyableCode>
          {uid === 'YOUR_USER_ID' && (
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem', margin: 0 }}>
              ⚠️ Sign in first — your real User ID will appear here.
            </p>
          )}
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <button style={tabStyle('ios')} onClick={() => setActiveTab('ios')}>📱 iPhone (iOS Shortcuts)</button>
          <button style={tabStyle('android')} onClick={() => setActiveTab('android')}>🤖 Pixel 10 Pro (Android)</button>
        </div>

        {/* ── iOS SECTION ── */}
        {activeTab === 'ios' && (
          <>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Create a Shortcut that compresses your screen recording and uploads it automatically. Run it right after a match.
            </p>
            <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li>
                Open the <strong>Shortcuts</strong> app on your iPhone and tap <strong>+</strong> to create a new shortcut.
              </li>
              <li>
                Add Action: <strong>Select Photos</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Tap the arrow → set <em>Include</em> to <em>Videos Only</em></span>
              </li>
              <li>
                Add Action: <strong>Encode Media</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Tap the arrow → set <em>Size</em> to <em>720p</em>, enable <em>HEVC</em> to reduce file size.</span>
              </li>
              <li>
                Add Action: <strong>Current Date</strong> → then <strong>Format Date</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Set Date Format to <em>Custom</em> and type: <code>yyyy-MM-dd_HH-mm-ss</code></span>
              </li>

              <li>
                <strong>Authenticate — Add Action: URL</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Paste this URL exactly:</span>
                <CopyableCode>{authUrl}</CopyableCode>
              </li>
              <li>
                Add Action: <strong>Get Contents of URL</strong> — configure it:
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                  <li><strong>Method:</strong> POST</li>
                  <li><strong>Request Body:</strong> JSON</li>
                  <li>Add field → Text → Key: <code>email</code>, Value: your login email</li>
                  <li>Add field → Text → Key: <code>password</code>, Value: your login password</li>
                  <li>Add field → Boolean → Key: <code>returnSecureToken</code>, Value: <code>True</code></li>
                </ul>
              </li>
              <li>
                Add Action: <strong>Get Dictionary Value</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Get <code>Value</code> for Key <code>idToken</code> in <code>Contents of URL</code></span>
              </li>

              <li>
                <strong>Upload — Add Action: URL</strong><br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                  Paste the base storage URL below, then append the <em>Formatted Date</em> variable (tap to insert it) followed by <code>.mp4</code>:
                </span>
                <CopyableCode>{`${storageUrl}Match_[Formatted Date].mp4`}</CopyableCode>
                <span style={{ fontSize: '0.82em', opacity: 0.7 }}>
                  The <code>{uid}</code> part is your account's personal folder — videos from other users never appear in your library.
                </span>
              </li>
              <li>
                Add Action: <strong>Get Contents of URL</strong> — configure it:
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                  <li><strong>Method:</strong> POST</li>
                  <li><strong>Headers:</strong>
                    <ul style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
                      <li>Key: <code>Content-Type</code> → <code>video/mp4</code></li>
                      <li>Key: <code>Authorization</code> → <code>Bearer [Dictionary Value]</code> (select the variable from step 7)</li>
                    </ul>
                  </li>
                  <li><strong>Request Body:</strong> File → select the <em>Encoded Media</em> variable</li>
                </ul>
              </li>
              <li>
                <strong>Done!</strong> Run the shortcut after a match — it compresses your recording and uploads it to your private library. AI analysis starts automatically.
              </li>
            </ol>
          </>
        )}

        {/* ── ANDROID SECTION ── */}
        {activeTab === 'android' && (
          <>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Use the free <strong>HTTP Shortcuts</strong> app (Google Play) to create a one-tap upload button that authenticates and uploads your screen recordings.
            </p>

            <h4 style={{ marginBottom: '0.5rem' }}>Step 1 — Install HTTP Shortcuts</h4>
            <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <li>
                Install <strong>HTTP Shortcuts</strong> from the Google Play Store (free, no ads).
              </li>
              <li>
                Open the app and tap <strong>+</strong> → <strong>Regular Shortcut</strong>.
              </li>
            </ol>

            <h4 style={{ marginBottom: '0.5rem' }}>Step 2 — Create the Auth Shortcut (run once to get a token)</h4>
            <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <li>
                Name it <em>"Get Auth Token"</em>. Set:
                <ul style={{ marginLeft: '1rem', marginTop: '0.25rem', fontSize: '0.9em' }}>
                  <li><strong>Method:</strong> POST</li>
                  <li><strong>URL:</strong><CopyableCode>{authUrl}</CopyableCode></li>
                  <li><strong>Request Body:</strong> JSON</li>
                  <li>Add field → <code>email</code>: your login email</li>
                  <li>Add field → <code>password</code>: your login password</li>
                  <li>Add field → <code>returnSecureToken</code>: <code>true</code></li>
                </ul>
              </li>
              <li>
                Under <strong>Response Handling</strong> → <strong>Store Response</strong>, add a variable:<br />
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Variable name: <code>id_token</code>, JSONPath: <code>$.idToken</code></span>
              </li>
              <li>Save and run it once to store your token. Tokens last ~1 hour — re-run if uploads start failing.</li>
            </ol>

            <h4 style={{ marginBottom: '0.5rem' }}>Step 3 — Create the Upload Shortcut</h4>
            <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <li>
                Create a new <strong>Regular Shortcut</strong>, name it <em>"Upload Match"</em>. Set:
                <ul style={{ marginLeft: '1rem', marginTop: '0.25rem', fontSize: '0.9em' }}>
                  <li><strong>Method:</strong> POST</li>
                  <li>
                    <strong>URL</strong> (your personal upload path):
                    <CopyableCode>{`${storageUrl}Match_{{timestamp}}.mp4`}</CopyableCode>
                    <span style={{ fontSize: '0.82em', opacity: 0.7 }}>The <code>{uid}</code> folder is your private library — no other users can see it.</span>
                  </li>
                </ul>
              </li>
              <li>
                Under <strong>Headers</strong>, add:
                <ul style={{ marginLeft: '1rem', marginTop: '0.25rem', fontSize: '0.9em' }}>
                  <li><code>Content-Type</code>: <code>video/mp4</code></li>
                  <li><code>Authorization</code>: <code>Bearer {'{id_token}'}</code></li>
                </ul>
              </li>
              <li>
                Under <strong>Request Body</strong> → select <strong>File</strong> → enable <em>"Pick file on execution"</em>.
              </li>
              <li>Save the shortcut.</li>
            </ol>

            <h4 style={{ marginBottom: '0.5rem' }}>Step 4 — Record & Upload on Pixel 10 Pro</h4>
            <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <li>
                Record your match using the built-in <strong>Screen Recorder</strong> (swipe down quick tiles → Screen Record). Stop recording when done — the file saves to <em>Movies/Screen recordings</em>.
              </li>
              <li>
                Optional compression: open the video in <strong>Google Photos</strong> → tap <strong>Share</strong> → share to <strong>Files</strong> app, then use a free app like <strong>Video Compress</strong> (Play Store) to shrink it before uploading.
              </li>
              <li>
                Open <strong>HTTP Shortcuts</strong>, tap <em>"Upload Match"</em>, pick your recording from Files, and tap Send. AI analysis starts automatically once uploaded.
              </li>
              <li>
                <strong>Home screen shortcut tip:</strong> Long-press <em>"Upload Match"</em> in the app → <em>Place on Home Screen</em> for one-tap access.
              </li>
            </ol>

            <div style={{
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}>
              💡 <strong>Tip:</strong> The Pixel 10 Pro's screen recorder captures at up to 1080p. For faster uploads over cellular, compress to 720p first using <strong>Video Compress</strong> on the Play Store.
            </div>
          </>
        )}
      </div>
    </>
  );
}
