import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db/db.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
