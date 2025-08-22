// Import component rendering functions
import {
  renderLayout,
  loadComponentDefinitions,
  renderFromTemplate,
} from './components.js';

// --- Global Error Handling ---
window.addEventListener('error', async (event) => {
  console.log('🚨 JavaScript 에러 캐치:', {
    message: event.error?.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });

  // 서버로 에러 로그 전송
  try {
    await fetch(`${API_BASE_URL}/api/log-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'javascript_error',
        message: event.error?.message || 'Unknown JavaScript error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.log('❌ 에러 로깅 실패:', e);
  }
});

// Promise 에러 캐치
window.addEventListener('unhandledrejection', async (event) => {
  console.log('🚨 Promise 에러 캐치:', {
    reason: event.reason,
    promise: event.promise
  });

  // 서버로 에러 로그 전송
  try {
    await fetch(`${API_BASE_URL}/api/log-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'promise_error',
        message: event.reason?.message || 'Unknown Promise error',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.log('❌ 에러 로깅 실패:', e);
  }
});

// Check authentication first
function checkAuth() {
  const token = localStorage.getItem('navo_token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return token;
}

const token = checkAuth();
if (!token) {
  // This will redirect to login, so we don't need to continue
  throw new Error('Authentication required');
}

const statusEl = document.getElementById('status');
const canvasEl = document.getElementById('canvas');
const infoEl = document.getElementById('info');
const saveBtn = document.getElementById('saveBtn');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatHistory = document.getElementById('chatHistory');
const togglePanelBtn = document.getElementById('togglePanelBtn');
const layoutEl = document.querySelector('.layout');
const panelEl = document.querySelector('.panel');
const panelOverlayEl = document.getElementById('panelOverlay');

// Project generation elements
const projectDescription = document.getElementById('projectDescription');
const projectFeatures = document.getElementById('projectFeatures');
const targetAudience = document.getElementById('targetAudience');
const businessType = document.getElementById('businessType');
const generateProjectBtn = document.getElementById('generateProjectBtn');
const projectResult = document.getElementById('projectResult');

// 페이지의 현재 상태를 JSON으로 저장할 변수
let currentLayout = null;

const API_BASE_URL = window.API_BASE_URL || '';

const suggestionsListEl = document.getElementById('suggestionsList');
const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');
const toggleSuggestionsBtn = document.getElementById('toggleSuggestionsBtn');
const suggestionsPanel = document.getElementById('suggestionsPanel');
const closeSuggestionsBtn = document.getElementById('closeSuggestionsBtn');
const suggestionsOverlay = document.getElementById('suggestionsOverlay');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
const profileToggle = document.getElementById('profileToggle');
const profileMenu = document.getElementById('profileMenu');
// New Project/Page List Elements
const projectListEl = document.getElementById('projectList');
const pageListEl = document.getElementById('pageList');
const currentPageProjectNameEl = document.getElementById(
  'currentPageProjectName'
);
const projectListSectionEl = document.querySelector('.project-list-section');
const pageListSectionEl = document.querySelector('.page-list-section');
const backToProjectsBtn = document.getElementById('backToProjectsBtn');

// Component Builder Elements
const createComponentBtn = document.getElementById('createComponentBtn');
const componentModal = document.getElementById('componentModal');
const closeComponentModal = document.getElementById('closeComponentModal');
const componentForm = document.getElementById('componentForm');
const previewComponentBtn = document.getElementById('previewComponentBtn');

// Natural Language Component Generation Elements
const componentDescription = document.getElementById('componentDescription');
const generateComponentBtn = document.getElementById('generateComponentBtn');
const generationStatus = document.getElementById('generationStatus');

// Toggle Section Elements
const toggleProjectGenerationBtn = document.getElementById(
  'toggleProjectGenerationBtn'
);
const toggleProjectListBtn = document.getElementById('toggleProjectListBtn');
const toggleComponentBuilderBtn = document.getElementById(
  'toggleComponentBuilderBtn'
);

// Toggle Panel Elements
const projectGenerationPanel = document.getElementById(
  'projectGenerationPanel'
);
const projectListPanel = document.getElementById('projectListPanel');
const componentBuilderPanel = document.getElementById('componentBuilderPanel');

// Close Button Elements
const closeProjectGenerationBtn = document.getElementById(
  'closeProjectGenerationBtn'
);
const closeProjectListBtn = document.getElementById('closeProjectListBtn');
const closeComponentBuilderBtn = document.getElementById(
  'closeComponentBuilderBtn'
);

// Logout functionality
function handleLogout() {
  localStorage.removeItem('navo_token');
  localStorage.removeItem('navo_user');
  window.location.href = '/login.html';
}

if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);

// Profile menu toggle (desktop)
if (profileToggle && profileMenu) {
  profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = profileMenu.classList.toggle('open');
    profileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!profileMenu.classList.contains('open')) return;
    if (e.target === profileMenu || profileMenu.contains(e.target)) return;
    if (e.target === profileToggle || profileToggle.contains(e.target)) return;
    profileMenu.classList.remove('open');
    profileToggle.setAttribute('aria-expanded', 'false');
  });
}

