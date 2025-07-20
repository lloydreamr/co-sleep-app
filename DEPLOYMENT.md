# 🚀 Deployment Guide

## **Railway Deployment (Recommended)**

### **Step 1: Connect to Railway**
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select the `co-sleep-app` repository

### **Step 2: Add Environment Variables**
In Railway dashboard, add these environment variables:

```bash
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://username:password@host:port/database"

# JWT Secret (generate a secure one)
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# Server
PORT=3000
HOST=0.0.0.0

# Environment
NODE_ENV=production

# Optional: Stripe (for premium features)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### **Step 3: Deploy**
1. Railway will automatically detect the Node.js app
2. It will run `npm install` and `npm start`
3. The app will be available at your Railway URL

### **Step 4: Database Setup**
After deployment, run these commands in Railway's terminal:

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed initial data
npm run db:seed
```

## **Heroku Deployment**

### **Step 1: Create Heroku App**
```bash
heroku create your-co-sleep-app
```

### **Step 2: Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:mini
```

### **Step 3: Set Environment Variables**
```bash
heroku config:set JWT_SECRET="your-super-secure-jwt-secret-key-here"
heroku config:set NODE_ENV=production
```

### **Step 4: Deploy**
```bash
git push heroku main
```

### **Step 5: Database Setup**
```bash
heroku run npx prisma generate
heroku run npx prisma db push
heroku run npm run db:seed
```

## **Vercel Deployment**

### **Step 1: Connect to Vercel**
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure as Node.js app

### **Step 2: Add Environment Variables**
In Vercel dashboard, add the same environment variables as above.

### **Step 3: Deploy**
Vercel will automatically deploy on every push to main.

## **Testing Your Deployment**

### **1. Health Check**
Visit: `https://your-app-url.railway.app/health`
Should return: `{"status":"healthy",...}`

### **2. Main App**
Visit: `https://your-app-url.railway.app/`
Should show the Co-Sleep interface

### **3. Authentication**
Visit: `https://your-app-url.railway.app/auth.html`
Should show login/register forms

### **4. API Test**
```bash
curl https://your-app-url.railway.app/api/auth/profile
# Should return: {"error":"No token provided"}
```

## **Environment Variables Reference**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret for JWT tokens | Yes | `your-secret-key` |
| `PORT` | Server port | No | `3000` |
| `HOST` | Server host | No | `0.0.0.0` |
| `NODE_ENV` | Environment | No | `production` |
| `STRIPE_SECRET_KEY` | Stripe secret key | No | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No | `pk_live_...` |

## **Troubleshooting**

### **Database Connection Issues**
- Check `DATABASE_URL` format
- Ensure database is accessible
- Verify SSL settings if needed

### **Authentication Issues**
- Check `JWT_SECRET` is set
- Verify token expiration settings
- Check CORS configuration

### **Build Issues**
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility
- Verify build scripts are correct

## **Security Checklist**

- [ ] Change default JWT secret
- [ ] Use HTTPS in production
- [ ] Set up proper CORS
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Regular security updates

## **Performance Optimization**

- [ ] Enable database connection pooling
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Monitor memory usage
- [ ] Set up auto-scaling

---

**Need help?** Check the [README.md](README.md) for more details or open an issue on GitHub. 