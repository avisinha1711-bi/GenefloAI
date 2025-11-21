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
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', '*'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - ensure proper path
app.use(express.static(path.join(__dirname, '.'))); // Serve from root directory

// Initialize knowledge graph on startup
learningEngine.initializeKnowledgeGraph();

// Enhanced helper functions
function buildEnhancedContext(message, userSession) {
  const memories = memorySystem.getRelevantMemories(userSession.id, message);
  const knowledgeLevel = userSession.knowledgeLevel || 3;
  
  return {
    userKnowledge: knowledgeLevel,
    recentConversations: memories.recentConversations,
    knownConcepts: memories.knownConcepts,
    queryComplexity: learningEngine.analyzeQuestionComplexity(message),
    learningStyle: userSession.learningStyle || 'comprehensive'
  };
}

function generateFollowUpQuestions(conceptsUsed, knowledgeLevel, currentTopic) {
  const questionBank = {
    basic: [
      "Would you like me to explain this in more detail?",
      "Should I provide a real-world example of this concept?",
      "Would you like to explore related genetic mechanisms?"
    ],
    intermediate: [
      "Would you like to see how this applies in genetic research?",
      "Should I explain the molecular mechanisms behind this?",
      "Want to explore experimental evidence for this concept?"
    ],
    advanced: [
      "Would you like to discuss recent research findings?",
      "Should I explain the technical applications?",
      "Want to explore controversies or open questions?"
    ]
  };
  
  let level = 'basic';
  if (knowledgeLevel >= 4) level = 'advanced';
  else if (knowledgeLevel >= 2.5) level = 'intermediate';
  
  return questionBank[level].slice(0, 2);
}

function updateUserModel(userSession, message, response) {
  try {
    const updatedLevel = learningEngine.assessKnowledgeLevel(userSession, message);
    
    // Enhanced concept learning
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      const conceptMap = {
        'mutation': 'mutations',
        'recombination': 'genetic_recombination',
        'transcription': 'transcription',
        'translation': 'translation',
        'dna': 'dna_structure',
        'rna': 'rna_types',
        'protein': 'protein_synthesis',
        'gene': 'gene_expression',
        'chromosome': 'chromosome_structure',
        'genome': 'genome_organization'
      };
      
      Object.entries(conceptMap).forEach(([keyword, concept]) => {
        if (lowerMessage.includes(keyword)) {
          memorySystem.learnConcept(userSession.id, concept, 0.3);
        }
      });
    }
    
    return {
      ...userSession,
      knowledgeLevel: updatedLevel,
      lastInteraction: new Date().toISOString(),
      conversationHistory: [
        ...(userSession.conversationHistory || []),
        { message, response, timestamp: new Date().toISOString() }
      ].slice(-20) // Keep more history for better learning
    };
  } catch (error) {
    console.error('Error updating user model:', error);
    return userSession;
  }
}

// Enhanced health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Advanced Genetics AI Chatbot',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'Comprehensive genetics knowledge',
      'Adaptive learning',
      'Molecular biology expertise',
      'Research-level content'
    ]
  });
});

