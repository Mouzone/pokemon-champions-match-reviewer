import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', minWidth: 0 }}>
      <div style={{ 
        flex: 1, 
        border: '1px solid var(--border-color)', 
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
        display: 'flex',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <button 
          onClick={() => setIsPreview(!isPreview)}
          style={{ 
            position: 'absolute', 
            top: '0.25rem', 
            right: '0.25rem', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '0.25rem',
            zIndex: 10,
            opacity: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}
          title={isPreview ? "Edit text" : "Preview markdown"}
        >
          {isPreview ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>

        {!isPreview ? (
          <textarea 
            className="markdown-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none',
              resize: 'none',
              padding: '1rem',
              paddingRight: '2.5rem',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        ) : (
          <div className="markdown-editor-preview" style={{ 
            padding: '1rem', 
            paddingRight: '2.5rem',
            height: '100%', 
            overflowY: 'auto',
            backgroundColor: 'white'
          }}>  <ReactMarkdown>{value || '*No content*'}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
