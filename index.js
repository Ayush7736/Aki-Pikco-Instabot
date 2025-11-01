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
console.log(`   PAGE_ACCESS_TOKEN: ${PAGE_ACCESS_TOKEN ? `✅ Set (${PAGE_ACCESS_TOKEN.substring(0, 10)}...)` : '❌ Missing'}`);
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
const MAX_LOG_ENTRIES = 1000;

function logInteraction(userId, userMessage, botReply, source = "instagram", status = "success") {
  const timestamp = new Date().toISOString();
  const logEntry = {
    userId,
    userMessage,
    botReply: botReply.length > 300 ? botReply.substring(0, 300) + '...' : botReply,
    source,
    status,
    timestamp
  };
  
  chatLogs.unshift(logEntry);
  
  // Prevent memory leaks by limiting log size
  if (chatLogs.length > MAX_LOG_ENTRIES) {
    chatLogs = chatLogs.slice(0, MAX_LOG_ENTRIES);
  }
  
  const statusIcon = status === "success" ? "✅" : "❌";
  console.log(`${statusIcon} [${timestamp}] ${source} User ${userId}: ${userMessage}`);
  if (status === "success") {
    console.log(`🤖 [${timestamp}] Bot: ${botReply.substring(0, 100)}${botReply.length > 100 ? '...' : ''}`);
  }
}

// ===== OPTIMIZED FALLBACK MODELS FOR FREE TIER =====
async function tryFallbackModelsOptimized(prompt, apiKey) {
  const fallbackModels = [
    { name: 'gemini-2.0-flash-lite', priority: 1 },
    { name: 'gemini-2.0-flash', priority: 2 },
    { name: 'gemini-2.5-flash', priority: 3 },
    { name: 'gemini-2.5-pro', priority: 4 },
    { name: 'gemini-1.5-flash', priority: 5 }
  ];

  fallbackModels.sort((a, b) => a.priority - b.priority);
  
  for (const model of fallbackModels) {
    try {
      console.log(`🔄 Trying model: ${model.name}`);
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7
          }
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000
        }
      );
      
      if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✅ Success with model: ${model.name}`);
        return response.data.candidates[0].content.parts[0].text.trim();
      }
    } catch (error) {
      console.log(`❌ Model ${model.name} failed:`, error.message);
      continue;
    }
  }
  
  return "I'm currently unable to generate responses. Please try again in a moment.";
}

// ===== INSTAGRAM OAUTH CALLBACK HANDLER =====
app.get("/auth/callback", (req, res) => {
  const { code, error, error_reason, error_description } = req.query;
  
  console.log("🔐 Instagram OAuth Callback Received");

  if (code) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>✅ Instagram Connected</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D);
            margin: 0; padding: 20px; min-height: 100vh; 
            display: flex; align-items: center; justify-content: center; color: white; 
          }
          .card { 
            background: rgba(255,255,255,0.15); padding: 40px; border-radius: 20px; 
            backdrop-filter: blur(10px); text-align: center; max-width: 500px;
            border: 1px solid rgba(255,255,255,0.2);
          }
          h1 { margin: 0 0 20px 0; font-size: 2.2em; }
          .btn { 
            background: white; color: #E1306C; padding: 12px 30px; border: none; 
            border-radius: 25px; font-size: 1.1em; cursor: pointer; margin-top: 20px; 
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Instagram Connected!</h1>
          <p>Your Instagram account has been successfully connected to the AI bot.</p>
          <p>You can now close this window and start chatting with your AI bot!</p>
          <button class="btn" onclick="window.close()">Close Window</button>
        </div>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
      </html>
    `);
  } else if (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>❌ Connection Failed</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa;">
        <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #dc3545;">❌ Connection Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p>Please try again or check your Instagram app settings.</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Instagram Authentication</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>🔐 Instagram Auth Endpoint</h1>
        <p>This handles Instagram OAuth callbacks for your AI bot.</p>
        <p><strong>Status:</strong> <span style="color: green;">✅ Active & Ready</span></p>
      </body>
      </html>
    `);
  }
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    status: "OK",
    message: "🚀 Instagram AI Bot Server Running",
    timestamp: new Date().toISOString(),
    version: "4.0.0",
    gemini_tier: "FREE TIER (v1beta)",
    token_type: "IGAA (Instagram Business API)",
    endpoints: {
      health: "/",
      webhook: "/webhook",
      callback: "/auth/callback", 
      logs: "/logs",
      status: "/status",
      test_token: "/test-token",
      test_gemini: "/test-gemini"
    },
    stats: {
      totalInteractions: chatLogs.length,
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    }
  });
});

// ===== WEBHOOK VERIFICATION =====
app.get("/webhook", (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  console.log(`🔐 Webhook Verification: mode=${mode}, token=${token ? 'provided' : 'missing'}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.status(403).json({ error: "Verification failed" });
  }
});

