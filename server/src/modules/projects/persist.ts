import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { InferSelectModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { pages, components, componentDefinitions } from '@/schema';
// Temporary stub: replace with real AI generation
async function generateLayoutComponentsForPage(_args: { path: string; name?: string; description?: string | null }) {
  return [] as any[];
}

function inferLayoutFromPath(path?: string): string {
  if (!path || path === '/') return 'home';
  if (path.startsWith('/login') || path.startsWith('/signup')) return 'auth';
  if (path.startsWith('/admin')) return 'dashboard';
  if (path.startsWith('/feed')) return 'feed';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/create')) return 'composer';
  if (path.startsWith('/post')) return 'detail';
  if (path.startsWith('/discover')) return 'explore';
  if (path.includes('/products') || path.includes('/list')) return 'catalog';
  return 'default';
}

// Store pages within a transaction
export async function storePages(
  tx: PostgresJsDatabase<any>,
  projectId: string,
  pageData: any[]
): Promise<InferSelectModel<typeof pages>[]> {
  const savedPages: InferSelectModel<typeof pages>[] = [];

  for (const page of pageData) {
    // Step 1: persist pages as-is (do not infer layout here)
    const layoutJson = {
      layout: page.layoutJson?.layout ?? undefined,
      metadata: page.layoutJson?.metadata ?? {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Agent',
      },
      components: page.layoutJson?.components ?? [],
    } as any;

    const savedPage = await tx
      .insert(pages)
      .values({
        projectId,
        path: page.path,
        name: page.name,
        layoutJson,
      })
      .returning();

    savedPages.push(savedPage[0]);
  }

  return savedPages;
}

// Step 2 in DAG: assign layout after pages exist
export async function assignLayoutsForPages(
  tx: PostgresJsDatabase<any>,
  savedPages: InferSelectModel<typeof pages>[]
): Promise<void> {
  for (const page of savedPages) {
    const current = (page.layoutJson as any) || {};
    const currentLayout = current.layout as string | undefined;
    const nextLayout =
      currentLayout && currentLayout !== 'default'
        ? currentLayout
        : inferLayoutFromPath(page.path);

    // If page has no components, generate per-page components with LLM
    const hasComponents =
      Array.isArray(current.components) && current.components.length > 0;
    const synthesizedComponents = !hasComponents
      ? await generateLayoutComponentsForPage({
          path: page.path || '/',
          name: (page as any).name,
          description: (page as any).description,
        })
      : undefined;

    const nextLayoutJson = {
      ...current,
      layout: nextLayout,
      ...(synthesizedComponents ? { components: synthesizedComponents } : {}),
    };

    await tx
      .update(pages)
      .set({ layoutJson: nextLayoutJson })
      .where(eq(pages.id, page.id));
  }
}

// Store component definitions within a transaction
export async function storeComponentDefinitions(
  tx: PostgresJsDatabase<any>,
  projectId: string,
  componentData: any[]
): Promise<InferSelectModel<typeof componentDefinitions>[]> {
  const savedDefs: InferSelectModel<typeof componentDefinitions>[] = [];

  for (const component of componentData) {
    const savedComponent = await tx
      .insert(componentDefinitions)
      .values({
        projectId,
        name: component.type,
        displayName: component.displayName,
        category: component.category,
        propsSchema: component.propsSchema,
        renderTemplate: component.renderTemplate,
        cssStyles: component.cssStyles,
      })
      .returning();

    savedDefs.push(savedComponent[0]);
  }

  return savedDefs;
}

// Create page component instances within a transaction and sync layoutJson.components
export async function storePageComponents(
  tx: PostgresJsDatabase<any>,
  savedPages: InferSelectModel<typeof pages>[],
  savedDefs: InferSelectModel<typeof componentDefinitions>[]
): Promise<InferSelectModel<typeof components>[]> {
  const savedInst: InferSelectModel<typeof components>[] = [];

  for (const page of savedPages) {
    if (page.layoutJson && (page.layoutJson as any).components) {
      const comps: any[] = (page.layoutJson as any).components;
      for (let i = 0; i < comps.length; i++) {
        const pageComponent = comps[i];
        const componentDef = savedDefs.find(
          (def) => def.name === pageComponent.type
        );

        if (componentDef) {
          const savedComponent = await tx
            .insert(components)
            .values({
              pageId: page.id,
              componentDefinitionId: componentDef.id,
              props: pageComponent.props || {},
              orderIndex: i,
            })
            .returning();

          savedInst.push(savedComponent[0]);
        }
      }
    }

    const pageComponents = await tx
      .select({
        id: components.id,
        props: components.props,
        orderIndex: components.orderIndex,
        componentName: componentDefinitions.name,
      })
      .from(components)
      .innerJoin(
        componentDefinitions,
        eq(components.componentDefinitionId, componentDefinitions.id)
      )
      .where(eq(components.pageId, page.id))
      .orderBy(components.orderIndex);

    const layoutComponents = pageComponents.map((comp) => ({
      type: comp.componentName,
      props: comp.props,
    }));

    const nextLayoutJson = {
      ...((page.layoutJson as any) || {}),
      components: layoutComponents,
    };

    await tx
      .update(pages)
      .set({ layoutJson: nextLayoutJson })
      .where(eq(pages.id, page.id));
  }

  return savedInst;
}
