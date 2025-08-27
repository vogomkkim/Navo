import { FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/db.js';
import {
  events,
  suggestions as suggestionsTable,
  projects as projectsTable,
  componentDefinitions,
  pages,
} from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { scaffoldProject } from '../nodes/scaffoldProject.js'; // Added import

import createDOMPurify from 'dompurify';

// Initialize DOMPurify
const purify = createDOMPurify(); // Initialize without arguments for Node.js

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Utility: Create a URL/DB safe name from free text
 */
function slugifyName(input: string): string {
  const base = (input || 'custom-component')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const clipped = base.slice(0, 48) || 'component';
  return clipped.replace(/^-+|-+$/g, '') || 'component';
}

/**
 * Validate a generated component definition object minimally
 */
function validateGeneratedComponentDef(obj: any): {
  ok: boolean;
  error?: string;
} {
  if (!obj || typeof obj !== 'object')
    return { ok: false, error: 'Invalid object' };
  const requiredStringFields = ['name', 'display_name', 'render_template'];
  for (const f of requiredStringFields) {
    if (typeof obj[f] !== 'string' || obj[f].trim() === '') {
      return { ok: false, error: `Missing or invalid field: ${f}` };
    }
  }
  if (obj.css_styles != null && typeof obj.css_styles !== 'string') {
    return { ok: false, error: 'css_styles must be a string if provided' };
  }
  if (obj.props_schema != null && typeof obj.props_schema !== 'object') {
    return { ok: false, error: 'props_schema must be an object if provided' };
  }
  return { ok: true };
}

function sanitizeLayout(layout: any): any {
  if (!layout) return layout;

  const sanitizedLayout = JSON.parse(JSON.stringify(layout)); // Deep copy

  function traverse(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = purify.sanitize(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      }
    }
  }
  traverse(sanitizedLayout);
  return sanitizedLayout;
}

/**
 * Build prompt for natural language -> component definition JSON
 */
function buildNlToComponentPrompt(description: string): string {
  return `You are a UI component generator for a low-code website builder.
Given the user's natural language description, produce a SINGLE component definition as compact JSON.
Constraints:
- Output ONLY pure JSON, no backticks, no explanations.
- Use mustache-style placeholders in HTML template: {{id}}, {{propName}}.
- Keep HTML semantic and accessible.
- Include minimal, scoped CSS as one string (no <style> tag).
- props_schema must be a JSON Schema object describing editable props.

Required JSON shape:
{
  "name": string,                 // machine-safe unique name, PascalCase or simple-kebab is ok
  "display_name": string,         // human friendly
  "description": string,          // short description
  "category": string,             // e.g., "basic", "forms", "media"
  "props_schema": {
    "type": "object",
    "properties": { /* keys for props used in the template */ }
  },
  "render_template": string,      // HTML with {{placeholders}}, include data-id="{{id}}"
  "css_styles": string            // CSS rules targeting classes used in template
}

User description:
${description}
`;
}

export async function handleAiCommand(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { command, projectId } = request.body as any;
    const userId = request.userId;

    if (!command) {
      reply.status(400).send({ error: 'Command is required' });
      return;
    }

    // Process AI command and generate response
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(command);
    const response = result.response;
    const text = response.text();

    // Store the AI interaction
    await db.insert(events).values({
      projectId: projectId || null,
      userId,
      type: 'ai_command',
      data: { command, response: text },
    });

    reply.send({ response: text });
  } catch (error) {
    console.error('Error processing AI command:', error);
    reply.status(500).send({ error: 'Failed to process AI command' });
  }
}