init();

// Add keyboard event listener for ESC key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSuggestionsPanel();
    closeMobilePanel();
  }
});

async function init() {
  setStatus('Loading components and draft…');
  try {
    // First, load component definitions
    await loadComponentDefinitions();

    // Then load draft
    const res = await fetch(`${API_BASE_URL}/api/draft`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const data = await res.json();

    // API로부터 받은 layout 데이터를 변수에 저장
    currentLayout = data?.draft?.layout;
    canvasEl.innerHTML = renderLayout(currentLayout);

    infoEl.textContent = `Draft loaded in ${data.tookMs ?? 0} ms`;
    setStatus('Ready');
    track({ type: 'view:page', page: 'editor' });
    fetchAndRenderSuggestions(); // Fetch and render suggestions on init
    fetchAndRenderProjects(); // New: Fetch and render projects on init
    fetchAndRenderComponents(); // New: Fetch and render components on init
  } catch (e) {
    setStatus(`Failed to load draft: ${e.message}`);
    console.error(e);
  }
}

async function fetchAndRenderSuggestions(refresh = false) {
  try {
    const url = new URL(`${API_BASE_URL}/api/suggestions`);
    if (refresh) {
      url.searchParams.set('refresh', 'true');
    }
    url.searchParams.set('limit', '3');

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const { suggestions } = await res.json();

    suggestionsListEl.innerHTML = ''; // Clear previous suggestions

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach((suggestion) => {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'suggestion-card';
        suggestionEl.innerHTML = `
          <p>${suggestion.content.description || 'No description'}</p>
          <button class="apply-suggestion-btn" data-suggestion-id="${suggestion.id}">Apply</button>
        `;
        suggestionsListEl.appendChild(suggestionEl);
      });
      console.log(
        `Loaded ${suggestions.length} suggestions (refresh: ${refresh})`
      );
    } else {
      suggestionsListEl.innerHTML = '<p>No suggestions available.</p>';
    }
  } catch (e) {
    console.error('Error fetching suggestions:', e);
    suggestionsListEl.innerHTML = `<p class="error">Failed to load suggestions: ${e.message}</p>`;
  }
}

/**
 * 스타일 객체를 인라인 스타일 문자열로 변환합니다.
 * e.g., { color: 'blue', fontSize: '16px' } -> 'color:blue;font-size:16px'
 * @param {object | undefined} styleObject
 * @returns {string}
 */

saveBtn.addEventListener('click', async () => {
  setStatus('Saving…');
  // HTML 대신, 현재 layout JSON 객체를 서버로 전송
  if (!currentLayout) {
    setStatus('Save failed: No layout data');
    return;
  }

  const payload = { layout: currentLayout };

  try {
    const res = await fetch(`${API_BASE_URL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setStatus(`Saved (${data.versionId})`);
    track({ type: 'editor:save', versionId: data.versionId });
  } catch (e) {
    setStatus('Save failed');
  }
});

const generateDummySuggestionBtn = document.getElementById(
  'generateDummySuggestionBtn'
);
if (generateDummySuggestionBtn) {
  generateDummySuggestionBtn.addEventListener('click', async () => {
    setStatus('Generating dummy suggestion...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-dummy-suggestion`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }
      const data = await res.json();
      setStatus(data.message || 'Dummy suggestion generated.');
      fetchAndRenderSuggestions(); // Refresh suggestions after generating a new one
    } catch (e) {
      setStatus(`Failed to generate dummy suggestion: ${e.message}`);
      console.error('Error generating dummy suggestion:', e);
    }
  });
}

