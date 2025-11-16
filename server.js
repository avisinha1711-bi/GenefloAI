const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for user sessions (in production, use Redis or database)
const userSessions = new Map();

// Enhanced knowledge base for molecular genetics
const knowledgeBase = {
  "dna structure": {
    title: "DNA Structure",
    content: "DNA (Deoxyribonucleic Acid) has a double-helical structure composed of two antiparallel strands. Each strand consists of nucleotides containing a deoxyribose sugar, phosphate group, and one of four nitrogenous bases: Adenine (A), Thymine (T), Cytosine (C), and Guanine (G). Bases form complementary pairs: A-T and G-C, connected by hydrogen bonds. The structure was discovered by Watson and Crick in 1953.",
    keywords: ["double helix", "nucleotides", "base pairing", "watson crick"]
  },
  "transcription": {
    title: "Transcription Process",
    content: "Transcription is the first step of gene expression where DNA is copied into mRNA. RNA polymerase binds to promoter regions and unwinds the DNA helix. The template strand is used to synthesize a complementary mRNA molecule in the 5' to 3' direction. Key steps include: initiation, elongation, and termination. In eukaryotes, mRNA undergoes processing including 5' capping, splicing, and 3' polyadenylation.",
    keywords: ["rna polymerase", "promoter", "template strand", "mrna synthesis"]
  },
  "translation": {
    title: "Translation Process",
    content: "Translation converts mRNA into proteins through ribosomes. Ribosomes read mRNA codons (triplets) and tRNA molecules bring corresponding amino acids. The process includes: initiation (start codon AUG), elongation (peptide bond formation), and termination (stop codons UAA, UAG, UGA). The genetic code is degenerate, universal, and non-overlapping.",
    keywords: ["ribosome", "codon", "tRNA", "amino acids", "genetic code"]
  },
  "genetic code": {
    title: "Genetic Code",
    content: "The genetic code is the set of rules by which mRNA sequences are translated into proteins. It's characterized by: 1) Triplet nature (3 bases per codon), 2) Degeneracy (multiple codons code for same amino acid), 3) Universality (mostly conserved across species), 4) Non-overlapping, 5) Start codon (AUG for Methionine), 6) Stop codons (UAA, UAG, UGA).",
    keywords: ["codon table", "start codon", "stop codon", "degenerate"]
  },
  "lac operon": {
    title: "Lac Operon Regulation",
    content: "The lac operon is a classic example of gene regulation in E. coli. It controls lactose metabolism and consists of: structural genes (lacZ, lacY, lacA), operator, promoter, and repressor. In absence of lactose, repressor binds operator preventing transcription. When lactose is present, it acts as inducer, inactivating repressor and allowing transcription.",
    keywords: ["operon", "gene regulation", "lactose", "repressor", "inducer"]
  },
  "replication": {
    title: "DNA Replication",
    content: "DNA replication is semi-conservative and bidirectional. Key enzymes: Helicase (unwinds DNA), Primase (synthesizes RNA primers), DNA Polymerase III (extends primers), DNA Polymerase I (replaces primers), Ligase (joins Okazaki fragments). Leading strand is continuous, lagging strand is discontinuous. Replication ensures genetic continuity.",
    keywords: ["semi-conservative", "helicase", "dna polymerase", "okazaki fragments"]
  },
  "mutations": {
    title: "Genetic Mutations",
    content: "Mutations are changes in DNA sequence. Types include: Point mutations (substitutions), Frameshift mutations (insertions/deletions), Silent mutations (no amino acid change), Missense (amino acid change), Nonsense (premature stop codon). Mutations can be spontaneous or induced by mutagens.",
    keywords: ["point mutation", "frameshift", "silent", "missense", "nonsense"]
  },
  "central dogma": {
    title: "Central Dogma of Molecular Biology",
    content: "The Central Dogma describes information flow: DNA → RNA → Protein. Key processes: Replication (DNA to DNA), Transcription (DNA to RNA), Translation (RNA to Protein). Reverse transcription (RNA to DNA) occurs in retroviruses. This framework explains how genetic information is expressed and maintained.",
    keywords: ["dna to rna", "rna to protein", "information flow", "crick"]
  }
};

