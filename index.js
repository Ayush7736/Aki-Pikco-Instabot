// Import required modules
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ===== ENVIRONMENT VARIABLES =====
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

// ===== ENVIRONMENT VALIDATION =====
console.log("🔧 Environment Check:");
console.log(`   PORT: ${PORT}`);
console.log(`   VERIFY_TOKEN: ${VERIFY_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   PAGE_ACCESS_TOKEN: ${PAGE_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   SERP_API_KEY: ${SERP_API_KEY ? '✅ Set' : '❌ Optional'}`);

// Validate required environment variables
const requiredEnvVars = ['VERIFY_TOKEN', 'PAGE_ACCESS_TOKEN', 'GEMINI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('💡 Please check your Render environment variables configuration');
  process.exit(1);
}

// ===== LOGGING SYSTEM =====
let chatLogs = [];
const MAX_LOG_ENTRIES = 500;

function logInteraction(userId, userMessage, botReply) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    userId,
    userMessage,
    botReply: botReply.substring(0, 200) + (botReply.length > 200 ? '...' : ''),
    timestamp
  };
  
  chatLogs.push(logEntry);
  
  // Prevent memory leaks by limiting log size
  if (chatLogs.length > MAX_LOG_ENTRIES) {
    chatLogs = chatLogs.slice(-MAX_LOG_ENTRIES);
  }
  
  console.log(`💬 [${timestamp}] User ${userId}: ${userMessage}`);
  console.log(`🤖 [${timestamp}] Bot: ${botReply.substring(0, 100)}...`);
}

// ===== HEALTH CHECK ENDPOINT =====
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🤖 Instagram Gemini Bot Server is Running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      health: "/",
      webhook: "/webhook",
      logs: "/logs",
      clearLogs: "DELETE /logs"
    },
    stats: {
      totalInteractions: chatLogs.length,
      uptime: Math.floor(process.uptime()) + " seconds"
    }
  });
});

// ===== WEBHOOK VERIFICATION =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`🔐 Webhook verification attempt: mode=${mode}, token=${token ? 'provided' : 'missing'}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.status(403).json({
      error: "Verification failed",
      message: "Invalid verify token or mode"
    });
  }
});

// ===== WEBHOOK MESSAGE HANDLER =====
app.post("/webhook", async (req, res) => {
  try {
    console.log("📨 Received webhook payload");
    const body = req.body;

    // Immediately respond to acknowledge receipt
    res.status(200).send("EVENT_RECEIVED");

    // Process the webhook asynchronously
    processWebhook(body).catch(error => {
      console.error("❌ Error processing webhook:", error.message);
    });

  } catch (err) {
    console.error("❌ POST /webhook error:", err.message);
    res.status(500).send("ERROR_PROCESSING");
  }
});

// ===== PROCESS WEBHOOK ASYNC =====
async function processWebhook(body) {
  if (body.object === "instagram" || body.object === "page") {
    console.log(`🔍 Processing ${body.object} webhook`);
    
    for (const entry of body.entry) {
      // Handle Instagram direct messages
      const messaging = entry.messaging || [];
      
      for (const event of messaging) {
        if (event.message && event.message.text) {
          await processMessageEvent(event);
        }
      }
      
      // Handle Instagram story replies or other changes
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "messages" && change.value.messages) {
          for (const message of change.value.messages) {
            await processMessageEvent({
              sender: { id: message.from },
              message: { text: message.text }
            });
          }
        }
      }
    }
  } else {
    console.log("⚠️ Unknown webhook object type:", body.object);
  }
}

