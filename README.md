# StudyTrack

A full-stack student timetable and progress tracker with WhatsApp notifications.

## Tech Stack
- **Backend**: Python 3.10, Flask, MongoDB, Flask-JWT-Extended, APScheduler
- **Frontend**: React (Vite), TailwindCSS, Chart.js
- **DevOps**: Docker, Docker Compose

## Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.10+ (for local backend dev)
- MongoDB (local or Atlas)

## Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd STUDY_TRACK
   ```

2. **Environment Setup**
   Copy the example env file:
   ```bash
   cp .env.example .env
   ```
   *Note: Update `TWILIO_SID`, `TWILIO_AUTH`, etc. in `.env` for WhatsApp features.*

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3000
   - MongoDB: localhost:27017

## Local Development (VS Code)

### Backend
1. Open `backend/` in terminal.
2. Create virtual env: `python -m venv venv`
3. Activate: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. Install deps: `pip install -r requirements.txt`
5. Run: `python run.py`

### Frontend
1. Open `frontend/` in terminal.
2. Install deps: `npm install`
3. Run: `npm run dev`

## VS Code Configuration
The project includes `.vscode` settings for debugging.
- Use the "Python: Flask" launch configuration to debug backend.
- Use "Chrome" debugger for frontend.

## Testing
- **Backend**: `pytest`
- **Frontend**: `npm test`
