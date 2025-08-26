'use client';

import { useState } from 'react';
import { useListProjects } from '@/lib/api';

export function ProjectListSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useListProjects({
    enabled: isPanelOpen, // Only fetch when panel is open
  });

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <div className="panel-section project-list-toggle-section">
        <button id="toggleProjectListBtn" className="toggle-section-btn" onClick={togglePanel}>
          📁 My Projects
        </button>
      </div>

      <div className={`project-list-panel ${isPanelOpen ? 'open' : ''}`} id="projectListPanel">
        <div className="panel-section project-list-section">
          <div className="section-header">
            <h2>My Projects</h2>
            <button id="closeProjectListBtn" className="close-btn" onClick={closePanel}>×</button>
          </div>
          <ul id="projectList" className="project-list">
            {isLoading && <p>Loading projects...</p>}
            {isError && <p>Error: {error?.message}</p>}
            {data?.projects.length === 0 && !isLoading && <p>No projects found.</p>}
            {data?.projects.map((project: any) => (
              <li key={project.id}>
                {project.name} (Created: {new Date(project.createdAt).toLocaleDateString()})
                {/* TODO: Add functionality to view project pages */}
              </li>
            ))}
          </ul>
          {/* TODO: Add back to projects button if needed */}
        </div>
      </div>
    </>
  );
}