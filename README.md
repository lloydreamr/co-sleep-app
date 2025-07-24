# 🌙 Co-Sleep App

A WebRTC-based co-sleeping app for finding quiet presence and peaceful sleep companionship.

## ✨ Features

### 🆓 Free Features
- **Voice-only co-sleeping** - Connect with others for peaceful sleep presence
- **Smart matching** - Find compatible sleep partners
- **Auto-disconnect** - Automatic disconnection after set time
- **Skip partners** - Skip and find new partners if needed

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### 1. Clone and Install
```bash
git clone <repository-url>
cd co-sleep-app
npm install
```

### 2. Database Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/cosleep_db"

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to use the app!

## 🗄️ Database Schema

### Core Models
- **User** - User accounts and preferences
- **SleepSession** - Co-sleeping sessions and analytics  
- **SleepAnalytics** - User sleep pattern analytics
- **CallHistory** - Call history tracking for verified users

### Social Features
- **Block** - User blocking system
- **Favorite** - Favorite partners
- **Report** - User reporting system
- **Rating** - Anonymous partner ratings

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/analytics` - Get sleep analytics

### WebRTC Signaling
- `GET /` - Main app interface
- WebSocket events for real-time communication

## 🆓 Freemium Model

This app follows a freemium model with no subscription requirements:
- All core features available for free
- Enhanced user experience features included
- No payment processing or subscription complexity

## 📱 Mobile Support

The app is fully responsive and works on mobile devices. For best experience:
- Use HTTPS in production (required for microphone access)
- Ensure stable internet connection
- Allow microphone permissions

## 🛠️ Development

### Database Commands
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:migrate     # Create migration
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database
```

### Environment Variables
```bash
DATABASE_URL=          # PostgreSQL connection string
JWT_SECRET=           # JWT signing secret
PORT=3000             # Server port
HOST=0.0.0.0          # Server host
NODE_ENV=development  # Environment
```

## 🚀 Deployment

### Railway (Recommended)
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Manual Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Start production server

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- Rate limiting (recommended for production)

## 📊 Analytics

Track user sleep patterns:
- Session duration
- Connection quality
- Partner compatibility
- Sleep schedule adherence

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the documentation
- Review existing issues
- Create new issue with details

---

**Happy Co-Sleeping! 🌙✨**
