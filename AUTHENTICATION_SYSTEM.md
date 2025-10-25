# 🔐 Authentication System Documentation

## Overview
The Gemini Auto Reply extension now includes a comprehensive authentication system with token-based usage tracking and payment integration.

## 🏗️ System Architecture

### Database Schema (Supabase)
- **`user`** - User accounts with token balances
- **`payment`** - USDC payment records
- **`token_ai_usage`** - AI request logging

### Key Features
- ✅ User registration and login
- ✅ Token-based usage tracking
- ✅ USDC payment integration
- ✅ Real-time token balance updates
- ✅ Comprehensive analytics

## 🚀 Getting Started

### 1. Database Setup
Run the SQL script in `database_setup.sql` on your Supabase instance:

```sql
-- This will create all necessary tables, functions, and triggers
-- See database_setup.sql for complete schema
```

### 2. Environment Variables
Create a `.env` file in the `server/` directory:

```env
# xAI API Configuration
XAI_API_KEY=your_xai_api_key_here

# Supabase Configuration
SUPABASE_URL=https://avtaghpbnasdxmjnahxc.supabase.co
SUPABASE_KEY=your_supabase_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Payment Configuration
USDC_ADDRESS=rizkygm23.eth
MINIMUM_PAYMENT=5
TOKEN_RATE=1000  # Tokens per $1

# Token Configuration
FREE_TOKENS=200000
TOKEN_COST_GENERATE=100
TOKEN_COST_QUICK=50
TOKEN_COST_TOPIC=25
TOKEN_COST_TRANSLATE=10
TOKEN_COST_PARAPHRASE=10
```

### 3. Install Dependencies
```bash
cd server
npm install
# or
bun install
```

### 4. Start Server
```bash
npm start
# or
bun start
```

## 🔑 Authentication Flow

### User Registration
1. User enters email address
2. System creates account with 200,000 free tokens
3. User data stored in Supabase
4. Authentication state saved in localStorage

### User Login
1. User enters email address
2. System validates user exists
3. Returns user data and token balance
4. Authentication state saved in localStorage

### AI Request Flow
1. Check user authentication
2. Verify sufficient token balance
3. Process AI request
4. Deduct tokens from user account
5. Log usage in database
6. Return response with updated token count

## 💰 Payment System

### USDC Payment Process
1. User sends USDC to `rizkygm23.eth` on Arbitrum
2. User submits transaction hash via extension
3. System creates pending payment record
4. Admin confirms payment (manual or automated)
5. Tokens added to user account

### Payment Rates
- **Minimum Payment**: $5 USD
- **Token Rate**: 1,000 tokens per $1 USD
- **Example**: $10 payment = 10,000 tokens

## 🎯 Token Usage Costs

| Feature | Cost | Description |
|---------|------|-------------|
| Generate Reply | 100 tokens | Full AI reply generation |
| Quick Reply | 50 tokens | Simplified AI reply |
| Topic Generation | 25 tokens | Conversation starters |
| Translation | 10 tokens | ID → EN translation |
| Paraphrase | 10 tokens | Text improvement |

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login existing user
- `GET /auth/user/:userId` - Get user information

### Payment
- `POST /payment/create` - Create payment record
- `POST /payment/confirm` - Confirm payment

### AI Features (Authenticated)
- `POST /generate` - Generate Twitter reply
- `POST /generate-discord` - Generate Discord reply
- `POST /generate-quick` - Quick reply generation
- `POST /generate-topic` - Topic generation
- `POST /generate-translate` - Translation
- `POST /generate-parafrase` - Paraphrasing

## 🔧 Frontend Integration

### Content Scripts
Both `content.js` and `content-discord.js` now include:
- Authentication checks before AI requests
- Token balance display
- Payment integration UI
- Error handling for insufficient tokens

### Authentication Helper
The `auth-helper.js` file provides:
- User authentication management
- Token balance tracking
- Payment UI components
- API request helpers

## 🛡️ Security Features

### Token Validation
- Server-side token balance verification
- Atomic token deduction operations
- Usage logging for audit trails

### Payment Security
- Transaction hash validation
- Minimum payment requirements
- Duplicate payment prevention

### User Data Protection
- Secure token storage
- Session management
- Data encryption in transit

## 📈 Analytics & Monitoring

### User Analytics
- Total requests per user
- Token usage patterns
- Payment history
- Platform usage (Twitter vs Discord)

### System Analytics
- API request volumes
- Error rates
- Performance metrics
- Revenue tracking

## 🚨 Error Handling

### Insufficient Tokens
- Clear error messages
- Top-up prompts
- Token balance display

### Authentication Errors
- Login prompts
- Session validation
- Automatic re-authentication

### Payment Errors
- Transaction validation
- Payment status tracking
- Manual confirmation process

## 🔄 Migration Guide

### For Existing Users
1. Install updated extension
2. Login with email address
3. Receive 200,000 free tokens
4. Continue using AI features

### For Developers
1. Update content scripts
2. Add authentication checks
3. Implement token tracking
4. Test payment flows

## 📝 Configuration

### Token Costs
Adjust token costs in `server/index.js`:
```javascript
const requiredTokens = 100; // Cost per AI request
```

### Payment Settings
Configure in environment variables:
```env
USDC_ADDRESS=rizkygm23.eth
MINIMUM_PAYMENT=5
TOKEN_RATE=1000
```

### Database Functions
Customize in `database_setup.sql`:
```sql
-- Adjust token deduction logic
-- Modify payment confirmation process
-- Update analytics queries
```

## 🎉 Benefits

### For Users
- ✅ Free 200,000 tokens to start
- ✅ Transparent token usage
- ✅ Easy payment system
- ✅ Real-time balance updates

### For Developers
- ✅ Scalable architecture
- ✅ Comprehensive analytics
- ✅ Secure payment processing
- ✅ Easy maintenance

## 🚀 Future Enhancements

### Planned Features
- [ ] Automated payment confirmation
- [ ] Subscription plans
- [ ] Bulk token purchases
- [ ] Referral system
- [ ] Advanced analytics dashboard

### Integration Opportunities
- [ ] Web3 wallet integration
- [ ] Multi-chain support
- [ ] NFT-based rewards
- [ ] Community features

---

## 📞 Support

For technical support or questions about the authentication system, please refer to the main documentation or contact the development team.

**Happy coding! 🚀**