canvasEl.addEventListener('click', (ev) => {
  const target = ev.target;

  // 클릭된 요소가 data-editable="true" 속성을 가졌는지 확인합니다.
  if (target.dataset.editable === 'true') {
    // The track() call for edits is in handleTextEdit -> finishEditing,
    // so we don't need to track here to avoid duplicates.
    handleTextEdit(target);
    return;
  }

  // Track general component clicks
  const componentEl = target.closest('[data-id]');
  if (componentEl) {
    const componentId = componentEl.dataset.id;
    const component = currentLayout.components.find(
      (c) => c.id === componentId
    );
    track({
      type: 'click:component',
      componentId: componentId,
      componentType: component?.type || 'unknown',
      target: target.tagName || 'UNKNOWN',
    });
  } else {
    // Fallback for clicks on the canvas background
    track({ type: 'click:canvas', target: target.tagName || 'UNKNOWN' });
  }
});

/**
 * 텍스트 요소의 편집 모드를 처리합니다.
 * 요소를 숨기고, 그 자리에 입력 상자를 만들어 편집을 수행합니다.
 * 편집이 완료되면(Enter 또는 blur), 화면과 내부 데이터(currentLayout)를 모두 업데이트합니다.
 * @param {HTMLElement} element - 편집할 대상 요소
 */
function handleTextEdit(element) {
  // 1. 기존 요소를 숨기고, 그 내용을 가진 입력 상자를 만듭니다.
  element.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = element.textContent.trim();
  input.className = 'inline-editor';

  // --- 추가된 부분 시작 ---
  // 2. 원래 요소의 계산된 스타일을 가져와 입력 상자에 적용합니다.
  const style = window.getComputedStyle(element);
  input.style.fontSize = style.fontSize;
  input.style.fontWeight = style.fontWeight;
  input.style.fontFamily = style.fontFamily;
  input.style.lineHeight = style.lineHeight;
  input.style.letterSpacing = style.letterSpacing;
  input.style.padding = style.padding;
  input.style.margin = style.margin;
  input.style.width = style.width; // 너비도 복사
  input.style.border = '1px solid #007bff'; // 편집 중임을 알리는 테두리 추가
  input.style.outline = 'none';
  // --- 추가된 부분 끝 ---

  // 3. 기존 요소 바로 뒤에 입력 상자를 삽입하고 포커스를 줍니다.
  element.parentNode.insertBefore(input, element.nextSibling);
  input.focus();

  // ... 이하 편집 완료 로직은 동일 ...
  const finishEditing = () => {
    const newValue = input.value;

    // 3a. UI 텍스트 업데이트
    element.textContent = newValue;

    // 3b. 내부 데이터(currentLayout) 업데이트
    const componentId = element.dataset.componentId;
    const propName = element.dataset.propName;

    if (currentLayout && componentId && propName) {
      const componentToUpdate = currentLayout.components.find(
        (c) => c.id === componentId
      );
      if (componentToUpdate) {
        componentToUpdate.props[propName] = newValue;
        console.log('Updated layout:', currentLayout); // 데이터 변경 확인용 로그
      }
    }

    // 3c. 입력 상자를 제거하고, 원래 요소를 다시 보여줍니다.
    input.remove();
    element.style.display = '';
    setStatus('Ready');
    track({
      type: 'editor:change',
      details: { componentId, propName, newValue },
    });
  };

  input.addEventListener('blur', finishEditing);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      // Escape 키를 누르면 편집을 취소하고 원상 복구합니다.
      input.remove();
      element.style.display = '';
      setStatus('Ready');
    }
  });
}

let eventQueue = [];
let flushTimer = null;

function track(event) {
  eventQueue.push({ ...event, ts: Date.now() });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 2000);
  }
}

