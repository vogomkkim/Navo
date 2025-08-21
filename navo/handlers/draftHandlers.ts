import { Request, Response } from 'express';
import { prisma } from '../db/db.js';

// Mock layout for development
const currentMockLayout = {
  components: [
    {
      id: 'c1',
      type: 'Header',
      props: { title: 'Welcome to Navo', subtitle: 'AI-Powered Web Builder' },
    },
    {
      id: 'c2',
      type: 'Hero',
      props: { headline: 'Build Amazing Websites', cta: 'Get Started' },
    },
    {
      id: 'c3',
      type: 'Footer',
      props: { text: '© 2024 Navo. All rights reserved.' },
    },
  ],
};

export async function handleDraft(req: Request, res: Response): Promise<void> {
  try {
    // For now, return mock data
    // TODO: Implement actual draft fetching from database
    res.json({
      ok: true,
      draft: {
        id: 'mock-draft-id',
        layout: currentMockLayout,
        lastModified: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
}

export async function handleSave(req: Request, res: Response): Promise<void> {
  try {
    const { layout } = req.body;

    if (!layout) {
      res.status(400).json({ error: 'Layout is required' });
      return;
    }

    // For now, just log the save operation
    // TODO: Implement actual draft saving to database
    console.log('Saving draft layout:', layout);

    res.json({
      ok: true,
      message: 'Draft saved successfully',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
}