// ===== WEBHOOK MESSAGE HANDLER =====
app.post("/webhook", async (req, res) => {
  try {
    console.log("📨 Instagram Webhook Received");
    const body = req.body;

    // Immediately acknowledge receipt
    res.status(200).send("EVENT_RECEIVED");

    // Process asynchronously
    processWebhook(body).catch(error => {
      console.error("❌ Webhook processing error:", error.message);
    });

  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
    res.status(500).send("ERROR_PROCESSING_WEBHOOK");
  }
});

// ===== PROCESS WEBHOOK =====
async function processWebhook(body) {
  if (body.object !== "instagram") {
    console.log("⚠️ Ignoring non-Instagram webhook");
    return;
  }

  if (!body.entry || body.entry.length === 0) {
    console.log("ℹ️ No entries in webhook");
    return;
  }

  for (const entry of body.entry) {
    const messaging = entry.messaging || [];
    
    console.log(`   Processing ${messaging.length} messaging events`);

    for (const event of messaging) {
      if (event.message && event.message.text) {
        await processInstagramMessage(event);
      }
    }
  }
}

// ===== PROCESS INSTAGRAM MESSAGE =====
async function processInstagramMessage(event) {
  const senderId = event.sender.id;
  const userMessage = event.message.text.trim();

  console.log(`📩 Instagram Message from ${senderId}: "${userMessage}"`);

  if (!userMessage) {
    console.log("⚠️ Empty message, ignoring");
    return;
  }

  let prompt = userMessage;
  let searchUsed = false;

  // ===== SEARCH FUNCTIONALITY =====
  if (userMessage.toLowerCase().startsWith("search:") && SERP_API_KEY) {
    const query = userMessage.slice(7).trim();
    if (query) {
      try {
        console.log(`🔍 Performing search: "${query}"`);
        
        const searchResponse = await axios.get("https://serpapi.com/search.json", {
          params: {
            q: query,
            api_key: SERP_API_KEY,
            engine: "google",
            num: 3
          },
          timeout: 10000
        });

        const results = searchResponse.data.organic_results?.slice(0, 3)
          .map((result, index) => `${index + 1}. ${result.title}: ${result.snippet}`)
          .join('\n\n') || 'No relevant results found.';

        prompt = `User searched for: "${query}"\n\nSearch Results:\n${results}\n\nBased on these results, provide a helpful and concise answer.`;
        searchUsed = true;

        console.log("✅ Search completed successfully");

      } catch (error) {
        console.error("❌ Search API error:", error.message);
        prompt = `I couldn't search for "${query}" right now. Please try again later.`;
      }
    }
  }

  // ===== GEMINI AI RESPONSE (OPTIMIZED FREE TIER) =====
  let geminiReply = "I'm having trouble generating a response right now. Please try again in a moment.";

  try {
    console.log(`🤖 Generating AI response with Gemini Free Tier...`);
    
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `You are a helpful AI assistant for Instagram. Respond in a friendly, conversational tone. Keep responses clear and engaging.

User message: ${prompt}

Please provide a helpful response${searchUsed ? ' based on the search results' : ''}.`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
          topP: 0.8
        }
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 25000
      }
    );

    const candidate = geminiResponse.data.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.text) {
      geminiReply = candidate.content.parts[0].text.trim();
    }

    if (!geminiReply || geminiReply.trim() === "") {
      geminiReply = "I didn't quite get that. Could you please rephrase your question?";
    }

    if (geminiReply.length > 1500) {
      geminiReply = geminiReply.substring(0, 1497) + "...";
    }

    console.log(`✅ AI response generated (${geminiReply.length} characters)`);

  } catch (error) {
    console.error("❌ Primary model failed:", error.message);
    geminiReply = await tryFallbackModelsOptimized(prompt, GEMINI_API_KEY);
  }

  // ===== SEND REPLY TO INSTAGRAM =====
  try {
    await sendInstagramMessage(senderId, geminiReply);
    logInteraction(senderId, userMessage, geminiReply, "instagram", "success");
    
  } catch (error) {
    console.error("❌ Failed to send Instagram message:", error.message);
    logInteraction(senderId, userMessage, error.message, "instagram", "error");
  }
}