// Function to find relevant topic from user query
function findRelevantTopic(query) {
  const lowerQuery = query.toLowerCase();
  
  // Check for exact matches first
  for (const [topic, data] of Object.entries(knowledgeBase)) {
    if (lowerQuery.includes(topic)) {
      return { topic, data };
    }
  }
  
  // Check for keyword matches
  for (const [topic, data] of Object.entries(knowledgeBase)) {
    for (const keyword of data.keywords) {
      if (lowerQuery.includes(keyword)) {
        return { topic, data };
      }
    }
  }
  
  return null;
}

// Function to generate enhanced response using external APIs
async function generateEnhancedResponse(userMessage, userSession) {
  try {
    // Try to use OpenAI API if available
    if (process.env.OPENAI_API_KEY) {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are MolGenoBot, an expert molecular genetics assistant. Provide accurate, educational responses about DNA, RNA, proteins, transcription, translation, and related topics. Keep responses clear and suitable for students and researchers."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        response: response.data.choices[0].message.content,
        source: "openai",
        updatedSession: {
          knowledgeLevel: Math.min(userSession.knowledgeLevel + 1, 10),
          lastTopics: [...(userSession.lastTopics || []).slice(-4), userMessage.toLowerCase()]
        }
      };
    }
  } catch (error) {
    console.log('OpenAI API not available, using local knowledge base');
  }

  // Fallback to local knowledge base
  const relevantTopic = findRelevantTopic(userMessage);
  
  if (relevantTopic) {
    return {
      response: `**${relevantTopic.data.title}**\n\n${relevantTopic.data.content}\n\nIs there anything specific about ${relevantTopic.topic} you'd like me to elaborate on?`,
      source: "knowledge_base",
      updatedSession: {
        knowledgeLevel: Math.min(userSession.knowledgeLevel + 1, 10),
        lastTopics: [...(userSession.lastTopics || []).slice(-4), relevantTopic.topic],
        interests: [...new Set([...(userSession.interests || []), relevantTopic.topic])]
      }
    };
  }

  // General response for unknown topics
  return {
    response: "I'm MolGenoBot, your molecular genetics assistant! I can help you understand:\n\n• DNA structure and replication\n• Transcription and RNA processing\n• Translation and protein synthesis\n• Genetic code and mutations\n• Gene regulation (like lac operon)\n• Central dogma of molecular biology\n\nWhat specific topic would you like to learn about? You can also ask about the genetic translator tool and how DNA sequences are converted to proteins.",
    source: "general",
    updatedSession: userSession
  };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'GenefloAI Backend Server is running',
    version: '1.0.0'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, userSession } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create user session
    const sessionId = userSession?.id || `user_${Date.now()}`;
    let currentSession = userSessions.get(sessionId) || {
      id: sessionId,
      knowledgeLevel: 0,
      interests: [],
      lastTopics: [],
      conversationHistory: [],
      createdAt: new Date().toISOString()
    };

    // Generate response
    const botResponse = await generateEnhancedResponse(message, currentSession);

    // Update session
    const updatedSession = {
      ...currentSession,
      ...botResponse.updatedSession,
      conversationHistory: [
        ...currentSession.conversationHistory.slice(-49), // Keep last 50 messages
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: botResponse.response, timestamp: new Date().toISOString() }
      ]
    };

    userSessions.set(sessionId, updatedSession);

    res.json({
      response: botResponse.response,
      source: botResponse.source,
      updatedSession: updatedSession
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to process your request at this time'
    });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  const session = userSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.get('/api/topics', (req, res) => {
  const topics = Object.keys(knowledgeBase).map(key => ({
    id: key,
    title: knowledgeBase[key].title,
    keywords: knowledgeBase[key].keywords
  }));
  res.json(topics);
});

// Serve the frontend (optional)
app.get('/', (req, res) => {
  res.json({ 
    message: 'GenefloAI Genetic Translator Backend',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat (POST)',
      topics: '/api/topics',
      session: '/api/session/:sessionId'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧬 GenefloAI Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Chat endpoint: http://localhost:${PORT}/api/chat`);
});
