"use client";

import { StatusDisplay } from "@/components/ui/StatusDisplay";
import { ProfileMenu } from "@/components/ui/ProfileMenu";
import { Panel } from "@/components/ui/Panel";
import { SaveButton } from "@/components/ui/SaveButton";
import { GenerateDummySuggestionButton } from "@/components/ui/GenerateDummySuggestionButton";
import { InfoDisplay } from "@/components/ui/InfoDisplay";
import { ChatSection } from "@/components/ui/ChatSection";
import { SuggestionsSection } from "@/components/ui/SuggestionsSection";
import { ProjectGenerationSection } from "@/components/ui/ProjectGenerationSection";
import { ProjectListSection } from "@/components/ui/ProjectListSection";
import { ComponentBuilderSection } from "@/components/ui/ComponentBuilderSection";
import { MobileChat } from "@/components/ui/MobileChat";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { LayoutRenderer } from "@/components/LayoutRenderer";
import { useDraft } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useLayoutContext } from "@/app/context/LayoutContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomeContent() {
  const { isAuthenticated, token } = useAuth();
  const { setCurrentLayout } = useLayoutContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/login");
    }
  }, [isAuthenticated, token, router]);

  const {
    data: dataDraft,
    isLoading: isLoadingDraft,
    isError: isErrorDraft,
    error: errorDraft,
  } = useDraft();

  // draft 데이터를 LayoutContext에 설정
  useEffect(() => {
    if (dataDraft?.draft?.layout) {
      setCurrentLayout(dataDraft.draft.layout);
    }
  }, [dataDraft, setCurrentLayout]);

  // 인증되지 않은 경우 로딩 표시
  if (!isAuthenticated || !token) {
    return <div>Redirecting to login...</div>;
  }

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
        </Panel>
      </main>
      <MobileChat />
    </>
  );
}
