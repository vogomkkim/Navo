'use client';

import React from 'react';
import { useIdeStore } from '@/store/ideStore';
import { Cross2Icon } from '@radix-ui/react-icons';

export const FileTabs = () => {
  const { openFiles, activeFile, setActiveFile, closeOpenFile, nodesById } =
    useIdeStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="w-full border-b border-gray-200 bg-white">
      <div className="flex items-center overflow-x-auto overscroll-x-contain no-scrollbar py-1 gap-1">
        {openFiles.map((filePath) => {
          const label =
            nodesById?.[filePath]?.displayNames?.ko ??
            nodesById?.[filePath]?.displayNames?.en ??
            nodesById?.[filePath]?.name ??
            filePath.split('/').pop();
          const isActive = activeFile === filePath;
          return (
            <button
              key={filePath}
              onClick={() => setActiveFile(filePath)}
              className={
                `group inline-flex items-center max-w-xs px-3 py-1.5 rounded-md border transition-colors ` +
                (isActive
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
              }
              title={String(label)}
            >
              <span className="truncate text-sm">{label}</span>
              <span className="hidden group-hover:inline-block mx-0 group-hover:mx-2 h-4 w-px bg-gray-200 transition-all" />
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeOpenFile(filePath);
                }}
                className="hidden group-hover:inline-flex items-center justify-center ml-0 group-hover:ml-1 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all"
                aria-label="Close tab"
                role="button"
              >
                <Cross2Icon className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Hide scrollbar utility (can be moved to globals if needed)
// .no-scrollbar::-webkit-scrollbar { display: none; }
// .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
