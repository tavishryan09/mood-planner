# Vercel Deployment Guide

This guide will walk you through deploying the Mood Planner application to Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Neon Database (existing production database or new database)
- Microsoft Azure account (for Outlook integration)

## Step 1: Prepare Your Repository

1. **Initialize Git repository** (if not already done):
```bash
cd my-app
git init
git add .
git commit -m "Initial commit"
```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository
   - Follow instructions to push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Set Up Production Database

### Option A: Use Existing Neon Database
If you want to use your existing Neon database for production, skip to Step 3.

### Option B: Create New Production Database
1. Go to https://console.neon.tech
2. Create a new project for production
3. Copy the connection string
4. Run all database initialization scripts:

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run all initialization scripts in order
npm run init-auth-db
npm run init-projects-db
npm run init-planning-db
npm run add-row-index
npm run update-planning-schema
npm run add-row-span
npm run add-task-completed
npm run add-billing-rate
npm run add-project-billing
npm run set-team-rates-default
npm run init-planning-user-settings
npm run add-sidebar-preference
npm run init-dashboard-widget-settings
npm run add-show-all-projects-preference
npm run init-expenses-db
npm run add-expense-receipt
npm run add-expense-status
npm run add-outlook-integration
npm run add-widget-visibility
npm run add-outlook-event-id

# Create admin user
npm run create-admin
```

## Step 3: Configure Microsoft OAuth for Production

1. **Go to Azure Portal**: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

2. **Find your existing app registration** or create a new one

3. **Add production redirect URI**:
   - Go to "Authentication" in your app registration
   - Under "Platform configurations" → "Web"
   - Add redirect URI: `https://your-app-name.vercel.app/api/outlook/callback`
   - Replace `your-app-name` with your actual Vercel domain
   - Click "Save"

4. **Verify API permissions** (should already be set):
   - Go to "API permissions"
   - Ensure these are granted:
     - `offline_access`
     - `User.Read`
     - `Calendars.ReadWrite`

5. **Get your credentials**:
   - Application (client) ID: Copy this value
   - Client secret: If you need a new one, go to "Certificates & secrets" → "New client secret"

## Step 4: Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com/new

2. **Import your GitHub repository**:
   - Click "Import Project"
   - Select your repository
   - Click "Import"

3. **Configure project**:
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: `my-app` (if your Next.js app is in a subdirectory)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Add Environment Variables**:
   Click "Environment Variables" and add these:

   ```
   DATABASE_URL
   postgresql://your-username:your-password@your-neon-project.neon.tech/neondb?sslmode=require&channel_binding=require

   JWT_SECRET
   (generate new: openssl rand -base64 32)

   NEXT_PUBLIC_APP_URL
   https://your-app-name.vercel.app

   MICROSOFT_CLIENT_ID
   (your Azure app client ID)

   MICROSOFT_CLIENT_SECRET
   (your Azure app client secret)

   MICROSOFT_REDIRECT_URI
   https://your-app-name.vercel.app/api/outlook/callback
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (2-5 minutes)

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
cd my-app
vercel
```

4. **Follow prompts**:
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: Enter your project name
   - Directory: `./` (or `./my-app` if at repo root)
   - Override settings: No

5. **Add environment variables**:
```bash
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add MICROSOFT_CLIENT_ID production
vercel env add MICROSOFT_CLIENT_SECRET production
vercel env add MICROSOFT_REDIRECT_URI production
```

6. **Deploy to production**:
```bash
vercel --prod
```

## Step 5: Update Microsoft OAuth Redirect URI

1. **Get your Vercel deployment URL**:
   - Example: `https://mood-planner-abc123.vercel.app`

2. **Update Azure App Registration**:
   - Go back to Azure Portal
   - Update the redirect URI with your actual Vercel URL
   - Update environment variable `MICROSOFT_REDIRECT_URI` in Vercel if needed

3. **Update environment variables in Vercel**:
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Update `NEXT_PUBLIC_APP_URL` and `MICROSOFT_REDIRECT_URI` with your actual domain

## Step 6: Test Your Deployment

1. **Visit your deployed app**: `https://your-app-name.vercel.app`

2. **Test authentication**:
   - Try logging in with your admin credentials
   - Create a new user
   - Test role-based access

3. **Test Outlook integration**:
   - Connect Outlook calendar
   - Create a planning task
   - Verify it syncs to Outlook
   - Test manual sync button

4. **Test all features**:
   - Planning page
   - Projects management
   - Dashboard widgets
   - Expenses tracking

## Step 7: Set Up Custom Domain (Optional)

1. **Go to your Vercel project settings**

2. **Navigate to "Domains"**

3. **Add your custom domain**:
   - Click "Add"
   - Enter your domain (e.g., `planner.yourdomain.com`)
   - Follow DNS configuration instructions

4. **Update environment variables**:
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain
   - Update `MICROSOFT_REDIRECT_URI` to your custom domain

5. **Update Azure OAuth**:
   - Add new redirect URI with custom domain
   - Can keep Vercel domain as backup

## Troubleshooting

### Build Fails

**Check build logs**:
- Look for TypeScript errors
- Verify all dependencies are in package.json
- Ensure environment variables are set

**Common fixes**:
```bash
# Locally test build
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Database Connection Issues

**Verify**:
- DATABASE_URL includes `?sslmode=require&channel_binding=require`
- Neon database is accessible from Vercel
- Connection string has correct credentials

**Test connection**:
- Try connecting via Vercel Functions
- Check Vercel deployment logs

### Outlook OAuth Not Working

**Verify**:
- Redirect URI in Azure matches exactly: `https://your-domain.vercel.app/api/outlook/callback`
- MICROSOFT_REDIRECT_URI environment variable matches
- Client ID and secret are correct
- API permissions are granted

**Clear OAuth state**:
- Try disconnecting and reconnecting Outlook
- Check browser console for errors

### Environment Variables Not Loading

**Solutions**:
- Redeploy after adding environment variables
- Verify variables are set for "Production" environment
- Check variable names match exactly (case-sensitive)

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

- Each push creates a preview deployment
- Merges to main deploy to production
- View deployments in Vercel dashboard

## Production Checklist

- [ ] Database initialized and migrated
- [ ] Admin user created
- [ ] All environment variables set in Vercel
- [ ] Microsoft OAuth redirect URI updated for production domain
- [ ] Deployment successful
- [ ] Login works
- [ ] Outlook integration works
- [ ] All features tested
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)

## Monitoring and Logs

**View logs**:
- Go to Vercel dashboard
- Select your project
- Click "Deployments"
- Click on a deployment → "Functions"
- View real-time logs

**Analytics**:
- Vercel provides analytics in the dashboard
- Monitor performance, errors, and usage

## Database Backups

**Neon automatic backups**:
- Neon automatically backs up your database
- Configure retention in Neon dashboard

**Manual backup**:
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

## Security Best Practices

1. **Never commit .env.local** - Already in .gitignore
2. **Rotate secrets regularly** - JWT_SECRET, MICROSOFT_CLIENT_SECRET
3. **Use strong passwords** for database and admin users
4. **Enable 2FA** on Vercel and Azure accounts
5. **Monitor Vercel logs** for suspicious activity
6. **Keep dependencies updated**: `npm audit` regularly

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Neon Documentation: https://neon.tech/docs
- Microsoft Graph API: https://learn.microsoft.com/en-us/graph/

## Future Updates

To deploy updates:

1. Make changes locally
2. Test locally: `npm run dev`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
4. Vercel automatically deploys
5. Test production deployment

## Rolling Back

If a deployment has issues:

1. Go to Vercel dashboard
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Previous version is now live
