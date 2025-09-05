'use client';

import React, { useState } from 'react';
import { useListVfsNodes } from '@/hooks/api';
import { useIdeStore } from '@/store/ideStore';
import clsx from 'clsx';

interface FileTreeProps {
  projectId: string;
  parentId?: string | null;
  level?: number;
}

const DirectoryNode = ({
  node,
  projectId,
  level,
}: {
  node: any;
  projectId: string;
  level: number;
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
    <div className="text-sm text-gray-700">
      <div
        onClick={handleToggle}
        className="cursor-pointer flex items-center px-2 py-1 rounded hover:bg-gray-200/80"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <span className={isOpen ? 'font-semibold' : ''}>{node.name}</span>
      </div>
      {isOpen && (
        <div>
          {isLoading && <div style={{ paddingLeft: `${(level + 1) * 16}px` }} className="px-2 py-1 text-gray-500">...</div>}
          {isError && <div style={{ paddingLeft: `${(level + 1) * 16}px` }} className="px-2 py-1 text-red-500">Error</div>}
          {childrenData?.nodes.map((childNode) => (
            <Node
              key={childNode.id}
              node={childNode}
              projectId={projectId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileNode = ({
  node,
  level,
}: {
  node: any;
  level: number;
}) => {
  const addOpenFile = useIdeStore((state) => state.addOpenFile);
  const activeFile = useIdeStore((state) => state.activeFile);

  const isActive = activeFile === node.id;

  return (
    <div className="text-sm text-gray-700">
      <div
        onClick={() => addOpenFile(node.id)}
        className={clsx(
          "cursor-pointer flex items-center px-2 py-1 rounded hover:bg-gray-200/80",
          isActive && "bg-blue-100/80"
        )}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <span>{node.name}</span>
      </div>
    </div>
  );
};

const Node = ({
  node,
  projectId,
  level,
}: {
  node: any;
  projectId: string;
  level: number;
}) => {
  if (node.nodeType === 'DIRECTORY') {
    return (
      <DirectoryNode
        node={node}
        projectId={projectId}
        level={level}
      />
    );
  }
  return <FileNode node={node} level={level} />;
};

export const FileTree = ({ projectId }: { projectId: string }) => {
  const { data, isLoading, isError, error } = useListVfsNodes(projectId, null); // Fetch root nodes

  if (isLoading) {
    return <div className="p-2 text-sm text-gray-500">Loading file tree...</div>;
  }

  if (isError) {
    return <div className="p-2 text-sm text-red-500">Error: {error.message}</div>;
  }

  if (!data?.nodes || data.nodes.length === 0) {
    return <div className="p-2 text-sm text-gray-500">No files or directories.</div>;
  }

  return (
    <div className="p-2">
      {data.nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          projectId={projectId}
          level={1}
        />
      ))}
    </div>
  );
};