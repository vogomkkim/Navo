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
  ArchiveIcon,
  FileIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { toast } from 'sonner';

// --- Helper Components ---

const InlineInput = ({
  defaultValue = '',
  onConfirm,
  onCancel,
  icon,
}: {
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    else if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex items-center w-full py-0.5">
      {icon && <span className="mr-1">{icon}</span>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        className="w-full px-1 text-sm bg-transparent border border-blue-500 rounded focus:outline-none"
      />
    </div>
  );
};

// --- Main Components ---

type EditingState =
  | {
      id: string;
      type: 'rename';
    }
  | {
      id: string; // parentId for creation
      type: 'createFile' | 'createDirectory';
    };

const Node = ({
  node,
  projectId,
  level,
  editingState,
  setEditingState,
  forceOpen,
}: {
  node: VfsNode;
  projectId: string;
  level: number;
  editingState: EditingState | null;
  setEditingState: (state: EditingState | null) => void;
  forceOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(!!forceOpen);
  const { data, isLoading } = useListVfsNodes(projectId, node.id, {
    enabled: !!(isOpen || forceOpen),
  });

  const {
    addOpenFile,
    activeFile,
    setActiveFile,
    upsertManyNodeMeta,
    treeLabelMode,
    nodesById,
  } = useIdeStore();
  const isActive = activeFile === node.id;

  const { mutate: renameNode, isPending: isRenaming } = useRenameVfsNode();
  const { mutate: deleteNode } = useDeleteVfsNode();
  const { mutate: createNode, isPending: isCreating } = useCreateVfsNode();

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const handleNodeClick = () => {
    if (node.nodeType === 'DIRECTORY') {
      if (!forceOpen) {
        setIsOpen(!isOpen);
      }
      return; // do not open editor or set active file for directories
    }
    // FILE: open in editor tab
    setActiveFile(node.id);
    addOpenFile(node.id);
  };

  const handleRename = (newName: string) => {
    if (newName === node.name) {
      setEditingState(null);
      return;
    }
    renameNode(
      { projectId, nodeId: node.id, name: newName, parentId: node.parentId },
      {
        onSuccess: () => {
          toast.success(
            `'${node.name}'의 이름을 '${newName}'(으)로 변경했습니다.`
          );
          setEditingState(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm(`'${node.name}'을(를) 정말 삭제하시겠습니까?`)) {
      deleteNode(
        { projectId, nodeId: node.id, parentId: node.parentId },
        {
          onSuccess: () => toast.success(`'${node.name}'을(를) 삭제했습니다.`),
          onError: (error) => toast.error(error.message),
        }
      );
    }
  };

  const handleCreate = (name: string) => {
    if (!editingState || editingState.type === 'rename') return;
    createNode(
      {
        projectId,
        parentId: node.id,
        name,
        nodeType: editingState.type === 'createFile' ? 'FILE' : 'DIRECTORY',
      },
      {
        onSuccess: () => {
          toast.success(`'${name}'을(를) 생성했습니다.`);
          setEditingState(null);
          setIsOpen(true);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const isEditingThisNode =
    editingState?.type === 'rename' && editingState.id === node.id;
  const isCreatingInThisNode =
    editingState?.id === node.id && editingState.type !== 'rename';

  // Cache children meta when they load
  useEffect(() => {
    if (data?.nodes && data.nodes.length > 0) {
      upsertManyNodeMeta(
        data.nodes.map((n: any) => ({
          id: n.id,
          name: n.name,
          path: n.metadata?.path,
        }))
      );
    }
  }, [data, upsertManyNodeMeta]);

  if (isEditingThisNode) {
    return (
      <div style={{ paddingLeft: `${level * 16}px` }} className="px-2 py-1">
        <InlineInput
          defaultValue={node.name}
          onConfirm={handleRename}
          onCancel={() => setEditingState(null)}
          icon={node.nodeType === 'DIRECTORY' ? <ArchiveIcon /> : <FileIcon />}
        />
      </div>
    );
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          onClick={handleNodeClick}
          onMouseDown={(e) => {
            // Prevent text selection/drag on mouse interactions
            e.preventDefault();
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          className={clsx(
            'cursor-pointer flex items-center px-2 py-1 rounded text-sm whitespace-nowrap',
            isActive
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          {node.nodeType === 'DIRECTORY' ? (
            <>
              {isOpen ? (
                <ChevronDownIcon className="mr-1" />
              ) : (
                <ChevronRightIcon className="mr-1" />
              )}
              <ArchiveIcon className="mr-1 text-yellow-600" />
            </>
          ) : (
            <FileIcon className="mr-1 text-gray-500" />
          )}
          <span className="select-none">
            {treeLabelMode === 'filename'
              ? node.name
              : nodesById[node.id]?.displayNames?.ko ||
                nodesById[node.id]?.name ||
                node.name}
          </span>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-1.5 text-sm w-48 z-10 border dark:border-gray-700">
          {node.nodeType === 'DIRECTORY' && (
            <>
              <ContextMenu.Item
                onClick={() =>
                  setEditingState({ id: node.id, type: 'createFile' })
                }
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none"
              >
                <FilePlusIcon /> 새 파일
              </ContextMenu.Item>
              <ContextMenu.Item
                onClick={() =>
                  setEditingState({ id: node.id, type: 'createDirectory' })
                }
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none"
              >
                <PlusCircledIcon /> 새 폴더
              </ContextMenu.Item>
              <ContextMenu.Separator className="h-px my-1 bg-gray-200 dark:bg-gray-700" />
            </>
          )}
          <ContextMenu.Item
            onClick={() => setEditingState({ id: node.id, type: 'rename' })}
            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none"
          >
            <Pencil1Icon /> 이름 변경
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/50 outline-none"
          >
            <TrashIcon /> 삭제
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>

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
          {data?.nodes.map((childNode) => (
            <Node
              key={childNode.id}
              node={childNode}
              projectId={projectId}
              level={level + 1}
              editingState={editingState}
              setEditingState={setEditingState}
            />
          ))}
          {isCreatingInThisNode && (
            <div
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
              className="px-2 py-1"
            >
              <InlineInput
                onConfirm={handleCreate}
                onCancel={() => setEditingState(null)}
                icon={
                  editingState.type === 'createFile' ? (
                    <FileIcon />
                  ) : (
                    <ArchiveIcon />
                  )
                }
              />
            </div>
          )}
        </div>
      )}
    </ContextMenu.Root>
  );
};

export const FileTree = ({ projectId }: { projectId: string }) => {
  const { data, isLoading, isError } = useListVfsNodes(projectId, null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const { upsertManyNodeMeta, treeLabelMode, setTreeLabelMode } = useIdeStore();
  const { mutate: createNode, isPending: isCreating } = useCreateVfsNode();

  const handleCreateRoot = (name: string) => {
    if (!editingState || editingState.type === 'rename') return;
    createNode(
      {
        projectId,
        parentId: null,
        name,
        nodeType: editingState.type === 'createFile' ? 'FILE' : 'DIRECTORY',
      },
      {
        onSuccess: () => {
          toast.success(`'${name}'을(를) 최상위에 생성했습니다.`);
          setEditingState(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="p-2" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex items-center gap-2 px-2 mb-2">
        <button
          onClick={() => setEditingState({ id: 'root', type: 'createFile' })}
          className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          title="새 파일 (최상위)"
          disabled={isCreating}
        >
          <FilePlusIcon />
        </button>
        <button
          onClick={() =>
            setEditingState({ id: 'root', type: 'createDirectory' })
          }
          className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          title="새 폴더 (최상위)"
          disabled={isCreating}
        >
          <PlusCircledIcon />
        </button>

        <div className="ml-auto inline-flex items-center rounded-md border border-gray-300 overflow-hidden bg-white">
          <button
            className={`px-2 py-1 text-xs ${
              treeLabelMode === 'name'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setTreeLabelMode('name')}
            title="이름으로 보기"
          >
            이름
          </button>
          <button
            className={`px-2 py-1 text-xs border-l border-gray-300 ${
              treeLabelMode === 'filename'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setTreeLabelMode('filename')}
            title="파일명으로 보기"
          >
            파일명
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">파일 트리 로딩 중...</div>
      )}
      {isError && (
        <div className="text-sm text-red-500">오류가 발생했습니다.</div>
      )}

      {editingState?.id === 'root' && (
        <div className="px-2 py-1">
          <InlineInput
            onConfirm={handleCreateRoot}
            onCancel={() => setEditingState(null)}
            icon={
              editingState.type === 'createFile' ? (
                <FileIcon />
              ) : (
                <ArchiveIcon />
              )
            }
          />
        </div>
      )}

      {data?.nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          projectId={projectId}
          level={1}
          editingState={editingState}
          setEditingState={setEditingState}
          forceOpen={node.nodeType === 'DIRECTORY'}
        />
      ))}
    </div>
  );
};
