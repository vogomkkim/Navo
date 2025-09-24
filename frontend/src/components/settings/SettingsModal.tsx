// frontend/src/components/SettingsModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useIdeStore } from '@/store/ideStore';
import { AccountSettings } from './AccountSettings';
import { ProjectSettings } from './ProjectSettings';
import { IntegrationsSettings } from '@/integrations/IntegrationsSettings'; // Will be created next

// Vertical Menu Component
function SettingsMenu({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const menuItems = ['Account', 'Project', 'Integrations'];

  return (
    <div style={{ width: '200px', background: '#f7f7f7', borderRight: '1px solid #e0e0e0', padding: '1rem 0.5rem' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {menuItems.map(item => (
          <li key={item}>
            <button
              onClick={() => setActiveTab(item.toLowerCase())}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: 'none',
                background: activeTab === item.toLowerCase() ? '#e0e7ff' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '6px',
                fontWeight: activeTab === item.toLowerCase() ? '600' : 'normal',
                color: activeTab === item.toLowerCase() ? '#4f46e5' : '#333',
              }}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsModal() {
  const { isSettingsModalOpen, closeSettingsModal } = useIdeStore();
  const [activeTab, setActiveTab] = useState('account');

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeSettingsModal();
    }
  }, [closeSettingsModal]);

  useEffect(() => {
    if (isSettingsModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsModalOpen, handleKeyDown]);

  if (!isSettingsModalOpen) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'project':
        return <ProjectSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={closeSettingsModal}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '1000px',
          height: '75%',
          backgroundColor: 'white',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Vertical Menu */}
        <SettingsMenu activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Right Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
            </h2>
            <button onClick={closeSettingsModal} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem' }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
