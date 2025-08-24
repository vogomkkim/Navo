export const statusEl = document.getElementById('status') as HTMLElement | null;
export const canvasEl = document.getElementById('canvas') as HTMLElement | null;
export const infoEl = document.getElementById('info') as HTMLElement | null;
export const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement | null;
export const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
export const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement | null;
export const chatHistory = document.getElementById('chatHistory') as HTMLElement | null;
export const togglePanelBtn = document.getElementById('togglePanelBtn') as HTMLButtonElement | null;
export const layoutEl = document.querySelector('.layout') as HTMLElement | null;
export const panelEl = document.querySelector('.panel') as HTMLElement | null;
export const panelOverlayEl = document.getElementById('panelOverlay') as HTMLElement | null;

// Project generation elements
export const projectDescription = document.getElementById('projectDescription') as HTMLTextAreaElement | null;
export const projectFeatures = document.getElementById('projectFeatures') as HTMLTextAreaElement | null;
export const targetAudience = document.getElementById('targetAudience') as HTMLInputElement | null;
export const businessType = document.getElementById('businessType') as HTMLInputElement | null;
export const generateProjectBtn = document.getElementById('generateProjectBtn') as HTMLButtonElement | null;
export const projectResult = document.getElementById('projectResult') as HTMLElement | null;

// Suggestions elements
export const suggestionsListEl = document.getElementById('suggestionsList') as HTMLElement | null;
export const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn') as HTMLButtonElement | null;
export const toggleSuggestionsBtn = document.getElementById('toggleSuggestionsBtn') as HTMLButtonElement | null;
export const suggestionsPanel = document.getElementById('suggestionsPanel') as HTMLElement | null;
export const closeSuggestionsBtn = document.getElementById('closeSuggestionsBtn') as HTMLButtonElement | null;
export const suggestionsOverlay = document.getElementById('suggestionsOverlay') as HTMLElement | null;

// Auth elements
export const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement | null;
export const logoutBtnMobile = document.getElementById('logoutBtnMobile') as HTMLButtonElement | null;
export const profileToggle = document.getElementById('profileToggle') as HTMLButtonElement | null;
export const profileMenu = document.getElementById('profileMenu') as HTMLElement | null;

// Project/Page List Elements
export const projectListEl = document.getElementById('projectList') as HTMLElement | null;
export const pageListEl = document.getElementById('pageList') as HTMLElement | null;
export const currentPageProjectNameEl = document.getElementById('currentPageProjectName') as HTMLElement | null;
export const projectListSectionEl = document.querySelector('.project-list-section') as HTMLElement | null;
export const pageListSectionEl = document.querySelector('.page-list-section') as HTMLElement | null;
export const backToProjectsBtn = document.getElementById('backToProjectsBtn') as HTMLButtonElement | null;

// Component Builder Elements
export const createComponentBtn = document.getElementById('createComponentBtn') as HTMLButtonElement | null;
export const componentModal = document.getElementById('componentModal') as HTMLElement | null;
export const closeComponentModal = document.getElementById('closeComponentModal') as HTMLButtonElement | null;
export const componentForm = document.getElementById('componentForm') as HTMLFormElement | null;
export const previewComponentBtn = document.getElementById('previewComponentBtn') as HTMLButtonElement | null;

// Natural Language Component Generation Elements
export const componentDescription = document.getElementById('componentDescription') as HTMLTextAreaElement | null;
export const generateComponentBtn = document.getElementById('generateComponentBtn') as HTMLButtonElement | null;
export const generationStatus = document.getElementById('generationStatus') as HTMLElement | null;

// Toggle Section Elements
export const toggleProjectGenerationBtn = document.getElementById('toggleProjectGenerationBtn') as HTMLButtonElement | null;
export const toggleProjectListBtn = document.getElementById('toggleProjectListBtn') as HTMLButtonElement | null;
export const toggleComponentBuilderBtn = document.getElementById('toggleComponentBuilderBtn') as HTMLButtonElement | null;

