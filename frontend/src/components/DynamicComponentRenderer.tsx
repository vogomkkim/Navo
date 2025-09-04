'use client';

import parse, { DOMNode } from 'html-react-parser';

import { useLayoutContext } from '@/app/context/LayoutContext';
import { EditableText } from '@/components/ui/EditableText';

interface LayoutComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  // VFS introduces a new 'content' field for raw HTML/template
  content?: string;
}

interface DynamicComponentRendererProps {
  component: LayoutComponent;
}

export function DynamicComponentRenderer({
  component,
}: DynamicComponentRendererProps) {
  const { updateComponentProp } = useLayoutContext();

  // In VFS, the component's template comes directly from the node's content.
  // We no longer need a separate 'component definition'.
  let renderedHtml = component.content || '';

  // Fallback rendering if content is empty
  if (!renderedHtml) {
    return (
      <div className="component-fallback" data-id={component.id}>
        <div className="fallback-header">
          <h3 className="text-lg font-medium text-gray-900">
            {component.props.title || component.type}
          </h3>
        </div>
        <div className="fallback-info text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
          <span>📝 {component.type} (Content is empty)</span>
        </div>
      </div>
    );
  }

  // Placeholder substitution logic remains the same
  const allProps = { id: component.id, ...component.props };
  Object.entries(allProps).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    renderedHtml = renderedHtml.replace(placeholder, String(value ?? ''));
  });

  const replace = (node: DOMNode) => {
    if (
      node.type === 'tag' &&
      node.attribs &&
      node.attribs['data-editable'] === 'true'
    ) {
      const propName = node.attribs['data-prop-name'];
      if (propName && component.props[propName] !== undefined) {
        return (
          <EditableText
            initialText={String(component.props[propName])}
            onSave={(newText) => {
              updateComponentProp(component.id, propName, newText);
            }}
          />
        );
      }
    }
  };

  return (
    <div data-id={component.id}>{parse(renderedHtml, { replace })}</div>
  );
}