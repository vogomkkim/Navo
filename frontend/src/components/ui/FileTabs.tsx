'use client';

import React from 'react';
import { useIdeStore } from '@/store/ideStore';

export const FileTabs = () => {
  const { openFiles, activeFile, setActiveFile, closeOpenFile } = useIdeStore();

  if (openFiles.length === 0) {
    return null; // Don't render anything if no files are open
  }

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '5px' }}>
      {openFiles.map((filePath) => (
        <div
          key={filePath}
          onClick={() => setActiveFile(filePath)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderBottom: 'none',
            marginRight: '4px',
            backgroundColor: activeFile === filePath ? '#eee' : 'transparent',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>{filePath.split('/').pop()}</span> {/* Show only the file name */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent setActiveFile from being called
              closeOpenFile(filePath);
            }}
            style={{
              marginLeft: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0 4px'
            }}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
};
