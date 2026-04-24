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
    const { prompt, previousPosterText } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🎨 Generating poster for:", prompt);
    if (previousPosterText) {
      console.log("📝 Modifying existing poster:", JSON.stringify(previousPosterText));
    }

    // Build context-aware messages for the AI
    const systemPrompt = `You are an expert advertising copywriter. Generate poster text content. Reply ONLY in valid JSON format with no extra text or markdown. Use this exact structure:
{"headline": "short catchy headline (max 6 words)", "tagline": "supporting tagline (max 10 words)", "cta": "call to action (max 4 words)"}
All text MUST be in English. Keep it punchy and professional.`;

    let userMessage;
    if (previousPosterText) {
      // User is modifying an existing poster — include current text as context
      userMessage = `Current poster text is:
- Headline: "${previousPosterText.headline}"
- Tagline: "${previousPosterText.tagline}"  
- CTA: "${previousPosterText.cta}"

The user wants to modify it with this instruction: "${prompt}"

Apply the user's requested changes to the current poster text. Only change what the user asks for, keep everything else the same. Return the updated JSON.`;
    } else {
      // Fresh poster creation
      userMessage = `Create advertising poster text for: ${prompt}`;
    }

    // Step 1: Generate poster TEXT content using Groq AI
    const textResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    let posterText = { headline: "Your Brand Here", tagline: "Quality You Can Trust", cta: "Shop Now" };
    
    if (textResponse.ok) {
      const textData = await textResponse.json();
      const content = textData.choices?.[0]?.message?.content || "";
      try {
        // Try to parse the JSON from the AI response
        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
        posterText = JSON.parse(cleaned);
      } catch (e) {
        console.warn("⚠️ Could not parse poster text, using defaults");
      }
    }

    // Step 2: Generate background IMAGE without any text
    // Keep prompt concise for faster generation
    const enhancedPrompt = `${prompt} advertisement background, vibrant colors, bokeh, luxury, no text no words no letters`;

    const imagePrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=768&height=768&model=flux&nologo=true&seed=${seed}`;

    console.log("📥 Fetching poster image from Pollinations...");

    // Fetch image server-side to avoid CORS issues with Canvas
    // Pollinations can take 1-3 minutes, so allow generous timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 180s timeout

    try {
      const imgResponse = await fetch(pollinationsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!imgResponse.ok) {
        throw new Error(`Image API returned ${imgResponse.status}`);
      }

      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(imgBuffer).toString('base64');
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const dataUrl = `data:${contentType};base64,${base64}`;

      console.log("✅ Poster image fetched and converted to base64");

      res.json({ 
        posterUrl: dataUrl,
        posterText: posterText,
        prompt: prompt,
        timestamp: new Date().toISOString()
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error("⚠️ Image fetch failed:", fetchErr.message);
      // Fallback: send the direct URL and let client try without Canvas export
      res.json({ 
        posterUrl: pollinationsUrl,
        posterText: posterText,
        prompt: prompt,
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }

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
