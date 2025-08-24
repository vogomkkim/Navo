export const statusEl = document.getElementById('status');
export const canvasEl = document.getElementById('canvas');
export const infoEl = document.getElementById('info');
export const saveBtn = document.getElementById('saveBtn');
export const chatInput = document.getElementById('chatInput');
export const chatSendBtn = document.getElementById('chatSendBtn');
export const chatHistory = document.getElementById('chatHistory');
export const togglePanelBtn = document.getElementById('togglePanelBtn');
export const layoutEl = document.querySelector('.layout');
export const panelEl = document.querySelector('.panel');
export const panelOverlayEl = document.getElementById('panelOverlay');

// Project generation elements
export const projectDescription = document.getElementById('projectDescription');
export const projectFeatures = document.getElementById('projectFeatures');
export const targetAudience = document.getElementById('targetAudience');
export const businessType = document.getElementById('businessType');
export const generateProjectBtn = document.getElementById('generateProjectBtn');
export const projectResult = document.getElementById('projectResult');

// Suggestions elements
export const suggestionsListEl = document.getElementById('suggestionsList');
export const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');
export const toggleSuggestionsBtn = document.getElementById('toggleSuggestionsBtn');
export const suggestionsPanel = document.getElementById('suggestionsPanel');
export const closeSuggestionsBtn = document.getElementById('closeSuggestionsBtn');
export const suggestionsOverlay = document.getElementById('suggestionsOverlay');

// Auth elements
export const logoutBtn = document.getElementById('logoutBtn');
export const logoutBtnMobile = document.getElementById('logoutBtnMobile');
export const profileToggle = document.getElementById('profileToggle');
export const profileMenu = document.getElementById('profileMenu');

// Project/Page List Elements
export const projectListEl = document.getElementById('projectList');
export const pageListEl = document.getElementById('pageList');
export const currentPageProjectNameEl = document.getElementById(
  'currentPageProjectName'
);
export const projectListSectionEl = document.querySelector('.project-list-section');
export const pageListSectionEl = document.querySelector('.page-list-section');
export const backToProjectsBtn = document.getElementById('backToProjectsBtn');

// Component Builder Elements
export const createComponentBtn = document.getElementById('createComponentBtn');
export const componentModal = document.getElementById('componentModal');
export const closeComponentModal = document.getElementById('closeComponentModal');
export const componentForm = document.getElementById('componentForm');
export const previewComponentBtn = document.getElementById('previewComponentBtn');

// Natural Language Component Generation Elements
export const componentDescription = document.getElementById('componentDescription');
export const generateComponentBtn = document.getElementById('generateComponentBtn');
export const generationStatus = document.getElementById('generationStatus');

// Toggle Section Elements
export const toggleProjectGenerationBtn = document.getElementById(
  'toggleProjectGenerationBtn'
);
export const toggleProjectListBtn = document.getElementById('toggleProjectListBtn');
export const toggleComponentBuilderBtn = document.getElementById(
  'toggleComponentBuilderBtn'
);

// Toggle Panel Elements
export const projectGenerationPanel = document.getElementById(
  'projectGenerationPanel'
);
export const projectListPanel = document.getElementById('projectListPanel');
export const componentBuilderPanel = document.getElementById('componentBuilderPanel');

// Close Button Elements
export const closeProjectGenerationBtn = document.getElementById(
  'closeProjectGenerationBtn'
);
export const closeProjectListBtn = document.getElementById('closeProjectListBtn');
export const closeComponentBuilderBtn = document.getElementById(
  'closeComponentBuilderBtn'
);

export function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

export function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

export function openMobilePanel() {
  if (!panelEl) return;
  panelEl.classList.add('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeMobilePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.remove('active');
  document.body.style.overflow = '';
  // Reset any inline styles applied during swipe
  if (panelOverlayEl) panelOverlayEl.style.opacity = '';
  panelEl.style.transform = '';
  panelEl.style.transition = '';
}

export function togglePanel() {
  if (isMobile()) {
    if (panelEl.classList.contains('mobile-open')) {
      closeMobilePanel();
    } else {
      openMobilePanel();
    }
  } else {
    layoutEl.classList.toggle('panel-left');
  }
}

export function openSuggestionsPanel() {
    suggestionsPanel.classList.add('open');
    suggestionsOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    closeMobilePanel();
}

export function closeSuggestionsPanel() {
    suggestionsPanel.classList.remove('open');
    suggestionsOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

export function setupMobileAccordions() {
    const sectionHeaders = document.querySelectorAll('.panel-section > h2');
    sectionHeaders.forEach((header) => {
      header.addEventListener('click', () => {
        if (!isMobile()) return;
        const section = header.parentElement;
        section.classList.toggle('collapsed');
      });
    });
}

export function initializeToggleSections() {
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

function setupToggleSection(toggleBtn, panel, closeBtn) {
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
        } catch (error) {
          console.error('Error closing panel:', error);
        }
      });
    }
}
