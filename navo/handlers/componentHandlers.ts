import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { componentDefinitions } from '../db/schema.js';
import { and, asc, desc, eq } from 'drizzle-orm';

/**
 * Get all available component definitions
 */
export async function handleGetComponentDefinitions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const components = await db
      .select({
        id: componentDefinitions.id,
        name: componentDefinitions.name,
        display_name: componentDefinitions.displayName,
        description: componentDefinitions.description,
        category: componentDefinitions.category,
        props_schema: componentDefinitions.propsSchema,
        render_template: componentDefinitions.renderTemplate,
        css_styles: componentDefinitions.cssStyles,
      })
      .from(componentDefinitions)
      .where(eq(componentDefinitions.isActive, true))
      .orderBy(asc(componentDefinitions.category), asc(componentDefinitions.displayName));

    res.json({ ok: true, components });
  } catch (error) {
    console.error('Error fetching component definitions:', error);
    res
      .status(500)
      .json({ ok: false, error: 'Failed to fetch component definitions' });
  }
}

/**
 * Get a specific component definition by name
 */
export async function handleGetComponentDefinition(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name } = req.params;

    const rows = await db
      .select()
      .from(componentDefinitions)
      .where(and(eq(componentDefinitions.name, name), eq(componentDefinitions.isActive, true)))
      .limit(1);

    const component = rows[0];

    if (!component) {
      res.status(404).json({ ok: false, error: 'Component not found' });
      return;
    }

    res.json({ ok: true, component });
  } catch (error) {
    console.error('Error fetching component definition:', error);
    res
      .status(500)
      .json({ ok: false, error: 'Failed to fetch component definition' });
  }
}

/**
 * Seed default component definitions
 */
/**
 * Create a new component definition
 */
export async function handleCreateComponentDefinition(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      name,
      display_name,
      description,
      category,
      props_schema,
      render_template,
      css_styles,
    } = req.body;

    if (!name || !display_name || !render_template) {
      res.status(400).json({
        ok: false,
        error: 'Name, display_name, and render_template are required',
      });
      return;
    }

    // Check if component with same name already exists
    const existing = await db
      .select({ id: componentDefinitions.id })
      .from(componentDefinitions)
      .where(eq(componentDefinitions.name, name))
      .limit(1);

    if (existing[0]) {
      res.status(400).json({
        ok: false,
        error: 'Component with this name already exists',
      });
      return;
    }

    // Create new component definition
    const created = await db
      .insert(componentDefinitions)
      .values({
        name,
        displayName: display_name,
        description: description || '',
        category: category || 'custom',
        propsSchema: props_schema || { type: 'object', properties: {} },
        renderTemplate: render_template,
        cssStyles: css_styles || '',
        isActive: true,
      })
      .returning();

    res.json({
      ok: true,
      message: 'Component definition created successfully',
      component: created[0],
    });
  } catch (error) {
    console.error('Error creating component definition:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create component definition',
    });
  }
}

/**
 * Update an existing component definition
 */
export async function handleUpdateComponentDefinition(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      display_name,
      description,
      category,
      props_schema,
      render_template,
      css_styles,
      is_active,
    } = req.body;

    const updated = await db
      .update(componentDefinitions)
      .set({
        displayName: display_name,
        description,
        category,
        propsSchema: props_schema,
        renderTemplate: render_template,
        cssStyles: css_styles,
        isActive: is_active,
        updatedAt: new Date(),
      })
      .where(eq(componentDefinitions.id, id))
      .returning();

    res.json({
      ok: true,
      message: 'Component definition updated successfully',
      component: updated[0],
    });
  } catch (error) {
    console.error('Error updating component definition:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update component definition',
    });
  }
}

/**
 * Delete a component definition
 */
export async function handleDeleteComponentDefinition(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    await db.delete(componentDefinitions).where(eq(componentDefinitions.id, id));

    res.json({
      ok: true,
      message: 'Component definition deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting component definition:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete component definition',
    });
  }
}

