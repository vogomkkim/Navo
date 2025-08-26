import { StatusDisplay } from '@/components/ui/StatusDisplay';
import { ProfileMenu } from '@/components/ui/ProfileMenu';
import { Panel } from '@/components/ui/Panel';
import { SaveButton } from '@/components/ui/SaveButton';
import { GenerateDummySuggestionButton } from '@/components/ui/GenerateDummySuggestionButton';
import { InfoDisplay } from '@/components/ui/InfoDisplay';
import { ChatSection } from '@/components/ui/ChatSection';
import { SuggestionsSection } from '@/components/ui/SuggestionsSection';
import { ProjectGenerationSection } from '@/components/ui/ProjectGenerationSection';
import { ProjectListSection } from '@/components/ui/ProjectListSection';
import { ComponentBuilderSection } from '@/components/ui/ComponentBuilderSection';
import { MobileChat } from '@/components/ui/MobileChat';
import { AccordionSection } from '@/components/ui/AccordionSection';
import { LayoutRenderer } from '@/components/LayoutRenderer'; // Import LayoutRenderer
import { useDraft } from '@/lib/api'; // Import useDraft hook

export default function Home() {
  const { data: dataDraft, isLoading: isLoadingDraft, isError: isErrorDraft, error: errorDraft } = useDraft();
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
        <section className="canvas" id="canvas" aria-label="Canvas">
          {isLoadingDraft ? (
            <p>Loading draft...</p>
          ) : isErrorDraft ? (
            <p>Error loading draft: {errorDraft?.message}</p>
          ) : (
            <LayoutRenderer layout={dataDraft?.draft?.layout || null} />
          )}
        </section>
        <Panel>
          {/* Panel content will go here */}
          <AccordionSection title="Actions">
            <SaveButton currentLayout={null} />
            <GenerateDummySuggestionButton />
          </AccordionSection>
          <AccordionSection title="Info">
            <InfoDisplay infoText="Draft loaded in 0 ms" />
          </AccordionSection>

          <AccordionSection title="Chat">
            <ChatSection />
          </AccordionSection>

          <AccordionSection title="AI Suggestions">
            <SuggestionsSection />
          </AccordionSection>

          <AccordionSection title="Generate New Project">
            <ProjectGenerationSection />
          </AccordionSection>

          <AccordionSection title="My Projects">
            <ProjectListSection />
          </AccordionSection>

          <AccordionSection title="Create Component">
            <ComponentBuilderSection />
          </AccordionSection>

          {/* ... other panel sections will be added as components */}
        </Panel>
      </main>
      <MobileChat />
    </>
  );
}