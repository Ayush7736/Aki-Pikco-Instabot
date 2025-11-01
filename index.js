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

// ===== COMPREHENSIVE DEBUG LOGGING =====
console.log("🚨 ===== COMPREHENSIVE DEBUG START =====");
console.log("🔧 ENVIRONMENT VARIABLES DEBUG:");
console.log("   PORT:", PORT);
console.log("   VERIFY_TOKEN exists:", !!VERIFY_TOKEN);
console.log("   VERIFY_TOKEN value:", VERIFY_TOKEN);
console.log("   PAGE_ACCESS_TOKEN exists:", !!PAGE_ACCESS_TOKEN);
console.log("   PAGE_ACCESS_TOKEN length:", PAGE_ACCESS_TOKEN?.length);
console.log("   PAGE_ACCESS_TOKEN first 30:", PAGE_ACCESS_TOKEN?.substring(0, 30));
console.log("   PAGE_ACCESS_TOKEN last 10:", PAGE_ACCESS_TOKEN?.substring(PAGE_ACCESS_TOKEN?.length - 10));
console.log("   GEMINI_API_KEY exists:", !!GEMINI_API_KEY);
console.log("   GEMINI_API_KEY first 10:", GEMINI_API_KEY?.substring(0, 10));
console.log("   SERP_API_KEY exists:", !!SERP_API_KEY);

// Check if token is the problematic one
const isOldToken = PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe');
console.log("   IS OLD PROBLEMATIC TOKEN:", isOldToken);

// Check process.env directly
console.log("🔍 PROCESS.ENV DIRECT CHECK:");
console.log("   process.env.PAGE_ACCESS_TOKEN exists:", !!process.env.PAGE_ACCESS_TOKEN);
console.log("   process.env.PAGE_ACCESS_TOKEN length:", process.env.PAGE_ACCESS_TOKEN?.length);
console.log("   process.env.PAGE_ACCESS_TOKEN first 20:", process.env.PAGE_ACCESS_TOKEN?.substring(0, 20));

console.log("🚨 ===== COMPREHENSIVE DEBUG END =====");

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
  
  if (chatLogs.length > MAX_LOG_ENTRIES) {
    chatLogs = chatLogs.slice(0, MAX_LOG_ENTRIES);
  }
  
  const statusIcon = status === "success" ? "✅" : "❌";
  console.log(`${statusIcon} [${timestamp}] ${source} User ${userId}: ${userMessage}`);
  if (status === "success") {
    console.log(`🤖 [${timestamp}] Bot: ${botReply.substring(0, 100)}${botReply.length > 100 ? '...' : ''}`);
  }
}

// ===== TOKEN CLEANING FUNCTION =====
function cleanToken(token) {
  if (!token) return token;
  console.log("🧹 Cleaning token - before:", token.length, "chars");
  const cleaned = token.replace(/[^a-zA-Z0-9]/g, '');
  console.log("🧹 Cleaning token - after:", cleaned.length, "chars");
  return cleaned;
}

