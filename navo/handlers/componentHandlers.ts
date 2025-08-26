import { FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  request: FastifyRequest,
  reply: FastifyReply
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
      .orderBy(
        asc(componentDefinitions.category),
        asc(componentDefinitions.displayName)
      );

    reply.send({ ok: true, components });
  } catch (error) {
    console.error('Error fetching component definitions:', error);
    reply
      .status(500)
      .send({ ok: false, error: 'Failed to fetch component definitions' });
  }
}

/**
 * Get a specific component definition by name
 */
export async function handleGetComponentDefinition(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { name } = request.params as { name: string };

    const rows = await db
      .select()
      .from(componentDefinitions)
      .where(
        and(
          eq(componentDefinitions.name, name),
          eq(componentDefinitions.isActive, true)
        )
      )
      .limit(1);

    const component = rows[0];

    if (!component) {
      reply.status(404).send({ ok: false, error: 'Component not found' });
      return;
    }

    reply.send({ ok: true, component });
  } catch (error) {
    console.error('Error fetching component definition:', error);
    reply
      .status(500)
      .send({ ok: false, error: 'Failed to fetch component definition' });
  }
}

/**
 * Create a new component definition
 */
export async function handleCreateComponentDefinition(
  request: FastifyRequest,
  reply: FastifyReply
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
    } = request.body as {
      name: string;
      display_name: string;
      description?: string;
      category?: string;
      props_schema?: any;
      render_template: string;
      css_styles?: string;
    };

    if (!name || !display_name || !render_template) {
      reply.status(400).send({
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
      reply.status(400).send({
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

    reply.send({
      ok: true,
      message: 'Component definition created successfully',
      component: created[0],
    });
  } catch (error) {
    console.error('Error creating component definition:', error);
    reply.status(500).send({
      ok: false,
      error: 'Failed to create component definition',
    });
  }
}

/**
 * Update an existing component definition
 */
export async function handleUpdateComponentDefinition(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.params as { id: string };
    const {
      display_name,
      description,
      category,
      props_schema,
      render_template,
      css_styles,
      is_active,
    } = request.body as {
      display_name?: string;
      description?: string;
      category?: string;
      props_schema?: any;
      render_template?: string;
      css_styles?: string;
      is_active?: boolean;
    };

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

    reply.send({
      ok: true,
      message: 'Component definition updated successfully',
      component: updated[0],
    });
  } catch (error) {
    console.error('Error updating component definition:', error);
    reply.status(500).send({
      ok: false,
      error: 'Failed to update component definition',
    });
  }
}

/**
 * Delete a component definition
 */
export async function handleDeleteComponentDefinition(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id } = request.params as { id: string };

    await db
      .delete(componentDefinitions)
      .where(eq(componentDefinitions.id, id));

    reply.send({
      ok: true,
      message: 'Component definition deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting component definition:', error);
    reply.status(500).send({
      ok: false,
      error: 'Failed to delete component definition',
    });
  }
}

export async function handleSeedComponentDefinitions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const jsonPath = path.resolve(
      process.cwd(),
      'navo/data/default-components.json'
    );
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const defaultComponents: ComponentDefinition[] = JSON.parse(jsonData);

    const valuesToInsert = defaultComponents.map(
      (component: ComponentDefinition) => ({
        name: component.name,
        displayName: component.display_name,
        description: component.description || '',
        category: component.category || 'custom',
        propsSchema: component.props_schema,
        renderTemplate: component.render_template,
        cssStyles: component.css_styles || '',
        isActive: true,
      })
    );

    // This requires a PostgreSQL database for the onConflictDoUpdate feature.
    // This will insert new components and update existing ones based on the name.
    await db
      .insert(componentDefinitions)
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
        },
      });

    reply.send({
      ok: true,
      message: `Seeded ${defaultComponents.length} component definitions`,
      components: defaultComponents.length,
    });
  } catch (error) {
    console.error('Error seeding component definitions:', error);
    reply
      .status(500)
      .send({ ok: false, error: 'Failed to seed component definitions' });
  }
}

/**
 * Generate a component definition from natural language using Gemini
 */
export async function handleGenerateComponentFromNaturalLanguage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { description } = request.body as { description?: string };
    if (!description || typeof description !== 'string') {
      reply.status(400).send({ ok: false, error: 'description is required' });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Generate ONE UI component definition as strict JSON with fields: name, display_name, description, category, props_schema (JSON Schema), render_template (HTML with {{placeholders}} including data-id=\"{{id}}\"), css_styles. User description: ${description}`;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
    }
    const generated = JSON.parse(text);
    reply.send({ ok: true, component: generated });
  } catch (error) {
    console.error('Error generating component from natural language:', error);
    reply.status(500).send({ ok: false, error: 'Failed to generate component' });
  }
}