export async function generateAiSuggestion(currentLayout: any): Promise<any> {
  console.log('[AI] Entering generateAiSuggestion', { currentLayout });
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an AI assistant that suggests improvements for web page layouts.
Analyze the provided currentLayout (a JSON object representing the page components).
Suggest ONE actionable improvement. The suggestion should be concise and focus on a single change.
The suggestion should be in the following JSON format:
{
  "type": "style" | "content" | "component", // Type of suggestion
  "content": { // The actual change to apply, matching the structure expected by the frontend
    "type": "update" | "add" | "remove",
    "id": "component_id", // If updating/removing
    "payload": { // The data for the change
      // e.g., for style update: { props: { style: { color: "blue" } } }
      // e.g., for content update: { props: { headline: "New Headline" } }
      // e.g., for add: { id: "new_id", type: "ComponentType", props: {} }
    },
    "description": "A brief, human-readable description of the suggestion."
  }
}

Example:
If the layout has a Header, suggest changing its background color.
If the layout has a Hero, suggest a different CTA text.

Current Layout: ${JSON.stringify(currentLayout, null, 2)}

Your suggestion:
`;

  try {
    console.log('[AI] Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    console.log('[AI] Gemini Suggestion Raw Response:', text);

    let parsedSuggestion;
    try {
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      }
      console.log('[AI] Attempting to parse Gemini response:', text);
      parsedSuggestion = JSON.parse(text);
      console.log(
        '[AI] Successfully parsed Gemini response.',
        parsedSuggestion
      );
    } catch (parseError) {
      console.error(
        '[AI] Failed to parse Gemini suggestion as JSON:',
        parseError
      );
      console.error('[AI] Raw Gemini suggestion text:', text);
      throw new Error('AI suggestion was not valid JSON.');
    }
    console.log('[AI] Exiting generateAiSuggestion - Success');
    return parsedSuggestion;
  } catch (err) {
    console.error('[AI] Error calling Gemini API for suggestion:', err);
    console.log('[AI] Exiting generateAiSuggestion - Failure');
    throw new Error('Failed to get suggestion from AI.');
  }
}

export async function generateAndStoreDummySuggestion(
  projectId: string
): Promise<void> {
  console.log('[AI] Entering generateAndStoreDummySuggestion');
  try {
    // Fetch the current layout from the draft API to pass to the AI
    console.log('[AI] Fetching current layout from /api/draft');
    const draftRes = await fetch(
      `http://localhost:${process.env.PORT}/api/draft`
    );
    const draftData = await draftRes.json();
    const currentLayout = draftData?.draft?.layout;

    if (!currentLayout) {
      console.error('[AI] Could not fetch current layout for AI suggestion.');
      return;
    }
    console.log('[AI] Successfully fetched current layout.');

    console.log('[AI] Generating AI suggestion...');
    const aiSuggestion = await generateAiSuggestion(currentLayout);
    console.log('[AI] AI suggestion generated:', aiSuggestion);

    try {
      await db.insert(suggestionsTable).values({
        projectId,
        type: aiSuggestion.type,
        content: aiSuggestion.content,
      });
      console.log('[AI] AI-generated suggestion stored successfully.');
    } catch (err) {
      console.error('[AI] Error storing AI-generated suggestion:', err);
    }
  } catch (err: any) {
    console.error('[AI] Error in generateAndStoreDummySuggestion:', err);
  }
  console.log('[AI] Exiting generateAndStoreDummySuggestion');
}

export async function handleGetSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, type, limit = 10, offset = 0 } = request.query as any;

    const rows = await db
      .select()
      .from(suggestionsTable)
      .where(
        sql`${
          projectId
            ? eq(suggestionsTable.projectId, projectId as string)
            : sql`true`
        } AND ${type ? eq(suggestionsTable.type, type as string) : sql`true`}`
      )
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(suggestionsTable.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    reply.status(500).send({ error: 'Failed to fetch suggestions' });
  }
}

export async function handleGenerateDummySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Use latest project owned by user as target for dummy suggestion if available
    const latestProject = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, userId))
      .orderBy(desc(projectsTable.createdAt))
      .limit(1);

    const projectId = latestProject[0]?.id || 'dummy-project-id';
    await generateAndStoreDummySuggestion(projectId);
    reply.send({ ok: true, message: 'Dummy suggestion generated' });
  } catch (error) {
    console.error('Error generating dummy suggestion:', error);
    reply.status(500).send({ error: 'Failed to generate dummy suggestion' });
  }
}

