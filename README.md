# Mot-lee Organics MLM Platform

A premium, lightweight multi-level marketing platform for Mot-lee Organics skincare products.

## Features

- **Authentication System**: Secure signup/login with sponsor detection
- **Dashboard**: Clean overview of sales, team, and earnings
- **Product Catalog**: Beautiful product browsing and ordering
- **Team Management**: Simple genealogy tree and downline tracking
- **Commission System**: Automated commission calculations
- **Admin Panel**: Complete management interface

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database + Auth)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

Run the SQL schema from the `scripts/` directory in your Supabase project to set up the database tables and RLS policies.

Additionally, create a public storage bucket for product images:

- Bucket name: `products`
- Public: enabled
- Usage in app: admin uploads images; app reads public URLs

## Deployment

### GitHub
1. Initialize git repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repository on GitHub and push:
```bash
git remote add origin https://github.com/yourusername/mot-lee-organics-mlm.git
git branch -M main
git push -u origin main
```

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
3. Deploy - Vercel will automatically build and deploy your Next.js app

The project includes a `vercel.json` configuration file for optimal deployment settings.

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # Reusable components
├── contexts/           # React contexts
├── lib/               # Utilities and configurations
└── types/              # TypeScript type definitions
scripts/                # Database setup and migration SQL files
```

## Built by

[lunexweb](https://www.lunexweb.com) - Professional web development services