async function flushEvents() {
  const batch = eventQueue.splice(0, eventQueue.length);
  flushTimer = null;
  if (batch.length === 0) return;
  try {
    await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch (_) {
    // ignore errors for mock
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

projectListEl.addEventListener('click', (event) => {
  const projectItem = event.target.closest('.project-item');
  if (projectItem) {
    const projectId = projectItem.dataset.projectId;
    const projectName = projectItem.dataset.projectName;
    console.log(`Project clicked: ${projectName} (${projectId})`);
    fetchAndRenderPages(projectId, projectName); // Call the new function
  }
});

async function fetchAndRenderPages(projectId, projectName) {
  setStatus(`Loading pages for ${projectName}...`);
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/pages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const { pages } = await res.json();

    pageListEl.innerHTML = ''; // Clear previous pages
    currentPageProjectNameEl.textContent = projectName; // Set project name in header

    if (pages && pages.length > 0) {
      pages.forEach((page) => {
        const pageItem = document.createElement('li');
        pageItem.className = 'page-item';
        pageItem.dataset.pageId = page.id;
        pageItem.innerHTML = `
          <span>${page.path}</span>
          <span class="page-date">${new Date(page.updated_at).toLocaleDateString()}</span>
        `;
        pageListEl.appendChild(pageItem);
      });
      setStatus(`Pages loaded for ${projectName}.`);
    } else {
      pageListEl.innerHTML = '<p>No pages found for this project.</p>';
      setStatus(`No pages for ${projectName}.`);
    }

    // Toggle UI visibility
    projectListSectionEl.style.display = 'none';
    pageListSectionEl.style.display = 'block';
    closeMobilePanel();
  } catch (e) {
    console.error('Error fetching pages:', e);
    pageListEl.innerHTML = `<p class="error">Failed to load pages: ${e.message}</p>`;
    setStatus('Error loading pages.');
  }
}

// --- 채팅 UI 로직 추가 ---
chatSendBtn.addEventListener('click', handleChatMessage);

pageListEl.addEventListener('click', (event) => {
  const pageItem = event.target.closest('.page-item');
  if (pageItem) {
    const pageId = pageItem.dataset.pageId;
    // Placeholder for handling page click - will be implemented in a later step
    console.log(`Page clicked: ${pageId}`);
    // Call a function to fetch and render the page layout
    // For now, just a placeholder:
    // fetchAndRenderPageLayout(pageId);
  }
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleChatMessage();
  }
});

/**
 * 채팅 메시지 전송을 처리합니다.
 */
async function handleChatMessage() {
  // Made async
  const command = chatInput.value.trim();
  if (!command) return;

  console.log(`Chat command: ${command}`);
  addMessageToHistory('user', command);
  chatInput.value = '';

  // --- AI API 호출 시작 ---
  setStatus('Thinking...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, currentLayout }), // Send command and current layout
    });

    if (!res.ok) {
      throw new Error(`AI API responded with status ${res.status}`);
    }

    const { layoutChanges, aiResponseText } = await res.json();

    if (layoutChanges && currentLayout) {
      // Apply layout changes received from AI
      // This is a simplified application of changes. A more robust solution
      // would handle various types of changes (add, remove, update components).
      // For now, we assume layoutChanges directly replaces or updates components.
      if (layoutChanges.components) {
        currentLayout.components = layoutChanges.components;
      } else if (Array.isArray(layoutChanges)) {
        // If layoutChanges is an array of updates
        layoutChanges.forEach((change) => {
          if (change.type === 'update' && change.id) {
            const index = currentLayout.components.findIndex(
              (c) => c.id === change.id
            );
            if (index !== -1) {
              currentLayout.components[index] = {
                ...currentLayout.components[index],
                ...change.payload,
              };
            }
          } else if (change.type === 'add') {
            currentLayout.components.push(change.payload);
          }
          // Add more change types (e.g., 'remove') as needed
        });
      }
      canvasEl.innerHTML = renderLayout(currentLayout); // Re-render the page with updated layout
    }

    addMessageToHistory('assistant', aiResponseText || '(AI): Done.');
    setStatus('Ready');
    track({ type: 'chat:command', command, response: aiResponseText });
  } catch (e) {
    console.error('AI command failed:', e);
    addMessageToHistory('assistant', `(AI Error): ${e.message}`);
    setStatus('Error');
    track({ type: 'chat:command', command, error: e.message });
  }
  // --- AI API 호출 끝 ---
}

/**
 * 채팅 기록에 메시지를 추가합니다.
 * @param {'user' | 'assistant'} sender
 * @param {string} message
 */
