# Vercel Deployment Troubleshooting - Login Issues

## Common Issue: Environment Variables Not Set

If your login isn't working on Vercel, it's most likely because the environment variables haven't been configured yet.

## Step-by-Step Fix:

### 1. Add Environment Variables in Vercel

Go to your Vercel project dashboard and add these environment variables:

**Required Variables:**

1. **DATABASE_URL**
   ```
   Copy from your .env.local file
   ```
   Example format: `postgresql://user:password@host.neon.tech/database?sslmode=require&channel_binding=require`

2. **JWT_SECRET**
   ```
   Copy from your .env.local file (or generate new with: openssl rand -base64 32)
   ```

3. **NEXT_PUBLIC_APP_URL**
   ```
   https://your-vercel-domain.vercel.app
   ```
   *(Replace with your actual Vercel URL)*

4. **MICROSOFT_CLIENT_ID**
   ```
   Copy from your .env.local file
   ```

5. **MICROSOFT_CLIENT_SECRET**
   ```
   Copy from your .env.local file
   ```

6. **MICROSOFT_REDIRECT_URI**
   ```
   https://your-vercel-domain.vercel.app/api/outlook/callback
   ```
   *(Replace with your actual Vercel URL)*

### 2. How to Add Variables in Vercel:

1. Go to https://vercel.com/dashboard
2. Select your project (mood-planner)
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Make sure to select **Production**, **Preview**, and **Development** environments
6. Click **Save**

### 3. Redeploy After Adding Variables:

After adding environment variables, you need to redeploy:

**Option 1 - Via Dashboard:**
- Go to **Deployments** tab
- Click on the latest deployment
- Click **Redeploy** → **Redeploy**

**Option 2 - Trigger New Deployment:**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

### 4. Verify Database Connection:

The app uses your production Neon database. Make sure:
- The DATABASE_URL is correct and accessible from Vercel
- The database has all tables initialized
- The admin user exists (tavishryan@gmail.com)

### 5. Check Vercel Logs:

To see what's actually failing:

1. Go to your Vercel dashboard
2. Click on your project
3. Go to **Deployments**
4. Click on the latest deployment
5. Click **View Function Logs**
6. Try logging in and watch for errors in real-time

## Common Error Messages:

### "DATABASE_URL environment variable is not set"
- **Cause:** DATABASE_URL not added to Vercel
- **Fix:** Add DATABASE_URL environment variable and redeploy

### "JWT_SECRET environment variable is not set"
- **Cause:** JWT_SECRET not added to Vercel
- **Fix:** Add JWT_SECRET environment variable and redeploy

### "Invalid credentials" or blank error
- **Cause:** Database connection working but user doesn't exist
- **Fix:** Make sure the production database has the admin user

### "Unauthorized" or 401 errors
- **Cause:** JWT token can't be generated/verified
- **Fix:** Make sure JWT_SECRET matches between deployments

## Testing Login:

Once variables are set and redeployed:

**Login Credentials:**
- Email: `tavishryan@gmail.com`
- Password: `Password123!`

## Need to Check Database?

If you need to verify the user exists in production:

```bash
# Connect to your production Neon database using the DATABASE_URL from .env.local
psql "YOUR_DATABASE_URL_HERE"

# Then run:
SELECT id, name, email, role FROM users WHERE email = 'tavishryan@gmail.com';
```

If the user doesn't exist, you'll need to run the create-admin script against production:

```bash
# Make sure DATABASE_URL points to production in .env.local temporarily
npm run create-admin
```

## Quick Checklist:

- [ ] All 6 environment variables added to Vercel
- [ ] Variables set for Production environment
- [ ] Redeployed after adding variables
- [ ] Database is accessible (not IP-restricted)
- [ ] Admin user exists in production database
- [ ] Vercel URL matches NEXT_PUBLIC_APP_URL
- [ ] Microsoft OAuth redirect URI updated with Vercel URL

## Still Not Working?

If you've done all the above and it's still not working, check:

1. Browser console for JavaScript errors
2. Network tab in browser dev tools for failed API calls
3. Vercel function logs for server-side errors

The most common issue is simply that environment variables haven't been added yet!
