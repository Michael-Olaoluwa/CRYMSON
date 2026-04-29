# Crymson Deployment Guide

## Deployment Architecture

- **Frontend**: Vercel (automatic deployments from GitHub)
- **Backend**: Railway (Docker-based deployment)
- **Database**: MongoDB Atlas (cloud-hosted)

## Prerequisites

1. GitHub account with your Crymson repo
2. Vercel account (free tier available)
3. Railway account (free tier available)
4. MongoDB Atlas account (free tier available)
5. Git installed locally

## Step 1: Set Up MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new project called "Crymson"

### 1.2 Create a Cluster
1. Click "Create" for a new cluster
2. Choose the free shared tier (M0)
3. Select your region (closest to your users)
4. Click "Create Cluster"

### 1.3 Create Database User
1. Go to "Database Access" in the left menu
2. Click "Add New Database User"
3. Create username: `crymson_user`
4. Set a strong password (save this!)
5. Built-in Role: `Atlas admin`
6. Click "Add User"

### 1.4 Set Network Access
1. Go to "Network Access" in the left menu
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (for now)
4. Click "Confirm"

### 1.5 Get Connection String
1. Go back to "Clusters"
2. Click "Connect" on your cluster
3. Choose "Drivers"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<database>` with `crymson`
7. Example: `mongodb+srv://crymson_user:PASSWORD@cluster0.xxxxx.mongodb.net/crymson`

## Step 2: Deploy Backend to Railway

### 2.1 Connect GitHub to Railway
1. Go to https://railway.app
2. Sign up or log in
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Connect your GitHub account
6. Select your Crymson repository

### 2.2 Configure Backend Service
1. Railway will auto-detect Node.js
2. In the "Variables" tab, add environment variables:

```
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-string>
MONGODB_URI=<your-mongodb-connection-string-from-step-1.5>
PORT=5000
CLIENT_ORIGIN=https://<your-vercel-frontend-url>.vercel.app
ALLOWED_ORIGINS=https://<your-vercel-frontend-url>.vercel.app
```

### 2.3 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Go to "Deployments" tab
4. Find your public URL (e.g., `https://crymson-backend-prod.railway.app`)
5. Save this URL

## Step 3: Deploy Frontend to Vercel

### 3.1 Connect GitHub to Vercel
1. Go to https://vercel.com
2. Sign up or log in
3. Click "Add New Project"
4. Import your GitHub repository
5. Select "Create a team" (optional) or skip

### 3.2 Configure Build Settings
1. Framework: React (should auto-detect)
2. Build Command: `npm run build`
3. Output Directory: `build`

### 3.3 Add Environment Variables
1. In "Environment Variables" section, add:

```
REACT_APP_API_BASE_URL=<your-railway-backend-url-from-step-2.4>
```

Example: `REACT_APP_API_BASE_URL=https://crymson-backend-prod.railway.app`

### 3.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Your app is now live at the generated Vercel URL (e.g., `https://crymson.vercel.app`)

## Step 4: Test Your Deployment

### 4.1 Frontend
1. Visit your Vercel URL
2. Test the sign-up and login flow
3. Verify all tools load and work

### 4.2 Backend Health Check
1. Visit `https://<your-railway-url>/api/health`
2. You should see: `{"status":"ok","db":{"connected":true}}`

### 4.3 Full Flow Test
1. Sign up with a test account
2. Create a task, academic event, etc.
3. Verify data persists after logout/login

## Step 5: Update Frontend URL in Backend (Important!)

If you haven't already, update your Railway backend with the final Vercel URL:

1. Go to Railway dashboard
2. Select your backend project
3. Go to "Variables"
4. Update `CLIENT_ORIGIN` to your actual Vercel URL
5. Redeploy (Railway auto-redeploys on code push)

## Post-Deployment Checklist

- [ ] Database connected and working
- [ ] Frontend loading without 404s or CORS errors
- [ ] Sign-up/Login flow works
- [ ] Can create and retrieve data (tasks, events, grades)
- [ ] Backend health endpoint returns `ok`
- [ ] No error logs in Railway dashboard
- [ ] HTTPS is enforced (check URL bar)

## Troubleshooting

### "CORS error" after deployment
1. Verify `CLIENT_ORIGIN` in Railway backend matches your Vercel URL exactly
2. Check that `ALLOWED_ORIGINS` includes your Vercel domain
3. Redeploy backend after changing variables

### "Cannot connect to database"
1. Check `MONGODB_URI` is correct in Railway variables
2. Verify MongoDB Atlas network access allows all IPs
3. Check database user password is correct

### "Blank page" on Vercel
1. Check browser console for errors
2. Verify `REACT_APP_API_BASE_URL` is set in Vercel environment
3. Check build logs in Vercel dashboard

### "502 Bad Gateway" from backend
1. Check Railway logs for startup errors
2. Verify all required environment variables are set
3. Check that JWT_SECRET is not the development default

## Development vs Production

- **Development**: Run locally with `npm run start:all`
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:5000`
  - Set `REACT_APP_API_BASE_URL=http://localhost:5000` in `.env`

- **Production**: Auto-deploys when you push to GitHub
  - Frontend: Vercel URL
  - Backend: Railway URL
  - Environment variables managed in each platform's dashboard

## Updating Your App

1. Make code changes locally
2. Commit and push to GitHub: `git push origin main`
3. Vercel and Railway automatically redeploy
4. View deployment logs in each platform's dashboard

## Security Notes

- Never commit `.env` files with secrets
- Rotate `JWT_SECRET` periodically
- Keep dependencies updated: `npm audit`
- Use strong passwords for MongoDB
- Monitor Railway and Vercel logs for errors

## Support

For issues:
1. Check Railway logs: `railway logs`
2. Check Vercel logs in dashboard
3. Verify network connectivity and firewall
4. Ensure environment variables are set correctly
