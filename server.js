// Enhanced API endpoints for LLM capabilities
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userSession } = req.body;
    
    // Enhanced context building
    const context = await buildEnhancedContext(message, userSession);
    
    // Generate response with reasoning
    const response = await generateReasonedResponse(message, context, userSession);
    
    // Update user model with learning
    const updatedSession = await updateUserModel(userSession, message, response);
    
    res.json({
      response: response.answer,
      reasoning: response.reasoning, // For debugging/transparency
      updatedSession: updatedSession,
      suggestedQuestions: generateFollowUpQuestions(response)
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Memory management endpoints
app.get('/api/memory/:userId', (req, res) => {
  // Retrieve user's conversation history and learned concepts
});

app.delete('/api/memory/:userId', (req, res) => {
  // Clear specific memories or reset learning
});

// Knowledge assessment endpoint
app.post('/api/assess-knowledge', (req, res) => {
  // Assess user's understanding and adjust difficulty
});
// Enhanced memory system
class EnhancedMemory {
  constructor() {
    this.conversationMemory = new Map();
    this.conceptMemory = new Map();
    this.userModels = new Map();
  }

  // Store and retrieve conversation context
  storeConversation(userId, message, response, timestamp) {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    
    const conversation = this.conversationMemory.get(userId);
    conversation.push({
      role: 'user',
      content: message,
      timestamp
    });
    
    conversation.push({
      role: 'assistant',
      content: response,
      timestamp
    });
    
    // Keep only last 50 messages to manage memory
    if (conversation.length > 50) {
      this.conversationMemory.set(userId, conversation.slice(-50));
    }
  }

  // Concept learning and recall
  learnConcept(userId, concept, confidence = 1) {
    if (!this.conceptMemory.has(userId)) {
      this.conceptMemory.set(userId, new Map());
    }
    
    const userConcepts = this.conceptMemory.get(userId);
    const currentConfidence = userConcepts.get(concept) || 0;
    userConcepts.set(concept, Math.min(1, currentConfidence + confidence * 0.1));
  }

  // Retrieve relevant memories for context
  getRelevantMemories(userId, currentMessage, limit = 5) {
    const conversation = this.conversationMemory.get(userId) || [];
    const concepts = this.conceptMemory.get(userId) || new Map();
    
    // Simple relevance scoring (in production, use embeddings)
    const relevantMemories = conversation
      .filter(msg => msg.role === 'user')
      .slice(-limit)
      .map(msg => msg.content);
    
    const strongConcepts = Array.from(concepts.entries())
      .filter(([_, confidence]) => confidence > 0.7)
      .map(([concept]) => concept);
    
    return {
      recentConversations: relevantMemories,
      knownConcepts: strongConcepts
    };
  }
}

// Initialize memory system
const memorySystem = new EnhancedMemory();