function addMessageToHistory(sender, message) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${sender}`;
  msgEl.textContent = message;
  chatHistory.appendChild(msgEl);
  chatHistory.scrollTop = chatHistory.scrollHeight; // 항상 맨 아래로 스크롤
}

pageListEl.addEventListener('click', (event) => {
  const pageItem = event.target.closest('.page-item');
  if (pageItem) {
    const pageId = pageItem.dataset.pageId;
    console.log(`Page clicked: ${pageId}`);
    fetchAndRenderPageLayout(pageId); // Call the new function
  }
});

async function fetchAndRenderPageLayout(pageId) {
  setStatus('Loading page layout...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const { layout } = await res.json();

    currentLayout = layout; // Update currentLayout with the fetched page layout
    canvasEl.innerHTML = renderLayout(currentLayout); // Render the fetched layout

    setStatus('Page loaded.');

    // Toggle UI visibility: hide page list, show canvas
    pageListSectionEl.style.display = 'none';
    canvasEl.style.display = 'block'; // Assuming canvas is hidden when page list is shown
    projectListSectionEl.style.display = 'none'; // Ensure project list is hidden
    // Close mobile panel after navigation
    closeMobilePanel();
  } catch (e) {
    console.error('Error fetching page layout:', e);
    setStatus(`Failed to load page: ${e.message}`);
  }
}

// --- Responsive panel toggle ---
function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function openMobilePanel() {
  if (!panelEl) return;
  panelEl.classList.add('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobilePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('mobile-open');
  if (panelOverlayEl) panelOverlayEl.classList.remove('active');
  document.body.style.overflow = '';
  // Reset any inline styles applied during swipe
  if (panelOverlayEl) panelOverlayEl.style.opacity = '';
  panelEl.style.transform = '';
  panelEl.style.transition = '';
}

function togglePanel() {
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

if (togglePanelBtn) {
  togglePanelBtn.addEventListener('click', togglePanel);
}

if (panelOverlayEl) {
  panelOverlayEl.addEventListener('click', closeMobilePanel);
}

window.addEventListener('resize', () => {
  if (!isMobile()) {
    closeMobilePanel();
  }
});

// --- Swipe-to-close gesture for mobile panel ---
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;

function onPanelTouchStart(e) {
  if (!isMobile()) return;
  if (!panelEl.classList.contains('mobile-open')) return;
  isSwiping = true;
  touchStartX = e.touches ? e.touches[0].clientX : e.clientX;
  touchCurrentX = touchStartX;
  panelEl.style.transition = 'none';
}

function onPanelTouchMove(e) {
  if (!isSwiping) return;
  touchCurrentX = e.touches ? e.touches[0].clientX : e.clientX;
  const deltaX = Math.max(0, touchCurrentX - touchStartX); // only allow swipe to the right to close
  // Move panel along with finger, capped to panel width
  const panelWidth = panelEl.getBoundingClientRect().width;
  const translateX = Math.min(deltaX, panelWidth);
  panelEl.style.transform = `translateX(${translateX}px)`;
  // Dim overlay according to progress
  if (panelOverlayEl) {
    const progress = 1 - Math.min(1, translateX / panelWidth);
    panelOverlayEl.style.opacity = String(0.28 * progress);
  }
}

function onPanelTouchEnd() {
  if (!isSwiping) return;
  isSwiping = false;
  const panelWidth = panelEl.getBoundingClientRect().width;
  const deltaX = Math.max(0, touchCurrentX - touchStartX);
  panelEl.style.transition = '';
  panelEl.style.transform = '';
  if (deltaX > panelWidth * 0.33) {
    closeMobilePanel();
  } else {
    // restore overlay opacity
    if (panelOverlayEl) panelOverlayEl.style.opacity = '';
  }
}

// Attach listeners
panelEl.addEventListener('touchstart', onPanelTouchStart, { passive: true });
panelEl.addEventListener('touchmove', onPanelTouchMove, { passive: true });
panelEl.addEventListener('touchend', onPanelTouchEnd, { passive: true });
panelEl.addEventListener('mousedown', onPanelTouchStart);
window.addEventListener('mousemove', onPanelTouchMove);
window.addEventListener('mouseup', onPanelTouchEnd);

// --- Back to Projects Button Listener ---
backToProjectsBtn.addEventListener('click', () => {
  pageListSectionEl.style.display = 'none';
  projectListSectionEl.style.display = 'block';
  canvasEl.style.display = 'block'; // Ensure canvas is visible when returning to project list
  setStatus('Ready.');
});

// --- Component Builder Event Listeners ---
// 안전한 이벤트 리스너 등록 (요소가 존재할 때만)
if (createComponentBtn) {
  createComponentBtn.addEventListener('click', () => {
    if (componentModal) {
      componentModal.classList.add('show');
    }
  });
}

if (closeComponentModal) {
  closeComponentModal.addEventListener('click', () => {
    if (componentModal && componentForm) {
      componentModal.classList.remove('show');
      componentForm.reset();
    }
  });
}

// Close modal when clicking outside
if (componentModal) {
  componentModal.addEventListener('click', (e) => {
    if (e.target === componentModal && componentForm) {
      componentModal.classList.remove('show');
      componentForm.reset();
    }
  });
}

// Preview component
if (previewComponentBtn && componentForm) {
  previewComponentBtn.addEventListener('click', () => {
    const formData = new FormData(componentForm);
    const template = formData.get('render_template');
    const css = formData.get('css_styles');

    if (template) {
      // Create a preview component
      const previewComponent = {
        id: 'preview',
        type: 'preview',
        props: {
          content: 'Preview Content',
          style: 'color: #666; font-style: italic;',
        },
      };

      // Render preview
      const previewHtml = renderFromTemplate(template, previewComponent.props);

      // Show preview in canvas
      if (canvasEl) {
        canvasEl.innerHTML = `
          <div class="preview-container">
            <h3>Component Preview</h3>
            <div class="preview-component">
              ${previewHtml}
            </div>
            <style>${css}</style>
          </div>
        `;
        setStatus('Component preview loaded');
      }
    }
  });
}

// Save component
if (componentForm) {
  componentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(componentForm);
    const componentData = {
      name: formData.get('name'),
      display_name: formData.get('display_name'),
      description: formData.get('description'),
      category: formData.get('category'),
      render_template: formData.get('render_template'),
      css_styles: formData.get('css_styles'),
    };

    try {
      setStatus('Creating component...');

      const response = await fetch(`${API_BASE_URL}/api/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(componentData),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (data.ok) {
        setStatus('Component created successfully!');
        if (componentModal) {
          componentModal.classList.remove('show');
        }
        componentForm.reset();

        // Refresh component list and reload component definitions
        await loadComponentDefinitions();
        await fetchAndRenderComponents();

      // Refresh canvas if it has components
      if (currentLayout) {
        canvasEl.innerHTML = renderLayout(currentLayout);
      }
    } else {
      setStatus(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating component:', error);
    setStatus(`Failed to create component: ${error.message}`);
  }
});