// ===== COMPREHENSIVE TOKEN DEBUG ENDPOINT =====
app.get("/debug-env", (req, res) => {
  console.log("🔍 /debug-env called - Comprehensive environment check");
  
  const envAnalysis = {
    timestamp: new Date().toISOString(),
    environment_variables: {
      PORT: process.env.PORT,
      VERIFY_TOKEN: {
        exists: !!process.env.VERIFY_TOKEN,
        length: process.env.VERIFY_TOKEN?.length,
        value: process.env.VERIFY_TOKEN
      },
      PAGE_ACCESS_TOKEN: {
        exists: !!process.env.PAGE_ACCESS_TOKEN,
        length: process.env.PAGE_ACCESS_TOKEN?.length,
        first_30: process.env.PAGE_ACCESS_TOKEN?.substring(0, 30),
        last_10: process.env.PAGE_ACCESS_TOKEN?.substring(process.env.PAGE_ACCESS_TOKEN?.length - 10),
        is_old_token: process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe')
      },
      GEMINI_API_KEY: {
        exists: !!process.env.GEMINI_API_KEY,
        length: process.env.GEMINI_API_KEY?.length,
        first_10: process.env.GEMINI_API_KEY?.substring(0, 10)
      },
      SERP_API_KEY: {
        exists: !!process.env.SERP_API_KEY,
        length: process.env.SERP_API_KEY?.length
      }
    },
    constants: {
      PAGE_ACCESS_TOKEN: {
        length: PAGE_ACCESS_TOKEN?.length,
        first_30: PAGE_ACCESS_TOKEN?.substring(0, 30),
        is_old_token: PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe')
      }
    },
    process_info: {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  res.json(envAnalysis);
});

// ===== TOKEN VALIDATION TEST =====
app.get("/validate-token", async (req, res) => {
  try {
    console.log("🧪 /validate-token - Comprehensive token validation");
    
    const currentToken = process.env.PAGE_ACCESS_TOKEN;
    const cleanedToken = cleanToken(currentToken);
    
    console.log("   Current token length:", currentToken?.length);
    console.log("   Cleaned token length:", cleanedToken?.length);
    console.log("   Token starts with IGAA:", currentToken?.startsWith('IGAA'));
    console.log("   First 20 chars:", currentToken?.substring(0, 20));
    
    // Test the token with Facebook API
    const testResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me?fields=name,id,instagram_business_account&access_token=${cleanedToken}`,
      { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Instagram-AI-Bot-Debug/1.0'
        }
      }
    );

    res.json({
      status: "✅ TOKEN IS VALID",
      debug_info: {
        original_token_length: currentToken?.length,
        cleaned_token_length: cleanedToken?.length,
        starts_with_IGAA: currentToken?.startsWith('IGAA'),
        first_20_chars: currentToken?.substring(0, 20),
        api_response: testResponse.data
      },
      conclusion: "Token is working correctly with Facebook API"
    });

  } catch (error) {
    console.error("❌ /validate-token - Token validation failed");
    
    const errorData = error.response?.data?.error || {};
    const currentToken = process.env.PAGE_ACCESS_TOKEN;
    
    res.status(400).json({
      status: "❌ TOKEN IS INVALID",
      debug_info: {
        token_length: currentToken?.length,
        starts_with_IGAA: currentToken?.startsWith('IGAA'),
        first_30_chars: currentToken?.substring(0, 30),
        last_10_chars: currentToken?.substring(currentToken?.length - 10),
        is_old_token: currentToken?.startsWith('IGAAJeDiCbAihBZAFJGe')
      },
      error_details: {
        code: errorData.code,
        message: errorData.message,
        type: errorData.type,
        fbtrace_id: errorData.fbtrace_id
      },
      possible_issues: [
        !currentToken?.startsWith('IGAA') ? "❌ Token should start with 'IGAA'" : "✅ Token format correct",
        currentToken?.length < 180 ? "❌ Token seems too short" : "✅ Token length OK",
        errorData.code === 190 ? "❌ Token is completely invalid" : "",
        errorData.code === 10 ? "❌ Missing permissions" : ""
      ].filter(issue => issue),
      solution: "The token in Render environment variables is invalid. Regenerate and update it."
    });
  }
});

// ===== FORCE TOKEN UPDATE TEST =====
app.get("/force-token-test", async (req, res) => {
  try {
    console.log("🧪 /force-token-test - Testing with manual token");
    
    // Test with a manually provided token
    const testToken = req.query.token || process.env.PAGE_ACCESS_TOKEN;
    
    console.log("   Testing token:", testToken?.substring(0, 20) + "...");
    console.log("   Token length:", testToken?.length);
    
    const testResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me?fields=name&access_token=${testToken}`,
      { timeout: 10000 }
    );

    res.json({
      status: "✅ MANUAL TOKEN TEST SUCCESS",
      tested_token_preview: testToken?.substring(0, 20) + "...",
      token_length: testToken?.length,
      api_response: testResponse.data
    });

  } catch (error) {
    const testToken = req.query.token || process.env.PAGE_ACCESS_TOKEN;
    
    res.status(400).json({
      status: "❌ MANUAL TOKEN TEST FAILED",
      tested_token_preview: testToken?.substring(0, 20) + "...",
      token_length: testToken?.length,
      error: error.response?.data?.error || error.message
    });
  }
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "🚀 Instagram AI Bot Server Running - DEBUG MODE",
    timestamp: new Date().toISOString(),
    version: "6.0.0 - FULL DEBUG",
    debug_endpoints: {
      environment: "/debug-env",
      token_validation: "/validate-token", 
      force_test: "/force-token-test?token=YOUR_TOKEN",
      test_token: "/test-token",
      test_gemini: "/test-gemini",
      logs: "/logs"
    },
    current_token_status: {
      length: process.env.PAGE_ACCESS_TOKEN?.length,
      starts_with_IGAA: process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAA'),
      is_old_token: process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe')
    }
  });
});

// ===== WEBHOOK VERIFICATION =====
app.get("/webhook", (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  console.log("🔐 Webhook Verification DEBUG:");
  console.log("   Mode:", mode);
  console.log("   Token provided:", token ? 'YES' : 'NO');
  console.log("   Expected token:", VERIFY_TOKEN);
  console.log("   Challenge:", challenge);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.status(403).json({ 
      error: "Verification failed",
      debug: {
        mode_received: mode,
        token_received: token ? 'YES' : 'NO',
        expected_token: VERIFY_TOKEN
      }
    });
  }
});

