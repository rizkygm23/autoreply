# 🚀 Auto Reply - AI Social Assistant v2.2

AI-powered Chrome extension for generating contextual replies on Twitter/X and Discord using **Grok AI (xAI)**.

**No login required - Just install and use!**

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![AI](https://img.shields.io/badge/AI-Grok--4--1--fast-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome-yellow)

---

## ✨ Features

### Core Features
- 🤖 **AI-Powered Replies** - Natural, contextual replies using Grok-4-1-fast (non-reasoning)
- 🎨 **Room Personalities** - Custom vocabulary & emojis per community
- 🧠 **Response Memory** - Anti-repetition system remembers last 10 replies per room
- ⏰ **Time-Aware Persona** - Responses adapt based on WIB timezone (morning/night mood)
- 📊 **Cost Tracking** - Real-time token usage and cost estimation in terminal
- ⚡ **Plug & Play** - No login, no setup, just install!

### Platform Support
| Platform | Features |
|----------|----------|
| **Twitter/X** | Reply generation, Quote tweet generation |
| **Discord** | Reply generation, Topic starter, Translation, Paraphrase |

### Smart Features
- 🔄 **Anti-Repetition** - Prevents duplicate or similar responses
- 🏷️ **Nickname Extraction** - Uses natural names from Discord usernames (e.g., "Arya \| Maxi" → "Arya")
- 😀 **Custom Emojis** - Room-specific Discord emojis (placed at end, 20-30% frequency)
- 🎭 **Context-Aware** - Detects crisis keywords, matches energy, avoids "AI slop"

---

## 📦 Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Bun** | Latest | [bun.sh](https://bun.sh) |
| **Chrome** | Latest | [google.com/chrome](https://google.com/chrome) |
| **xAI API Key** | - | [x.ai](https://x.ai) |

---

## 🛠️ Installation

### 1. Server Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
bun install

# Copy environment template
cp env.example .env

# Edit .env and add your xAI API key
# XAI_API_KEY=your_key_here

# Start server
bun run dev
```

Server runs on `http://localhost:3000` with auto API connection check.

### 2. Extension Setup

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `auto-reply` folder (root directory)

---

## ⚙️ Configuration

### API URL (`project.json`)

```json
{
  "apiBaseUrl": "http://localhost:3000",
  "rooms": [...]
}
```

For production:
```json
{
  "apiBaseUrl": "https://your-server.onrender.com",
  "rooms": [...]
}
```

### Room Configuration

Each room supports custom settings:

```json
{
  "id": "cys",
  "icon": "🎯",
  "name": "Cysic",
  "desc": "Cysic Community",
  "emojis": [":CysicSymbol:", ":pepe_pray:", ":pogcat:"],
  "vocab": ["Cysors", "gmsor", "zk"],
  "extraInfo": "gmsor adalah sapaan khas cysic"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique room identifier |
| `icon` | Display emoji |
| `name` | Room display name |
| `emojis` | Custom Discord emojis for this server |
| `vocab` | Community-specific vocabulary |
| `extraInfo` | Additional context for AI (optional) |

### Available Rooms

| Room | Icon | Description |
|------|------|-------------|
| Rialo | 🏛️ | Rialo Community |
| Lighter | 💡 | Lighter Community |
| Creek | 🌊 | Creek Community |
| Cysic | 🎯 | Cysic Community (with custom emojis) |
| Town | 🏘️ | Town Community |
| FGO | 🎮 | FGO Community |
| MMT | 🚀 | MMT Community |
| Mega | ⚡ | Mega Community |
| Seismic | 🌍 | Seismic Community (with custom emojis) |

---

## 🎯 Usage

### Twitter/X
1. Navigate to any tweet
2. Hover to see the AI interface
3. Select room → Click **"💬 Generate Reply"** or **"🔁 Quote Tweet"**

### Discord
1. Go to any channel
2. Use the floating room selector (bottom-right)
3. Features available:
   - **💬 Reply** - Generate contextual reply
   - **🎯 Topic** - Start new conversation topic
   - **🌐 Translate** - Translate selected text
   - **✏️ Paraphrase** - Rewrite text

---

## 💰 Cost Estimation

Server logs show real-time token usage and cost:

```
[Grok] 📊 Tokens: in:1523 | out:12 | total:1535
[Grok] 💰 Cost: in:$304.60µ | out:$6.00µ | total:$310.60µ
```

Pricing (Grok-4-1-fast):
- Input: $0.2 / 1M tokens
- Output: $0.5 / 1M tokens

---

## 🧠 AI Behavior Rules

The AI follows these core principles:

### Language Style
- ✅ Strictly lowercase
- ✅ Grade 8 English (simple vocabulary)
- ✅ Max 12 words per Discord reply
- ✅ Uses commas instead of periods (Twitter grammar)
- ❌ No "AI slop" words (delve, unleash, landscape, etc.)
- ❌ No ending periods
- ❌ No emojis/hashtags on Twitter

### Smart Behaviors
- 🎭 **Nickname usage**: Only 10-20% of replies, only for pure greetings
- 😀 **Emoji usage**: 20-30% of replies, only at sentence end
- 🔄 **Anti-repetition**: Tracks last 10 responses per room
- ⏰ **Time-aware**: Mood changes based on time of day
- 💔 **Crisis detection**: Empathetic responses for "rekt", "hacked", etc.

---

## 📁 Project Structure

```
auto-reply/
├── manifest.json           # Chrome extension manifest
├── project.json            # Room config (API URL, emojis, vocab)
├── content.js              # Twitter/X content script
├── content-discord.js      # Discord content script
├── background.js           # Service worker
├── icon.png                # Extension icon
│
└── server/                 # Backend server (Bun + Express)
    ├── index.js            # Main server entry
    ├── env.example         # Environment template
    │
    ├── routes/generate/    # AI generation endpoints
    │   ├── discordReply.js # Discord reply generation
    │   ├── discordTopic.js # Discord topic starter
    │   ├── twitterReply.js # Twitter reply generation
    │   ├── twitterQuote.js # Twitter quote generation
    │   ├── translate.js    # Translation endpoint
    │   ├── paraphrase.js   # Paraphrase endpoint
    │   └── quickReply.js   # Quick reply generation
    │
    ├── services/
    │   └── aiService.js    # Grok AI integration
    │
    ├── lib/
    │   ├── helpers.js      # Utilities (nickname, time context)
    │   ├── storage.js      # Response memory system
    │   └── logger.js       # Colored console logging
    │
    └── data/               # Room conversation history
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-discord` | POST | Generate Discord reply |
| `/generate-discord-topic` | POST | Generate Discord topic |
| `/generate-twitter` | POST | Generate Twitter reply |
| `/generate-twitter-quote` | POST | Generate Twitter quote |
| `/translate` | POST | Translate text |
| `/paraphrase` | POST | Paraphrase text |
| `/quick-reply` | POST | Quick contextual reply |

---

## 📄 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

**Made with ❤️ for Web3 communities**

*Powered by Grok-4-1-fast (xAI)*