// --- 제안 적용 로직 추가 ---
suggestionsListEl.addEventListener('click', (ev) => {
  if (ev.target.classList.contains('apply-suggestion-btn')) {
    const suggestionId = ev.target.dataset.suggestionId;
    applySuggestion(suggestionId);
  }
});

async function applySuggestion(suggestionId) {
  // For now, we'll just log the action.
  // In a real app, you would fetch the suggestion details
  // and apply the changes to the currentLayout.
  console.log(`Applying suggestion ${suggestionId}`);
  setStatus(`Applying suggestion ${suggestionId}...`);

  // This is a placeholder. You would need an API endpoint to get a single suggestion
  // or have the suggestion data available on the client.
  // For this example, let's assume we need to fetch it.
  try {
    // This is a mock implementation. In a real scenario, you'd fetch the suggestion
    // and apply its `content` to the `currentLayout`.
    const res = await fetch(`${API_BASE_URL}/api/suggestions`);
    const { suggestions } = await res.json();
    const suggestionToApply = suggestions.find((s) => s.id === suggestionId);

    if (suggestionToApply && suggestionToApply.content) {
      const change = suggestionToApply.content;
      if (change.type === 'update' && change.id) {
        const index = currentLayout.components.findIndex(
          (c) => c.id === change.id
        );
        if (index !== -1) {
          // Deep merge props to avoid overwriting existing ones
          const originalComponent = currentLayout.components[index];
          const newProps = {
            ...originalComponent.props,
            ...change.payload.props,
          };
          if (change.payload.props.style) {
            newProps.style = {
              ...originalComponent.props.style,
              ...change.payload.props.style,
            };
          }
          currentLayout.components[index] = {
            ...originalComponent,
            props: newProps,
          };
        }
      } else if (change.type === 'add') {
        currentLayout.components.push(change.payload);
      }
      canvasEl.innerHTML = renderLayout(currentLayout);
      setStatus(`Suggestion ${suggestionId} applied.`);
      track({ type: 'suggestion:apply', suggestionId });
    } else {
      throw new Error('Suggestion not found or has no content.');
    }
  } catch (e) {
    console.error('Failed to apply suggestion:', e);
    setStatus(`Error applying suggestion: ${e.message}`);
  }
}

// --- Project Generation Logic ---
generateProjectBtn.addEventListener('click', async () => {
  await generateProject();
});

// --- Suggestions Panel Functions ---
function openSuggestionsPanel() {
  suggestionsPanel.classList.add('open');
  suggestionsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  closeMobilePanel();
}

function closeSuggestionsPanel() {
  suggestionsPanel.classList.remove('open');
  suggestionsOverlay.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// --- Suggestions Toggle Logic ---
if (toggleSuggestionsBtn) {
  toggleSuggestionsBtn.addEventListener('click', () => {
    openSuggestionsPanel();
  });
}

// --- Accordion behavior for panel sections on mobile ---
function setupMobileAccordions() {
  const sectionHeaders = document.querySelectorAll('.panel-section > h2');
  sectionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      if (!isMobile()) return;
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });
}

