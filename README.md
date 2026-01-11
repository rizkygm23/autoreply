# 🚀 Gemini Social Assistant v2.1

AI-powered Chrome extension for generating contextual replies on Twitter/X and Discord using Grok AI (xAI).

**No login required - Just install and use!**

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome-yellow)

---

## ✨ Features

- 🤖 **AI-Powered Replies** - Natural, contextual replies using Grok AI
- 🎨 **Room Personalities** - Different AI styles for various communities
- 📊 **Cost Tracking** - Token usage and cost estimation in terminal
- ⚡ **Plug & Play** - No login, no setup, just install and use!

### Supported Platforms
- Twitter/X
- Discord

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

Server will run on `http://localhost:3000`

### 2. Extension Setup

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **"Load unpacked"**
4. Select the `auto-reply` folder (root directory)

---

## ⚙️ Configuration

### API URL Configuration

Edit `project.json` to change the API URL:

```json
{
  "apiBaseUrl": "http://localhost:3000",
  "rooms": [...]
}
```

For production deployment, change to your server URL:
```json
{
  "apiBaseUrl": "https://your-server.onrender.com",
  "rooms": [...]
}
```

### Room Personalities

Each room has its own AI personality:

| Room | Icon | Description |
|------|------|-------------|
| Rialo | 🏛️ | Professional, business |
| Cysic | 🎯 | Community-focused |
| MMT | 🚀 | Technical |
| FGO | 🎮 | Gaming |
| Mega | ⚡ | Fast-paced |

---

## 🎯 Usage

### Twitter/X
1. Navigate to any tweet
2. Hover to see the AI interface
3. Select room → Click **"💬 Generate"**

### Discord
1. Go to any channel
2. Use the floating room selector
3. Generate replies, topics, or translations

---

## 💰 Cost Estimation

Server logs show token usage:
```
[Grok] 📊 Tokens: in:1523 | out:12 | total:1535
[Grok] 💰 Cost: in:$304.60µ | out:$6.00µ | total:$310.60µ
```

---

## 📁 Project Structure

```
auto-reply/
├── manifest.json         # Extension manifest
├── project.json          # Configuration (API URL, rooms)
├── content.js            # Twitter/X content script
├── content-discord.js    # Discord content script
├── background.js         # Service worker
├── icon.png              # Extension icon
│
└── server/               # Backend server
    ├── index.js          # Express server
    ├── env.example       # Environment template
    ├── routes/           # API endpoints
    ├── services/         # AI service
    └── data/             # Room data
```

---

## 📄 License

MIT License

---

**Made with ❤️ for better social interactions**
