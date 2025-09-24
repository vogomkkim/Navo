// frontend/src/components/AccountSettings.tsx
'use client';

import React from 'react';

export function AccountSettings() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>My Profile</h3>
      <p>User profile information will be displayed here.</p>
      {/* Example: <ProfileForm /> */}

      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Authentication</h3>
        <p>Password change options will be available here.</p>
        {/* Example: <ChangePasswordForm /> */}
      </div>
    </div>
  );
}