export async function handleTestDbSuggestions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(suggestionsTable)
      .limit(5)
      .orderBy(desc(suggestionsTable.createdAt));

    reply.send({ suggestions: rows });
  } catch (error) {
    console.error('Error fetching test suggestions:', error);
    reply.status(500).send({ error: 'Failed to fetch test suggestions' });
  }
}

export async function handleApplySuggestion(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { suggestionId } = request.body as any;

    const updated = await db
      .update(suggestionsTable)
      .set({ appliedAt: new Date() })
      .where(eq(suggestionsTable.id, suggestionId))
      .returning();

    reply.send({ suggestion: updated[0] });
  } catch (error) {
    console.error('Error applying suggestion:', error);
    reply.status(500).send({ error: 'Failed to apply suggestion' });
  }
}

export async function handleSeedDummyData(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.userId;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Create a test project
    const created = await db
      .insert(projectsTable)
      .values({
        name: 'Test Project',
        ownerId: userId as string,
      })
      .returning();

    const project = created[0];

    // Create some test suggestions
    await db.insert(suggestionsTable).values([
      {
        projectId: project.id,
        type: 'layout',
        content: { suggestion: 'Add more spacing between elements' },
      },
      {
        projectId: project.id,
        type: 'style',
        content: { suggestion: 'Use a more vibrant color scheme' },
      },
    ]);

    reply.send({ message: 'Dummy data seeded successfully', project });
  } catch (error) {
    console.error('Error seeding dummy data:', error);
    reply.status(500).send({ error: 'Failed to seed dummy data' });
  }
}

