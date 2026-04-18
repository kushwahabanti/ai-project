# ✨ AI Ad Generator — Pro Edition

AI-powered advertisement text & poster generator with a premium glassmorphic UI.  
Generate ad copy, slogans, marketing strategies, social media posts, and AI-generated posters — all in one place.

---

## 🚀 Features

- **Text Ad Generation** — Professional, casual, creative, or funny ad copy powered by Groq LLM (Llama 3.1)
- **AI Poster Generation** — Create eye-catching marketing posters via Pollinations AI
- **Multiple Tones** — Switch between Professional, Casual, Creative, and Funny
- **Quick Actions** — One-click Slogans, Strategies, Description, and Social Post generation
- **Chat History** — Persistent project history saved in local storage
- **Premium UI** — Dark glassmorphic design with warm amber/teal color theme

---

## 📁 Project Structure

```
AI-Ad-Generator/
├── public/              # Frontend (static files)
│   ├── index.html       # Main HTML page
│   ├── css/
│   │   └── style.css    # Complete stylesheet
│   └── js/
│       └── app.js       # Client-side application logic
├── index.js             # Express server (API routes)
├── .env                 # Environment variables (not committed)
├── .env.example         # Template for environment variables
├── .gitignore           # Git ignore rules
├── package.json         # Node.js project config
└── README.md            # This file
```

---

## ⚡ Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-ad-generator.git
cd ai-ad-generator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your [Groq API key](https://console.groq.com/):

```
API_KEY=gsk_your_api_key_here
```

### 4. Start the server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Vanilla HTML, CSS, JavaScript       |
| Backend     | Node.js + Express                   |
| AI Text     | Groq API (Llama 3.1 8B Instant)     |
| AI Posters  | Pollinations AI (Flux model)        |
| Markdown    | Marked.js                           |

---

## 📡 API Endpoints

| Method | Endpoint            | Description                  |
|--------|---------------------|------------------------------|
| POST   | `/generate`         | Generate text ad copy        |
| POST   | `/generate-poster`  | Generate AI poster URL       |
| GET    | `/health`           | Server health check          |

---

## 📜 License

MIT — free to use, modify, and distribute.
# ai-project
