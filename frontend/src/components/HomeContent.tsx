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
import { useListProjects, usePageLayout, fetchApi } from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useLayoutContext } from "@/app/context/LayoutContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
} from "@radix-ui/react-icons";

export default function HomeContent() {
  const { isAuthenticated, token } = useAuth();
  const { setCurrentLayout } = useLayoutContext();
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [incompleteProject, setIncompleteProject] = useState<any>(null);
  const [showMessage, setShowMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 메시지 표시 함수들
  const showSuccessMessage = (text: string) => {
    setShowMessage({ type: "success", text });
    setTimeout(() => setShowMessage(null), 3000);
  };

  const showErrorMessage = (text: string) => {
    setShowMessage({ type: "error", text });
    setTimeout(() => setShowMessage(null), 5000);
  };

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

  // 선택된 페이지의 레이아웃 로딩
  const {
    data: pageLayoutData,
    isLoading: isLoadingPageLayout,
    isError: isErrorPageLayout,
    error: errorPageLayout,
  } = usePageLayout(selectedPageId || undefined);

  const { data: projectsData, isLoading: isLoadingProjects } =
    useListProjects();

  // 페이지 선택 핸들러
  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  // 프로젝트 선택 핸들러
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);

    // 프로젝트가 미완성인지 확인
    const project = projectsData?.projects?.find((p) => p.id === projectId);
    if (project) {
      // 페이지나 컴포넌트가 없는지 확인 (간단한 체크)
      const hasContent =
        pageLayoutData?.layout && Object.keys(pageLayoutData.layout).length > 0;

      if (!hasContent) {
        setIncompleteProject(project);
        setShowRecoveryModal(true);
      }
    }
  };

  // 복구 옵션 핸들러
  const handleRecoveryOption = async (option: "continue" | "restart") => {
    if (!incompleteProject) return;

    try {
      if (option === "continue") {
        // 이어서 완성하기: 기존 요구사항으로 AI가 프로젝트 완성
        console.log("이어서 완성하기:", incompleteProject.name);

        const result = await fetchApi("/api/ai/recover-project", {
          method: "POST",
          token,
          body: JSON.stringify({
            projectId: incompleteProject.id,
            action: "continue",
          }),
        });

        console.log("프로젝트 복구 완료:", result);
        showSuccessMessage("프로젝트가 성공적으로 완성되었습니다!");
      } else if (option === "restart") {
        // 새로 시작하기: 기존 내용 삭제 후 새로 생성
        console.log("새로 시작하기:", incompleteProject.name);
        // TODO: 기존 데이터 정리 후 AI 생성 API 호출
      }

      setShowRecoveryModal(false);
      setIncompleteProject(null);
    } catch (error) {
      console.error("복구 프로세스 오류:", error);
      showErrorMessage("프로젝트 복구 중 오류가 발생했습니다.");
    }
  };

  // 인증되지 않은 경우 로딩 표시
  if (!isAuthenticated || !token) {
    return <div>로그인 페이지로 이동 중...</div>;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="text-2xl font-bold text-gray-900">Navo — 에디터</h1>

          {/* 프로젝트 선택기 */}
          <Select.Root
            value={selectedProjectId || ""}
            onValueChange={handleProjectSelect}
          >
            <Select.Trigger className="inline-flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[200px]">
              <Select.Value placeholder="프로젝트 선택" />
              <Select.Icon className="text-gray-400">
                <ChevronDownIcon className="h-4 w-4" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="overflow-hidden rounded-lg bg-white shadow-lg border border-gray-200 min-w-[200px] z-50">
                <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                  <ChevronUpIcon className="h-4 w-4" />
                </Select.ScrollUpButton>

                <Select.Viewport className="p-1">
                  {projectsData?.projects
                    ?.sort((a, b) => a.name.localeCompare(b.name))
                    ?.map((project) => (
                      <Select.Item
                        key={project.id}
                        value={project.id}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 focus:outline-none"
                      >
                        <Select.ItemText className="flex items-center gap-2">
                          <span className="text-gray-500">📁</span>
                          {project.name}
                        </Select.ItemText>
                        <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                          <CheckIcon className="h-4 w-4 text-blue-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}

                  <div className="h-px bg-gray-200 my-1"></div>

                  <button className="relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">
                    <span className="text-blue-500 mr-2">➕</span>새 프로젝트
                    만들기
                  </button>
                </Select.Viewport>

                <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                  <ChevronDownIcon className="h-4 w-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

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
          {!selectedProjectId ? (
            <div className="preview-placeholder">
              <div className="preview-header">
                <div className="preview-icon">📁</div>
                <h2>프로젝트를 선택하세요</h2>
                <p>프로젝트를 선택하면 미리보기가 표시됩니다.</p>
              </div>
            </div>
          ) : (
            <>
              {/* 프로젝트 정보 및 라우트 목록 */}
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">
                  📁{" "}
                  {projectsData?.projects?.find(
                    (p) => p.id === selectedProjectId
                  )?.name || "프로젝트"}
                </h2>

                {/* 라우트 목록 */}
                {selectedProjectId && (
                  <div className="mb-4 relative">
                    <details className="border border-gray-200 rounded">
                      <summary className="px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
                        🚀 라우트 ({pageLayoutData?.pages?.length || 0}개) ▼
                      </summary>
                      <div className="absolute top-full left-0 right-0 z-10 p-3 bg-gray-50 border border-gray-200 rounded-b shadow-lg">
                        <div className="flex flex-wrap gap-2">
                          {pageLayoutData?.pages?.map((page: any) => (
                            <button
                              key={page.id}
                              onClick={() => handlePageSelect(page.id)}
                              className={`text-sm px-2 py-1 rounded border transition-colors ${
                                selectedPageId === page.id
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                              }`}
                            >
                              {page.path}
                            </button>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* 선택된 페이지 표시 */}
                    {selectedPageId && (
                      <div className="mt-2 text-sm text-gray-600">
                        📄 현재 페이지:{" "}
                        {
                          pageLayoutData?.pages?.find(
                            (p: any) => p.id === selectedPageId
                          )?.path
                        }
                      </div>
                    )}

                    {/* 디버깅 정보 */}
                    {selectedPageId && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-gray-500">
                          🐛 디버깅 정보
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 rounded text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              페이지 레이아웃 데이터:
                            </h4>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  JSON.stringify(pageLayoutData, null, 2)
                                )
                              }
                              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="복사하기"
                            >
                              📋
                            </button>
                          </div>
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(pageLayoutData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>

              {/* 미리보기 */}
              {selectedPageId ? (
                // 선택된 페이지의 레이아웃 표시
                isLoadingPageLayout ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>페이지 레이아웃 로딩 중...</p>
                  </div>
                ) : isErrorPageLayout ? (
                  <div className="error-state">
                    <p>페이지 레이아웃 로딩 오류: {errorPageLayout?.message}</p>
                  </div>
                ) : (
                  <LayoutRenderer layout={pageLayoutData?.layout || null} />
                )
              ) : (
                <div className="preview-placeholder">
                  <div className="preview-header">
                    <div className="preview-icon">📄</div>
                    <h2>페이지를 선택하세요</h2>
                    <p>프로젝트에서 페이지를 선택하면 미리보기가 표시됩니다.</p>
                  </div>
                </div>
              )}
            </>
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

      {/* 메시지 표시 */}
      {showMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            showMessage.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {showMessage.text}
        </div>
      )}

      {/* 프로젝트 복구 모달 */}
      {showRecoveryModal && incompleteProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                미완성 프로젝트 감지
              </h3>
              <p className="text-gray-600">
                프로젝트 <strong>&ldquo;{incompleteProject.name}&rdquo;</strong>
                이(가) 아직 완성되지 않았습니다.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">
                  이어서 완성하기
                </h4>
                <p className="text-sm text-blue-700">
                  기존 내용을 유지하고 AI가 필요한 페이지와 컴포넌트를 추가로
                  생성합니다.
                </p>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-1">
                  새로 시작하기
                </h4>
                <p className="text-sm text-orange-700">
                  기존 내용을 모두 삭제하고 완전히 새로 생성합니다.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleRecoveryOption("continue")}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                이어서 완성하기
              </button>
              <button
                onClick={() => handleRecoveryOption("restart")}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                새로 시작하기
              </button>
            </div>

            <button
              onClick={() => setShowRecoveryModal(false)}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
}
