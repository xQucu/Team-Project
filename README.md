# CheetahFit

A running-focused fitness app with AI-powered onboarding and personalized training plan management.

## Tech Stack

- **Backend**: Django 6 + Django REST Framework
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4
- **AI**: Google Gemini API
- **Database**: SQLite (dev)

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## Setup

### 1. Clone the Repository

```bash
cd CheetahFit
```

### 2. Backend Setup

#### Windows (PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Linux/macOS (Bash)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Create Environment File

Create `backend/.env` with your API key:

```
GEMINI_API_KEY=your_api_key_here
```

> **Note**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

#### Run Migrations

```bash
python manage.py migrate
python manage.py runserver
```

The backend will start at `http://localhost:3000`

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`

---

## Running the Application

1. **Start Backend** (terminal 1):

```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
python manage.py runserver
```

1. **Start Frontend** (terminal 2):

```bash
cd frontend
npm run dev
```

1. **Open Browser**: Navigate to `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint                     | Description             |
| ------ | ---------------------------- | ----------------------- |
| POST   | `/api/auth/register/`        | Create new account      |
| POST   | `/api/auth/login/`           | Login                   |
| POST   | `/api/auth/logout/`          | Logout                  |
| GET    | `/api/auth/me/`              | Get user profile & plan |
| GET    | `/api/auth/workouts/`        | Get scheduled workouts  |
| POST   | `/api/auth/onboarding/chat/` | Onboarding AI chat      |
| POST   | `/api/auth/chat/`            | Training AI chat        |

---

## Project Structure

```
CheetahFit/
├── README.md                    # This file
├── backend/
│   ├── manage.py               # Django management
│   ├── requirements.txt        # Python dependencies
│   ├── .env                   # Environment variables (create this)
│   ├── cheetahfit/            # Django project settings
│   │   ├── settings.py
│   │   └── urls.py
│   └── users/                 # Main app
│       ├── models.py           # UserProfile, WorkoutSession
│       ├── views.py           # API endpoints
│       ├── services.py        # Business logic (save workouts, etc)
│       ├── prompts.py        # AI system prompts
│       ├── parsers.py        # AI response parsing
│       ├── urls.py          # Route definitions
│       └── migrations/      # Database migrations
│
└── frontend/
    ├── package.json           # Node dependencies
    ├── vite.config.ts       # Vite configuration
    ├── src/
    │   ├── main.tsx        # Entry point
    │   └── App.tsx         # Main component
    └── components/          # React components
        ├── home-screen.tsx
        ├── onboarding-chat.tsx
        ├── chat-interface.tsx
        ├── training-card.tsx
        ├── two-week-calendar.tsx
        ├── full-calendar.tsx
        └── ui/              # UI primitives
```

---

## Features

### Onboarding

- AI-guided conversation collects user data
  (age, weight, height, goal, experience, training days per week, injuries)
- Generates personalized 3-month running plan (12 weeks, 4 weeks per month)
- Plan includes workout type descriptions for each session
- Plan saved to database with proper date scheduling

### Home Screen

- Two-week calendar view showing upcoming workouts
- Full month calendar view
- Training card with workout details
- Live workout session mode

### AI Chat

- Answers questions about upcoming/past workouts
- Makes modifications to training plan
- Clear commands (e.g., "move wednesday to friday") apply directly
- Vague requests (e.g., "make training harder") propose changes with confirmation
- Delete workouts (e.g., "remove saturday's workout")
- Bulk modifications (e.g., "make all workouts 60 min")
- Creates new workout plans (e.g., "add more workouts")

**Confirmation Flow:**
1. User requests broad change → AI proposes specific changes
2. Frontend shows proposal with workout count and description
3. User responds "Yes" or "No" → Changes applied or cancelled

**Response Fields:**
| Field | Description |
| ------ |-------------|
| `reply` | Conversational response |
| `modifications_applied` | Array of successful changes |
| `confirmation_needed` | `{workout_ids: [...], proposed_change: "..."}` |
| `newly_created` | Count of new workouts created |

---

## Development

### Running Tests

```bash
# Backend
python manage.py test

# Frontend
npm run test
```

### Building for Production

```bash
# Frontend
npm run build
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'django'"

```bash
# Activate virtual environment
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### "GEMINI_API_KEY not configured"

Make sure `.env` file exists in `backend/` with valid API key.

### Frontend not loading

Make sure both backend (port 3000) and frontend (port 5173) are running.

