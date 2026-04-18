require("dotenv").config();
const cors = require("cors");
const express = require("express");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.API_KEY;

// ✅ Text generation endpoint
app.post("/generate", async (req, res) => {
  try {
    const { prompt, tone = "professional" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({ error: "Prompt too long. Max 1000 characters." });
    }

    // Tone-based system prompts
    const tonePrompts = {
      professional: "You are a professional marketing expert. Be clear, concise, and business-focused.",
      casual: "You are a friendly marketing assistant. Be conversational and approachable.",
      creative: "You are a creative copywriter. Be imaginative, catchy, and engaging.",
      funny: "You are a witty marketing expert. Be humorous and entertaining while staying relevant."
    };

    const systemPrompt = tonePrompts[tone] || tonePrompts.professional;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error:", errorData);
      return res.status(response.status).json({ 
        error: "AI service error. Please try again." 
      });
    }

    const data = await response.json();
    console.log("✅ AI Response received");

    const result =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "No response from AI";

    res.json({ 
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Server ERROR:", error.message);
    res.status(500).json({ 
      error: "Server error. Please check your connection and try again." 
    });
  }
});

// 🎨 Poster generation endpoint
app.post("/generate-poster", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🎨 Generating poster for:", prompt);

    // Enhanced prompt for better poster generation
    const enhancedPrompt = `Create a professional advertising poster for: ${prompt}. Make it eye-catching, modern, with bold typography, vibrant colors, and commercial appeal. Professional marketing design, high quality, suitable for print and digital use, write clear readble text with meaning on poster.`;

    // Using Pollinations.ai (free AI image generation API)
    // Alternative free APIs: 
    // - https://image.pollinations.ai/prompt/YOUR_PROMPT
    // - Replicate API
    // - Stability AI (requires API key)
    
    const imagePrompt = encodeURIComponent(enhancedPrompt);
    const posterUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;

    console.log("✅ Poster URL generated:", posterUrl);

    res.json({ 
      posterUrl: posterUrl,
      prompt: prompt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Poster Generation ERROR:", error.message);
    res.status(500).json({ 
      error: "Failed to generate poster. Please try again." 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "Server is running!", 
    timestamp: new Date().toISOString(),
    endpoints: {
      text: "/generate",
      poster: "/generate-poster"
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Text generation: POST http://localhost:${PORT}/generate`);
  console.log(`🎨 Poster generation: POST http://localhost:${PORT}/generate-poster`);
});
