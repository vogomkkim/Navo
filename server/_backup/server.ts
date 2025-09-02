import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import apiRoutes from './routes/apiRoutes.js';
import { setupStaticRoutes } from './routes/staticRoutes.js';
import { errorHandlingMiddleware } from './middleware/errorHandler.js';
import logger from './core/logger.js';

const app = Fastify({ logger: false });

// Middleware
app.register(cors);

// Setup routes
app.register(apiRoutes);
// setupStaticRoutes(app); // 정적 파일 서빙 비활성화

// Error handler (must be after routes)
app.setErrorHandler(errorHandlingMiddleware);

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
    logger.error('Error generating AI suggestion', error);
    throw error;
  }
}

// Test endpoint for dummy suggestion
export async function handleGenerateDummySuggestion(
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const suggestion = await generateAiSuggestion(
      'Generate a simple website layout suggestion in JSON format'
    );
    reply.send({ suggestion });
  } catch (error) {
    reply.status(500).send({ error: 'Failed to generate suggestion' });
  }
}

export default app;
