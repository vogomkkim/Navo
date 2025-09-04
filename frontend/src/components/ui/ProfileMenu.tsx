'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  AvatarIcon,
  ExitIcon,
  GearIcon,
  MoonIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { ThemeContext } from '@/components/ThemeProvider';

export function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { logout } = useAuth();
  const { theme, toggle } = React.useContext(ThemeContext);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleLogoutClick = () => {
    logout();
    setIsOpen(false); // Close menu after logout
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          title="Account"
          ref={toggleRef}
        >
          <AvatarIcon className="h-4 w-4 text-gray-600" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
          sideOffset={5}
          ref={menuRef}
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 cursor-pointer outline-none"
            onClick={() => {
              toggle();
              setIsOpen(false);
            }}
          >
            {theme === 'light' ? (
              <MoonIcon className="h-4 w-4" />
            ) : (
              <SunIcon className="h-4 w-4" />
            )}
            테마 전환
          </DropdownMenu.Item>

          <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 cursor-pointer outline-none">
            <GearIcon className="h-4 w-4" />
            설정
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 cursor-pointer outline-none"
            onClick={handleLogoutClick}
          >
            <ExitIcon className="h-4 w-4" />
            로그아웃
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
