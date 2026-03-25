# NEXUS — Professional Networking App

A full-stack LinkedIn-style professional networking app built with **React + Vite** on the frontend and **Supabase** on the backend.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (avatars) |
| Styling | Custom CSS (dark charcoal theme) |

---

## Features

- 🏠 **Feed** — Post updates, like & comment in real time
- 🔍 **Search** — Find people and jobs by name, skill, company
- 💼 **Jobs** — Browse listings, filter by type, apply with one click
- 👤 **Profile** — Edit your profile, view posts and connections
- 🔐 **Auth** — Sign up / Sign in with email + password
- 🎨 **Dark UI** — Charcoal + teal accent, micro-animations throughout

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd nexus
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`
3. Run the SQL — this creates all tables, RLS policies, and triggers
4. Go to **Project Settings → API** and copy your URL and anon key

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Supabase Storage Setup (for avatar uploads)

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `avatars`
3. Set it to **public**
4. Add this policy: allow authenticated users to upload to their own folder

---

## Project Structure

```
nexus/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state & hooks
│   ├── lib/
│   │   └── supabase.js          # Supabase client + all API calls
│   ├── pages/
│   │   ├── Landing.jsx          # Hero + auth modals
│   │   ├── Feed.jsx             # Posts feed + create post
│   │   ├── Search.jsx           # People + job search
│   │   ├── Jobs.jsx             # Job board + apply
│   │   └── Profile.jsx          # User profile + edit
│   ├── components/
│   │   └── Navbar.jsx           # Top navigation bar
│   ├── App.jsx                  # Root + layout + routing
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles + CSS variables
├── supabase/
│   └── schema.sql               # Full DB schema + RLS policies
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (linked to auth.users) |
| `posts` | Feed posts with content and optional image |
| `likes` | Post likes (unique per user per post) |
| `comments` | Post comments |
| `connections` | Professional connections (pending/accepted) |
| `jobs` | Job listings |
| `job_applications` | User job applications |

---

## Adding Seed Data

To test with some initial data, run this SQL in Supabase SQL Editor:

```sql
-- After creating a user account, insert sample jobs
INSERT INTO public.jobs (poster_id, title, company, location, description, job_type, salary_min, salary_max, skills)
VALUES
  (auth.uid(), 'Senior Frontend Engineer', 'Vercel', 'Remote', 'Join our team building the future of the web.', 'remote', 140000, 180000, ARRAY['React', 'TypeScript', 'Next.js']),
  (auth.uid(), 'Product Designer', 'Linear', 'San Francisco, CA', 'Design world-class product experiences.', 'full-time', 120000, 160000, ARRAY['Figma', 'Design Systems', 'UX Research']),
  (auth.uid(), 'Backend Engineer', 'Supabase', 'Remote', 'Build and scale our open source backend platform.', 'remote', 130000, 170000, ARRAY['PostgreSQL', 'Rust', 'TypeScript']);
```

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## Build for Production

```bash
npm run build
# Output → dist/
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## Security Notes

- All tables have **Row Level Security (RLS)** enabled
- Users can only edit their own profiles and posts
- Connections are only visible to the participants
- Anon key is safe to expose in the frontend (it's public-facing by design)
- For additional security, add email confirmation in Supabase Auth settings

---

Built with ❤️ using React + Supabase
