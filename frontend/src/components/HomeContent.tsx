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
import { useEffect, useState } from "react";

export default function HomeContent() {
  const { isAuthenticated, token } = useAuth();
  const { setCurrentLayout } = useLayoutContext();
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/login");
    }
  }, [isAuthenticated, token, router]);

  // Panel Tab 기능
  useEffect(() => {
    const handleTabClick = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        if (target && target.classList.contains("panel-tab")) {
          const tabName = target.getAttribute("data-tab");
          if (tabName) {
            // 모든 탭 비활성화
            document.querySelectorAll(".panel-tab").forEach((tab) => {
              tab.classList.remove("active");
            });
            document
              .querySelectorAll(".panel-tab-content")
              .forEach((content) => {
                content.classList.remove("active");
              });

            // 선택된 탭 활성화
            target.classList.add("active");
            const content = document.querySelector(
              `.panel-tab-content[data-tab="${tabName}"]`
            );
            if (content) {
              content.classList.add("active");
            }
          }
        }
      } catch (error) {
        console.error("Tab click handler error:", error);
      }
    };

    document.addEventListener("click", handleTabClick);
    return () => document.removeEventListener("click", handleTabClick);
  }, []);

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
    return <div>로그인 페이지로 이동 중...</div>;
  }

  return (
    <>
      <header className="topbar">
        <h1>Navo — 에디터 (W1)</h1>
        <div className="topbar-actions">
          <ProfileMenu />
          <StatusDisplay />
        </div>
      </header>
      <main className="layout">
        <section className="ai-chat-interface" aria-label="AI 채팅 인터페이스">
          <div className="chat-messages">
            <ChatSection />
          </div>
        </section>

        <section
          className="project-preview"
          id="preview"
          aria-label="프로젝트 미리보기"
        >
          {isLoadingDraft ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>프로젝트 미리보기 로딩 중...</p>
            </div>
          ) : isErrorDraft ? (
            <div className="error-state">
              <p>미리보기 로딩 오류: {errorDraft?.message}</p>
            </div>
          ) : (
            <LayoutRenderer layout={dataDraft?.draft?.layout || null} />
          )}
        </section>
      </main>

      {/* Right Side Panel */}
      <div className={`side-panel ${isPanelOpen ? "open" : ""}`}>
        <button
          className="panel-toggle-btn"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          aria-label={isPanelOpen ? "패널 닫기" : "패널 열기"}
        >
          {isPanelOpen ? "×" : "☰"}
        </button>

        <div className="panel-content">
          <div className="panel-header">
            <h3>작업 도구</h3>
          </div>

          <div className="panel-tabs">
            <button className="panel-tab active" data-tab="actions">
              작업
            </button>
            <button className="panel-tab" data-tab="suggestions">
              AI
            </button>
            <button className="panel-tab" data-tab="tools">
              도구
            </button>
          </div>

          <div className="panel-tab-content active" data-tab="actions">
            <h4>빠른 작업</h4>
            <SaveButton currentLayout={null} />
            <GenerateDummySuggestionButton />
          </div>

          <div className="panel-tab-content" data-tab="suggestions">
            <h4>AI 제안</h4>
            <SuggestionsSection />
          </div>

          <div className="panel-tab-content" data-tab="tools">
            <h4>프로젝트 도구</h4>
            <ProjectGenerationSection />
            <ProjectListSection />
            <ComponentBuilderSection />
          </div>
        </div>
      </div>
      <MobileChat />
    </>
  );
}
