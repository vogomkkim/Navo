'use client';

import React, { useState } from 'react';
import { useListVfsNodes } from '@/lib/api';
import { useIdeStore } from '@/store/ideStore';

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
}

const DirectoryNode = ({
  node,
  projectId,
}: {
  node: any;
  projectId: string;
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
          {isLoading && <div>불러오는 중...</div>}
          {isError && <div>디렉토리를 불러오는 중 오류가 발생했습니다.</div>}
          {childrenData?.nodes.map((childNode) => (
            <Node
              key={childNode.id}
              node={childNode}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileNode = ({
  node,
}: {
  node: any;
}) => {
  const addOpenFile = useIdeStore((state) => state.addOpenFile);

  return (
    <div
      onClick={() => addOpenFile(node.id)} // Use store action on click
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
}: {
  node: any;
  projectId: string;
}) => {
  if (node.nodeType === 'DIRECTORY') {
    return (
      <DirectoryNode
        node={node}
        projectId={projectId}
      />
    );
  }
  return <FileNode node={node} />;
};

export const FileTree = ({ projectId }: FileTreeProps) => {
  const { data, isLoading, isError, error } = useListVfsNodes(projectId, null); // Fetch root nodes

  if (isLoading) {
    return <div>파일 트리를 불러오는 중...</div>;
  }

  if (isError) {
    return <div>오류: {error.message}</div>;
  }

  if (!data?.nodes || data.nodes.length === 0) {
    return <div>파일이나 디렉토리가 없습니다.</div>;
  }

  return (
    <div>
      {data.nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          projectId={projectId}
        />
      ))}
    </div>
  );
};
