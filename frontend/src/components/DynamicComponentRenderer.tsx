'use client';

import { useComponentDefinitions } from '@/app/context/ComponentDefinitionContext';
import { useLayoutContext } from '@/app/context/LayoutContext'; // Import useLayoutContext
import parse, { DOMNode } from 'html-react-parser';
import { EditableText } from '@/components/ui/EditableText';

interface LayoutComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

interface DynamicComponentRendererProps {
  component: LayoutComponent;
}

export function DynamicComponentRenderer({
  component,
}: DynamicComponentRendererProps) {
  const { componentRegistry, isLoading, isError, error } =
    useComponentDefinitions();
  const { updateComponentProp } = useLayoutContext(); // Move this to the top level

  if (isLoading) {
    return (
      <div className="component-placeholder">
        Loading component definitions...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="component-placeholder">
        Error loading component definitions: {error?.message}
      </div>
    );
  }

  const componentDef = componentRegistry.get(component.type);

  if (!componentDef) {
    // 폴백 렌더링: 정의되지 않은 컴포넌트를 기본 UI로 표시
    return (
      <div className="component-fallback" data-id={component.id}>
        <div className="fallback-header">
          <h3 className="text-lg font-medium text-gray-900">
            {component.props.title ||
              component.props.headline ||
              component.type}
          </h3>
          {component.props.subtitle && (
            <p className="text-sm text-gray-600 mt-1">
              {component.props.subtitle}
            </p>
          )}
        </div>

        <div className="fallback-content">
          {component.props.message && (
            <p className="text-gray-700 mb-3">{component.props.message}</p>
          )}

          {component.props.content && (
            <div className="text-gray-600">{component.props.content}</div>
          )}

          {component.props.cta && (
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              {component.props.cta}
            </button>
          )}
        </div>

        <div className="fallback-info text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
          <span>📝 {component.type} 컴포넌트 (폴백 모드)</span>

          {/* 디버깅 정보 */}
          <details className="mt-2">
            <summary className="cursor-pointer">🔍 컴포넌트 디버깅</summary>
            <div className="mt-2 text-left">
              <p>
                <strong>컴포넌트 타입:</strong> {component.type}
              </p>
              <p>
                <strong>컴포넌트 ID:</strong> {component.id}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <p>
                  <strong>Props:</strong>
                </p>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(component.props, null, 2)
                    )
                  }
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                  title="Props 복사하기"
                >
                  📋
                </button>
              </div>
              <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto max-h-32">
                {JSON.stringify(component.props, null, 2)}
              </pre>

              <div className="flex items-center gap-2 mt-2">
                <p>
                  <strong>사용 가능한 컴포넌트:</strong>
                </p>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      Array.from(componentRegistry.keys()).join(', ') || '없음'
                    )
                  }
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                  title="컴포넌트 목록 복사하기"
                >
                  📋
                </button>
              </div>
              <p className="text-xs">
                {Array.from(componentRegistry.keys()).join(', ') || '없음'}
              </p>
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Implement placeholder substitution
  let renderedHtml = componentDef.render_template || '';
  const allProps = { id: component.id, ...component.props };

  Object.entries(allProps).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    // HTML 문자열인지 확인 (features 같은 경우)
    if (
      typeof value === 'string' &&
      value.includes('<') &&
      value.includes('>')
    ) {
      // HTML 문자열인 경우 이스케이프하지 않음
      renderedHtml = renderedHtml.replace(placeholder, value);
    } else {
      // 일반 텍스트인 경우 이스케이프
      const safeValue =
        value !== undefined && value !== null ? String(value) : '';
      renderedHtml = renderedHtml.replace(placeholder, escapeHtml(safeValue));
    }
  });

  // Utility function to escape HTML for safe display (copied from navo/web/components.ts)
  function escapeHtml(text: unknown): string {
    if (text === null || text === undefined) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  const replace = (node: DOMNode) => {
    if (
      node.type === 'tag' &&
      node.attribs &&
      node.attribs['data-editable'] === 'true'
    ) {
      const propName = node.attribs['data-prop-name']; // Assuming a new attribute to identify the prop

      // Safely access text content from children
      let initialText = '';
      if (node.children && node.children.length > 0) {
        const firstChild = node.children[0];
        if (firstChild.type === 'text') {
          initialText = firstChild.data || '';
        }
      }

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
    <>
      {componentDef.css_styles && (
        <style dangerouslySetInnerHTML={{ __html: componentDef.css_styles }} />
      )}
      <div data-id={component.id}>{parse(renderedHtml, { replace })}</div>
    </>
  );
}
