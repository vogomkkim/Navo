// Component rendering logic for user-defined components
// This file handles the rendering of different component types
import { api } from './modules/api';

// Component registry to store loaded component definitions
type ComponentDef = {
  name: string;
  display_name?: string;
  description?: string;
  category?: string;
  props_schema?: Record<string, unknown>;
  render_template?: string;
  css_styles?: string;
};

type LayoutComponent = {
  id: string;
  type: string;
  props: Record<string, any>;
};

type Layout = {
  components: LayoutComponent[];
};

let componentRegistry: Map<string, ComponentDef> = new Map();

// Utility function to escape HTML for safe display
function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Convert style object to CSS string
 */
function toStyleString(
  styleObject: Record<string, unknown> | undefined | null
): string {
  if (!styleObject || typeof styleObject !== 'object') return '';

  return Object.entries(styleObject)
    .map(
      ([key, value]) =>
        `${key.replace(/([A-Z])/g, ' -$1').toLowerCase()}:${value}`
    )
    .join(';');
}

/**
 * Load component definitions from the server
 */
async function loadComponentDefinitions(): Promise<void> {
  try {
    const data = await api.listComponents();
    if (data.ok && data.components) {
      // Store components in registry
      (data.components as ComponentDef[]).forEach((comp) => {
        componentRegistry.set(comp.name, comp);
      });
      console.log(`Loaded ${data.components.length} component definitions`);
    } else {
      console.error('Failed to load components:', data);
    }
  } catch (error) {
    console.error('Error loading component definitions:', error);
    // Re-throw the error to allow the caller (app.ts) to handle it
    throw error;
  }
}

/**
 * Render a single component based on its type and props
 */
function renderComponent(component: LayoutComponent): string {
  const { id, type, props } = component;
  const styleString = toStyleString(props.style);

  // Try to get component definition from registry
  const componentDef = componentRegistry.get(type);

  if (componentDef && componentDef.render_template) {
    // Use the template from database
    return renderFromTemplate(componentDef.render_template!, {
      id,
      ...props,
      style: styleString,
    });
  }

  // If component is not in the registry, return an unknown component message.
  return `<div class="component-unknown" data-id="${id}"><p>Unknown component type: <strong>${escapeHtml(type)}</strong></p></div>`;
}

/**
 * Render component from template string with variable substitution
 */
function renderFromTemplate(
  template: string,
  props: Record<string, unknown>
): string {
  // Ensure template is a string
  if (typeof template !== 'string') {
    console.error('Template is not a string:', template);
    return '<div class="error">Invalid template</div>';
  }

  let result = template;

  // Replace {{variable}} placeholders with actual values
  Object.entries(props).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    // Convert value to string and handle undefined/null values
    const safeValue =
      value !== undefined && value !== null ? String(value) : '';
    result = result.replace(placeholder, escapeHtml(safeValue));
  });

  return result;
}

/**
 * Render the entire layout by rendering all components
 */
function renderLayout(layout: Layout | null): string {
  if (!layout || !Array.isArray(layout.components)) {
    return '<p class="error">Error: Invalid layout data received from API.</p>';
  }

  const html = layout.components.map(renderComponent).join('');

  return html;
}

// Export functions for use in other files
export {
  renderLayout,
  renderComponent,
  toStyleString,
  loadComponentDefinitions,
  renderFromTemplate,
  escapeHtml,
};
