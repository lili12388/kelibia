# Railway Deployment Guide for Edarna

## Steps to Deploy:

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub (recommended for easy deployment)

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your repository: `lili12388/darna`
- Railway will automatically detect it's a Node.js project

### 3. Add PostgreSQL Database
- In your Railway project, click "New"
- Select "Database" → "Add PostgreSQL"
- Railway will automatically create a database and provide connection string

### 4. Set Environment Variables
Click on your service → "Variables" tab and add:

```
NODE_ENV=production
SESSION_SECRET=your-secret-key-here-change-this
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=${{PORT}}
```

Railway automatically provides:
- `PORT` - The port your app should listen on
- `Postgres.DATABASE_URL` - Your PostgreSQL connection string

### 5. Deploy
- Railway will automatically deploy on every push to main branch
- First deployment will take 2-3 minutes

### 6. Get Your URL
- Once deployed, go to "Settings" → "Networking"
- Click "Generate Domain" to get your public URL
- You can also add a custom domain if you have one

### 7. Run Database Migrations
After first deployment, open the Railway service terminal and run:
```bash
npm run db:push
```

## Important Notes:

- **No file size limits** on Railway (unlike Vercel's 4.5MB limit)
- **Free tier**: $5 credit per month, 500 hours of usage
- **No cold starts** - your server stays warm
- **Automatic SSL** - HTTPS enabled by default
- **Environment variables** are automatically injected

## Differences from Vercel:

1. ✅ No serverless limitations - full Node.js server
2. ✅ Handles large file uploads (videos, etc.)
3. ✅ Real file system access (though we're using base64 in DB)
4. ✅ No function timeout issues
5. ⚠️ Limited free tier hours (but $5 credit monthly)

## Monitoring:

- View logs in real-time from Railway dashboard
- Monitor resource usage and deployments
- Set up alerts for deployment failures

## Custom Domain (Optional):

1. Go to Settings → Networking
2. Click "Custom Domain"
3. Add your domain and configure DNS as instructed
4. Railway handles SSL certificates automatically
