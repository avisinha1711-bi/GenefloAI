const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const natural = require('natural');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genefloai';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Database Models
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    knowledgeLevel: { type: Number, default: 0 },
    interests: [String],
    learningHistory: [{
        topic: String,
        timestamp: Date,
        interactionType: String
    }],
    conversationHistory: [{
        message: String,
        response: String,
        timestamp: Date
    }],
    preferences: {
        learningStyle: { type: String, enum: ['visual', 'textual', 'interactive'], default: 'interactive' },
        difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' }
    },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const KnowledgeBaseSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    content: { type: String, required: true },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    relatedTopics: [String],
    examples: [String],
    commonQuestions: [String],
    tags: [String]
});

const ConversationSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        timestamp: Date
    }],
    context: {
        currentTopic: String,
        learningObjectives: [String],
        completedWorkflows: [String]
    }
});

const User = mongoose.model('User', UserSchema);
const KnowledgeBase = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);

// Initialize Knowledge Base
async function initializeKnowledgeBase() {
    const count = await KnowledgeBase.countDocuments();
    if (count === 0) {
        const knowledgeItems = [
            {
                topic: "DNA structure",
                content: "DNA (Deoxyribonucleic Acid) has a double-helical structure composed of two antiparallel strands. Each strand consists of nucleotides containing a sugar-phosphate backbone and nitrogenous bases (Adenine, Thymine, Cytosine, Guanine) that form complementary pairs (A-T, G-C) through hydrogen bonding.",
                difficulty: "beginner",
                relatedTopics: ["DNA replication", "Transcription", "Genetic code"],
                examples: ["The DNA double helix resembles a twisted ladder", "Watson and Crick proposed the double helix model in 1953"],
                commonQuestions: ["What is the difference between DNA and RNA?", "How does DNA store genetic information?"],
                tags: ["dna", "structure", "double helix", "genetics"]
            },
            {
                topic: "Transcription",
                content: "Transcription is the process where genetic information in DNA is copied into messenger RNA (mRNA). RNA polymerase enzyme binds to promoter regions on DNA and synthesizes mRNA complementary to the template strand. In eukaryotes, the primary transcript undergoes processing including 5' capping, 3' polyadenylation, and splicing to remove introns.",
                difficulty: "intermediate",
                relatedTopics: ["Translation", "Gene regulation", "RNA processing"],
                examples: ["The lac operon demonstrates transcriptional regulation in bacteria", "RNA polymerase requires transcription factors for initiation"],
                commonQuestions: ["What is the role of promoter regions?", "How does transcription differ in prokaryotes and eukaryotes?"],
                tags: ["transcription", "mrna", "rna polymerase", "gene expression"]
            },
            {
                topic: "Translation",
                content: "Translation is the process of protein synthesis from mRNA. Ribosomes read mRNA codons in the 5' to 3' direction, and transfer RNA (tRNA) molecules bring corresponding amino acids. The process includes initiation (start codon AUG), elongation (peptide bond formation), and termination (stop codons UAA, UAG, UGA).",
                difficulty: "intermediate",
                relatedTopics: ["Genetic code", "Protein structure", "Ribosomes"],
                examples: ["The genetic code is nearly universal across organisms", "Ribosomes have three tRNA binding sites: A, P, and E"],
                commonQuestions: ["What is the role of tRNA in translation?", "How do antibiotics target bacterial translation?"],
                tags: ["translation", "protein synthesis", "ribosomes", "genetic code"]
            },
            {
                topic: "Genetic code",
                content: "The genetic code is the set of rules by which information in mRNA is translated into proteins. It is triplet (three nucleotides per codon), degenerate (most amino acids have multiple codons), and nearly universal across organisms. There are 64 possible codons: 61 code for amino acids and 3 are stop codons.",
                difficulty: "beginner",
                relatedTopics: ["Translation", "Mutations", "Amino acids"],
                examples: ["AUG codes for methionine and serves as the start codon", "The wobble hypothesis explains codon degeneracy"],
                commonQuestions: ["Why is the genetic code degenerate?", "How do mutations affect the genetic code?"],
                tags: ["genetic code", "codons", "amino acids", "translation"]
            }
        ];
        
        await KnowledgeBase.insertMany(knowledgeItems);
        console.log("Knowledge base initialized");
    }
}