// Toggle Panel Elements
export const projectGenerationPanel = document.getElementById('projectGenerationPanel') as HTMLElement | null;
export const projectListPanel = document.getElementById('projectListPanel') as HTMLElement | null;
export const componentBuilderPanel = document.getElementById('componentBuilderPanel') as HTMLElement | null;

// Close Button Elements
export const closeProjectGenerationBtn = document.getElementById('closeProjectGenerationBtn') as HTMLButtonElement | null;
export const closeProjectListBtn = document.getElementById('closeProjectListBtn') as HTMLButtonElement | null;
export const closeComponentBuilderBtn = document.getElementById('closeComponentBuilderBtn') as HTMLButtonElement | null;

export function setStatus(text: string): void {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

export function isMobile(): boolean {
  return window.matchMedia('(max-width: 768px)').matches;
}

export function openMobilePanel(): void {
  if (!panelEl) return;
  panelEl.classList.add('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeMobilePanel(): void {
  if (!panelEl) return;
  panelEl.classList.remove('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.remove('active');
  document.body.style.overflow = '';
  // Reset any inline styles applied during swipe
  if (panelOverlayEl) panelOverlayEl.style.opacity = '';
  panelEl.style.transform = '';
  panelEl.style.transition = '';
}

export function togglePanel(): void {
  if (isMobile()) {
    if (panelEl && panelEl.classList.contains('mobile-open')) {
      closeMobilePanel();
    } else {
      openMobilePanel();
    }
  } else {
    if (layoutEl) {
      layoutEl.classList.toggle('panel-left');
    }
  }
}

export function openSuggestionsPanel(): void {
    if (suggestionsPanel) {
        suggestionsPanel.classList.add('open');
    }
    if (suggestionsOverlay) {
        suggestionsOverlay.classList.add('active');
    }
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    closeMobilePanel();
}

export function closeSuggestionsPanel(): void {
    if (suggestionsPanel) {
        suggestionsPanel.classList.remove('open');
    }
    if (suggestionsOverlay) {
        suggestionsOverlay.classList.remove('active');
    }
    document.body.style.overflow = ''; // Restore scrolling
}

export function setupMobileAccordions(): void {
    const sectionHeaders = document.querySelectorAll('.panel-section > h2');
    sectionHeaders.forEach((header: Element) => {
      header.addEventListener('click', () => {
        if (!isMobile()) return;
        const section = header.parentElement;
        if (section) {
            section.classList.toggle('collapsed');
        }
      });
    });
}

export function initializeToggleSections(): void {
    try {
      if (
        toggleProjectGenerationBtn &&
        projectGenerationPanel &&
        closeProjectGenerationBtn
      ) {
        setupToggleSection(
          toggleProjectGenerationBtn,
          projectGenerationPanel,
          closeProjectGenerationBtn
        );
      }

      if (toggleProjectListBtn && projectListPanel && closeProjectListBtn) {
        setupToggleSection(
          toggleProjectListBtn,
          projectListPanel,
          closeProjectListBtn
        );
      }

      if (
        toggleComponentBuilderBtn &&
        componentBuilderPanel &&
        closeComponentBuilderBtn
      ) {
        setupToggleSection(
          toggleComponentBuilderBtn,
          componentBuilderPanel,
          closeComponentBuilderBtn
        );
      }
    } catch (error) {
      console.error('Error initializing toggle sections:', error);
    }
}

function setupToggleSection(toggleBtn: HTMLElement, panel: HTMLElement, closeBtn: HTMLElement): void {
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        try {
          // Close all other panels first
          [projectGenerationPanel, projectListPanel, componentBuilderPanel].forEach(
            (p) => {
              if (p && p !== panel) {
                p.classList.remove('open');
              }
            }
          );

          // Toggle current panel
          panel.classList.toggle('open');
        } catch (error) {
          console.error('Error in toggle section:', error);
        }
      });
    }

    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => {
        try {
          panel.classList.remove('open');
        }
        catch (error) {
          console.error('Error closing panel:', error);
        }
      });
    }
}