import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
// Import Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static('dist'));

// OpenAI
import OpenAI from 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({apiKey: OPENAI_API_KEY});

// Example API endpoint - now uses the database
app.get('/api/example', async (req, res) => {
  try {
    // Fetch recent funds from the database
    const recentFunds = await prisma.fund.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        tags: true,
        manager: true
      }
    });
    
    res.json(recentFunds);
  } catch (error) {
    console.error('Error fetching example data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get all funds
app.get('/api/funds', async (req, res) => {
  try {
    const funds = await prisma.fund.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        programs: true
      }
    });
    
    // Transform the data for the frontend
    const transformedFunds = funds.map(fund => ({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      totalAmount: fund.totalAmount,
      programCount: fund.programs.length,
      createdAt: fund.createdAt
    }));
    
    res.json(transformedFunds);
  } catch (error) {
    console.error('Error fetching funds:', error);
    res.status(500).json({ error: 'Failed to fetch funds' });
  }
});

// Get a single fund by id
app.get('/api/funds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const fund = await prisma.fund.findUnique({
      where: { id: parseInt(id) },
      include: {
        programs: {
          include: {
            milestones: true,
            surveys: true
          }
        },
        sessions: {
          include: {
            user: true,
            program: true
          }
        }
      }
    });
    
    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }
    
    // Transform the data for the frontend
    const transformedFund = {
      id: fund.id,
      name: fund.name,
      description: fund.description,
      totalAmount: fund.totalAmount,
      programs: fund.programs.map(program => ({
        id: program.id,
        name: program.name,
        description: program.description,
        milestoneCount: program.milestones.length,
        surveyCount: program.surveys.length
      })),
      sessions: fund.sessions.map(session => ({
        id: session.id,
        title: session.title,
        status: session.status,
        userName: session.user.name,
        programName: session.program.name,
        createdAt: session.createdAt
      })),
      createdAt: fund.createdAt
    };
    
    res.json(transformedFund);
  } catch (error) {
    console.error('Error fetching fund:', error);
    res.status(500).json({ error: 'Failed to fetch fund' });
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fund: true,
        user: true,
        program: true
      }
    });
    
    // Transform the data for the frontend
    const transformedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      date: session.date,
      fund: {
        id: session.fund.id,
        name: session.fund.name
      },
      user: {
        id: session.user.id,
        name: session.user.name
      },
      createdAt: session.createdAt
    }));
    
    res.json(transformedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get a single session by id
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        fund: {
          include: {
            programs: true
          }
        },
        user: true,
        program: true,
        application: true,
        surveyResponses: {
          include: {
            survey: true
          }
        },
        milestoneReflections: {
          include: {
            milestone: true
          }
        },
        review: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// AI endpoint for generating insights
app.post('/api/ai/generate-insights', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Fetch the session data
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        fund: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Create a prompt for the AI
    const prompt = `
      Generate insights based on the following impact data:
      
      Fund: ${session.fund.name}
      Session: ${session.title}
      Description: ${session.description}
      Date: ${session.date}
      
      Data:
      ${JSON.stringify(session.data, null, 2)}
      
      Please provide:
      1. A summary of the key findings
      2. Identification of trends or patterns
      3. Recommendations for future actions
      4. Any areas of concern that should be addressed
    `;
    
    const response = await ChatGPTRequest(prompt);
    
    res.json({ insights: response });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

// Function to make requests to ChatGPT
async function ChatGPTRequest(prompt, model = "gpt-4o-mini") {
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant specialized in analyzing impact data and generating insights." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error making OpenAI request:', error);
    throw new Error('Failed to generate AI response');
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});