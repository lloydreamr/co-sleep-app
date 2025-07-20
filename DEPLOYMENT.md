# Hence Deployment Guide

This guide will help you deploy Hence to production.

## Prerequisites

- Node.js 16+ installed
- A cloud hosting account (Heroku, AWS, DigitalOcean, etc.)
- Domain name (optional but recommended)

## Quick Deploy Options

### Heroku (Recommended for beginners)

1. **Create Heroku account**: Sign up at [heroku.com](https://heroku.com)

2. **Install Heroku CLI**:
   ```bash
   # macOS
   brew install heroku/brew/heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

3. **Deploy**:
   ```bash
   heroku login
   heroku create your-hence-app
   git add .
   git commit -m "Initial Hence deployment"
   git push heroku main
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   ```

### DigitalOcean App Platform

1. **Create DigitalOcean account**: Sign up at [digitalocean.com](https://digitalocean.com)

2. **Connect your repository**: Link your GitHub repository

3. **Configure the app**:
   - Build command: `npm install`
   - Run command: `npm start`
   - Environment: Node.js

4. **Deploy**: Click "Deploy" in the DigitalOcean dashboard

## Production Configuration

### 1. Environment Variables

Create a `.env` file or set environment variables:

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### 2. HTTPS Setup

**Required for microphone access!**

- **Heroku**: Automatic HTTPS
- **DigitalOcean**: Enable HTTPS in app settings
- **Custom domain**: Use Let's Encrypt or your hosting provider's SSL

### 3. TURN Servers (Recommended)

For reliable connections across different networks:

```javascript
// In your config.js
iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: 'turn:your-turn-server.com:3478',
        username: 'your-username',
        credential: 'your-password'
    }
]
```

**Free TURN server options**:
- [Twilio Network Traversal Service](https://www.twilio.com/stun-turn)
- [CoTURN](https://github.com/coturn/coturn) (self-hosted)

### 4. Monitoring

Set up basic monitoring:

```bash
# Install monitoring tools
npm install --save winston morgan

# Add to your server.js
const winston = require('winston');
const morgan = require('morgan');

// Logging middleware
app.use(morgan('combined'));
```

## Security Considerations

### 1. Rate Limiting

```bash
npm install --save express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 2. Input Validation

```bash
npm install --save joi
```

### 3. CORS Configuration

```javascript
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    credentials: true
}));
```

## Performance Optimization

### 1. Compression

```bash
npm install --save compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Static File Caching

```javascript
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true
}));
```

## Testing Your Deployment

1. **Open your deployed URL**
2. **Test microphone access**
3. **Open multiple tabs/windows**
4. **Test voice connections**
5. **Check server logs for errors**

## Troubleshooting

### Common Issues

1. **Microphone not working**: Ensure HTTPS is enabled
2. **Connections failing**: Check TURN server configuration
3. **High latency**: Consider server location vs. user location
4. **Memory leaks**: Monitor server memory usage

### Logs

Check your hosting platform's logs:
- **Heroku**: `heroku logs --tail`
- **DigitalOcean**: App Platform logs dashboard
- **AWS**: CloudWatch logs

## Next Steps

After successful deployment:

1. **Set up monitoring**: Track usage, errors, and performance
2. **Add analytics**: Understand user behavior (privacy-focused)
3. **Implement moderation**: Basic safety features
4. **Scale up**: Add more servers as needed
5. **User feedback**: Collect and implement user suggestions

---

*Hence - A quiet space for sleep presence* 