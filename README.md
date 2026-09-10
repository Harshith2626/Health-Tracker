# Health Valut 🏥

A digital health locker, patient–doctor platform, health management system, and AI health assistant — built as a production-ready full-stack web app.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** Prisma ORM with SQLite (zero-setup local) & PostgreSQL (cloud-ready)
- **Auth:** JWT + bcrypt
- **AI Intelligence:** Multi-provider support (Claude / Gemini / OpenAI) with built-in Clinical Intelligence Engine
- **Deployment:** Docker, Docker Compose, Render, Vercel, Railway

```
health-valut/
├── backend/            # Express API, Prisma ORM, Multi-provider AI, Seed scripts, Dockerfile
├── frontend/           # React 18 + Vite + Tailwind CSS, Floating AI Window, Dockerfile
├── docker-compose.yml  # One-command full-stack container deployment
└── README.md
```

---

## 1. Quick Start (Local Development)

### Backend
```bash
cd backend
npm install
npm run dev        # Starts Express API on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Starts React App on http://localhost:5173
```

Demo logins:
- **Patient** — `patient@demo.com` / `patient123`
- **Doctor** — `doctor@demo.com` / `doctor123`

---

## 2. One-Command Docker Deployment 🐳

To run the entire full-stack application (frontend + backend + uploads + database volume):

```bash
docker-compose up --build
```

- Frontend available at: `http://localhost:80`
- Backend API available at: `http://localhost:5000`

---

## 3. Cloud Deployment

### A. Backend → Render / Railway
1. Create a **New Web Service** pointing to the repository.
2. Set Root Directory to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment Variables:
   - `DATABASE_URL` — Postgres connection string (Neon / Supabase / Render Postgres) or SQLite (`file:./dev.db`)
   - `JWT_SECRET` — Long random string
   - `JWT_EXPIRES_IN` — `7d`
   - `CORS_ORIGIN` — `https://your-frontend.vercel.app,*`
   - `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` or `OPENAI_API_KEY` — (Optional: connects live LLM APIs; defaults to built-in Clinical Intelligence Engine)

### B. Frontend → Vercel
1. Import repository on Vercel.
2. Set Root Directory to `frontend`.
3. Framework Preset: **Vite**.
4. Set Environment Variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
5. Deploy.

---

## 4. AI Intelligence Capabilities 🧠
The AI engine supports multi-provider cloud models with automatic fallback:
- **Anthropic Claude:** Set `ANTHROPIC_API_KEY`
- **Google Gemini:** Set `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- **OpenAI:** Set `OPENAI_API_KEY`
- **Built-in Clinical Intelligence Engine:** Active automatically without external keys, providing structured medical explanations, first-aid measures, lab report translation, and prescription analysis.