// ===== PROCESS MESSAGE EVENT =====
async function processMessageEvent(event) {
  const senderId = event.sender.id;
  const userMessage = event.message.text.trim();
  
  if (!userMessage) return;

  console.log(`📩 Processing message from ${senderId}: "${userMessage}"`);

  let prompt = userMessage;
  let usedSearch = false;

  // ===== SEARCH FUNCTIONALITY =====
  if (userMessage.toLowerCase().startsWith("search:")) {
    const query = userMessage.slice(7).trim();
    if (query && SERP_API_KEY) {
      try {
        console.log(`🔍 Performing search: "${query}"`);
        const serpRes = await axios.get("https://serpapi.com/search.json", {
          params: {
            q: query,
            api_key: SERP_API_KEY,
            engine: "google",
            num: 3
          },
          timeout: 15000
        });
        
        const results = serpRes.data.organic_results
          ?.slice(0, 3)
          .map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`)
          .join("\n\n") || "No relevant results found.";
        
        prompt = `User asked for search results about: "${query}"\n\nSearch Results:\n${results}\n\nBased on these search results, provide a helpful, concise response to the user. If the results don't fully answer their question, let them know and suggest being more specific.`;
        usedSearch = true;
        
      } catch (err) {
        console.error("❌ SERP API error:", err.message);
        prompt = `I tried to search for "${query}" but encountered an issue. Please try again later or ask me directly without the "search:" prefix.`;
      }
    } else if (!SERP_API_KEY) {
      prompt = "Search functionality is not currently available. Please ask me questions directly.";
    }
  }

  // ===== GEMINI AI RESPONSE =====
  let geminiReply = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
  
  try {
    console.log(`🤖 Generating AI response...`);
    
    const gemRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ 
          parts: [{ 
            text: `You are a helpful AI assistant. Respond to the user in a friendly, conversational tone. Keep responses clear and concise unless more detail is needed.\n\nUser: ${prompt}` 
          }] 
        }],
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      },
      { 
        headers: { "Content-Type": "application/json" },
        timeout: 30000
      }
    );

    if (gemRes.data.candidates && gemRes.data.candidates[0]) {
      geminiReply = gemRes.data.candidates[0].content.parts[0].text.trim();
    }
    
    // Ensure response is not empty
    if (!geminiReply) {
      geminiReply = "I didn't get a proper response. Could you please rephrase your question?";
    }
    
    // Truncate very long responses for Instagram
    if (geminiReply.length > 1500) {
      geminiReply = geminiReply.substring(0, 1497) + "...";
    }
    
    console.log(`✅ AI response generated (${geminiReply.length} chars)`);
    
  } catch (err) {
    console.error("❌ Gemini API error:", err.message);
    if (err.response) {
      console.error("Gemini API response error:", err.response.data);
    }
    
    if (err.code === 'ECONNABORTED') {
      geminiReply = "The request took too long to process. Please try again with a simpler question.";
    } else if (err.response?.status === 429) {
      geminiReply = "I'm receiving too many requests right now. Please try again in a few moments.";
    } else {
      geminiReply = "I'm experiencing technical difficulties. Please try again shortly.";
    }
  }

  // ===== SEND RESPONSE =====
  try {
    await sendMessage(senderId, geminiReply);
    logInteraction(senderId, userMessage, geminiReply);
  } catch (sendError) {
    console.error("❌ Failed to send message:", sendError.message);
  }
}

// ===== SEND MESSAGE FUNCTION =====
async function sendMessage(recipientId, messageText) {
  try {
    console.log(`📤 Sending message to ${recipientId} (${messageText.length} chars)`);
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: "RESPONSE"
      },
      {
        params: { 
          access_token: PAGE_ACCESS_TOKEN 
        },
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      }
    );
    
    console.log("✅ Message sent successfully");
    return response.data;
  } catch (err) {
    console.error("❌ sendMessage error:", err.message);
    if (err.response) {
      console.error("Facebook API error response:", JSON.stringify(err.response.data, null, 2));
      
      // Handle specific Facebook API errors
      if (err.response.data.error) {
        const fbError = err.response.data.error;
        console.error(`Facebook Error ${fbError.code}: ${fbError.message}`);
      }
    }
    throw err;
  }
}

// ===== LOGS ENDPOINT =====
app.get("/logs", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedLogs = chatLogs.slice().reverse().slice(startIndex, endIndex);
  
  res.json({
    page,
    limit,
    total: chatLogs.length,
    totalPages: Math.ceil(chatLogs.length / limit),
    logs: paginatedLogs
  });
});

// ===== CLEAR LOGS ENDPOINT =====
app.delete("/logs", (req, res) => {
  const previousCount = chatLogs.length;
  chatLogs = [];
  
  res.json({ 
    message: `Cleared ${previousCount} log entries`,
    cleared: previousCount,
    remaining: 0,
    timestamp: new Date().toISOString()
  });
});

// ===== SERVER STATUS ENDPOINT =====
app.get("/status", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    interactions: chatLogs.length,
    environment: {
      node: process.version,
      platform: process.platform
    }
  });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error("🛑 Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    availableEndpoints: [
      "GET /",
      "GET /webhook",
      "POST /webhook", 
      "GET /logs",
      "DELETE /logs",
      "GET /status"
    ]
  });
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`\n🚀 Instagram Gemini Bot Server Started!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`📊 Logs: http://localhost:${PORT}/logs`);
  console.log(`⚡ Status: http://localhost:${PORT}/status`);
  console.log(`\n💡 Make sure your webhook URL is set to: https://your-app.onrender.com/webhook`);
  console.log(`🔐 Verify Token: ${VERIFY_TOKEN}\n`);
});

module.exports = app;
