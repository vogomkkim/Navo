'use client';

import React, { useState } from 'react';
import { useListVfsNodes, VfsNode } from '@/lib/api';

// Define icons for file and directory
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

interface FileTreeProps {
  projectId: string;
  onFileSelect: (nodeId: string) => void;
}

const DirectoryNode = ({
  node,
  projectId,
  onFileSelect,
}: {
  node: VfsNode;
  projectId: string;
  onFileSelect: (nodeId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: childrenData,
    isLoading,
    isError,
  } = useListVfsNodes(projectId, node.id, {
    enabled: isOpen, // Only fetch children when the directory is open
  });

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <div
        onClick={handleToggle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <FolderIcon />
        <span style={{ marginLeft: '4px' }}>{node.name}</span>
      </div>
      {isOpen && (
        <div style={{ marginLeft: '20px' }}>
          {isLoading && <div>Loading...</div>}
          {isError && <div>Error loading directory.</div>}
          {childrenData?.nodes.map((childNode) => (
            <Node
              key={childNode.id}
              node={childNode}
              projectId={projectId}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileNode = ({
  node,
  onFileSelect,
}: {
  node: VfsNode;
  onFileSelect: (nodeId: string) => void;
}) => {
  return (
    <div
      onClick={() => onFileSelect(node.id)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <FileIcon />
      <span style={{ marginLeft: '4px' }}>{node.name}</span>
    </div>
  );
};

const Node = ({
  node,
  projectId,
  onFileSelect,
}: {
  node: VfsNode;
  projectId: string;
  onFileSelect: (nodeId: string) => void;
}) => {
  if (node.nodeType === 'DIRECTORY') {
    return (
      <DirectoryNode
        node={node}
        projectId={projectId}
        onFileSelect={onFileSelect}
      />
    );
  }
  return <FileNode node={node} onFileSelect={onFileSelect} />;
};

export const FileTree = ({ projectId, onFileSelect }: FileTreeProps) => {
  const { data, isLoading, isError, error } = useListVfsNodes(projectId, null); // Fetch root nodes

  if (isLoading) {
    return <div>Loading file tree...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  if (!data?.nodes || data.nodes.length === 0) {
    return <div>No files or directories found.</div>;
  }

  return (
    <div>
      {data.nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          projectId={projectId}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
};
