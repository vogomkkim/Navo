import { StatusDisplay } from '@/components/ui/StatusDisplay';
import { ProfileMenu } from '@/components/ui/ProfileMenu';
import { Panel } from '@/components/ui/Panel';

export default function Home() {
  return (
    <>
      <header className="topbar">
        <h1>Navo — Editor (W1)</h1>
        <div className="topbar-actions">
          <ProfileMenu />
          <StatusDisplay />
        </div>
      </header>
      <main className="layout">
        <section className="canvas" id="canvas" aria-label="Canvas"></section>
        <Panel>
          {/* Panel content will go here */}
          <div className="panel-section">
            <h2>Actions</h2>
            <button id="saveBtn">Save</button>
            <button id="generateDummySuggestionBtn">
              Generate Dummy Suggestion
            </button>
          </div>
          <div className="panel-section">
            <h2>Info</h2>
            <div id="info"></div>
          </div>
          {/* ... other panel sections will be added as components */}
        </Panel>
      </main>
      {/* Mobile Overlays and Chat Bar will go here */}
    </>
  );
}