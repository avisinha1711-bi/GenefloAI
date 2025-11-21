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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Initialize knowledge graph
learningEngine.initializeKnowledgeGraph();

// Helper functions
async function buildEnhancedContext(message, userSession) {
  const memories = memorySystem.getRelevantMemories(userSession.id, message);
  const knowledgeLevel = userSession.knowledgeLevel || 3;
  
  return {
    userKnowledge: knowledgeLevel,
    recentConversations: memories.recentConversations,
    knownConcepts: memories.knownConcepts,
    queryComplexity: learningEngine.analyzeQuestionComplexity(message)
  };
}

function generateFollowUpQuestions(response, conceptsUsed, knowledgeLevel) {
  const questionTemplates = {
    beginner: [
      "Can you explain this in simpler terms?",
      "What is a real-world example of this?",
      "Why is this important in biology?"
    ],
    intermediate: [
      "How does this process work in detail?",
      "What are the key molecules involved?",
      "How is this regulated in the cell?"
    ],
    advanced: [
      "What are the current research developments in this area?",
      "How do mutations affect this process?",
      "What are the medical applications of this knowledge?"
    ]
  };
  
  let level = 'intermediate';
  if (knowledgeLevel <= 2) level = 'beginner';
  if (knowledgeLevel >= 4) level = 'advanced';
  
  // Add concept-specific questions
  const conceptQuestions = [];
  conceptsUsed.forEach(concept => {
    if (concept === 'dna_structure') {
      conceptQuestions.push("How does DNA replication work?");
    } else if (concept === 'transcription') {
      conceptQuestions.push("What happens after transcription is complete?");
    } else if (concept === 'translation') {
      conceptQuestions.push("How are proteins modified after translation?");
    }
  });
  
  return [...conceptQuestions.slice(0, 2), ...questionTemplates[level].slice(0, 2)];
}

async function updateUserModel(userSession, message, response) {
  const updatedLevel = learningEngine.assessKnowledgeLevel(userSession, message);
  
  // Learn concepts from interaction
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('dna')) {
    memorySystem.learnConcept(userSession.id, 'dna_structure', 0.3);
  }
  if (lowerMessage.includes('transcription') || lowerMessage.includes('rna')) {
    memorySystem.learnConcept(userSession.id, 'transcription', 0.3);
  }
  if (lowerMessage.includes('translation') || lowerMessage.includes('protein')) {
    memorySystem.learnConcept(userSession.id, 'translation', 0.3);
  }
  
  return {
    ...userSession,
    knowledgeLevel: updatedLevel,
    lastInteraction: new Date().toISOString(),
    conversationHistory: [
      ...(userSession.conversationHistory || []),
      { message, response, timestamp: new Date().toISOString() }
    ].slice(-20) // Keep last 20 interactions
  };
}

// ENHANCED Chat endpoint - SINGLE INTEGRATED VERSION
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userSession = { 
      id: 'default-user', 
      knowledgeLevel: 3,
      conversationHistory: []
    } } = req.body;
    
    console.log('Received chat request:', { message, userId: userSession.id });
    
    // 1. Build enhanced context
    const context = await buildEnhancedContext(message, userSession);
    
    // 2. Generate reasoned response using all AI systems
    const reasonedResponse = await reasoningEngine.generateReasonedResponse(
      message, 
      context, 
      userSession
    );
    
    // 3. Store conversation in memory
    memorySystem.storeConversation(
      userSession.id, 
      message, 
      reasonedResponse.answer, 
      new Date()
    );
    
    // 4. Update user model with learning
    const updatedSession = await updateUserModel(
      userSession, 
      message, 
      reasonedResponse.answer
    );
    
    // 5. Generate follow-up questions
    const suggestedQuestions = generateFollowUpQuestions(
      reasonedResponse.answer,
      reasonedResponse.conceptsUsed,
      updatedSession.knowledgeLevel
    );
    
    res.json({
      response: reasonedResponse.answer,
      reasoning: reasonedResponse.reasoning,
      updatedSession: updatedSession,
      suggestedQuestions: suggestedQuestions,
      conceptsUsed: reasonedResponse.conceptsUsed,
      confidence: 0.85 // Simulated confidence score
    });
    
  } catch (error) {
    console.error('Enhanced chat error:', error);
    res.status(500).json({ 
      error: 'I encountered an error processing your question. Please try again.',
      details: error.message 
    });
  }
});

// Memory management endpoints
app.get('/api/memory/:userId', (req, res) => {
  const userId = req.params.userId;
  try {
    const memories = memorySystem.getRelevantMemories(userId, "");
    res.json({
      userId: userId,
      memorySummary: {
        totalConversations: memories.recentConversations.length,
        knownConcepts: memories.knownConcepts.length,
        recentInteractions: memories.recentConversations.slice(-5)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

app.delete('/api/memory/:userId', (req, res) => {
  const userId = req.params.userId;
  // In a complete implementation, you'd clear the actual memories
  res.json({ 
    message: `Memory cleared for user ${userId}`,
    note: 'In development - memory persistence needed for production'
  });
});

// Knowledge assessment endpoint
app.post('/api/assess-knowledge', (req, res) => {
  const { userId, responses } = req.body;
  
  try {
    // Simulate knowledge assessment
    const assessment = {
      userId: userId,
      molecularBiologyScore: Math.random() * 100,
      recommendedTopics: ['DNA Replication', 'Protein Synthesis', 'Gene Regulation'],
      knowledgeLevel: Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1)),
      assessmentDate: new Date().toISOString()
    };
    
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Assessment failed' });
  }
});

// User session initialization
app.post('/api/init-session', (req, res) => {
  const { userId } = req.body;
  
  const newSession = {
    id: userId || 'user-' + Date.now(),
    knowledgeLevel: 3, // Default intermediate
    conversationHistory: [],
    createdAt: new Date().toISOString(),
    lastInteraction: new Date().toISOString()
  };
  
  res.json(newSession);
});

// Get learning progress
app.get('/api/progress/:userId', (req, res) => {
  const userId = req.params.userId;
  const memories = memorySystem.getRelevantMemories(userId, "");
  
  const progress = {
    userId: userId,
    conceptsMastered: memories.knownConcepts.length,
    totalInteractions: memories.recentConversations.length,
    estimatedLevel: memories.knownConcepts.length > 5 ? 'Intermediate' : 'Beginner',
    learningStreak: Math.floor(Math.random() * 10) + 1 // Simulated
  };
  
  res.json(progress);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    systems: {
      memory: 'Operational',
      learning: 'Operational', 
      reasoning: 'Operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`GenefloAI Server running on port ${PORT}`);
  console.log(`Access your chatbot at: http://localhost:${PORT}`);
  console.log('AI Systems: Memory ✓ | Adaptive Learning ✓ | Reasoning ✓');
});

module.exports = app;
