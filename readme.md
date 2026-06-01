# 💥 INTERNLY //

```
░▒▓█▓▒░▒▓███████▓▒░▒▓████████▓▒░▒▓████████▓▒░▒▓███████▓▒░░▒▓███████▓▒░░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓██████▓▒░ ░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░    ░▒▓██████▓▒░  
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░     
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░     
░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░   ░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░     
                                                                                               
                                                                                               ```

**Internly** is a high-octane, automated scraping pipeline and interactive Kanban board designed to capture, score, and track software engineering and AI/ML internships. It filters out the noise, eliminates full-time commitment traps, and syncs pristine listings straight to a custom **Neo-Brutalist** dashboard.

Designed specifically for developers and college students who want a high-agency, visual tool to organize their career search.

---

## 🎨 Visual Aesthetic & Design Tokens
Internly uses a premium **Neo-Brutalist** design system designed to look raw, physical, and highly tactile:
- **Outline & Shadow**: Thick black outlines (`4px solid #000`) and flat, zero-blur 3D drop shadows (`6px 6px 0px #000`) that translate physical offsets on active hover (`transform: translate(-4px, -4px); box-shadow: 10px 10px 0px #000`).
- **Typography**: 
  - Display/Headings: **Outfit** (900 heavy sans-serif in all-caps)
  - Details/Data/Inputs: **JetBrains Mono** (raw, developer monospace styling)
- **High-Contrast Canvas**: Clean warm cream canvas (`#F4F2EC`) with a retro radial dot grid overlay.

---

## ⚡ Architecture Map
The workspace is split into two clean components: the **Scraping Pipeline** (Backend orchestrator + CRON) and the **Dashboard** (Vite React Client).

```
d:\PROJECTS\internships\
├── readme.md                       <-- You are here (Core reference manual)
└── internly\
    ├── src\
    │   ├── scrapers\
    │   │   ├── internshala.js      <-- Cheerio parser (1.5s rate-limit intervals)
    │   │   ├── linkedin.js         <-- Public search aggregator
    │   │   ├── wellfound.js        <-- Startup directory extractor + JSON fallback
    │   │   ├── unstop.js           <-- Student hackathons & challenges pipeline
    │   │   └── cutshort.js         <-- AI/ML startup parser
    │   ├── utils\
    │   │   ├── normalize.js        <-- Maps standard schema & sets stable hashed UUIDs
    │   │   ├── filter.js           <-- 0-10 relevance scoring & Student Blacklist Engine
    │   │   ├── db.js               <-- Supabase batch upserts & status drivers
    │   │   └── logger.js           <-- Rich terminal logging dashboard
    │   ├── config.js               <-- Keyword arrays, stipend limits & domain controls
    │   └── index.js                <-- entry orchestrator & daily 9 AM CRON job
    ├── dashboard\
    │   ├── src\
    │   │   ├── components\
    │   │   │   └── InternTracker.jsx <-- Neo-Brutalist Kanban Board, Search & Stats
    │   │   ├── App.jsx             <-- Client shell
    │   │   ├── index.css           <-- Custom dot-grid reset, brutal-card, scrollbars
    │   │   └── main.jsx            <-- React bootloader
    │   ├── index.html              <-- Fonts and metadata structure
    │   └── .env                    <-- Frontend VITE_SUPABASE connections
    ├── supabase\
    │   └── schema.sql              <-- Table structures, indices, and RLS policies
    └── .env                        <-- Scraper database credentials
```

---

## 🧠 Smart Pipeline Features

### 1. The Student-Friendly Blacklist Engine
To prevent college students from getting trapped in full-time commitments when they need temporary internships, the filtering engine applies a **4-point penalty** to any listing flagged with terms like:
- `"full time"`, `"full-time"`, `"immediate joiner"`, `"no part time"`, `"6 days"`, `"office only"`, `"not suitable for students"`, `"full commitment"`.

If flagged, a listing's score immediately falls below the shortlisting threshold of `6/10`, ensuring they never clutter your active board columns.

### 2. Resilient Database Upserts (Deterministic UUIDs)
To prevent foreign key violations when re-running scrapers, listing IDs are generated **deterministically** by hashing the listing's unique `apply_url` using a stable SHA-256 process. This ensures:
- Duplicate runs update existing rows in Supabase without modifying their UUID `id`.
- Active application states tracked in the `applications` table are preserved flawlessly on conflict.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase project (Free Tier)

### 1. Database Setup
Create your database tables by running the SQL migration file [supabase/schema.sql](file:///d:/PROJECTS/internships/internly/supabase/schema.sql) in your **Supabase SQL Editor**. 

### 2. Scraper Configuration (Backend)
1. Navigate to the scraper directory:
   ```bash
   cd d:\PROJECTS\internships\internly
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Configure your [.env](file:///d:/PROJECTS/internships/internly/.env) file:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-anon-or-service-role-key
   ```
4. Run the scraper pipeline manually:
   ```bash
   npm start
   ```
   *The pipeline will scrape all 5 platforms in parallel, output a beautiful summary dashboard in your terminal, batch-upsert the data to Supabase, and schedule a daily cron runner at **9:00 AM**.*

### 3. Dashboard Deployment (Frontend)
1. Navigate to the dashboard directory:
   ```bash
   cd d:\PROJECTS\internships\internly\dashboard
   ```
2. Configure your frontend [.env](file:///d:/PROJECTS/internships/internly/dashboard/.env):
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_KEY=your-anon-key
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser. If Supabase is connected, your board will sync live. If the environment variables are not detected, the app automatically runs in **Offline Interactive Demo Mode** loading pre-loaded AI/ML internships so you can test all filters, searches, and columns instantly!

---

## 💡 Sprint Strategy: Targeting YC Startups

For early-career and college developers looking to work on modern tech stacks with high agency, **Y Combinator (YC)** startups represent the ultimate target:
- ** pedestal-free hiring**: Founders care strictly about your capability and what you have built.
- **Application Portal**: Use the official [Work at a Startup](https://www.workatastartup.com/) portal to send high-agency outreach pointing directly to your projects.
