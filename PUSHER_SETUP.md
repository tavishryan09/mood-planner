# Pusher Setup Guide

## ✅ Local Development (Done!)
Your Pusher credentials have been added to `.env.local`

## 🚀 Production Setup (Vercel)

To make real-time updates work in production, add these environment variables to your Vercel project:

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your `mood-planner` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
PUSHER_APP_ID = 2099457
PUSHER_SECRET = 42513ed338f82fd24985
NEXT_PUBLIC_PUSHER_KEY = b7a7e7f733ebb5050c26
NEXT_PUBLIC_PUSHER_CLUSTER = us3
```

5. Make sure to check all three environments: **Production**, **Preview**, and **Development**
6. Click **Save**
7. Redeploy your app (or it will auto-deploy on next push)

### Option 2: Via Vercel CLI
```bash
vercel env add PUSHER_APP_ID
# Enter: 2099457

vercel env add PUSHER_SECRET
# Enter: 42513ed338f82fd24985

vercel env add NEXT_PUBLIC_PUSHER_KEY
# Enter: b7a7e7f733ebb5050c26

vercel env add NEXT_PUBLIC_PUSHER_CLUSTER
# Enter: us3
```

## 🧪 Testing

### Local Development
1. Restart your dev server: `npm run dev`
2. Open the planning page in two browser windows
3. Make a change in one window
4. It should appear instantly in the other window
5. Check browser console for: `[Pusher] Connected`

### Production
1. Deploy to Vercel
2. Open your production URL in two browser windows
3. Make a change in one window
4. It should appear instantly in the other window

## 📊 Monitoring
- Check your Pusher dashboard: https://dashboard.pusher.com/apps/2099457
- You'll see:
  - Active connections
  - Messages sent/received
  - Usage stats

## 💰 Free Tier Limits
- 100 concurrent connections
- 200,000 messages per day
- Unlimited channels

This should be plenty for your team!
