const statusEl = document.getElementById('status');
const canvasEl = document.getElementById('canvas');
const infoEl = document.getElementById('info');
const saveBtn = document.getElementById('saveBtn');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatHistory = document.getElementById('chatHistory');
const togglePanelBtn = document.getElementById('togglePanelBtn');
const layoutEl = document.querySelector('.layout');

// 페이지의 현재 상태를 JSON으로 저장할 변수
let currentLayout = null;

const API_BASE_URL = window.API_BASE_URL || '';

const suggestionsListEl = document.getElementById('suggestionsList');

init();

async function init() {
  setStatus('Loading draft…');
  try {
    const res = await fetch(`${API_BASE_URL}/api/draft`);
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const data = await res.json();

    // API로부터 받은 layout 데이터를 변수에 저장
    currentLayout = data?.draft?.layout;
    renderLayout(currentLayout);

    infoEl.textContent = `Draft loaded in ${data.tookMs ?? 0} ms`;
    setStatus('Ready');
    track({ type: 'view:page', page: 'editor' });
    fetchAndRenderSuggestions(); // Fetch and render suggestions on init
  } catch (e) {
    setStatus(`Failed to load draft: ${e.message}`);
    console.error(e);
  }
}

async function fetchAndRenderSuggestions() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/suggestions`);
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const { suggestions } = await res.json();

    suggestionsListEl.innerHTML = ''; // Clear previous suggestions

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'suggestion-card';
        suggestionEl.innerHTML = `
          <p>${suggestion.content.description || 'No description'}</p>
          <button class="apply-suggestion-btn" data-suggestion-id="${suggestion.id}">Apply</button>
        `;
        suggestionsListEl.appendChild(suggestionEl);
      });
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
function toStyleString(styleObject) {
  if (!styleObject) return '';
  return Object.entries(styleObject)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, ' -$1').toLowerCase()}:${value}`)
    .join(';');
}

function renderLayout(layout) {
  if (!layout || !Array.isArray(layout.components)) {
    canvasEl.innerHTML = '<p class="error">Error: Invalid layout data received from API.</p>';
    return;
  }

  const html = layout.components.map(component => {
    const { id, type, props } = component;
    // props에서 스타일 객체를 가져와 문자열로 변환합니다.
    const styleString = toStyleString(props.style);

    switch (type) {
      case 'Header':
        // data-editable 속성을 추가하여 편집 가능함을 표시하고,
        // data-component-id와 data-prop-name으로 어떤 데이터를 수정해야 하는지 명시합니다.
        return `<header class="component-header" data-id="${id}">
                  <h1 data-editable="true" data-component-id="${id}" data-prop-name="title" style="${styleString}">${props.title || ''}</h1>
                </header>`;
      case 'Hero':
        // Hero 섹션의 경우, 스타일을 섹션 전체에 적용해 보겠습니다.
        return `<section class="component-hero" data-id="${id}" style="${styleString}">
                  <h2 data-editable="true" data-component-id="${id}" data-prop-name="headline">${props.headline || ''}</h2>
                  <p data-editable="true" data-component-id="${id}" data-prop-name="cta">${props.cta || ''}</p>
                </section>`;
      case 'Footer':
        return `<footer class="component-footer" data-id="${id}">
                  <p data-editable="true" data-component-id="${id}" data-prop-name="text" style="${styleString}">${props.text || ''}</p>
                </footer>`;
      default:
        return `<div class="component-unknown" data-id="${id}"><p>Unknown component type: <strong>${type}</strong></p></div>`;
    }
  }).join('');

  canvasEl.innerHTML = html;
}

saveBtn.addEventListener('click', async () => {
  setStatus('Saving…');
  // HTML 대신, 현재 layout JSON 객체를 서버로 전송
  if (!currentLayout) {
    setStatus('Save failed: No layout data');
    return;
  }

  const payload = { layout: currentLayout };

  try {
    const res = await fetch(`${API_BASE_URL}/api/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setStatus(`Saved (${data.versionId})`);
    track({ type: 'editor:save', versionId: data.versionId });
  } catch (e) {
    setStatus('Save failed');
  }
});

const generateDummySuggestionBtn = document.getElementById('generateDummySuggestionBtn');
if (generateDummySuggestionBtn) {
  generateDummySuggestionBtn.addEventListener('click', async () => {
    setStatus('Generating dummy suggestion...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-dummy-suggestion`, { method: 'POST' });
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
    const component = currentLayout.components.find(c => c.id === componentId);
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
      const componentToUpdate = currentLayout.components.find(c => c.id === componentId);
      if (componentToUpdate) {
        componentToUpdate.props[propName] = newValue;
        console.log('Updated layout:', currentLayout); // 데이터 변경 확인용 로그
      }
    }

    // 3c. 입력 상자를 제거하고, 원래 요소를 다시 보여줍니다.
    input.remove();
    element.style.display = '';
    setStatus('Ready');
    track({ type: 'editor:change', details: { componentId, propName, newValue } });
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
    await fetch(`${API_BASE_URL}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: batch }) });
  } catch (_) {
    // ignore errors for mock
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- 채팅 UI 로직 추가 ---
chatSendBtn.addEventListener('click', handleChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleChatMessage();
  }
});

/**
 * 채팅 메시지 전송을 처리합니다.
 */
async function handleChatMessage() { // Made async
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
      } else if (Array.isArray(layoutChanges)) { // If layoutChanges is an array of updates
        layoutChanges.forEach(change => {
          if (change.type === 'update' && change.id) {
            const index = currentLayout.components.findIndex(c => c.id === change.id);
            if (index !== -1) {
              currentLayout.components[index] = { ...currentLayout.components[index], ...change.payload };
            }
          } else if (change.type === 'add') {
            currentLayout.components.push(change.payload);
          }
          // Add more change types (e.g., 'remove') as needed
        });
      }
      renderLayout(currentLayout); // Re-render the page with updated layout
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

// --- 패널 토글 로직 추가 ---
togglePanelBtn.addEventListener('click', () => {
  layoutEl.classList.toggle('panel-left');
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
    const suggestionToApply = suggestions.find(s => s.id === suggestionId);

    if (suggestionToApply && suggestionToApply.content) {
      const change = suggestionToApply.content;
      if (change.type === 'update' && change.id) {
        const index = currentLayout.components.findIndex(c => c.id === change.id);
        if (index !== -1) {
          // Deep merge props to avoid overwriting existing ones
          const originalComponent = currentLayout.components[index];
          const newProps = { ...originalComponent.props, ...change.payload.props };
          if (change.payload.props.style) {
            newProps.style = { ...originalComponent.props.style, ...change.payload.props.style };
          }
          currentLayout.components[index] = { ...originalComponent, props: newProps };
        }
      } else if (change.type === 'add') {
        currentLayout.components.push(change.payload);
      }
      renderLayout(currentLayout);
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
