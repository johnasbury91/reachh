# Reddit Monitor - Reachh Internal Tool

Find Reddit opportunities and track your comment placements.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

### Option 1: One-Click Deploy
1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import the repo
4. Add environment variable: `APIFY_API_KEY`
5. Deploy

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```
When prompted, add the environment variable.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APIFY_API_KEY` | Your Apify API token |

## Features

### Search Tab
- Enter keywords to search Reddit
- Filter by target subreddits
- Add opportunities to your queue

### Queue Tab
- Review queued opportunities
- Open thread in new tab → post your comment
- Paste comment URL → mark as posted

### Posted Tab
- Track all completed comments
- Quick links to view your comments

## Data Storage

Currently uses localStorage (persists in your browser).
Ready for Supabase upgrade when needed.

## Default Project: Dharm

- **Keywords**: best electric scooter, offroad electric scooter, budget electric scooter
- **Subreddits**: r/ElectricScooters, r/scooters, r/electricvehicles

Edit in the interface or modify `DEFAULT_PROJECT` in `app/page.js`.
