const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our enhanced systems
const { EnhancedMemory, AdaptiveLearningEngine, ReasoningEngine } = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AI systems
const memorySystem = new EnhancedMemory();
const learningEngine = new AdaptiveLearningEngine();
const reasoningEngine = new ReasoningEngine();

// Middleware - simplified for deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - ensure proper path
app.use(express.static(path.join(__dirname, 'public')));

// Initialize knowledge graph on startup
learningEngine.initializeKnowledgeGraph();

// Helper functions - simplified and robust
function buildEnhancedContext(message, userSession) {
  const memories = memorySystem.getRelevantMemories(userSession.id, message);
  const knowledgeLevel = userSession.knowledgeLevel || 3;
  
  return {
    userKnowledge: knowledgeLevel,
    recentConversations: memories.recentConversations,
    knownConcepts: memories.knownConcepts,
    queryComplexity: learningEngine.analyzeQuestionComplexity(message)
  };
}

function generateFollowUpQuestions(conceptsUsed, knowledgeLevel) {
  // Pre-defined questions - no dynamic generation issues
  const questions = [
    "Would you like me to explain this genetics concept in more detail?",
    "Can I provide an example of how this works in genetic research?",
    "Would you like to explore related genetics topics?"
  ];
  
  return questions.slice(0, 2);
}

function updateUserModel(userSession, message, response) {
  try {
    const updatedLevel = learningEngine.assessKnowledgeLevel(userSession, message);
    
    // Simple concept learning
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('mutation')) {
        memorySystem.learnConcept(userSession.id, 'mutations', 0.3);
      }
      if (lowerMessage.includes('recombination')) {
        memorySystem.learnConcept(userSession.id, 'genetic_recombination', 0.3);
      }
    }
    
    return {
      ...userSession,
      knowledgeLevel: updatedLevel,
      lastInteraction: new Date().toISOString(),
      conversationHistory: [
        ...(userSession.conversationHistory || []),
        { message, response, timestamp: new Date().toISOString() }
      ].slice(-10) // Keep smaller history for deployment
    };
  } catch (error) {
    console.error('Error updating user model:', error);
    return userSession; // Return original session on error
  }
}

// Health check endpoint - critical for deployment
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Genetics AI Chatbot',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Main chat endpoint with robust error handling
app.post('/api/chat', async (req, res) => {
  // Set timeout for response
  req.setTimeout(30000); // 30 second timeout
  
  try {
    const { message, userSession = { 
      id: 'user-' + Date.now(), 
      knowledgeLevel: 3,
      conversationHistory: []
    } } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid message format',
        response: 'Please provide a valid text message about genetics.'
      });
    }

    // 1. Build enhanced context
    const context = buildEnhancedContext(message, userSession);
    
    // 2. Generate reasoned response
    const reasonedResponse = await reasoningEngine.generateReasonedResponse(
      message, 
      context, 
      userSession
    );
    
    // 3. Store conversation
    memorySystem.storeConversation(
      userSession.id, 
      message, 
      reasonedResponse.answer, 
      new Date()
    );
    
    // 4. Update user model
    const updatedSession = updateUserModel(
      userSession, 
      message, 
      reasonedResponse.answer
    );
    
    // 5. Generate follow-up questions
    const suggestedQuestions = generateFollowUpQuestions(
      reasonedResponse.conceptsUsed,
      updatedSession.knowledgeLevel
    );
    
    // Successful response
    res.json({
      response: reasonedResponse.answer,
      reasoning: reasonedResponse.reasoning,
      updatedSession: updatedSession,
      suggestedQuestions: suggestedQuestions,
      conceptsUsed: reasonedResponse.conceptsUsed,
      confidence: 0.85,
      focusArea: 'genetics',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      response: 'I encountered a technical issue. Please try your genetics question again.',
      timestamp: new Date().toISOString()
    });
  }
});

// Memory management endpoints
app.get('/api/memory/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const memories = memorySystem.getRelevantMemories(userId, "");
    
    res.json({
      userId: userId,
      memorySummary: {
        totalConversations: memories.recentConversations.length,
        knownConcepts: memories.knownConcepts,
        recentInteractions: memories.recentConversations.slice(-3)
      },
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve memories',
      status: 'error'
    });
  }
});

// User session initialization
app.post('/api/init-session', (req, res) => {
  try {
    const { userId, interests = ['genetics'] } = req.body;
    
    const newSession = {
      id: userId || 'genetics-user-' + Date.now(),
      knowledgeLevel: 3,
      conversationHistory: [],
      interests: interests,
      focusArea: 'genetics',
      createdAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString()
    };
    
    res.json(newSession);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

// Simple progress endpoint
app.get('/api/progress/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const memories = memorySystem.getRelevantMemories(userId, "");
    
    const progress = {
      userId: userId,
      conceptsMastered: memories.knownConcepts.length,
      totalInteractions: memories.recentConversations.length,
      estimatedLevel: memories.knownConcepts.length > 3 ? 'Intermediate' : 'Beginner'
    };
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Genetics AI Chatbot API',
    status: 'running',
    endpoints: [
      'GET /api/health',
      'POST /api/chat',
      'POST /api/init-session',
      'GET /api/memory/:userId',
      'GET /api/progress/:userId'
    ],
    documentation: 'See /api/health for service status'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/health',
      '/api/chat',
      '/api/init-session'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'The genetics chatbot encountered an unexpected error'
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Genetics AI Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
