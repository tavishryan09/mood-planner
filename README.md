# Next.js + daisyUI + Neon Database Starter

This is a [Next.js](https://nextjs.org) project with [daisyUI](https://daisyui.com) components and [Neon](https://neon.tech) database integration, ready to be deployed on [Vercel](https://vercel.com).

## Features

- Next.js 15 with App Router
- TypeScript support
- Tailwind CSS v4
- daisyUI components
- Neon serverless Postgres database
- ESLint configuration
- Ready for Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun
- A Neon database account (sign up at https://neon.tech)

### Installation

1. Clone the repository or use this template

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

4. Configure your Neon database:

   - Go to [Neon Console](https://console.neon.tech)
   - Create a new project
   - Copy your database connection string
   - Update the `DATABASE_URL` in `.env.local` with your Neon connection string

Example:
```
DATABASE_URL=postgresql://username:password@your-project.neon.tech/database_name?sslmode=require
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database Usage

The database connection is configured in `lib/db.ts`. Here's an example of how to use it:

```typescript
import { sql } from '@/lib/db';

// Example query
const result = await sql`SELECT * FROM users`;
```

## Deploy on Vercel

### Method 1: Deploy via Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel](https://vercel.com/new)
3. Import your repository
4. Add your environment variables:
   - `DATABASE_URL`: Your Neon database connection string
5. Click Deploy

### Method 2: Deploy via Vercel CLI

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Run the deploy command:

```bash
vercel
```

3. Follow the prompts and add your environment variables when asked

### Environment Variables on Vercel

Make sure to add the following environment variable in your Vercel project settings:

- `DATABASE_URL`: Your Neon database connection string

Go to Project Settings > Environment Variables and add your variables there.

## Project Structure

```
.
├── app/
│   ├── globals.css          # Global styles with Tailwind and daisyUI
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page with daisyUI components
├── lib/
│   └── db.ts                # Neon database configuration
├── public/                  # Static assets
├── .env.local              # Local environment variables (not in git)
├── .env.example            # Environment variables template
├── next.config.ts          # Next.js configuration
├── postcss.config.mjs      # PostCSS and daisyUI configuration
├── tsconfig.json           # TypeScript configuration
└── vercel.json             # Vercel deployment configuration
```

## Learn More

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### daisyUI
- [daisyUI Documentation](https://daisyui.com/docs)
- [daisyUI Components](https://daisyui.com/components)

### Neon Database
- [Neon Documentation](https://neon.tech/docs)
- [Neon with Next.js Guide](https://neon.tech/docs/guides/nextjs)

### Vercel
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
