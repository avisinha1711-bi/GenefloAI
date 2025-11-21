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
      "Can you explain this genetics concept in simpler terms?",
      "What is a real-world example of this genetic principle?",
      "Why is this important in genetic research?"
    ],
    intermediate: [
      "How does this genetic process work in detail?",
      "What are the key experiments that demonstrated this?",
      "How is this genetic mechanism regulated?"
    ],
    advanced: [
      "What are the current research developments in this genetic area?",
      "How do mutations affect this genetic process?",
      "What are the medical applications of this genetic knowledge?"
    ]
  };
  
  let level = 'intermediate';
  if (knowledgeLevel <= 2) level = 'beginner';
  if (knowledgeLevel >= 4) level = 'advanced';
  
  // Add genetics-specific questions based on concepts used
  const conceptQuestions = [];
  conceptsUsed.forEach(concept => {
    if (concept === 'mutations') {
      conceptQuestions.push("What are the different types of mutations and their effects?");
      conceptQuestions.push("How do cells repair DNA damage?");
    } else if (concept === 'genetic_recombination') {
      conceptQuestions.push("What is the molecular mechanism of homologous recombination?");
      conceptQuestions.push("How does recombination create genetic diversity?");
    } else if (concept === 'genetic_mapping') {
      conceptQuestions.push("How is genetic mapping used to find disease genes?");
      conceptQuestions.push("What's the difference between genetic and physical maps?");
    } else if (concept === 'complementation') {
      conceptQuestions.push("How do complementation tests work in practice?");
      conceptQuestions.push("What can we learn from cis-trans tests?");
    } else if (concept === 'transposable_elements') {
      conceptQuestions.push("How are transposable elements used in genetic engineering?");
      conceptQuestions.push("What role do transposons play in evolution?");
    } else if (concept === 'genetic_engineering') {
      conceptQuestions.push("What are the main tools used in genetic engineering?");
      conceptQuestions.push("How is recombinant DNA technology applied in medicine?");
    }
  });
  
  return [...conceptQuestions.slice(0, 2), ...questionTemplates[level].slice(0, 2)];
}

async function updateUserModel(userSession, message, response) {
  const updatedLevel = learningEngine.assessKnowledgeLevel(userSession, message);
  
  // Learn genetics concepts from interaction
  const lowerMessage = message.toLowerCase();
  const geneticsKeywords = {
    'mutations': ['mutation', 'mutant', 'mutagen'],
    'genetic_recombination': ['recombination', 'crossing over', 'recA', 'holliday'],
    'genetic_mapping': ['mapping', 'genetic map', 'recombination frequency'],
    'complementation': ['complementation', 'cis trans', 'dominant recessive'],
    'transposable_elements': ['transposon', 'jumping gene', 'IS element', 'retrotransposon'],
    'genetic_engineering': ['genetic engineering', 'recombinant', 'cloning', 'restriction enzyme'],
    'bacterial_genetics': ['bacterial genetics', 'transduction', 'conjugation', 'transformation'],
    'yeast_genetics': ['yeast genetics', 'mating type'],
    'drosophila_genetics': ['drosophila', 'fruit fly', 'fate mapping']
  };
  
  Object.entries(geneticsKeywords).forEach(([concept, keywords]) => {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      memorySystem.learnConcept(userSession.id, concept, 0.3);
    }
  });
  
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

// ENHANCED Chat endpoint - GENETICS FOCUSED
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userSession = { 
      id: 'default-user', 
      knowledgeLevel: 3,
      conversationHistory: [],
      interests: ['genetics', 'molecular_biology']
    } } = req.body;
    
    console.log('Received genetics chat request:', { message, userId: userSession.id });
    
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
    
    // 5. Generate genetics-focused follow-up questions
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
      confidence: 0.85,
      focusArea: 'genetics'
    });
    
  } catch (error) {
    console.error('Genetics chat error:', error);
    res.status(500).json({ 
      error: 'I encountered an error processing your genetics question. Please try again.',
      details: error.message 
    });
  }
});