// ===== WEBHOOK MESSAGE HANDLER =====
app.post("/webhook", async (req, res) => {
  try {
    console.log("📨 Instagram Webhook Received - DEBUG");
    console.log("   Body object:", req.body.object);
    console.log("   Entry count:", req.body.entry?.length || 0);
    console.log("   Current token in use:", process.env.PAGE_ACCESS_TOKEN?.substring(0, 20) + "...");

    // Immediately acknowledge receipt
    res.status(200).send("EVENT_RECEIVED");

    // Process asynchronously
    processWebhook(req.body).catch(error => {
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
  console.log(`   Current token: ${process.env.PAGE_ACCESS_TOKEN?.substring(0, 20)}...`);

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

  // ===== GEMINI AI RESPONSE =====
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
    console.error("❌ Gemini API error:", error.message);
    geminiReply = "I'm having trouble connecting to the AI service. Please try again later.";
  }

  // ===== SEND REPLY TO INSTAGRAM =====
  try {
    console.log(`📤 Attempting to send message with token: ${process.env.PAGE_ACCESS_TOKEN?.substring(0, 20)}...`);
    await sendInstagramMessage(senderId, geminiReply);
    logInteraction(senderId, userMessage, geminiReply, "instagram", "success");
    
  } catch (error) {
    console.error("❌ Failed to send Instagram message:", error.message);
    console.error("   Current token preview:", process.env.PAGE_ACCESS_TOKEN?.substring(0, 30));
    logInteraction(senderId, userMessage, error.message, "instagram", "error");
  }
}

// ===== SEND INSTAGRAM MESSAGE =====
async function sendInstagramMessage(recipientId, messageText) {
  try {
    console.log(`📤 Sending to Instagram user ${recipientId}`);
    
    const cleanAccessToken = cleanToken(process.env.PAGE_ACCESS_TOKEN);
    console.log(`   Using cleaned token: ${cleanAccessToken.substring(0, 20)}...`);
    console.log(`   Cleaned token length: ${cleanAccessToken.length}`);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: "RESPONSE"
      },
      {
        params: { access_token: cleanAccessToken },
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
      console.error(`   Error type: ${fbError.type}`);
      console.error(`   FB Trace ID: ${fbError.fbtrace_id}`);
    }
    
    throw error;
  }
}

// ===== TEST ENDPOINTS =====
app.get("/test-token", async (req, res) => {
  try {
    console.log("🧪 Testing Instagram token...");
    
    const testResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me?fields=name,id&access_token=${process.env.PAGE_ACCESS_TOKEN}`,
      { timeout: 10000 }
    );

    res.json({
      status: "✅ Token is VALID",
      token_preview: `${process.env.PAGE_ACCESS_TOKEN.substring(0, 15)}...`,
      token_length: process.env.PAGE_ACCESS_TOKEN.length,
      account_info: testResponse.data
    });

  } catch (error) {
    console.error("❌ Token test failed:", error.message);
    
    res.status(400).json({
      status: "❌ Token is INVALID",
      token_preview: `${process.env.PAGE_ACCESS_TOKEN?.substring(0, 15)}...`,
      token_length: process.env.PAGE_ACCESS_TOKEN?.length,
      error: error.response?.data?.error || error.message
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
      test_prompt: testPrompt,
      response: responseText
    });

  } catch (error) {
    console.error("❌ Gemini test failed:", error.message);
    
    res.status(400).json({
      status: "❌ Gemini API Failed",
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// ===== ADMIN ROUTES =====
app.get("/logs", (req, res) => {
  res.json({
    total: chatLogs.length,
    logs: chatLogs.slice(0, 50)
  });
});

app.get("/status", (req, res) => {
  res.json({
    status: "healthy",
    server_time: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    interactions: chatLogs.length,
    current_token: {
      length: process.env.PAGE_ACCESS_TOKEN?.length,
      starts_with_IGAA: process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAA'),
      is_old_token: process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe')
    }
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`
🔍 INSTAGRAM AI BOT - FULL DEBUG MODE STARTED
=============================================
📍 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}

📊 DEBUG ENDPOINTS:
🔗 Environment Analysis: https://instaai-2gem.onrender.com/debug-env
🔗 Token Validation: https://instaai-2gem.onrender.com/validate-token  
🔗 Force Token Test: https://instaai-2gem.onrender.com/force-token-test?token=YOUR_TOKEN
🔗 Basic Token Test: https://instaai-2gem.onrender.com/test-token
🔗 Gemini Test: https://instaai-2gem.onrender.com/test-gemini
🔗 Logs: https://instaai-2gem.onrender.com/logs

💡 Webhook URL: https://instaai-2gem.onrender.com/webhook
🔑 Verify Token: ${VERIFY_TOKEN}

📝 CURRENT TOKEN STATUS:
   Length: ${process.env.PAGE_ACCESS_TOKEN?.length} chars
   Starts with IGAA: ${process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAA')}
   Is Old Token: ${process.env.PAGE_ACCESS_TOKEN?.startsWith('IGAAJeDiCbAihBZAFJGe')}

✅ Server is ready for comprehensive debugging!
=============================================
  `);
});

module.exports = app;
