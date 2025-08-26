'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

export function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { logout } = useAuth();

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
    <div className="profile">
      <button
        id="profileToggle"
        className="profile-toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Account"
        onClick={handleToggle}
        ref={toggleRef}
      >
        <span className="avatar" id="profileAvatar">👤</span>
      </button>
      <div className={`profile-menu ${isOpen ? 'open' : ''}`} id="profileMenu" role="menu" ref={menuRef}>
        <button id="logoutBtn" role="menuitem" onClick={handleLogoutClick}>
          Logout
        </button>
      </div>
    </div>
  );
}