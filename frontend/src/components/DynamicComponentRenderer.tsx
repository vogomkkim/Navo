"use client";

import { useComponentDefinitions } from "@/app/context/ComponentDefinitionContext";
import { useLayoutContext } from "@/app/context/LayoutContext"; // Import useLayoutContext
import parse, { DOMNode } from "html-react-parser";
import { EditableText } from "@/components/ui/EditableText";

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
    return (
      <div className="component-unknown" data-id={component.id}>
        <h3>컴포넌트를 찾을 수 없습니다</h3>
        <p>
          <strong>요청된 타입:</strong> {component.type}
        </p>
        <p>
          <strong>사용 가능한 타입:</strong>{" "}
          {Array.from(componentRegistry.keys()).join(", ") || "없음"}
        </p>
        <p>
          <strong>컴포넌트 ID:</strong> {component.id}
        </p>
        <details>
          <summary>컴포넌트 속성 보기</summary>
          <pre>{JSON.stringify(component.props, null, 2)}</pre>
        </details>
        <div className="component-debug-info">
          <p>
            <strong>디버그 정보:</strong>
          </p>
          <ul>
            <li>컴포넌트 레지스트리 크기: {componentRegistry.size}</li>
            <li>로딩 상태: {isLoading ? "로딩 중" : "완료"}</li>
            <li>에러 상태: {isError ? "에러 발생" : "정상"}</li>
            {error && <li>에러 메시지: {error.message}</li>}
          </ul>
        </div>
      </div>
    );
  }

  // Implement placeholder substitution
  let renderedHtml = componentDef.render_template || "";
  const allProps = { id: component.id, ...component.props };

  Object.entries(allProps).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    // Basic HTML escaping for values
    const safeValue =
      value !== undefined && value !== null ? String(value) : "";
    renderedHtml = renderedHtml.replace(placeholder, escapeHtml(safeValue));
  });

  // Utility function to escape HTML for safe display (copied from navo/web/components.ts)
  function escapeHtml(text: unknown): string {
    if (text === null || text === undefined) {
      return "";
    }
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  const replace = (node: DOMNode) => {
    if (
      node.type === "tag" &&
      node.attribs &&
      node.attribs["data-editable"] === "true"
    ) {
      const propName = node.attribs["data-prop-name"]; // Assuming a new attribute to identify the prop

      // Safely access text content from children
      let initialText = "";
      if (node.children && node.children.length > 0) {
        const firstChild = node.children[0];
        if (firstChild.type === "text") {
          initialText = firstChild.data || "";
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
