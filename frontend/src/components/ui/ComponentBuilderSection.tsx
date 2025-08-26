'use client';

import { useState } from 'react';
import { useGenerateComponent } from '@/lib/api';

export function ComponentBuilderSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [componentDescription, setComponentDescription] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedComponent, setGeneratedComponent] = useState<any>(null);

  const { mutate: generateComponent, isPending, isSuccess, isError, error } = useGenerateComponent();

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleGenerateComponent = () => {
    if (!componentDescription.trim()) {
      setGenerationStatus('Please provide a description.');
      return;
    }
    setGenerationStatus('Generating...');
    setGeneratedComponent(null);
    generateComponent(
      {
        description: componentDescription
      },
      {
        onSuccess: (data) => {
          setGenerationStatus('Component generated successfully!');
          setGeneratedComponent(data.component);
          console.log('Generated Component:', data.component);
        },
        onError: (err) => {
          setGenerationStatus(`Error: ${err.message}`);
          console.error('Component generation failed:', err);
        },
      }
    );
  };

  return (
    <>
      <div className="panel-section component-builder-toggle-section">
        <button id="toggleComponentBuilderBtn" className="toggle-section-btn" onClick={togglePanel}>
          🧩 Create Component
        </button>
      </div>

      <div className={`component-builder-panel ${isPanelOpen ? 'open' : ''}`} id="componentBuilderPanel">
        <div className="panel-section component-builder-section">
          <div className="section-header">
            <h2>Create Component</h2>
            <button id="closeComponentBuilderBtn" className="close-btn" onClick={closePanel}>×</button>
          </div>
          <div className="natural-language-input">
            <textarea
              id="componentDescription"
              placeholder="Describe the component you want...&#10;&#10;Examples:&#10;• A photo gallery that shows images in a grid&#10;• A contact form with name, email, and message fields&#10;• A pricing table with three columns&#10;• A hero section with a big title and call-to-action button"
              rows={6}
              value={componentDescription}
              onChange={(e) => setComponentDescription(e.target.value)}
            ></textarea>
            <button id="generateComponentBtn" className="generate-component-btn" onClick={handleGenerateComponent} disabled={isPending}>
              {isPending ? 'Generating...' : '🚀 Generate Component'}
            </button>
          </div>
          <div id="generationStatus" className="generation-status">
            {generationStatus && <p>{generationStatus}</p>}
          </div>
          {generatedComponent && (
            <div className="component-preview">
              <h5>Generated Component:</h5>
              <pre>{JSON.stringify(generatedComponent, null, 2)}</pre>
              {/* TODO: Add buttons to apply/save component */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}