import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { componentDefinitions } from '../db/schema.js';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';

interface ComponentDefinition {
    name: string;
    display_name: string;
    description: string;
    category: string;
    props_schema: any;
    render_template: string;
    css_styles: string;
}

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
    const jsonPath = path.resolve(process.cwd(), 'navo/data/default-components.json');
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const defaultComponents: ComponentDefinition[] = JSON.parse(jsonData);

    const valuesToInsert = defaultComponents.map((component: ComponentDefinition) => ({
        name: component.name,
        displayName: component.display_name,
        description: component.description || '',
        category: component.category || 'custom',
        propsSchema: component.props_schema,
        renderTemplate: component.render_template,
        cssStyles: component.css_styles || '',
        isActive: true,
    }));

    // This requires a PostgreSQL database for the onConflictDoUpdate feature.
    // This will insert new components and update existing ones based on the name.
    await db.insert(componentDefinitions)
        .values(valuesToInsert)
        .onConflictDoUpdate({
            target: componentDefinitions.name,
            set: {
                displayName: sql.raw(`excluded.display_name`),
                description: sql.raw(`excluded.description`),
                category: sql.raw(`excluded.category`),
                propsSchema: sql.raw(`excluded.props_schema`),
                renderTemplate: sql.raw(`excluded.render_template`),
                cssStyles: sql.raw(`excluded.css_styles`),
                isActive: sql.raw(`excluded.is_active`),
                updatedAt: new Date(),
            }
        });

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