setupMobileAccordions();
window.addEventListener('resize', () => {
  // Expand all sections when moving to desktop for safety
  if (!isMobile()) {
    document
      .querySelectorAll('.panel-section.collapsed')
      .forEach((el) => el.classList.remove('collapsed'));
  }
});

if (closeSuggestionsBtn) {
  closeSuggestionsBtn.addEventListener('click', () => {
    closeSuggestionsPanel();
  });
}

if (suggestionsOverlay) {
  suggestionsOverlay.addEventListener('click', () => {
    closeSuggestionsPanel();
  });
}

// --- Suggestions Refresh Logic ---
if (refreshSuggestionsBtn) {
  refreshSuggestionsBtn.addEventListener('click', async () => {
    await fetchAndRenderSuggestions(true); // true = refresh mode
  });
}

async function generateProject() {
  const description = projectDescription.value.trim();
  const features = projectFeatures.value.trim();
  const audience = targetAudience.value.trim();
  const business = businessType.value.trim();

  if (!description) {
    alert('Please enter a project description');
    return;
  }

  setStatus('Generating project structure...');
  generateProjectBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        features: features ? features.split(',').map((f) => f.trim()) : [],
        targetAudience: audience,
        businessType: business,
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.ok && data.project) {
      displayProjectResult(data.project);
      setStatus(
        `Project "${data.project.structure.name}" generated successfully!`
      );
      track({
        type: 'project:generated',
        projectName: data.project.structure.name,
      });
    } else {
      throw new Error(data.error || 'Failed to generate project');
    }
  } catch (error) {
    console.error('Project generation failed:', error);
    setStatus(`Error: ${error.message}`);
    projectResult.innerHTML = `<p class="error">Failed to generate project: ${error.message}</p>`;
  } finally {
    generateProjectBtn.disabled = false;
  }
}

function displayProjectResult(project) {
  const { structure, code, instructions } = project;

  let html = `
    <h3>Generated Project: ${structure.name}</h3>
    <p><strong>Description:</strong> ${structure.description}</p>

    <div class="structure-item">
      <h4>📄 Pages (${structure.pages.length})</h4>
      <p>${structure.pages.map((p) => `${p.name} (${p.path})`).join(', ')}</p>
    </div>

    <div class="structure-item">
      <h4>🧩 Components (${structure.components.length})</h4>
      <p>${structure.components.map((c) => c.name).join(', ')}</p>
    </div>

    <div class="structure-item">
      <h4>🗄️ Database Tables (${structure.database.tables.length})</h4>
      <p>${structure.database.tables.map((t) => t.name).join(', ')}</p>
    </div>

    <div class="structure-item">
      <h4>🔌 API Endpoints (${structure.apiEndpoints.length})</h4>
      <p>${structure.apiEndpoints.map((e) => `${e.method} ${e.path}`).join(', ')}</p>
    </div>

    <div class="structure-item">
      <h4>📋 Next Steps</h4>
      <ul>
        ${instructions.map((instruction) => `<li>${instruction}</li>`).join('')}
      </ul>
    </div>

    <details>
      <summary>📊 Database Schema</summary>
      <pre>${code.database}</pre>
    </details>
  `;

  projectResult.innerHTML = html;
}

