# 🚀 Gemini Social Assistant Enhanced v2.0

Advanced AI-powered Chrome extension for generating contextual replies on Twitter/X and Discord using Grok AI (xAI).

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome-yellow)

## ✨ Features

### 🤖 AI-Powered Replies
- **Contextual Generation**: Uses Grok AI to generate natural, contextual replies
- **Room Personalities**: Different AI personalities for various communities
- **Smart Context**: Analyzes nearby replies and engagement metrics
- **Multiple Options**: Generate multiple reply alternatives

### 🎨 Modern UI/UX
- **Beautiful Interface**: Modern, responsive design with smooth animations
- **Reply Preview**: Preview generated replies before posting
- **Dark Theme**: Optimized for Twitter/X and Discord dark themes
- **Real-time Feedback**: Loading states, success/error notifications

### 📊 Analytics & Cost Tracking
- **Token Usage**: Real-time token consumption tracking
- **Cost Estimation**: See cost per request in terminal
- **Usage Statistics**: Track generation attempts and success rates

### ⚡ Supported Platforms
- Twitter/X
- Discord

---

## 📦 Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Bun** | Latest | [bun.sh](https://bun.sh) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) (alternative to Bun) |
| **Chrome** | Latest | [google.com/chrome](https://google.com/chrome) |
| **xAI API Key** | - | [x.ai](https://x.ai) |

---

## 🛠️ Installation

### 1. Server Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/auto-reply.git
cd auto-reply
```

#### Step 2: Navigate to Server Directory
```bash
cd server
```

#### Step 3: Install Dependencies
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

#### Step 4: Configure Environment Variables
```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` file with your configuration:
```env
# xAI API Key (Get from https://x.ai)
XAI_API_KEY=your_xai_api_key_here

# Server Port
PORT=3000
```

#### Step 5: Start the Server
```bash
# Development mode (with hot reload)
bun run dev

# Or production mode
bun run start

# Or using npm
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
```

---

### 2. Extension Setup

#### Step 1: Open Chrome Extensions
1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)

#### Step 2: Load the Extension
1. Click **"Load unpacked"**
2. Navigate to the `auto-reply` folder (root directory, NOT the server folder)
3. Click **"Select Folder"**

#### Step 3: Verify Installation
- You should see "Gemini Social Assistant Enhanced" in your extensions list
- The extension icon should appear in your Chrome toolbar

---

## 🎯 Usage

### Twitter/X
1. Navigate to any Twitter/X page
2. Hover over any tweet to see the AI interface
3. Select your preferred room/community
4. Click **"💬 Generate"** for preview or **"⚡ Quick"** for direct insertion

### Discord
1. Go to any Discord channel
2. The extension automatically adds interface to messages
3. Use the global room selector in the header
4. Generate replies, topics, or use translation tools

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Quick generate on focused tweet |
| `Ctrl+Shift+S` | Open settings panel |
| `Escape` | Close any open modal |

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | POST | Generate Twitter/X replies |
| `/generate-quote` | POST | Generate quote tweet comments |
| `/generate-discord` | POST | Generate Discord replies |
| `/generate-quick` | POST | Generate quick replies |
| `/generate-topic` | POST | Generate conversation topics |
| `/generate-translate` | POST | Indonesian → English translation |
| `/generate-parafrase` | POST | Improve/paraphrase English text |

---

## 🏠 Room Personalities

Each room has its own AI personality and style:

| Room | Icon | Description |
|------|------|-------------|
| **Rialo** | 🏛️ | Professional, business-focused |
| **Cysic** | 🎯 | Community-focused with custom emojis |
| **MMT** | 🚀 | Technical, development-focused |
| **FGO** | 🎮 | Gaming-focused |
| **Mega** | ⚡ | Fast-paced, energetic |
| **Town** | 🏘️ | General community |

---

## 💰 Cost Estimation

The server logs token usage and estimated costs for each request:

```
[Grok] 📊 Tokens: in:1523 | out:12 | total:1535
[Grok] 💰 Cost: in:$304.60µ | out:$6.00µ | total:$310.60µ
```

### xAI Pricing (grok-3-fast)
| Type | Price |
|------|-------|
| Input | $0.20 / 1M tokens |
| Output | $0.50 / 1M tokens |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not loading | Check if Developer mode is enabled |
| API errors | Verify server is running and API key is valid |
| UI not appearing | Refresh the page and check console for errors |
| CORS errors | Ensure server has proper CORS configuration |

### Debug Mode
Check browser console for logs:
```
[Gemini Extension] ✅ Enhanced version initialized successfully!
```

Check server terminal for AI logs:
```
[Grok] Sending request to xAI...
[Grok] Success!
[Grok] 📊 Tokens: in:1523 | out:12 | total:1535
```

---

## 📁 Project Structure

```
auto-reply/
├── 📄 manifest.json          # Chrome extension manifest
├── 📄 content.js             # Twitter/X content script
├── 📄 content-discord.js     # Discord content script
├── 📄 background.js          # Service worker
├── 📄 popup.html             # Extension popup UI
├── 📄 popup.js               # Popup functionality
├── 📄 icon.png               # Extension icon
│
└── 📁 server/                # Backend server
    ├── 📄 index.js           # Express server entry
    ├── 📄 package.json       # Dependencies
    ├── 📄 env.example        # Environment template
    ├── 📁 routes/            # API route handlers
    │   └── 📁 generate/      # Generation endpoints
    ├── 📁 services/          # AI service layer
    ├── 📁 lib/               # Helper utilities
    └── 📁 data/              # Room data & local storage
```

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [Grok AI](https://x.ai) by xAI
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Express.js](https://expressjs.com) - Web framework

---

**Made with ❤️ for better social interactions**

*Version 2.0.0 - Enhanced with modern UI, analytics, and smart features*