// ===== SEND INSTAGRAM MESSAGE =====
async function sendInstagramMessage(recipientId, messageText) {
  try {
    console.log(`📤 Sending to Instagram user ${recipientId}`);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: "RESPONSE"
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    console.log("✅ Instagram message sent successfully!");
    return response.data;

  } catch (error) {
    console.error("❌ Instagram API Error:");
    
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error(`   Error ${fbError.code}: ${fbError.message}`);
      
      if (fbError.code === 190) {
        throw new Error("Invalid Instagram access token");
      } else if (fbError.code === 100) {
        throw new Error("Cannot message this user");
      }
    }
    
    throw error;
  }
}

// ===== TEST ENDPOINTS =====
app.get("/test-token", async (req, res) => {
  try {
    console.log("🧪 Testing Instagram token...");
    
    const testResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me?fields=name,id&access_token=${PAGE_ACCESS_TOKEN}`,
      { timeout: 10000 }
    );

    res.json({
      status: "✅ Token is VALID",
      token_preview: `${PAGE_ACCESS_TOKEN.substring(0, 15)}...`,
      account_info: testResponse.data,
      token_type: "IGAA (Instagram Business API)"
    });

  } catch (error) {
    console.error("❌ Token test failed:", error.message);
    
    res.status(400).json({
      status: "❌ Token is INVALID",
      error: error.response?.data?.error || error.message,
      solution: "Regenerate your Instagram access token"
    });
  }
});

app.get("/test-gemini", async (req, res) => {
  try {
    console.log("🧪 Testing Gemini Free Tier...");
    
    const testPrompt = "Hello! Please respond with a short greeting to confirm the API is working.";
    
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: testPrompt }]
        }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7
        }
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    const responseText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text";

    res.json({
      status: "✅ Gemini Free Tier is WORKING",
      model: "gemini-2.0-flash-lite",
      api_version: "v1beta",
      test_prompt: testPrompt,
      response: responseText
    });

  } catch (error) {
    console.error("❌ Gemini test failed:", error.message);
    
    res.status(400).json({
      status: "❌ Gemini API Failed",
      error: error.response?.data?.error?.message || error.message,
      solution: "Check your Gemini API key"
    });
  }
});

// ===== ADMIN ROUTES =====
app.get("/logs", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  
  res.json({
    page,
    limit,
    total: chatLogs.length,
    totalPages: Math.ceil(chatLogs.length / limit),
    logs: chatLogs.slice(0, limit)
  });
});

app.get("/status", (req, res) => {
  res.json({
    status: "healthy",
    server_time: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    interactions: chatLogs.length,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.delete("/logs", (req, res) => {
  const count = chatLogs.length;
  chatLogs = [];
  res.json({ message: `Cleared ${count} log entries`, cleared: count });
});

// ===== ERROR HANDLING =====
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: [
      "GET /", "GET /webhook", "POST /webhook", "GET /auth/callback",
      "GET /test-token", "GET /test-gemini", "GET /logs", "GET /status", "DELETE /logs"
    ]
  });
});

app.use((error, req, res, next) => {
  console.error("🛑 Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`
🌈 INSTAGRAM AI BOT SERVER STARTED
===================================
📍 Port: ${PORT}
🔗 Health: https://instaai-2gem.onrender.com/
📊 Logs: https://instaai-2gem.onrender.com/logs  
🧪 Token Test: https://instaai-2gem.onrender.com/test-token
🤖 Gemini Test: https://instaai-2gem.onrender.com/test-gemini

💡 Webhook URL: https://instaai-2gem.onrender.com/webhook
🔑 Verify Token: ${VERIFY_TOKEN}

✅ Server is ready for Instagram messages!
✨ Message @pikco.aki.74 to test your bot!
===================================
  `);
});

module.exports = app;
