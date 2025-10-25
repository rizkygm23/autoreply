# 🚀 Gemini Social Assistant Enhanced v2.0

Advanced AI-powered Chrome extension for generating contextual replies on Twitter/X and Discord with modern UI, analytics, and smart features.

## ✨ Features

### 🤖 AI-Powered Replies
- **Contextual Generation**: Uses Grok AI to generate natural, contextual replies
- **Room Personalities**: Different AI personalities for various communities (Rialo, Cysic, MMT, FGO, etc.)
- **Smart Context**: Analyzes nearby replies and engagement metrics for better context
- **Multiple Options**: Generate multiple reply alternatives to choose from

### 🎨 Modern UI/UX
- **Beautiful Interface**: Modern, responsive design with smooth animations
- **Reply Preview**: Preview generated replies before posting
- **Interactive Dropdowns**: Enhanced room selection with icons and descriptions
- **Real-time Feedback**: Loading states, success/error notifications
- **Dark Theme**: Optimized for Twitter/X and Discord dark themes

### 📊 Analytics & Insights
- **Usage Tracking**: Track generation attempts, success rates, and room preferences
- **Performance Metrics**: Monitor response times and error rates
- **Data Export**: Export analytics data for analysis
- **Real-time Stats**: View usage statistics in popup and settings

### ⚡ Smart Features
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+G (Generate) and Ctrl+Shift+S (Settings)
- **Auto-retry**: Automatic retry mechanism for failed requests
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Settings Panel**: Comprehensive settings with real-time preview
- **Context Menu**: Right-click integration for quick actions

### 🔧 Technical Improvements
- **Enhanced API Client**: Robust API client with retry logic and timeout handling
- **Memory Optimization**: Efficient memory usage and cleanup
- **Performance Monitoring**: Built-in performance tracking
- **Cross-platform**: Works on Twitter/X and Discord
- **Service Worker**: Background processing for better performance

## 🚀 Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/gemini-extension-enhanced.git
   cd gemini-extension-enhanced
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

3. **Configure Backend**
   - Ensure your backend server is running at `https://autoreply-gt64.onrender.com`
   - Set up your xAI API key in the server environment

## 🎯 Usage

### Twitter/X
1. Navigate to any Twitter/X page
2. Hover over any tweet to see the enhanced interface
3. Select your preferred room/community
4. Click "💬 Generate" for preview or "⚡ Quick" for direct insertion
5. Use keyboard shortcuts for faster workflow

### Discord
1. Go to any Discord channel
2. The extension automatically adds interface to messages
3. Use the global room selector in the header
4. Generate replies, topics, or use translation tools

### Keyboard Shortcuts
- `Ctrl+Shift+G`: Quick generate on focused tweet
- `Ctrl+Shift+S`: Open settings panel
- `Escape`: Close any open modal

## ⚙️ Configuration

### Settings Panel
Access via the ⚙️ button or `Ctrl+Shift+S`:

- **General Settings**
  - Show Reply Preview: Enable/disable preview modal
  - Enable Notifications: Show success/error notifications
  - Enable Analytics: Track usage data

- **Performance Settings**
  - Max Replies to Analyze: Adjust context collection (5-50)
  - Auto-retry attempts: Configure retry behavior

- **Analytics Dashboard**
  - View usage statistics
  - Export data for analysis
  - Reset analytics data

### Room Personalities
Each room has its own AI personality:

- **🏛️ Rialo**: Professional, business-focused
- **💡 Lighter**: Creative, innovative
- **🚀 MMT**: Technical, development-focused
- **🎯 Cysic**: Community-focused with custom emojis
- **⚡ Mega**: Fast-paced, energetic
- **🎮 FGO**: Gaming-focused
- **🏘️ Town**: General community

## 🔧 Development

### Project Structure
```
├── content.js              # Twitter/X integration
├── content-discord.js      # Discord integration
├── background.js           # Service worker
├── popup.html              # Extension popup
├── popup.js                # Popup functionality
├── manifest.json           # Extension manifest
├── server/                 # Backend server
│   ├── index.js           # Express server
│   ├── package.json       # Dependencies
│   └── data/              # Room data storage
└── README.md              # Documentation
```

### Key Classes
- `ExtensionSettings`: Manages user preferences
- `Analytics`: Tracks usage and performance
- `ApiClient`: Handles API communication with retry logic
- `CONFIG`: Centralized configuration

### API Endpoints
- `POST /generate`: Generate Twitter/X replies
- `POST /generate-discord`: Generate Discord replies
- `POST /generate-topic`: Generate conversation topics
- `POST /generate-translate`: Indonesian to English translation
- `POST /generate-parafrase`: Improve English text

## 🚀 Performance

### Optimizations
- **Lazy Loading**: Components load only when needed
- **Memory Management**: Automatic cleanup of unused elements
- **Efficient Observers**: Optimized DOM mutation observers
- **Caching**: Smart caching of settings and analytics
- **Debouncing**: Prevents excessive API calls

### Monitoring
- Real-time performance tracking
- Error rate monitoring
- Response time analytics
- Memory usage optimization

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally in browser
- **No Tracking**: No external tracking or analytics
- **Secure API**: HTTPS-only communication
- **Data Control**: Users can export/delete their data
- **Open Source**: Fully transparent codebase

## 🐛 Troubleshooting

### Common Issues
1. **Extension not loading**: Check if developer mode is enabled
2. **API errors**: Verify backend server is running
3. **UI not appearing**: Refresh the page and check console
4. **Settings not saving**: Check browser storage permissions

### Debug Mode
Enable debug logging by opening browser console and looking for:
```
[Gemini Extension] ✅ Enhanced version initialized successfully!
```

## 📈 Roadmap

### v2.1 (Planned)
- [ ] Custom room creation
- [ ] Advanced AI model selection
- [ ] Reply templates
- [ ] Sentiment analysis
- [ ] Multi-language support

### v2.2 (Future)
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Integration with more platforms
- [ ] AI model fine-tuning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with Grok AI (xAI)
- Inspired by the need for better social media interactions
- Thanks to the open-source community

---

**Made with ❤️ for better social interactions**

*Version 2.0.0 - Enhanced with modern UI, analytics, and smart features*
