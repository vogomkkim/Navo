// Component rendering logic for user-defined components
// This file handles the rendering of different component types

// Component registry to store loaded component definitions
let componentRegistry = new Map();

/**
 * Convert style object to CSS string
 */
function toStyleString(styleObject) {
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
async function loadComponentDefinitions() {
  try {
    const response = await fetch('/api/components');
    if (!response.ok) {
      throw new Error(`Failed to load components: ${response.status}`);
    }

    const data = await response.json();
    if (data.ok && data.components) {
      // Store components in registry
      data.components.forEach((comp) => {
        console.log(
          'Loading component:',
          comp.name,
          'template:',
          comp.render_template
        );
        componentRegistry.set(comp.name, comp);
      });

      console.log(`Loaded ${data.components.length} component definitions`);
    } else {
      console.error('Failed to load components:', data);
    }
  } catch (error) {
    console.error('Error loading component definitions:', error);
  }
}

/**
 * Render a single component based on its type and props
 */
function renderComponent(component) {
  const { id, type, props } = component;
  const styleString = toStyleString(props.style);

  // Try to get component definition from registry
  const componentDef = componentRegistry.get(type);

  if (componentDef && componentDef.render_template) {
    // Use the template from database
    return renderFromTemplate(componentDef.render_template, {
      id,
      ...props,
      style: styleString,
    });
  }

  // Fallback to hardcoded components for backward compatibility
  switch (type) {
    case 'Header':
      return `<header class="component-header" data-id="${id}">
              <h1 data-editable="true" data-component-id="${id}" data-prop-name="title" style="${styleString}">${props.title || ''}</h1>
            </header>`;

    case 'Hero':
      return `<section class="component-hero" data-id="${id}" style="${styleString}">
              <h2 data-editable="true" data-component-id="${id}" data-prop-name="headline">${props.headline || ''}</h2>
              <p data-editable="true" data-component-id="${id}" data-prop-name="cta">${props.cta || ''}</p>
            </section>`;

    case 'Footer':
      return `<footer class="component-footer" data-id="${id}">
              <p data-editable="true" data-component-id="${id}" data-prop-name="text" style="${styleString}">${props.text || ''}</p>
            </footer>`;

    case 'AuthForm':
      return `<div class="component-auth-form" data-id="${id}" style="${styleString}">
              <form class="auth-form">
                <h3 data-editable="true" data-component-id="${id}" data-prop-name="title">${props.title || 'Login'}</h3>
                <input type="email" placeholder="${props.emailPlaceholder || 'Email'}" class="auth-input" />
                <input type="password" placeholder="${props.passwordPlaceholder || 'Password'}" class="auth-input" />
                <button type="submit" class="auth-button">${props.buttonText || 'Sign In'}</button>
              </form>
            </div>`;

    default:
      return `<div class="component-unknown" data-id="${id}"><p>Unknown component type: <strong>${type}</strong></p></div>`;
  }
}

/**
 * Render component from template string with variable substitution
 */
function renderFromTemplate(template, props) {
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
    result = result.replace(placeholder, safeValue);
  });

  return result;
}

/**
 * Render the entire layout by rendering all components
 */
function renderLayout(layout) {
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
};
