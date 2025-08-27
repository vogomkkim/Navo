'use client';

import { DynamicComponentRenderer } from './DynamicComponentRenderer';

interface LayoutComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

interface Layout {
  components: LayoutComponent[];
}

interface LayoutRendererProps {
  layout: Layout | null;
}

export function LayoutRenderer({ layout }: LayoutRendererProps) {
  if (
    !layout ||
    !Array.isArray(layout.components) ||
    layout.components.length === 0
  ) {
    return (
      <p className="error">
        Error: Invalid layout data received from API or no components to render.
      </p>
    );
  }

  return (
    <>
      {layout.components.map((comp) => (
        <DynamicComponentRenderer key={comp.id} component={comp} />
      ))}
    </>
  );
}
