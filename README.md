# 🧭 FYND — Find Your Next Destination

> **AI-Powered Career Navigation & Job Intelligence Platform**

FYND is an intelligent, full-stack career acceleration platform designed to bridge the gap between job seekers and their dream roles. Powered by Google Gemini AI, semantic embeddings, and Supabase, FYND analyzes resumes, scores ATS compatibility, delivers semantic job matches, identifies skill gaps with curated learning pathways, and provides interactive AI interview prep.

---

## 🌐 Live Deployments

* **Frontend Web App:** [https://fynd-luyz.vercel.app](https://fynd-luyz.vercel.app)
* **Backend API Docs (Swagger):** [https://fynd-delta.vercel.app/docs](https://fynd-delta.vercel.app/docs)
* **Backend Health Check:** [https://fynd-delta.vercel.app/health](https://fynd-delta.vercel.app/health)

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📄 **AI Resume Parser & Profiling** | Extracts work experience, education, tech stacks, and projects from PDF/DOCX resumes into structured career profiles. |
| 🎯 **ATS Scanner & Bullet Optimizer** | Scores resumes against Applicant Tracking System benchmarks and optimizes bullet points using actionable impact metrics. |
| 🤖 **Semantic Job Matching** | Multi-factor matching engine combining keyword overlap, semantic embedding cosine similarity, and experience weighting. |
| 📊 **Skill Gap & Learning Pathways** | Identifies missing competencies for target roles and recommends tailored learning resources and documentation. |
| 💬 **AI Career Copilot & Interview Prep** | Role-specific AI interview simulations with instant behavioral and technical feedback. |
| 📋 **Application Kanban Tracker** | Organize job applications through stages (*Saved*, *Applied*, *Interviewing*, *Offered*, *Rejected*). |
| 🤝 **Networking & Outreach Generator** | Generates personalized cold outreach and LinkedIn connection messages tailored to specific hiring managers. |

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React 19 + Vite
* **Routing:** React Router v7
* **Styling & UI:** Modern Vanilla CSS + Responsive Glassmorphism Design System
* **Icons:** Lucide React
* **Auth & Client DB:** `@supabase/supabase-js`

### **Backend**
* **Framework:** FastAPI (Python 3.11 / 3.12)
* **Server:** Uvicorn
* **AI & Embeddings:** Google Gemini AI (`google-genai`, `gemini-2.5-flash`, `gemini-embedding-001`)
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth Engine)
* **Parsing & Matching:** `pypdf`, `python-docx`, `RapidFuzz`
* **Validation:** Pydantic v2

### **DevOps & Hosting**
* **Frontend Hosting:** Vercel (Vite SPA)
* **Backend Hosting:** Vercel Serverless Functions (`@vercel/python`) / Docker Container Ready

---

## 📁 Repository Structure

```text
FYND/
├── .gitignore
├── .vercelignore
├── README.md
├── backend/
│   ├── api/
│   │   └── index.py            # Vercel serverless function entry point
│   ├── app/
│   │   ├── auth/               # JWT & Supabase auth dependencies
│   │   ├── database/           # Supabase client initialization
│   │   ├── models/             # Pydantic schemas & data models
│   │   ├── routes/             # FastAPI route controllers (auth, jobs, resume, etc.)
│   │   ├── services/           # Business logic, Gemini LLM, embeddings & scrapers
│   │   └── main.py             # FastAPI application setup & CORS configuration
│   ├── Dockerfile              # Production multi-stage Docker container config
│   ├── .dockerignore
│   ├── .env.example
│   ├── .vercelignore
│   ├── vercel.json             # Vercel backend routing rules
│   └── requirements.txt        # Pinned lightweight backend dependencies
└── frontend/
    ├── public/
    │   └── _redirects          # SPA routing fallback for static hosts
    ├── src/
    │   ├── api/                # API client & fetch wrappers
    │   ├── assets/             # Logos and static illustrations
    │   ├── components/         # Reusable UI components (Navbar, Sidebar, JobCard)
    │   ├── lib/                # Supabase client initialization
    │   ├── pages/              # Views (Dashboard, ATS Scanner, Tracker, Interview, etc.)
    │   ├── App.jsx             # Route definitions & protected layouts
    │   ├── index.css           # Global design tokens & styling
    │   └── main.jsx            # React root mount
    ├── .env.example
    ├── package.json
    ├── vercel.json             # Vercel SPA rewrite rules
    └── vite.config.js
```

---

## 🚀 Getting Started (Local Development)

### **Prerequisites**
* **Node.js**: v18.0.0 or higher
* **Python**: v3.11 or higher
* **Git**
* A **Supabase** Project ([supabase.com](https://supabase.com))
* A **Google Gemini API Key** ([aistudio.google.com](https://aistudio.google.com/))

---

### **1. Clone the Repository**

```bash
git clone https://github.com/ChennamadhavaVishwani/FYND.git
cd FYND
```

---

### **2. Backend Setup**

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file inside `backend/` (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Fill in your actual keys:
   ```env
   APP_NAME=FYND
   ENVIRONMENT=development
   PORT=8000

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key

   # Gemini AI
   GEMINI_API_KEY=your-gemini-api-key

   # CORS Allowed Origins
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the backend server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   * The API will run at `http://localhost:8000`
   * Interactive Swagger docs at `http://localhost:8000/docs`

---

### **3. Frontend Setup**

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node packages:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file inside `frontend/` (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Fill in the variables:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   * The application will run at `http://localhost:5173`

---

## 🐳 Running with Docker (Backend)

You can run the backend in an isolated Docker container:

```bash
# Build the Docker image
docker build -t fynd-backend ./backend

# Run the container
docker run -d -p 8000:8000 --env-file backend/.env --name fynd-api fynd-backend
```

Visit `http://localhost:8000/health` to verify the container status.

---

## 🔑 Environment Variables Reference

### **Backend (`backend/.env`)**
| Variable | Required | Description |
| :--- | :---: | :--- |
| `APP_NAME` | No | Name identifier (`FYND`) |
| `ENVIRONMENT` | Yes | Runtime mode (`development` or `production`) |
| `PORT` | No | Server port (defaults to `8000`) |
| `SUPABASE_URL` | Yes | Supabase project URL (`https://<id>.supabase.co`) |
| `SUPABASE_KEY` | Yes | Supabase Service Role or Anon Secret Key |
| `GEMINI_API_KEY` | Yes | Google Gemini AI API key |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS allowed domains |
| `FRONTEND_URL` | Yes | Primary frontend domain for CORS |

### **Frontend (`frontend/.env`)**
| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_BASE_URL` | Yes | Base URL of the backend API (e.g. `http://localhost:8000` or production URL) |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase public anonymous API key |

---

## 🚢 Production Deployment

### **Deploying to Vercel (Monorepo Setup)**

#### **1. Backend Project**
1. Create a new project on Vercel importing this GitHub repository.
2. Set **Root Directory** to `backend`.
3. Set **Framework Preset** to `Other`.
4. Add backend environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, `ENVIRONMENT`).
5. Deploy.

#### **2. Frontend Project**
1. Create a second project on Vercel importing this GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Add frontend environment variables (`VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Deploy.

#### **3. Supabase Auth Configuration**
* In **Supabase Dashboard > Authentication > URL Configuration**:
  * Set **Site URL** to your frontend production URL (e.g. `https://fynd-luyz.vercel.app`).
  * Add Redirect URLs: `https://fynd-luyz.vercel.app/**`.



## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.