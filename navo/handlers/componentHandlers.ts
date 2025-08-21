import { Request, Response } from 'express';
import { prisma } from '../db/db.js';

/**
 * Get all available component definitions
 */
export async function handleGetComponentDefinitions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const components = await prisma.component_definitions.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        display_name: true,
        description: true,
        category: true,
        props_schema: true,
        render_template: true,
        css_styles: true,
      },
      orderBy: [{ category: 'asc' }, { display_name: 'asc' }],
    });

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

    const component = await prisma.component_definitions.findUnique({
      where: { name, is_active: true },
    });

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
      await prisma.component_definitions.upsert({
        where: { name: component.name },
        update: component,
        create: component,
      });
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