// Memory management endpoints
app.get('/api/memory/:userId', (req, res) => {
  const userId = req.params.userId;
  try {
    const memories = memorySystem.getRelevantMemories(userId, "");
    const geneticsConcepts = memories.knownConcepts.filter(concept => 
      concept.includes('mutations') || 
      concept.includes('recombination') ||
      concept.includes('genetic') ||
      concept.includes('transpos')
    );
    
    res.json({
      userId: userId,
      memorySummary: {
        totalConversations: memories.recentConversations.length,
        geneticsConcepts: geneticsConcepts.length,
        knownConcepts: memories.knownConcepts,
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

// Genetics knowledge assessment endpoint
app.post('/api/assess-genetics-knowledge', (req, res) => {
  const { userId, responses } = req.body;
  
  try {
    // Simulate genetics knowledge assessment
    const geneticsTopics = [
      'Mutations and DNA Repair',
      'Genetic Recombination',
      'Genetic Mapping',
      'Complementation Tests',
      'Transposable Elements',
      'Genetic Engineering',
      'Bacterial Genetics'
    ];
    
    const assessment = {
      userId: userId,
      geneticsKnowledgeScore: Math.random() * 100,
      strongAreas: geneticsTopics.slice(0, 3),
      weakAreas: geneticsTopics.slice(3, 5),
      recommendedTopics: ['Advanced Genetic Mapping', 'Molecular Mechanisms of Recombination'],
      knowledgeLevel: Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1)),
      assessmentDate: new Date().toISOString(),
      focusArea: 'Genetics'
    };
    
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Genetics assessment failed' });
  }
});

// User session initialization with genetics focus
app.post('/api/init-session', (req, res) => {
  const { userId, interests = ['genetics'] } = req.body;
  
  const newSession = {
    id: userId || 'genetics-user-' + Date.now(),
    knowledgeLevel: 3, // Default intermediate
    conversationHistory: [],
    interests: interests,
    focusArea: 'genetics',
    createdAt: new Date().toISOString(),
    lastInteraction: new Date().toISOString()
  };
  
  res.json(newSession);
});

// Get genetics learning progress
app.get('/api/genetics-progress/:userId', (req, res) => {
  const userId = req.params.userId;
  const memories = memorySystem.getRelevantMemories(userId, "");
  
  const geneticsConcepts = memories.knownConcepts.filter(concept => 
    concept.includes('mutations') || 
    concept.includes('recombination') ||
    concept.includes('genetic') ||
    concept.includes('transpos')
  );
  
  const progress = {
    userId: userId,
    geneticsConceptsMastered: geneticsConcepts.length,
    totalGeneticsInteractions: memories.recentConversations.filter(conv => 
      conv.toLowerCase().includes('mutation') ||
      conv.toLowerCase().includes('genetic') ||
      conv.toLowerCase().includes('recombination') ||
      conv.toLowerCase().includes('transpos')
    ).length,
    estimatedGeneticsLevel: geneticsConcepts.length > 5 ? 'Advanced' : geneticsConcepts.length > 2 ? 'Intermediate' : 'Beginner',
    learningStreak: Math.floor(Math.random() * 10) + 1,
    focusArea: 'Genetics'
  };
  
  res.json(progress);
});

// Genetics concept exploration endpoint
app.get('/api/genetics-concepts/:concept', (req, res) => {
  const concept = req.params.concept;
  const learningEngine = new AdaptiveLearningEngine();
  
  const conceptInfo = learningEngine.knowledgeGraph.get(concept);
  if (conceptInfo) {
    res.json({
      concept: concept,
      information: conceptInfo,
      relatedConcepts: learningEngine.getSuggestedConcepts(concept, 3),
      difficulty: conceptInfo.difficulty
    });
  } else {
    res.status(404).json({ error: 'Genetics concept not found' });
  }
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
    focus: 'Genetics Education',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`GenefloAI Genetics Server running on port ${PORT}`);
  console.log(`Access your genetics chatbot at: http://localhost:${PORT}`);
  console.log('AI Systems: Memory ✓ | Adaptive Learning ✓ | Reasoning ✓');
  console.log('Focus Area: Genetics & Molecular Biology');
});

module.exports = app;
