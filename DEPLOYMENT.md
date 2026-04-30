# Crymson Deployment Guide

## Deployment Architecture

- **Frontend**: Render static site
- **Backend**: Render web service
- **Database**: MongoDB Atlas (cloud-hosted)

## Prerequisites

1. GitHub account with your Crymson repo
2. Render account (free tier available)
3. MongoDB Atlas account (free tier available)
4. Git installed locally

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

## Step 2: Deploy Backend to Render

### 2.1 Connect GitHub to Render
1. Go to https://render.com
2. Sign up or log in
3. Click "New" or "New +"
4. Choose "Blueprint"
5. Connect your GitHub account
6. Select your Crymson repository

### 2.2 Configure the Backend Service
1. Render will read `render.yaml`
2. In the backend service environment settings, add:

```
JWT_SECRET=<generate-a-strong-random-string>
MONGODB_URI=<your-mongodb-connection-string-from-step-1.5>
CLIENT_ORIGIN=https://<your-render-frontend-url>.onrender.com
ALLOWED_ORIGINS=https://<your-render-frontend-url>.onrender.com
```

### 2.3 Deploy
1. Click "Apply" or "Create"
2. Wait for deployment to complete
3. Copy the backend public URL (for example, `https://crymson-backend.onrender.com`)

## Step 3: Deploy Frontend to Render

### 3.1 Configure the Static Site
1. Render should create the static site service from `render.yaml`
2. In the static site environment settings, add:

```
REACT_APP_API_BASE_URL=<your-render-backend-url-from-step-2.3>
```

Example: `REACT_APP_API_BASE_URL=https://crymson-backend.onrender.com`

### 3.2 Deploy
1. Wait for the static site build to finish
2. Copy the frontend URL Render gives you (for example, `https://crymson-frontend.onrender.com`)

## Step 4: Update Backend CORS Settings

Once the frontend URL is known:

1. Go to the Render dashboard
2. Open the backend service
3. Update `CLIENT_ORIGIN` to your actual Render frontend URL
4. Update `ALLOWED_ORIGINS` to the same URL
5. Save changes and let Render redeploy

## Step 5: Test Your Deployment

### 5.1 Frontend
1. Visit your Render frontend URL
2. Test the sign-up and login flow
3. Verify all tools load and work

### 5.2 Backend Health Check
1. Visit `https://<your-render-backend-url>/api/health`
2. You should see `{"status":"ok","db":{"connected":true}}`

### 5.3 Full Flow Test
1. Sign up with a test account
2. Create a task, academic event, etc.
3. Verify data persists after logout/login

## Post-Deployment Checklist

- [ ] Database connected and working
- [ ] Frontend loading without 404s or CORS errors
- [ ] Sign-up/Login flow works
- [ ] Can create and retrieve data (tasks, events, grades)
- [ ] Backend health endpoint returns `ok`
- [ ] No error logs in Render dashboard
- [ ] HTTPS is enforced (check URL bar)

## Troubleshooting

### "CORS error" after deployment
1. Verify `CLIENT_ORIGIN` in Render backend matches your Render frontend URL exactly
2. Check that `ALLOWED_ORIGINS` includes your Render frontend domain
3. Redeploy backend after changing variables

### "Cannot connect to database"
1. Check `MONGODB_URI` is correct in Render environment variables
2. Verify MongoDB Atlas network access allows all IPs
3. Check database user password is correct

### "Blank page" on Render
1. Check browser console for errors
2. Verify `REACT_APP_API_BASE_URL` is set in the Render static site environment
3. Check build logs in the Render dashboard

### "502 Bad Gateway" from backend
1. Check Render logs for startup errors
2. Verify all required environment variables are set
3. Check that JWT_SECRET is not the development default

## Development vs Production

- **Development**: Run locally with `npm run start:all`
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:5000`
  - Set `REACT_APP_API_BASE_URL=http://localhost:5000` in `.env`

- **Production**: Auto-deploys when you push to GitHub
  - Frontend: Render static site URL
  - Backend: Render web service URL
  - Environment variables managed in the Render dashboard

## Updating Your App

1. Make code changes locally
2. Commit and push to GitHub: `git push origin main`
3. Render automatically redeploys
4. View deployment logs in the Render dashboard

## Security Notes

- Never commit `.env` files with secrets
- Rotate `JWT_SECRET` periodically
- Keep dependencies updated: `npm audit`
- Use strong passwords for MongoDB
- Monitor Render logs for errors

## Support

For issues:
1. Check Render logs in the dashboard
2. Verify your environment variables are set correctly
3. Check network connectivity and firewall
4. Ensure environment variables are set correctly
