// frontend/src/components/ProjectSettings.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useIdeStore } from '@/store/ideStore';
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/apiClient';

interface Project {
  id: string;
  name: string;
  description: string | null;
}

export function ProjectSettings() {
  const { selectedProjectId } = useIdeStore();
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!selectedProjectId || !token) return;

      try {
        setIsLoading(true);
        setError(null);
        const projectData = await fetchApi<Project>(`/api/projects/${selectedProjectId}`, { token });
        setProject(projectData);
        setNewName(projectData.name || '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [selectedProjectId, token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !token || !newName.trim() || newName === project?.name) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProject = await fetchApi<Project>(`/api/projects/${selectedProjectId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name: newName }),
      });

      setProject(updatedProject);
      setNewName(updatedProject.name);
      setSuccessMessage('Project name updated successfully!');
      // Optionally, invalidate a react-query cache for projects list here
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading project settings...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!project) {
    return <div>No project selected or found.</div>;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', background: '#f0f2f5', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0, color: '#333' }}>Project Settings</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="projectName" style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
            Project Name
          </label>
          <input
            id="projectName"
            type="text"
            value={newName || ''}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || newName === (project?.name || '')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            border: 'none',
            background: isSaving || newName === (project?.name || '') ? '#ccc' : '#007bff',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
      {successMessage && <p style={{ color: 'green', marginTop: '1rem' }}>{successMessage}</p>}
    </div>
  );
}
