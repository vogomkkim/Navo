import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { setupApiRoutes } from './routes/apiRoutes.js';
import { setupStaticRoutes } from './routes/staticRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup routes
setupApiRoutes(app);
setupStaticRoutes(app);

// AI suggestion generation
export async function generateAiSuggestion(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Clean up the response
    text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

    return text;
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    throw error;
  }
}

// Test endpoint for dummy suggestion
export async function handleGenerateDummySuggestion(
  _req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const suggestion = await generateAiSuggestion(
      'Generate a simple website layout suggestion in JSON format'
    );
    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
}

export default app;
