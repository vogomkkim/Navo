import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db/db.js';

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
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Invalid object' };
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
  "props_schema": {               // JSON Schema for props
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
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { command, projectId } = req.body;
    const userId = 'dummy-user-id'; // Temporary hardcoded userId for testing

    if (!command) {
      res.status(400).json({ error: 'Command is required' });
      return;
    }

    // Process AI command and generate response
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(command);
    const response = result.response;
    const text = response.text();

    // Store the AI interaction
    await prisma.events.create({
      data: {
        project_id: projectId || null,
        user_id: userId,
        type: 'ai_command',
        data: { command, response: text },
      },
    });

    res.json({ response: text });
  } catch (error) {
    console.error('Error processing AI command:', error);
    res.status(500).json({ error: 'Failed to process AI command' });
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
      await prisma.suggestion.create({
        data: {
          projectId,
          type: aiSuggestion.type,
          content: JSON.stringify(aiSuggestion.content),
        },
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
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId, type, limit = 10, offset = 0 } = req.query;

    const suggestions = await prisma.suggestion.findMany({
      where: {
        projectId: (projectId as string) || undefined,
        type: (type as string) || undefined,
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: 'desc' },
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}

export async function handleTestDbSuggestions(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const suggestions = await prisma.suggestion.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching test suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch test suggestions' });
  }
}

export async function handleApplySuggestion(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { suggestionId } = req.body;

    const suggestion = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { applied_at: new Date() },
    });

    res.json({ suggestion });
  } catch (error) {
    console.error('Error applying suggestion:', error);
    res.status(500).json({ error: 'Failed to apply suggestion' });
  }
}

export async function handleSeedDummyData(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = 'dummy-user-id'; // Temporary hardcoded userId for testing

    // Create a test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        owner_id: userId,
      },
    });

    // Create some test suggestions
    await prisma.suggestion.createMany({
      data: [
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
      ],
    });

    res.json({ message: 'Dummy data seeded successfully', project });
  } catch (error) {
    console.error('Error seeding dummy data:', error);
    res.status(500).json({ error: 'Failed to seed dummy data' });
  }
}

export async function handleGenerateProject(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name } = req.body;
    const userId = 'dummy-user-id'; // Temporary hardcoded userId for testing

    const project = await prisma.project.create({
      data: {
        name,
        owner_id: userId,
      },
    });

    res.json({ project });
  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ error: 'Failed to generate project' });
  }
}

/**
 * Natural language -> Component Definition
 * POST body: { description: string, category?: string, save?: boolean }
 * Response: { ok: boolean, component: {...}, saved?: boolean }
 */
export async function handleGenerateComponentFromNaturalLanguage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { description, category, save } = req.body || {};

    if (!description || typeof description !== 'string') {
      res.status(400).json({ ok: false, error: 'description is required' });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildNlToComponentPrompt(description);

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Strip possible markdown fences
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    let generated: any;
    try {
      generated = JSON.parse(text);
    } catch (e) {
      console.error('[AI] Failed to parse model JSON for component:', text);
      res
        .status(502)
        .json({ ok: false, error: 'Model returned invalid JSON' });
      return;
    }

    // Provide sane defaults and validations
    if (!generated.name) {
      generated.name = slugifyName(description);
    } else {
      generated.name = slugifyName(generated.name);
    }
    generated.display_name =
      typeof generated.display_name === 'string' && generated.display_name.trim()
        ? generated.display_name.trim()
        : generated.name;
    generated.category =
      typeof (category || generated.category) === 'string'
        ? (category || generated.category)
        : 'custom';
    if (generated.props_schema == null) {
      generated.props_schema = { type: 'object', properties: {} };
    }
    if (generated.css_styles == null) {
      generated.css_styles = '';
    }

    const validation = validateGeneratedComponentDef(generated);
    if (!validation.ok) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    // Optionally persist into DB
    if (save) {
      // ensure uniqueness of name
      const baseName = generated.name;
      let uniqueName = baseName;
      let counter = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await prisma.component_definitions.findUnique({
          where: { name: uniqueName },
        });
        if (!existing) break;
        counter += 1;
        uniqueName = `${baseName}-${counter}`.slice(0, 56);
      }
      generated.name = uniqueName;

      const created = await prisma.component_definitions.create({
        data: {
          name: generated.name,
          display_name: generated.display_name,
          description: generated.description || '',
          category: generated.category || 'custom',
          props_schema: generated.props_schema,
          render_template: generated.render_template,
          css_styles: generated.css_styles || '',
          is_active: true,
        },
      });

      res.json({ ok: true, component: created, saved: true });
      return;
    }

    res.json({ ok: true, component: generated, saved: false });
  } catch (error) {
    console.error('Error generating component from natural language:', error);
    res
      .status(500)
      .json({ ok: false, error: 'Failed to generate component' });
  }
}
