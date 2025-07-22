# Deployment Guide

## Environment Variables

### Required Variables

```bash
# Database (REQUIRED)
DATABASE_URL="postgresql://username:password@host:port/database_name"

# JWT Secret (REQUIRED)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server Configuration
PORT=8080  # Railway uses port 8080
HOST=0.0.0.0
NODE_ENV=production
```

### Optional Variables

```bash
# Stripe (for premium features)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

## Railway Deployment

### 1. Database Setup

1. Create a PostgreSQL database on Railway
2. Get the connection string from Railway dashboard
3. Set the `DATABASE_URL` environment variable

### 2. Environment Variables

Set these environment variables in Railway:

```bash
DATABASE_URL=your_railway_postgres_connection_string
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
PORT=8080
```

### 3. Database Migration

The app will automatically run database migrations on startup.

### 4. Common Issues & Fixes

#### Rate Limiter Error
- **Issue:** `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`
- **Fix:** Added `app.set('trust proxy', 1)` in server.js

#### Content Security Policy
- **Issue:** Google Fonts blocked by CSP
- **Fix:** Added `https://fonts.googleapis.com` and `https://fonts.gstatic.com` to CSP

#### Database Connection
- **Issue:** `DATABASE_URL` not found
- **Fix:** Added environment variable validation and better error messages

#### Port Configuration
- **Issue:** Port mismatch between local and production
- **Fix:** Railway uses port 8080, local uses 3000

## Local Development

1. Copy `env.example` to `.env`
2. Set up a local PostgreSQL database
3. Update `DATABASE_URL` in `.env`
4. Run `npm install`
5. Run `npx prisma db push`
6. Run `npm start`

## Health Check

The app provides a health check endpoint:

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "onlineUsers": 0,
  "queueLength": 0,
  "activeConnections": 0,
  "performance": {
    "uptime": 123,
    "memory": {
      "rss": 53604352,
      "heapUsed": 11074672,
      "heapTotal": 13873152,
      "external": 2247893
    }
  }
}
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from Railway
- Ensure database schema is up to date

### Rate Limiting Issues
- The app skips rate limiting for health checks
- Rate limiting is configured for API endpoints only

### CSP Issues
- Google Fonts are now allowed in CSP
- All required domains are whitelisted

### Port Issues
- Railway automatically sets `PORT=8080`
- Local development uses `PORT=3000` 