// Enhanced main chat endpoint
app.post('/api/chat', async (req, res) => {
  req.setTimeout(45000); // 45 second timeout for complex queries
  
  try {
    const { message, userSession = { 
      id: 'user-' + Date.now(), 
      knowledgeLevel: 3,
      conversationHistory: [],
      interests: ['genetics', 'molecular_biology']
    } } = req.body;

    // Enhanced input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid message format',
        response: 'Please provide a valid question about genetics or molecular biology.'
      });
    }

    const trimmedMessage = message.trim();
    
    // 1. Build enhanced context
    const context = buildEnhancedContext(trimmedMessage, userSession);
    
    // 2. Generate reasoned response with fallback
    let reasonedResponse;
    try {
      reasonedResponse = await reasoningEngine.generateReasonedResponse(
        trimmedMessage, 
        context, 
        userSession
      );
    } catch (reasoningError) {
      console.error('Reasoning engine failed:', reasoningError);
      reasonedResponse = reasoningEngine.generateFallbackResponse(trimmedMessage, context);
    }
    
    // 3. Store conversation
    memorySystem.storeConversation(
      userSession.id, 
      trimmedMessage, 
      reasonedResponse.answer, 
      new Date()
    );
    
    // 4. Update user model
    const updatedSession = updateUserModel(
      userSession, 
      trimmedMessage, 
      reasonedResponse.answer
    );
    
    // 5. Generate follow-up questions
    const suggestedQuestions = generateFollowUpQuestions(
      reasonedResponse.conceptsUsed,
      updatedSession.knowledgeLevel,
      reasonedResponse.primaryTopic
    );
    
    // Enhanced successful response
    res.json({
      response: reasonedResponse.answer,
      reasoning: reasonedResponse.reasoning,
      updatedSession: updatedSession,
      suggestedQuestions: suggestedQuestions,
      conceptsUsed: reasonedResponse.conceptsUsed,
      confidence: reasonedResponse.confidence || 0.85,
      focusArea: reasonedResponse.primaryTopic || 'genetics',
      knowledgeLevel: updatedSession.knowledgeLevel,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    
    // Enhanced error response with helpful information
    res.status(500).json({ 
      error: 'Internal server error',
      response: 'I apologize for the technical issue. Here\'s a comprehensive genetics response: ' + 
                'Molecular genetics explores DNA structure, gene expression, and genetic variation. ' +
                'Key areas include DNA replication, transcription, translation, mutation mechanisms, ' +
                'and genetic engineering. What specific topic can I help you with?',
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// Enhanced memory management
app.get('/api/memory/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const memories = memorySystem.getRelevantMemories(userId, "");
    
    res.json({
      userId: userId,
      memorySummary: {
        totalConversations: memories.recentConversations.length,
        knownConcepts: memories.knownConcepts,
        strongConcepts: memories.knownConcepts.filter(concept => 
          memorySystem.getConceptConfidence(userId, concept) > 0.7
        ),
        recentInteractions: memories.recentConversations.slice(-5)
      },
      learningProgress: learningEngine.calculateProgress(userId),
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve memories',
      status: 'error'
    });
  }
});

// Enhanced user session initialization
app.post('/api/init-session', (req, res) => {
  try {
    const { userId, interests = ['genetics', 'molecular_biology', 'genomics'] } = req.body;
    
    const newSession = {
      id: userId || 'genetics-learner-' + Date.now(),
      knowledgeLevel: 3,
      conversationHistory: [],
      interests: interests,
      focusArea: 'comprehensive_genetics',
      learningStyle: 'adaptive',
      createdAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      progress: {
        conceptsMastered: 0,
        topicsExplored: [],
        assessmentScore: 0
      }
    };
    
    res.json(newSession);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to initialize session',
      fallbackSession: {
        id: 'fallback-' + Date.now(),
        knowledgeLevel: 3,
        conversationHistory: []
      }
    });
  }
});

// Enhanced progress endpoint
app.get('/api/progress/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const memories = memorySystem.getRelevantMemories(userId, "");
    
    const progress = {
      userId: userId,
      conceptsMastered: memories.knownConcepts.length,
      totalInteractions: memories.recentConversations.length,
      estimatedLevel: memories.knownConcepts.length > 8 ? 'Advanced' : 
                     memories.knownConcepts.length > 4 ? 'Intermediate' : 'Beginner',
      strongAreas: memories.knownConcepts.slice(0, 3),
      learningStreak: learningEngine.calculateLearningStreak(userId)
    };
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get progress',
      estimatedLevel: 'Beginner'
    });
  }
});

// Enhanced knowledge base endpoint
app.get('/api/knowledge/topics', (req, res) => {
  try {
    const topics = learningEngine.getAllTopics();
    res.json({
      topics: topics,
      totalConcepts: topics.length,
      categories: ['Molecular Genetics', 'Genomics', 'Biotechnology', 'Evolutionary Genetics']
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve topics',
      topics: ['DNA Structure', 'Gene Expression', 'Genetic Variation', 'Molecular Techniques']
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Advanced Genetics AI Chatbot API',
    status: 'running',
    version: '2.0.0',
    capabilities: [
      'Comprehensive genetics explanations',
      'Adaptive learning system',
      'Molecular biology expertise',
      'Research-level content',
      'Personalized knowledge paths'
    ],
    endpoints: [
      'GET /api/health',
      'POST /api/chat',
      'POST /api/init-session',
      'GET /api/memory/:userId',
      'GET /api/progress/:userId',
      'GET /api/knowledge/topics'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/health',
      '/api/chat',
      '/api/init-session',
      '/api/knowledge/topics'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'The advanced genetics chatbot encountered an unexpected error',
    support: 'Please try your question again or rephrase it.'
  });
});

// Start server with enhanced error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Advanced Genetics AI Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔬 Service: Comprehensive Genetics Knowledge Base`);
  console.log(`💡 Version: 2.0.0 - Enhanced Molecular Biology`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  // Try alternative port
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} busy, trying ${Number(PORT) + 1}`);
    app.listen(Number(PORT) + 1, '0.0.0.0', () => {
      console.log(`🚀 Server started on alternative port ${Number(PORT) + 1}`);
    });
  } else {
    process.exit(1);
  }
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
