import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// Your tokens
const VERIFY_TOKEN = "ayush";
const IG_ACCESS_TOKEN = "YOUR_INSTAGRAM_IGAA_TOKEN";
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log(JSON.stringify(body, null, 2));

    if (body.entry && body.entry[0].messaging) {
      for (const event of body.entry[0].messaging) {
        if (event.message && event.message.text) {
          const senderId = event.sender.id;
          const userMessage = event.message.text;

          // Get AI reply
          const aiResponse = await getGeminiResponse(userMessage);

          // Send reply back
          await sendIGMessage(senderId, aiResponse);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Error in webhook:", err);
    res.sendStatus(500);
  }
});

async function getGeminiResponse(prompt) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn’t think of a reply.";
  } catch (e) {
    console.error("Gemini error:", e);
    return "Error getting AI response.";
  }
}

async function sendIGMessage(recipientId, text) {
  try {
    await fetch(
      `https://graph.facebook.com/v24.0/me/messages?access_token=${IG_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );
  } catch (e) {
    console.error("Send message error:", e);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