// NLP and Response Generation
class IntelligentResponseGenerator {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
        this.classifier = new natural.BayesClassifier();
        this.initializeClassifier();
    }

    initializeClassifier() {
        // Training data for intent classification
        const trainingData = [
            { text: "what is dna structure", label: "dna_structure" },
            { text: "explain dna", label: "dna_structure" },
            { text: "how does transcription work", label: "transcription" },
            { text: "what is transcription", label: "transcription" },
            { text: "explain translation", label: "translation" },
            { text: "how are proteins made", label: "translation" },
            { text: "what is genetic code", label: "genetic_code" },
            { text: "explain codons", label: "genetic_code" },
            { text: "help me learn", label: "learning_help" },
            { text: "I want to study", label: "learning_help" },
            { text: "quiz me", label: "quiz" },
            { text: "test my knowledge", label: "quiz" }
        ];

        trainingData.forEach(item => {
            this.classifier.addDocument(item.text, item.label);
        });
        
        this.classifier.train();
    }

    async generateResponse(message, userSession) {
        // Classify user intent
        const intent = this.classifier.classify(message);
        
        // Find relevant knowledge base entries
        const relevantTopics = await this.findRelevantTopics(message);
        
        // Generate personalized response based on user knowledge level
        return this.formatResponse(intent, relevantTopics, userSession);
    }

    async findRelevantTopics(message) {
        const allTopics = await KnowledgeBase.find({});
        const relevant = [];
        
        const tokens = this.tokenizer.tokenize(message.toLowerCase());
        
        allTopics.forEach(topic => {
            let score = 0;
            tokens.forEach(token => {
                if (topic.tags.includes(token)) score += 2;
                if (topic.topic.toLowerCase().includes(token)) score += 3;
                if (topic.content.toLowerCase().includes(token)) score += 1;
            });
            
            if (score > 0) {
                relevant.push({ topic, score });
            }
        });
        
        return relevant.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    formatResponse(intent, relevantTopics, userSession) {
        if (relevantTopics.length === 0) {
            return "I'm not sure I understand. Could you rephrase your question about molecular genetics?";
        }

        const mainTopic = relevantTopics[0].topic;
        let response = "";
        
        // Adjust content based on user knowledge level
        if (userSession.knowledgeLevel < 30) {
            response = this.simplifyContent(mainTopic.content);
        } else if (userSession.knowledgeLevel > 70) {
            response = this.enhanceContent(mainTopic);
        } else {
            response = mainTopic.content;
        }

        // Add examples if available
        if (mainTopic.examples && mainTopic.examples.length > 0) {
            response += `\n\nFor example: ${mainTopic.examples[0]}`;
        }

        // Add related topics suggestion
        if (mainTopic.relatedTopics && mainTopic.relatedTopics.length > 0) {
            response += `\n\nRelated topics you might find interesting: ${mainTopic.relatedTopics.slice(0, 3).join(', ')}`;
        }

        return response;
    }

    simplifyContent(content) {
        // Simple content simplification - split and take first few sentences
        const sentences = content.split('. ');
        return sentences.slice(0, 2).join('. ') + '.';
    }

    enhanceContent(topic) {
        let enhanced = topic.content;
        
        // Add advanced details based on topic
        if (topic.topic === "DNA structure") {
            enhanced += "\n\nAdvanced: DNA can exist in different forms including B-DNA (most common), A-DNA (dehydrated), and Z-DNA (left-handed). Telomeres at chromosome ends have unique G-quadruplex structures.";
        } else if (topic.topic === "Transcription") {
            enhanced += "\n\nAdvanced: Transcription factors can be classified as general or specific. Enhancers can be located far from genes and work through DNA looping mediated by cohesin and mediator complexes.";
        }
        
        return enhanced;
    }

    generateQuiz(topic) {
        const quizzes = {
            "DNA structure": [
                {
                    question: "What type of bonds connect base pairs in DNA?",
                    options: ["Covalent bonds", "Hydrogen bonds", "Ionic bonds", "Peptide bonds"],
                    answer: 1
                }
            ],
            "Transcription": [
                {
                    question: "Which enzyme is primarily responsible for transcription?",
                    options: ["DNA polymerase", "RNA polymerase", "Helicase", "Ligase"],
                    answer: 1
                }
            ]
        };
        
        return quizzes[topic] || quizzes["DNA structure"];
    }
}

const responseGenerator = new IntelligentResponseGenerator();

// API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userSession } = req.body;
        
        // Find or create user
        let user = await User.findOne({ userId: userSession.id });
        if (!user) {
            user = new User({
                userId: userSession.id,
                knowledgeLevel: userSession.knowledgeLevel || 0,
                interests: userSession.interests || []
            });
        }

        // Update user activity
        user.lastActive = new Date();
        
        // Generate intelligent response
        const response = await responseGenerator.generateResponse(message, userSession);
        
        // Update user knowledge level based on interaction
        user.knowledgeLevel = Math.min(user.knowledgeLevel + 2, 100);
        
        // Extract potential interests from message
        const tokens = natural.WordTokenizer().tokenize(message.toLowerCase());
        const potentialInterests = ["dna", "rna", "protein", "gene", "transcription", "translation"];
        tokens.forEach(token => {
            if (potentialInterests.includes(token) && !user.interests.includes(token)) {
                user.interests.push(token);
            }
        });

        // Save conversation
        user.conversationHistory.push({
            message: message,
            response: response,
            timestamp: new Date()
        });

        // Keep only last 50 conversations
        if (user.conversationHistory.length > 50) {
            user.conversationHistory = user.conversationHistory.slice(-50);
        }

        await user.save();

        res.json({
            response: response,
            updatedSession: {
                knowledgeLevel: user.knowledgeLevel,
                interests: user.interests
            }
        });

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ 
            response: "I'm experiencing technical difficulties. Please try again later.",
            error: error.message 
        });
    }
});

// Get user progress
app.get('/api/user/:userId/progress', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            knowledgeLevel: user.knowledgeLevel,
            interests: user.interests,
            learningHistory: user.learningHistory.slice(-10),
            totalConversations: user.conversationHistory.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get learning recommendations
app.get('/api/user/:userId/recommendations', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const recommendations = await KnowledgeBase.find({
            difficulty: user.knowledgeLevel < 50 ? 'beginner' : 
                       user.knowledgeLevel < 80 ? 'intermediate' : 'advanced'
        }).limit(5);

        res.json({ recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize and start server
async function startServer() {
    try {
        await mongoose.connection.once('open', () => {
            console.log('Connected to MongoDB');
        });
        
        await initializeKnowledgeBase();
        
        app.listen(PORT, () => {
            console.log(`GenefloAI Backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
