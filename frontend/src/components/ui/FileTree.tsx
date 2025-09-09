'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  useListVfsNodes,
  useCreateVfsNode,
  useRenameVfsNode,
  useDeleteVfsNode,
  VfsNode,
} from '@/hooks/api';
import { useIdeStore } from '@/store/ideStore';
import clsx from 'clsx';
import {
  FilePlusIcon,
  PlusCircledIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import * as ContextMenu from '@radix-ui/react-context-menu';

// Helper component for inline editing (create/rename)
const InlineInput = ({
  defaultValue,
  onConfirm,
  onCancel,
}: {
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false); // Ref to prevent double submission

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    if (submittedRef.current) return;
    if (value.trim()) {
      submittedRef.current = true;
      onConfirm(value.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSubmit} // Use the same handler for blur
      className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none"
    />
  );
};

const NodeRenderer = ({
  node,
  projectId,
  level,
  onNodeSelect,
}: {
  node: VfsNode;
  projectId: string;
  level: number;
  onNodeSelect: (node: VfsNode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: childrenData, isLoading } = useListVfsNodes(projectId, node.id, {
    enabled: isOpen,
  });

  const addOpenFile = useIdeStore((state) => state.addOpenFile);
  const activeFile = useIdeStore((state) => state.activeFile);
  const isActive = activeFile === node.id;

  const handleNodeClick = () => {
    onNodeSelect(node);
    if (node.nodeType === 'DIRECTORY') {
      setIsOpen(!isOpen);
    } else {
      addOpenFile(node.id);
    }
  };

  return (
    <>
      <div
        onClick={handleNodeClick}
        className={clsx(
          'cursor-pointer flex items-center px-2 py-1 rounded text-sm',
          isActive ? 'bg-blue-100' : 'hover:bg-gray-100',
        )}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {node.nodeType === 'DIRECTORY' && (
          <span className="mr-1">{isOpen ? '▾' : '▸'}</span>
        )}
        <span>{node.name}</span>
      </div>
      {isOpen && (
        <div>
          {isLoading && (
            <div
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
              className="px-2 py-1 text-gray-400"
            >
              ...
            </div>
          )}
          {childrenData?.nodes.map((childNode) => (
            <ContextMenuWrapper
              key={childNode.id}
              node={childNode}
              projectId={projectId}
              level={level + 1}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      )}
    </>
  );
};

const ContextMenuWrapper = ({
  node,
  projectId,
  level,
  onNodeSelect,
}: {
  node: VfsNode;
  projectId: string;
  level: number;
  onNodeSelect: (node: VfsNode) => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const { mutate: renameNode } = useRenameVfsNode();
  const { mutate: deleteNode } = useDeleteVfsNode();

  const handleRename = (newName: string) => {
    renameNode(
      { projectId, nodeId: node.id, name: newName },
      { onSuccess: () => setIsRenaming(false) },
    );
  };

  const handleDelete = () => {
    if (window.confirm(`'${node.name}'을(를) 정말 삭제하시겠습니까?`)) {
      deleteNode({ projectId, nodeId: node.id, parentId: node.parentId });
    }
  };

  if (isRenaming) {
    return (
      <div style={{ paddingLeft: `${level * 16}px` }} className="px-2 py-1">
        <InlineInput
          defaultValue={node.name}
          onConfirm={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
      </div>
    );
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <NodeRenderer
          node={node}
          projectId={projectId}
          level={level}
          onNodeSelect={onNodeSelect}
        />
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="bg-white shadow-lg rounded-md py-1.5 text-sm w-40 z-10">
          <ContextMenu.Item
            onClick={() => setIsRenaming(true)}
            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 outline-none"
          >
            <Pencil1Icon /> 이름 변경
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 cursor-pointer hover:bg-red-50 outline-none"
          >
            <TrashIcon /> 삭제
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export const FileTree = ({ projectId }: { projectId: string }) => {
  const { data, isLoading, isError } = useListVfsNodes(projectId, null);
  const [selectedNode, setSelectedNode] = useState<VfsNode | null>(null);
  const [creatingType, setCreatingType] = useState<'FILE' | 'DIRECTORY' | null>(
    null,
  );
  const { mutate: createNode } = useCreateVfsNode();

  const handleCreate = (name: string) => {
    if (!creatingType) return;
    const parentId =
      selectedNode?.nodeType === 'DIRECTORY'
        ? selectedNode.id
        : selectedNode?.parentId ?? null;
    createNode(
      { projectId, parentId, name, nodeType: creatingType },
      { onSuccess: () => setCreatingType(null) },
    );
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 px-2 mb-2">
        <button
          onClick={() => setCreatingType('FILE')}
          className="p-1 text-gray-500 hover:text-gray-800"
          title="새 파일"
        >
          <FilePlusIcon />
        </button>
        <button
          onClick={() => setCreatingType('DIRECTORY')}
          className="p-1 text-gray-500 hover:text-gray-800"
          title="새 폴더"
        >
          <PlusCircledIcon />
        </button>
      </div>

      {isLoading && <div className="text-sm text-gray-500">파일 트리 로딩 중...</div>}
      {isError && <div className="text-sm text-red-500">오류 발생</div>}

      {creatingType && (
        <div className="px-2 py-1">
          <InlineInput
            defaultValue=""
            onConfirm={handleCreate}
            onCancel={() => setCreatingType(null)}
          />
        </div>
      )}

      {data?.nodes.map((node) => (
        <ContextMenuWrapper
          key={node.id}
          node={node}
          projectId={projectId}
          level={1}
          onNodeSelect={setSelectedNode}
        />
      ))}
    </div>
  );
};
