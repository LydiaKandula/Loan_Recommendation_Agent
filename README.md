# Loan Recommendation Agent

An AI-powered loan recommendation application built with **React**, **FastAPI**, **PostgreSQL**, and **Groq**. It provides a dashboard and chat interface for collecting loan-related information and generating AI-assisted responses. The backend also includes authentication and optional voice/call integrations.

## Tech stack

- **Frontend:** React, Vite, JavaScript
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **AI:** Groq API
- **Voice integrations:** Sarvam AI and Twilio (optional; credentials and public callback URL required)

## Project structure

```text
Loan_Recommendation_Agent/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuration and database connection
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API, chat, authentication and voice routes
│   │   └── services/      # LLM, recommendation, EMI and speech services
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── services/
    └── package.json
```

## Prerequisites

Install the following before running the project:

- Python 3.10 or newer
- Node.js (current LTS recommended) and npm
- PostgreSQL
- A Groq API key

Sarvam AI and Twilio credentials are needed only if you want to use the corresponding speech or calling features.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/LydiaKandula/Loan_Recommendation_Agent.git
cd Loan_Recommendation_Agent
```

### 2. Configure PostgreSQL

Create a database named `loan_recommendation_db` in PostgreSQL (or choose another database name and update `DATABASE_URL` in the environment file).

Example using the PostgreSQL command line:

```sql
CREATE DATABASE loan_recommendation_db;
```

### 3. Configure the backend

Open a terminal in the project root and run:

**Windows (PowerShell):**
```powershell
cd backend
py -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a file named `.env` inside the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/loan_recommendation_db

# Optional: speech and calling integrations
SARVAM_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PUBLIC_BASE_URL=
```

Replace the database username/password and add your own API credentials. Never commit your real `.env` file or API keys.

Start the backend from the `backend/` directory:

```bash
python -m uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000. Interactive API documentation is available at http://127.0.0.1:8000/docs.

### 4. Configure the frontend

Open a **second terminal** from the project root:

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at http://localhost:5173. The current frontend API helper points to the backend at http://127.0.0.1:8000.

## Main backend routes

The FastAPI application includes routes for:

- Authentication: `/auth/signup`, `/auth/login`, `/auth/me`
- Chat and loan interaction: `/chat`
- Applications and users: `/applications`, `/users`
- Logs: `/logs`
- Voice and calls: `/voices`, `/calls/*`

See the live API documentation at `/docs` for request and response schemas.

## Notes

- The backend creates its SQLAlchemy tables when the application starts. Ensure PostgreSQL is running and `DATABASE_URL` is correct.
- The frontend currently uses a local backend URL. Update its API base URL before deploying the frontend and backend to hosted environments.
- Twilio voice callbacks require a publicly reachable HTTPS URL. For local testing, you can expose the backend with a tunnelling service and set `PUBLIC_BASE_URL`.
- Keep API keys, database passwords, and Twilio credentials private. Use environment variables or your deployment platform's secret manager.

## Contributors

Built as a collaborative project with separate frontend, backend, database, and AI/LLM integration work.
