import { renderLayout, loadComponentDefinitions } from './components.js';
import { checkAuth, handleLogout } from './modules/auth.js';
import * as ui from './modules/ui.js';
import { api } from './modules/api.js';
import { track, setupGlobalErrorHandling } from './modules/events.js';
import DOMPurify from 'dompurify';

// --- State ---
type Layout = { components: Array<{ id: string; type: string; props: Record<string, any> } > } | null;
let currentLayout: Layout = null;

// --- Initialization ---
function init() {
    const token = checkAuth();
    if (!token) return;

    setupGlobalErrorHandling();
    addEventListeners();
    loadInitialData();
}

async function loadInitialData() {
    ui.setStatus('Loading components and draft…');
    try {
        await loadComponentDefinitions();
        const data = await api.getDraft();
        currentLayout = (data?.draft?.layout as any) ?? null;
        if (ui.canvasEl) ui.canvasEl.innerHTML = DOMPurify.sanitize(renderLayout(currentLayout as any));
        if (ui.infoEl) ui.infoEl.textContent = `Draft loaded in ${data.tookMs ?? 0} ms`;
        ui.setStatus('Ready');
        track({ type: 'view:page', page: 'editor' });
        // TODO: Re-implement suggestions, projects, and components loading
    } catch (e: any) {
        ui.setStatus(`Failed to load draft: ${e?.message || 'Unknown error'}`);
        console.error(e);
    }
}

// --- Event Listeners ---
function addEventListeners() {
    if (ui.logoutBtn) ui.logoutBtn.addEventListener('click', handleLogout);
    if (ui.logoutBtnMobile) ui.logoutBtnMobile.addEventListener('click', handleLogout);

    if (ui.profileToggle && ui.profileMenu) {
        ui.profileToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = ui.profileMenu!.classList.toggle('open');
          ui.profileToggle!.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            ui.closeSuggestionsPanel();
            ui.closeMobilePanel();
        }
    });

    if (ui.saveBtn) ui.saveBtn.addEventListener('click', async () => {
        ui.setStatus('Saving…');
        if (!currentLayout) {
            ui.setStatus('Save failed: No layout data');
            return;
        }
        try {
            const data = await api.saveDraft(currentLayout as any);
            ui.setStatus(`Saved (${data.versionId})`);
            track({ type: 'editor:save', versionId: data.versionId });
        } catch (e) {
            ui.setStatus('Save failed');
        }
    });

    if (ui.canvasEl) ui.canvasEl.addEventListener('click', (ev) => {
        const target = ev.target as HTMLElement | null;
        if (target && (target as any).dataset?.editable === 'true') {
            handleTextEdit(target as HTMLElement);
            return;
        }
        const componentEl = target?.closest?.('[data-id]') as HTMLElement | null;
        if (componentEl) {
            const componentId = (componentEl as any).dataset.id as string | undefined;
            const component = currentLayout && componentId ? currentLayout.components.find((c) => c.id === componentId) : undefined;
            track({
                type: 'click:component',
                componentId: componentId,
                componentType: component?.type || 'unknown',
                target: target?.tagName || 'UNKNOWN',
            });
        } else {
            track({ type: 'click:canvas', target: target?.tagName || 'UNKNOWN' });
        }
    });

    if (ui.togglePanelBtn) {
        ui.togglePanelBtn.addEventListener('click', ui.togglePanel);
    }

    if (ui.panelOverlayEl) {
        ui.panelOverlayEl.addEventListener('click', ui.closeMobilePanel);
    }

    window.addEventListener('resize', () => {
        if (!ui.isMobile()) {
            ui.closeMobilePanel();
        }
    });

    ui.initializeToggleSections();
    ui.setupMobileAccordions();
}

function handleTextEdit(element: HTMLElement) {
    element.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = (element.textContent || '').trim();
    input.className = 'inline-editor';
  
    const style = window.getComputedStyle(element);
    input.style.fontSize = style.fontSize;
    input.style.fontWeight = style.fontWeight;
    input.style.fontFamily = style.fontFamily;
    input.style.lineHeight = style.lineHeight;
    input.style.letterSpacing = style.letterSpacing;
    input.style.padding = style.padding;
    input.style.margin = style.margin;
    input.style.width = style.width;
    input.style.border = '1px solid #007bff';
    input.style.outline = 'none';

    element.parentNode?.insertBefore(input, element.nextSibling);
    input.focus();
  
    const finishEditing = () => {
      const newValue = input.value;
      element.textContent = newValue;
  
      const componentId = (element as any).dataset?.componentId as string | undefined;
      const propName = (element as any).dataset?.propName as string | undefined;
  
      if (currentLayout && componentId && propName) {
        const componentToUpdate = currentLayout.components.find(
          (c) => c.id === componentId
        );
        if (componentToUpdate) {
          componentToUpdate.props[propName] = newValue;
        }
      }
  
      input.remove();
      element.style.display = '';
      ui.setStatus('Ready');
      track({
        type: 'editor:change',
        details: { componentId, propName, newValue },
      });
    };
  
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        input.remove();
        element.style.display = '';
        ui.setStatus('Ready');
      }
    });
}

// --- Run --- 
init();