// --- Project Listing Functions ---
async function fetchAndRenderComponents() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/components`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.components) {
        console.log(`Loaded ${data.components.length} components`);
        // Component list display is not implemented yet
      }
    }
  } catch (error) {
    console.error('Error fetching components:', error);
    // Component list display is not implemented yet
  }
}

async function fetchAndRenderProjects() {
  setStatus('Loading projects...');
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const { projects } = await res.json();

    projectListEl.innerHTML = ''; // Clear previous projects

    if (projects && projects.length > 0) {
      projects.forEach((project) => {
        const projectItem = document.createElement('li');
        projectItem.className = 'project-item';
        projectItem.dataset.projectId = project.id;
        projectItem.dataset.projectName = project.name;
        projectItem.innerHTML = `
          <span>${project.name}</span>
          <span class="project-date">${new Date(project.createdAt).toLocaleDateString()}</span>
        `;
        projectListEl.appendChild(projectItem);
      });
      setStatus('Projects loaded.');
    } else {
      projectListEl.innerHTML = '<p>No projects found.</p>';
      setStatus('No projects.');
    }
  } catch (e) {
    console.error('Error fetching projects:', e);
    projectListEl.innerHTML = `<p class="error">Failed to load projects: ${e.message}</p>`;
    setStatus('Error loading projects.');
  }
}

// --- Event Listeners for Project/Page Navigation ---
projectListEl.addEventListener('click', (event) => {
  const projectItem = event.target.closest('.project-item');
  if (projectItem) {
    const projectId = projectItem.dataset.projectId;
    const projectName = projectItem.dataset.projectName;
    // Placeholder for handling project click - will be implemented in a later step
    console.log(`Project clicked: ${projectName} (${projectId})`);
    // Call a function to fetch and render pages for this project
    // For now, just a placeholder:
    // fetchAndRenderPages(projectId, projectName);
  }
});

// --- Natural Language Component Generation ---
if (generateComponentBtn && componentDescription && generationStatus) {
  generateComponentBtn.addEventListener('click', async () => {
    const description = componentDescription.value.trim();

    if (!description) {
      generationStatus.innerHTML =
        '<p class="error">Please describe the component you want to create.</p>';
      return;
    }

    setStatus('Generating component...');
    generationStatus.innerHTML =
      '<p class="generating">🚀 Generating component from your description...</p>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/components/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description,
          save: true, // Save the generated component to database
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const result = await response.json();

      if (result.ok && result.component) {
        const component = result.component;

        // Show success message with component details
        generationStatus.innerHTML = `
          <div class="success">
            <h4>✅ Component Generated Successfully!</h4>
            <div class="component-preview">
              <h5>${component.display_name}</h5>
              <p><strong>Category:</strong> ${component.category}</p>
              <p><strong>Description:</strong> ${component.description}</p>

              <details>
                <summary>📄 HTML Template</summary>
                <pre><code>${escapeHtml(component.render_template)}</code></pre>
              </details>

              ${
                component.css_styles
                  ? `
                <details>
                  <summary>🎨 CSS Styles</summary>
                  <pre><code>${escapeHtml(component.css_styles)}</code></pre>
                </details>
              `
                  : ''
              }

              <details>
                <summary>⚙️ Properties Schema</summary>
                <pre><code>${escapeHtml(JSON.stringify(component.props_schema, null, 2))}</code></pre>
              </details>
            </div>

            <div class="component-actions">
              <button class="btn btn-primary" onclick="addComponentToCanvas('${component.name}')">
                ➕ Add to Canvas
              </button>
              <button class="btn btn-secondary" onclick="previewComponent('${component.name}')">
                👁️ Preview
              </button>
            </div>
          </div>
        `;

        setStatus('Component generated successfully!');

        // Clear the input
        componentDescription.value = '';

        // Refresh component list if it exists
        if (typeof fetchAndRenderComponents === 'function') {
          fetchAndRenderComponents();
        }
      } else {
        throw new Error(result.error || 'Failed to generate component');
      }
    } catch (error) {
      console.error('Error generating component:', error);
      generationStatus.innerHTML = `
        <p class="error">❌ Failed to generate component: ${error.message}</p>
      `;
      setStatus('Error generating component');
    }
  });
}

// --- Toggle Section Functionality ---
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
        // 에러가 발생해도 애플리케이션이 중단되지 않도록 함
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

// --- Safe DOM Element Access ---
function safeSetInnerHTML(element, html) {
  try {
    if (element && typeof element.innerHTML !== 'undefined') {
      element.innerHTML = html;
    } else {
      console.warn('Element not found or innerHTML not supported:', element);
    }
  } catch (error) {
    console.error('Error setting innerHTML:', error);
  }
}

function safeAddEventListener(element, event, handler) {
  try {
    if (element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, handler);
    } else {
      console.warn('Element not found or addEventListener not supported:', element);
    }
  } catch (error) {
    console.error('Error adding event listener:', error);
  }
}

// --- Initialize Toggle Sections with Safe Access ---
function initializeToggleSections() {
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

// Initialize toggle sections when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeToggleSections);
} else {
  initializeToggleSections();
}

// Utility function to escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Function to add generated component to canvas
function addComponentToCanvas(componentName) {
  // This will be implemented to add the component to the current canvas
  console.log(`Adding component ${componentName} to canvas`);
  setStatus(`Component ${componentName} added to canvas`);
}

// Function to preview generated component
function previewComponent(componentName) {
  // This will be implemented to show a preview of the component
  console.log(`Previewing component ${componentName}`);
  setStatus(`Previewing component ${componentName}`);
}
