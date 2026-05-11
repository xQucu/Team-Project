# CheetahFit

A running-focused fitness app with AI-powered onboarding, personalized training plan management, and real-time workout tracking with GPS and heart rate monitoring.

## Tech Stack

- **Backend**: Django 6 + Django REST Framework
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4
- **AI**: Google Gemini API (gemini-3.1-flash-lite-preview)
- **Database**: SQLite (dev)
- **Bluetooth**: Web Bluetooth API (Heart Rate Monitor)
- **GPS**: Geolocation API

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## Setup

### 1. Clone the Repository

```bash
cd Team-Project
```

### 2. Backend Setup

#### Windows (PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
```

#### Linux/macOS (Bash)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

#### Create Environment File

```bash
cp env.example .env
```

Edit `.env` and add your Google Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

> **Note**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

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
python manage.py runserver 3000
```

2. **Start Frontend** (terminal 2):

```bash
cd frontend
npm run dev
```

3. **Open Browser**: Navigate to `http://localhost:5173`

---

## Features

### Onboarding

- AI-guided conversation collects user data (age, weight, height, goal, experience, training days per week, injuries)
- Generates personalized training plan (8 weeks)
- Plan includes workout type descriptions for each session
- Plan saved to database with proper date scheduling

### Home Screen

- Two-week calendar view showing upcoming workouts
- Full month calendar view
- Training card with workout details
- Start Training button (for scheduled workouts only)
- Live workout session mode

### Live Training Session

**GPS Tracking:**
- Uses `navigator.geolocation.watchPosition()` with high accuracy
- Haversine formula for distance calculation
- Only counts distance when speed >= 5 km/h
- Tracks speed (from GPS) and cumulative distance

**Heart Rate Monitoring:**
- Web Bluetooth API for heart rate monitor connection
- Auto-reconnect to previously paired devices
- Manual scan for new devices
- Works without device (continues with heart rate = 0)

**Data Saving:**
- Real-time data saved every 5 seconds during active training
- Pausing training stops data collection
- Data stored in `WorkoutDataPoint` table

**Pause/Resume:**
- Timer pauses when paused
- Elapsed time preserved
- GPS tracking paused during pause

**Finish Workout:**
- Remaining buffered data sent to server
- Workout marked as completed
- AI summary generated automatically

### Browser Refresh Handling

- Training state persisted in localStorage
- Session valid for 24 hours
- On page refresh: restores elapsed time, distance, pause state
- Auto-reconnects to Bluetooth device
- User continues training where they left off

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

### User Profile

- View and edit profile (age, weight, height, fitness goal, experience level)
- Profile data used for AI recommendations

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Create new account |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/auth/me/` | Get user profile & plan |
| POST | `/api/auth/profile/update/` | Update profile |

### Workouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/workouts/` | Get scheduled workouts |
| POST | `/api/auth/workouts/modify/` | Create/modify/delete workout |

### Workout Data (Live Session)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/workout-data/save/` | Save data points (every 5s) |
| POST | `/api/auth/workout-data/finish/` | Finish workout, generate AI summary |
| GET | `/api/auth/workout-data/<id>/` | Get workout data with points |

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/onboarding/chat/` | Onboarding AI chat |
| POST | `/api/auth/chat/` | Training AI chat |

---

## Database Models

### UserProfile
```python
- user: OneToOneField(User)
- age, weight, height: Physical stats
- experience_level: beginner | short_distance | intermediate | advanced
- fitness_goal, training_days_per_week, injuries
- has_completed_onboarding: Boolean
```

### WorkoutSession
```python
- user: ForeignKey(User)
- date, type, duration, description
- status: planned | completed | missed
- completed_at, week_number, month_number
# Post-completion fields:
- ai_summary: AI-generated summary
- total_duration_seconds, total_distance_km
- avg_heart_rate, max_heart_rate, avg_speed_kmh
```

### WorkoutDataPoint
```python
- user: ForeignKey(User)
- workout_session: ForeignKey(WorkoutSession)
- timestamp: DateTimeField(auto_now_add)
- elapsed_seconds: Time since training started
- distance_km, speed_kmh: Real-time metrics
- heart_rate: BPM (nullable)
- latitude, longitude: GPS coordinates (nullable)
```

---

## Project Structure

```
CheetahFit/
├── README.md
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── db.sqlite3
│   ├── .env
│   ├── cheetahfit/
│   │   ├── settings.py
│   │   └── urls.py
│   └── users/
│       ├── models.py          # UserProfile, WorkoutSession, WorkoutDataPoint
│       ├── views.py           # API endpoints
│       ├── services.py        # Business logic
│       ├── prompts.py         # AI system prompts
│       ├── parsers.py         # AI response parsing
│       └── urls.py
│
└── frontend/
    ├── package.json
    ├── vite.config.ts          # Proxy to backend on port 3000
    ├── src/
    │   └── App.tsx
    └── components/
        ├── home-screen.tsx           # Main dashboard + training logic
        ├── live-session.tsx          # Live workout UI
        ├── bluetooth-connect.tsx    # BLE heart rate pairing
        ├── onboarding-chat.tsx       # AI onboarding
        ├── chat-interface.tsx        # Chat UI
        ├── training-card.tsx         # Workout display
        ├── two-week-calendar.tsx    # 2-week view
        ├── full-calendar.tsx         # Month view
        ├── EditWorkoutModal.tsx
        ├── ProfileModal.tsx
        └── ui/                       # UI components
```

---

## Development

### Building for Production

```bash
cd frontend
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

### Frontend not connecting to backend

Make sure both backend (port 3000) and frontend (port 5173) are running.

### Bluetooth not working

- Use Chrome or Edge (Firefox doesn't support Web Bluetooth)
- Enable Bluetooth on your device
- Make sure heart rate monitor is in pairing mode

### GPS not tracking

- Allow location permissions in browser
- Use HTTPS or localhost (required for Geolocation API)
- Ensure GPS is enabled on device