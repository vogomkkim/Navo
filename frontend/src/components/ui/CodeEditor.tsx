'use client';

import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  content: string | null;
  language?: string;
  onChange?: (value: string | undefined) => void;
}

export const CodeEditor = ({
  content,
  language = 'typescript',
  onChange,
}: CodeEditorProps) => {
  if (content === null) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#888',
        }}
      >
        Select a file to view its content.
      </div>
    );
  }

  return (
    <Editor
      height="80vh"
      language={language}
      value={content}
      theme="vs-dark"
      onChange={onChange}
      options={{
        readOnly: false,
        minimap: { enabled: true },
        fontSize: 14,
      }}
    />
  );
};