export async function handleGenerateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectName, projectDescription } = request.body as any; // Expect project name and description
    const userId = request.userId;

    if (!projectName || !projectDescription) {
      reply
        .status(400)
        .send({ error: 'Project name and description are required.' });
      return;
    }

    // Step 1: Create the project entry in the database
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const createdProject = await db
      .insert(projectsTable)
      .values({
        name: projectName as string,
        ownerId: userId as string,
      })
      .returning();

    const projectId = createdProject[0].id;

    // Step 2: Use Gemini AI to generate the project structure
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Using a suitable model

    const prompt = `You are an AI assistant that generates a complete web project structure based on a user's natural language description.
The output should be a single JSON object containing:
- databaseSchema: SQL DDL for PostgreSQL (e.g., CREATE TABLE statements)
- pages: An array of page definitions, each with a path and an initial layout (array of component references).
- componentDefinitions: An array of custom component definitions (name, display_name, render_template, css_styles, props_schema).
- apiEndpoints: An array of API endpoint definitions (method, path, description).

Constraints:
- Output ONLY pure JSON, no backticks, no explanations.
- Ensure all generated IDs are valid UUIDs.
- For component layouts, use existing component types if applicable (e.g., 'Header', 'Hero', 'Footer'). If a custom component is needed, define it in 'componentDefinitions'.
- Keep the database schema simple for now.
- Provide a basic, functional structure.

User's Project Name: ${projectName}
User's Project Description: ${projectDescription}

Example JSON structure:
{
  "databaseSchema": "CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL);",
  "pages": [
    {
      "path": "/",
      "layout": [
        {"id": "home-header", "type": "Header", "props": {"title": "Welcome", "subtitle": "Our Homepage"}},
        {"id": "home-hero", "type": "Hero", "props": {"headline": "Build Your Dream", "cta": "Learn More"}}
      ]
    },
    {
      "path": "/about",
      "layout": [
        {"id": "about-header", "type": "Header", "props": {"title": "About Us", "subtitle": "Our Story"}}
      ]
    }
  ],
  "componentDefinitions": [
    {
      "name": "CustomCard",
      "display_name": "Custom Card",
      "description": "A customizable card component",
      "category": "basic",
      "props_schema": {"type": "object", "properties": {"title": {"type": "string"}}},
      "render_template": "<div class=\"card\"><h3 data-id=\"{{id}}-title\">{{title}}</h3><p>{{content}}</p></div>",
      "css_styles": ".card { border: 1px solid #ccc; padding: 16px; }"
    }
  ],
  "apiEndpoints": [
    {"method": "GET", "path": "/api/users", "description": "Get all users"},
    {"method": "POST", "path": "/api/users", "description": "Create a new user"}
  ]
}

Generate the project structure for the user's project:
`;

    console.log('[AI] Sending project generation prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Strip possible markdown fences
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    let generatedProjectStructure: any;
    try {
      generatedProjectStructure = JSON.parse(text);
      console.log(
        '[AI] Successfully parsed generated project structure:',
        generatedProjectStructure
      );
    } catch (parseError) {
      console.error(
        '[AI] Failed to parse Gemini response as JSON for project structure:',
        parseError
      );
      console.error('[AI] Raw Gemini response text:', text);
      reply.status(502).send({
        error: 'AI model returned invalid JSON for project structure.',
      });
      return;
    }

    // Step 3: Execute databaseSchema DDL
    if (generatedProjectStructure.databaseSchema) {
      try {
        console.log('[AI] Executing database schema DDL...');
        await db.execute(sql.raw(generatedProjectStructure.databaseSchema));
        console.log('[AI] Database schema DDL executed successfully.');
      } catch (dbError) {
        console.error('[AI] Error executing database schema DDL:', dbError);
        reply
          .status(500)
          .send({ error: 'Failed to execute database schema DDL.' });
        return;
      }
    }

    // Persist generatedProjectStructure to database
    // Persist componentDefinitions
    if (
      generatedProjectStructure.componentDefinitions &&
      generatedProjectStructure.componentDefinitions.length > 0
    ) {
      try {
        console.log('[AI] Persisting component definitions...');
        for (const compDef of generatedProjectStructure.componentDefinitions) {
          await db.insert(componentDefinitions).values({
            name: compDef.name,
            displayName: compDef.display_name,
            description: compDef.description || '',
            category: compDef.category || 'custom',
            propsSchema: compDef.props_schema,
            renderTemplate: purify.sanitize(compDef.render_template),
            cssStyles: compDef.css_styles
              ? compDef.css_styles
                  .replace(
                    /<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gi,
                    ''
                  )
                  .replace(/javascript:/gi, '')
              : '',
            isActive: true,
          });
        }
        console.log('[AI] Component definitions persisted successfully.');
      } catch (compDefError) {
        console.error(
          '[AI] Error persisting component definitions:',
          compDefError
        );
        reply
          .status(500)
          .send({ error: 'Failed to persist component definitions.' });
        return;
      }
    }

    // Persist pages
    if (
      generatedProjectStructure.pages &&
      generatedProjectStructure.pages.length > 0
    ) {
      try {
        console.log('[AI] Persisting pages...');
        for (const page of generatedProjectStructure.pages) {
          await db.insert(pages).values({
            projectId: projectId,
            path: page.path,
            layoutJson: sanitizeLayout(page.layout), // Assuming layout is directly storable as JSONB
          });
        }
        console.log('[AI] Pages persisted successfully.');
      } catch (pageError) {
        console.error('[AI] Error persisting pages:', pageError);
        reply.status(500).send({ error: 'Failed to persist pages.' });
        return;
      }
    }

    console.log(
      'Generated Project Structure (from AI):',
      JSON.stringify(generatedProjectStructure, null, 2)
    );

    // Step 4: Scaffold the project files
    try {
      console.log('[AI] Initiating project scaffolding...');
      const { projectPath } = await scaffoldProject(
        projectId,
        generatedProjectStructure
      );
      console.log(`[AI] Project scaffolded to: ${projectPath}`);
    } catch (scaffoldError) {
      console.error('[AI] Error during project scaffolding:', scaffoldError);
      reply.status(500).send({ error: 'Failed to scaffold project files.' });
      return;
    }

    reply.send({
      ok: true,
      message:
        'Project generation initiated. Review console for generated structure.',
      projectId: projectId,
      generatedStructure: generatedProjectStructure, // Return the generated structure for inspection
    });
  } catch (error) {
    console.error('Error generating project:', error);
    reply.status(500).send({ error: 'Failed to generate project' });
  }
}
