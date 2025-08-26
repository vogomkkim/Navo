'use client';

import { useState } from 'react';
import { useGenerateProject } from '@/lib/api';

export function ProjectGenerationSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectFeatures, setProjectFeatures] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [projectResult, setProjectResult] = useState<any>(null);

  const { mutate: generateProject, isPending, isSuccess, isError, error } = useGenerateProject();

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleGenerateProject = () => {
    setGenerationStatus('Generating...');
    setProjectResult(null);
    generateProject(
      {
        projectName,
        projectDescription,
        // Include other fields if the API supports them
        // projectFeatures,
        // targetAudience,
        // businessType,
      },
      {
        onSuccess: (data) => {
          setGenerationStatus('Project generated successfully!');
          setProjectResult(data.generatedStructure);
          console.log('Generated Project:', data);
        },
        onError: (err) => {
          setGenerationStatus(`Error: ${err.message}`);
          console.error('Project generation failed:', err);
        },
      }
    );
  };

  return (
    <>
      <div className="panel-section project-generation-toggle-section">
        <button id="toggleProjectGenerationBtn" className="toggle-section-btn" onClick={togglePanel}>
          🚀 Generate New Project
        </button>
      </div>

      <div className={`project-generation-panel ${isPanelOpen ? 'open' : ''}`} id="projectGenerationPanel">
        <div className="panel-section project-generation-section">
          <div className="section-header">
            <h2>Generate New Project</h2>
            <button id="closeProjectGenerationBtn" className="close-btn" onClick={closePanel}>×</button>
          </div>
          <div className="project-form">
            <input
              type="text"
              id="projectName"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <input
              type="text"
              id="projectDescription"
              placeholder="e.g., Instagram-like social media site"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
            {/*
            <input
              type="text"
              id="projectFeatures"
              placeholder="Features: posts, comments, likes, follows"
              value={projectFeatures}
              onChange={(e) => setProjectFeatures(e.target.value)}
            />
            <input
              type="text"
              id="targetAudience"
              placeholder="Target: young adults, social media users"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
            <input
              type="text"
              id="businessType"
              placeholder="Business: social platform, content sharing"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
            */}
            <button id="generateProjectBtn" onClick={handleGenerateProject} disabled={isPending}>
              {isPending ? 'Generating...' : 'Generate Project'}
            </button>
          </div>
          <div id="generationStatus" className="generation-status">
            {generationStatus && <p>{generationStatus}</p>}
          </div>
          {projectResult && (
            <div id="projectResult" className="project-result">
              <h3>Generated Structure:</h3>
              <pre>{JSON.stringify(projectResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}