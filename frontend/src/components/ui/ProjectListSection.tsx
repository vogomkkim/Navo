"use client";

import { useState } from "react";
import { useListProjects } from "@/lib/api";

export function ProjectListSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useListProjects({
    queryKey: ["projects"],
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
        <button
          id="toggleProjectListBtn"
          className="toggle-section-btn"
          onClick={togglePanel}
        >
          📁 내 프로젝트
        </button>
      </div>

      <div
        className={`project-list-panel ${isPanelOpen ? "open" : ""}`}
        id="projectListPanel"
      >
        <div className="panel-section project-list-section">
          <div className="section-header">
            <h2>내 프로젝트</h2>
            <button
              id="closeProjectListBtn"
              className="close-btn"
              onClick={closePanel}
            >
              ×
            </button>
          </div>
          <ul id="projectList" className="project-list">
            {isLoading && <p>프로젝트 로딩 중...</p>}
            {isError && <p>오류: {error?.message}</p>}
            {data?.projects.length === 0 && !isLoading && (
              <p>프로젝트를 찾을 수 없습니다.</p>
            )}
            {data?.projects.map((project: any) => (
              <li key={project.id}>
                {project.name} (생성일:{" "}
                {new Date(project.createdAt).toLocaleDateString()})
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