export async function handleSeedComponentDefinitions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const defaultComponents = [
      {
        name: 'Header',
        display_name: 'Header',
        description: 'Page header with title',
        category: 'basic',
        props_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', title: 'Title' },
            subtitle: { type: 'string', title: 'Subtitle' },
            style: { type: 'object', title: 'Styles' },
          },
        },
        render_template:
          '<header class="component-header" data-id="{{id}}"><h1 data-editable="true" data-component-id="{{id}}" data-prop-name="title" style="{{style}}">{{title}}</h1></header>',
        css_styles: '.component-header { padding: 1rem; background: #f8f9fa; }',
      },
      {
        name: 'Hero',
        display_name: 'Hero Section',
        description: 'Hero section with headline and CTA',
        category: 'basic',
        props_schema: {
          type: 'object',
          properties: {
            headline: { type: 'string', title: 'Headline' },
            cta: { type: 'string', title: 'Call to Action' },
            style: { type: 'object', title: 'Styles' },
          },
        },
        render_template:
          '<section class="component-hero" data-id="{{id}}" style="{{style}}"><h2 data-editable="true" data-component-id="{{id}}" data-prop-name="headline">{{headline}}</h2><p data-editable="true" data-component-id="{{id}}" data-prop-name="cta">{{cta}}</p></section>',
        css_styles:
          '.component-hero { text-align: center; padding: 3rem 1rem; }',
      },
      {
        name: 'Footer',
        display_name: 'Footer',
        description: 'Page footer with text',
        category: 'basic',
        props_schema: {
          type: 'object',
          properties: {
            text: { type: 'string', title: 'Footer Text' },
            style: { type: 'object', title: 'Styles' },
          },
        },
        render_template:
          '<footer class="component-footer" data-id="{{id}}"><p data-editable="true" data-component-id="{{id}}" data-prop-name="text" style="{{style}}">{{text}}</p></footer>',
        css_styles:
          '.component-footer { padding: 1rem; background: #f8f9fa; text-align: center; }',
      },
      {
        name: 'AuthForm',
        display_name: 'Authentication Form',
        description: 'Login/Register form',
        category: 'forms',
        props_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', title: 'Form Title' },
            emailPlaceholder: { type: 'string', title: 'Email Placeholder' },
            passwordPlaceholder: {
              type: 'string',
              title: 'Password Placeholder',
            },
            buttonText: { type: 'string', title: 'Button Text' },
            style: { type: 'object', title: 'Styles' },
          },
        },
        render_template:
          '<div class="component-auth-form" data-id="{{id}}" style="{{style}}"><form class="auth-form"><h3 data-editable="true" data-component-id="{{id}}" data-prop-name="title">{{title}}</h3><input type="email" placeholder="{{emailPlaceholder}}" class="auth-input" /><input type="password" placeholder="{{passwordPlaceholder}}" class="auth-input" /><button type="submit" class="auth-button">{{buttonText}}</button></form></div>',
        css_styles:
          '.component-auth-form { max-width: 400px; margin: 0 auto; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }',
      },
    ];

    // Upsert components (create if not exists, update if exists)
    for (const component of defaultComponents) {
      const existing = await db
        .select({ id: componentDefinitions.id })
        .from(componentDefinitions)
        .where(eq(componentDefinitions.name, component.name))
        .limit(1);

      if (existing[0]) {
        await db
          .update(componentDefinitions)
          .set({
            displayName: component.display_name,
            description: component.description || '',
            category: component.category || 'custom',
            propsSchema: component.props_schema,
            renderTemplate: component.render_template,
            cssStyles: component.css_styles || '',
            isActive: true,
          })
          .where(eq(componentDefinitions.id, existing[0].id));
      } else {
        await db.insert(componentDefinitions).values({
          name: component.name,
          displayName: component.display_name,
          description: component.description || '',
          category: component.category || 'custom',
          propsSchema: component.props_schema,
          renderTemplate: component.render_template,
          cssStyles: component.css_styles || '',
          isActive: true,
        });
      }
    }

    res.json({
      ok: true,
      message: `Seeded ${defaultComponents.length} component definitions`,
      components: defaultComponents.length,
    });
  } catch (error) {
    console.error('Error seeding component definitions:', error);
    res
      .status(500)
      .json({ ok: false, error: 'Failed to seed component definitions' });
  }
}
