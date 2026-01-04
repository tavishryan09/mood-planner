# Quick Deployment Checklist

This is a condensed checklist for deploying to Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Pre-Deployment

- [ ] Code pushed to GitHub repository
- [ ] Production database ready (Neon)
- [ ] Database migrations run on production database
- [ ] Admin user created in production database

## Environment Variables Needed

Copy these to Vercel project settings → Environment Variables:

| Variable | Example | Where to get it |
|----------|---------|----------------|
| `DATABASE_URL` | `postgresql://user:pass@host.neon.tech/db?sslmode=require&channel_binding=require` | Neon dashboard |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` | Generate new for production |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel domain |
| `MICROSOFT_CLIENT_ID` | `2b73bd54-5f85-4c07-924a-...` | Azure Portal |
| `MICROSOFT_CLIENT_SECRET` | `udH8Q~TUHkWDFxqXEi4X...` | Azure Portal |
| `MICROSOFT_REDIRECT_URI` | `https://your-app.vercel.app/api/outlook/callback` | Your Vercel domain + `/api/outlook/callback` |

## Deploy Steps

1. **Go to Vercel**: https://vercel.com/new
2. **Import GitHub repo**
3. **Configure**:
   - Root Directory: `my-app` (if Next.js is in subdirectory)
   - Framework: Next.js
4. **Add all 6 environment variables** (see table above)
5. **Click Deploy**

## After First Deployment

1. **Get Vercel URL**: `https://your-app-xyz123.vercel.app`

2. **Update Azure OAuth**:
   - Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
   - Select your app
   - Authentication → Add Redirect URI:
     - `https://your-app-xyz123.vercel.app/api/outlook/callback`
   - Save

3. **Update Vercel environment variables** if domain changed:
   - `NEXT_PUBLIC_APP_URL`
   - `MICROSOFT_REDIRECT_URI`
   - Redeploy: Deployments → Latest → Redeploy

4. **Test**:
   - [ ] Can login
   - [ ] Can create tasks
   - [ ] Outlook sync works

## Database Migration Commands

If you need to initialize a fresh production database, run these in order:

```bash
export DATABASE_URL="your-production-url"

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
npm run create-admin
```

## Continuous Deployment

Once deployed, every push to `main` branch automatically deploys:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Common Issues

**Build fails**: Run `npm run build` locally first to catch errors

**Database connection fails**: Verify `DATABASE_URL` includes `?sslmode=require&channel_binding=require`

**Outlook OAuth fails**: Verify redirect URI in Azure matches exactly (including https://)

**Environment variables not working**: Redeploy after adding/changing variables

## Rollback

If deployment breaks:
1. Go to Vercel dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

## Support Links

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- Azure Portal: https://portal.azure.com
- Neon Console: https://console.neon.tech
