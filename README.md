# 🎓 Crymson — Your Complete Academic Life OS

**Crymson is a unified productivity ecosystem for Nigerian university students** (and students everywhere). It combines CGPA tracking, task management, study time tracking, finance management, file organization, and AI-powered task detection into one app. Everything about your academic life lives here.

---

## 🧭 Quick Start

### You Need
- **Node.js** (v18 or higher)
- **MongoDB** (local or cloud — optional, the app also works offline with file storage)
- **OpenAI or Gemini API key** (for AI task detection — optional, the rest of the app works without it)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Michael-Olaoluwa/CRYMSON.git
cd CRYMSON

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Create backend environment file
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:
```
JWT_SECRET=any-random-string-you-want
```

For AI task detection (optional), also add:
```
OPENAI_API_KEY=sk-your-key-here
```

### Run

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd backend
npm start
# Runs on http://localhost:5000

# Terminal 2 — Frontend
npm start
# Runs on http://localhost:3000
```

### Run as Desktop App (Electron)

```bash
npm run start:electron
```

This opens Crymson in its own window with system tray and clipboard monitoring.

---

## 🧱 The 5 Core Tools

### 1. 📊 CGPA Tracker

**What it does:** Track your grades and see your CGPA in real time.

**How it works:**
- Add each course you're taking this semester
- Enter your scores for tests, exams, assignments
- Crymson calculates your Grade Point using the Nigerian 5.0 scale
- See your current CGPA, your target CGPA, and what grades you need to reach it
- The GPA Calculator in the sidebar works for any grading system

**Example:** You add "MTH 201" with Test 1 score 14/15, Test 2 score 12/15, Exam score 60/70. Crymson tells you: "Your grade is A (4.0). Your semester GPA is 3.85. You need a B in CHM 202 to reach your 4.0 target."

### 2. ✅ Task Manager

**What it does:** Manage every assignment, test, exam, and to-do item.

**How it works:**
- Create tasks with a title, due date, course code, priority (low/medium/high), and recurrence (daily/weekly/monthly)
- Tasks are organized by type: general, assignment, test, exam
- When a task is due soon, Crymson sends a browser notification
- Task completion rate feeds into your Crymson Score
- Course code tags connect tasks to the CGPA Tracker and Course Hub

**Example:** You add "Submit MTH 201 assignment" due Friday with high priority. It shows in "This week's tasks" on your dashboard. When you complete it, your task completion rate goes up.

### 3. ⏱️ Time Tracker

**What it does:** Log study sessions and see exactly how much time you spend on each course.

**How it works:**
- Start a timer when you begin studying, tag it with the course code
- Stop when you're done — Crymson saves the session
- See daily, weekly, and per-course breakdowns
- Low-hours warnings: if you've studied less than 3 hours for a course this week, Crymson alerts you
- Study sessions can be started directly from the Course Hub

**Example:** You study MTH 201 for 2 hours on Monday and 1.5 hours on Wednesday. Crymson shows: "6 hours this week. You're on track." If you skip a week: "You studied 0 hours for CHM 202 — your exam is in 2 weeks."

### 4. 💰 Finance Tracker

**What it does:** Track your school-related spending and savings.

**How it works:**
- Log expenses (tuition, accommodation, feeding, transport, etc.)
- Log income (allowance, part-time job, savings)
- See your balance, spending by category, and savings progress
- Track spending against a semester budget
- Get alerts when you're overspending in a category

**Example:** You log ₦50,000 for project materials. Crymson shows: "You've spent ₦215,000 of your ₦300,000 semester budget. Transport is over budget by ₦5,000."

### 5. 📁 Course Hub (New!)

**What it does:** One place for every file and note related to each course.

**How it works:**
- Click "Course Hub" in the sidebar
- Enter a course code (e.g. "MTH 201")
- Upload files: lecture notes, slides, past questions, assignments
- Write notes directly in the browser — no extra app needed
- Tag past questions for easy searching
- Download any file with one click
- Search across all your materials from the landing page

**Example:** You upload "MTH 201 Past Questions 2024.pdf" tagged with "vectors, calculus". Click it to download. Write a note: "The lecturer focuses on differentiation in the exam." Later, search "differentiation" and both the note and the file appear.

---

## 🤖 Smart Features

### 🔍 Passive Task Detector

**What it does:** Detects tasks, assignments, and exam dates from text anywhere — your course portal, WhatsApp messages, emails, Google Classroom.

**How it works (browser):**
1. Install the Crymson extension from the `extension/` folder
2. Visit any website
3. The extension scans the text for things that look like academic tasks
4. A small **+** button appears beside detected text
5. Click **+** → a popup asks "Add to Crymson tasks?"
6. Click "Add" → it's saved to your task manager automatically
7. You must be signed in to Crymson for the extension to save tasks

**How it works (Electron desktop app):**
1. Run `npm run start:electron`
2. Enable "Clipboard Monitor" in the permissions panel (gear icon)
3. Copy text from any app — Crymson automatically detects tasks
4. Enable "Global Hotkey (Ctrl+Shift+D)" — press it anytime to open the capture dialog

**The share-target page** (`/share-target`): Open it with `?text=...` in the URL, or paste text manually. Crymson analyzes it and shows you everything it found.

### 📋 Share Target

**What it does:** A dedicated page at `/share-target` where you can paste text or open it from a URL param to detect tasks.

### 🗂️ PWA Support

**What it does:** Crymson works as a Progressive Web App. On mobile, you can "Add to Home Screen" and it opens like a native app. It also works offline for basic features.

**Files:** `public/manifest.json`, `public/service-worker.js`

---

## 🔮 Features Being Built (Coming Soon)

### 🌤️ Daily Mood & Energy Check-In

**What it will do:** Every day, you tap 3 times to log your mood and energy level. Takes less than 10 seconds.

**Why it matters:** After a few weeks, Crymson learns your personal patterns:
- You study best on Tuesday and Wednesday mornings
- Your energy dips after 4pm
- You're most productive right after a good night's rest

The AI Study Planner will use this data to schedule your hardest study sessions during your natural peak hours.

**Example (after 4 weeks):** "We've noticed you study most effectively on Tuesday and Wednesday mornings. We've scheduled your MTH 201 sessions then."

### 🏆 Crymson Score

**What it will do:** A single score (0–1000) that measures how well you're managing your entire academic life. Not just grades — everything.

**The 5 dimensions:**

| Factor | Weight | Where the data comes from |
|--------|--------|--------------------------|
| Your CGPA vs your goal | 25% | CGPA Tracker |
| How consistently you study | 20% | Time Tracker |
| How many tasks you complete | 20% | Task Manager |
| How well you manage money | 20% | Finance Tracker |
| How consistently you log wellbeing | 15% | Mood & Energy Log |

**The tiers (from low to high):**
- **Bronze** — Getting started
- **Silver** — Building consistency
- **Gold** — Strong performance
- **Crimson Elite** — Peak performance

Every week, Crymson sends you a notification: "Your score is now 720 (Gold). Here's what moved: your study consistency went up 5%, but you completed 3 fewer tasks than last week."

### 📅 Semester Wrapped

**What it will do:** At the end of each semester, Crymson creates a beautiful shareable card — like Spotify Wrapped but for your academic life.

**What it shows:**
- "You studied 214 hours this semester"
- "Your CGPA moved from 3.1 to 3.4"
- "You completed 87% of your tasks"
- "You saved ₦45,000"
- "Your most productive week was Week 8"
- "Your top course was CSC 301"
- "Crymson Score: Gold Tier"

One tap to share to WhatsApp, Instagram Stories, X (Twitter). Every share is free word-of-mouth for Crymson.

### 👥 Social Layer

**What it will do:** See anonymised study stats from your friends and study groups. Not toxic comparison — just ambient motivation.

**Example:** "Your study group averaged 8 hours on CHM 202 this week. You logged 2 hours."

**Features:**
- Invite friends to a study group
- See group averages for study hours and task completion
- Opt-in Crymson Score leaderboard within groups
- Group challenges: "This week's goal: everyone studies 10 hours"
- Full privacy controls — you choose what to share

### 🛸 Unified Dashboard

**What it will do:** The home screen shows your complete academic picture in 90 seconds. Not a feed — a cockpit.

**Sections:**
1. **CGPA snapshot** — current vs goal, next assessment date
2. **This week's tasks** — due soon, overdue, completion rate
3. **Study hours** — per course, low-hours warnings
4. **Finance** — balance, spending, savings progress
5. **Crymson Score** — current tier + how it changed
6. **AI insight cards** — smart observations only Crymson can make

**Example AI insight:** "Your grades tend to drop when study time falls below 3 hours per week per course. You studied 2 hours for CHM 202 this week."

---

## 🧠 How the AI Detection Works

### The NLP Service (`backend/src/services/textAnalyzer.js`)

When text is sent to `/api/detect/detect`, the backend:

1. Takes the raw text
2. Sends it to OpenAI (GPT-3.5) or Google Gemini with a special instruction prompt
3. The AI returns structured JSON: `{ detections: [{ type, title, courseTag, dueAt, priority, confidence, sourceText }] }`
4. The frontend receives this and shows it to you

**What the AI looks for:**
- Assignments: "Submit CSC 301 assignment by Friday"
- Deadlines: "due date is March 10th"
- Exams: "Final exam is on Thursday"
- Grade weights: "worth 30% of your grade"
- Any text that sounds like a task you need to do

**If no API key is set:** The service returns empty detections with a note. Everything else in Crymson works fine — only AI detection is disabled.

### The Browser Extension (`extension/`)

The content script (`content.js`) runs on every page you visit:

1. It waits for the page to load
2. Walks through the text of the page
3. Checks for task-like patterns using 10 regex patterns
4. If a match is found, injects a small **+** icon beside that text
5. When you click the **+**, a dialog appears showing the detected text
6. You click "Add to tasks" → the extension calls the Crymson API → the task is saved

**Patterns it looks for:**
- `assignment due`, `homework deadline`
- `exam on`, `test on`, `quiz on`
- `submit by`, `submit before`
- `worth X%`, `X% of grade`
- `project`, `presentation`, `paper`, `essay` with date references
- `lab report`, `lab work` with deadline
- `read chapter` by a date

**Auth flow:** When you sign into Crymson on the web app, the extension picks up your auth token automatically — no separate login needed.

---

## 🖥️ Desktop App (Electron)

The Electron wrapper (`electron/`) gives Crymson access to your computer beyond the browser.

### Features

| Feature | What it does | Permission needed |
|---------|-------------|-------------------|
| **Clipboard Monitor** | Watches what you copy. When it detects task-like text, brings Crymson to the front. | You toggle on in Permissions Panel |
| **Global Hotkey** | Press `Ctrl+Shift+D` from anywhere → opens the capture dialog | You toggle on in Permissions Panel |
| **System Tray** | Crymson icon in your system tray. Right-click to toggle permissions, open, quit. | Automatic |
| **Capture Dialog** | Floating dialog to paste text from any app for detection | Always available |

### Permissions Panel
A gear button in the bottom-right of the app shows the Permissions Panel. You control exactly what Crymson can access — everything is opt-in.

---

## 🛠️ Architecture

```
crymson/
├── backend/                    # Express.js API server (port 5000)
│   ├── src/
│   │   ├── config/            # Database connection (MongoDB + offline JSON fallback)
│   │   ├── controllers/       # Logic for each feature
│   │   │   ├── authController.js
│   │   │   ├── academicController.js
│   │   │   ├── userStateController.js
│   │   │   ├── adminController.js
│   │   │   ├── detectionController.js     # Task detection endpoints
│   │   │   ├── courseMaterialController.js # File upload/download
│   │   │   └── courseNoteController.js     # Notes CRUD
│   │   ├── middleware/        # Auth, validation
│   │   │   └── auth.js        # JWT verification
│   │   ├── models/            # Database schemas
│   │   │   ├── User.js
│   │   │   ├── UserState.js
│   │   │   ├── AcademicEvent.js
│   │   │   ├── CourseMaterial.js
│   │   │   └── CourseNote.js
│   │   ├── routes/            # API route definitions
│   │   ├── services/
│   │   │   └── textAnalyzer.js  # OpenAI/Gemini integration
│   │   └── server.js          # App entry point
│   ├── uploads/               # Uploaded files stored here
│   └── data/                  # Offline JSON storage fallback
│
├── src/                       # React frontend (port 3000)
│   ├── components/            # Reusable UI components
│   │   ├── AppLayout.jsx      # Sidebar + layout wrapper
│   │   ├── DetectionPrompt.jsx    # Task detection toast
│   │   ├── FileUploader.jsx       # Drag-and-drop file upload
│   │   ├── NoteEditor.jsx         # In-app note writer
│   │   ├── MaterialsPanel.jsx     # Course materials widget
│   │   ├── PermissionsPanel.jsx   # Electron permission toggles
│   │   ├── TextCaptureWidget.jsx  # Floating capture dialog
│   │   └── ExtensionBridge.jsx    # Extension detection banner
│   ├── hooks/
│   │   └── useTextDetection.js    # Detection state management
│   ├── pages/
│   │   ├── CGPATracker.js
│   │   ├── UserCGPATracker.js
│   │   ├── UserHome.js
│   │   ├── ToDoPlanner.js
│   │   ├── TimeTracker.js
│   │   ├── FinanceTracker.js
│   │   ├── ShareTarget.jsx        # Text → tasks page
│   │   └── CourseMaterials.jsx    # Course hub page
│   ├── parts/
│   ├── screens/
│   ├── utils/
│   │   ├── apiBaseUrl.js      # API URL detection
│   │   ├── authSession.js     # Session token management
│   │   └── icons.jsx          # All SVG icons (40+ icons)
│   ├── context/
│   │   └── TimerContext.js
│   ├── App.js                 # Root component + page routing
│   └── index.js               # Entry point + service worker registration
│
├── electron/                  # Desktop app wrapper
│   ├── main.js                # Electron main process
│   └── preload.js             # Secure bridge API
│
├── extension/                 # Chrome browser extension
│   ├── manifest.json          # Extension config (MV3)
│   ├── content.js             # Page scanner + icon injector
│   ├── background.js          # Service worker (API calls)
│   ├── popup.html / popup.js  # Extension popup UI
│   └── icons/                 # Extension icons
│
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # PWA service worker
│   └── icons/                 # App icons + logo
│
└── package.json               # Frontend deps + scripts
```

### The Data Flow

```
User types on a website
        │
        ▼
Chrome Extension (content.js) ──scans text──► finds task patterns
        │                                              │
    shows + icon                                   user clicks +
        │                                              │
        ▼                                              ▼
Crymson API ──POST /api/detect/detect──► OpenAI/Gemini AI
        │                                              │
        │                                       returns tasks
        │                                              │
        ▼                                              ▼
Crymson API ──POST /api/detect/accept──► saves to MongoDB
        │
        ▼
Task appears in your ToDoPlanner + Dashboard
```

### API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/session` | Check if token is still valid |
| **Tasks (UserState)** | | |
| GET | `/api/user-state/tasks` | Get all tasks |
| PUT | `/api/user-state/tasks` | Save tasks |
| **CGPA** | | |
| GET | `/api/user-state/cgpa` | Get CGPA data |
| PUT | `/api/user-state/cgpa` | Save CGPA data |
| **Time Tracker** | | |
| GET | `/api/user-state/time-sessions` | Get study sessions |
| PUT | `/api/user-state/time-sessions` | Save study sessions |
| **Finance** | | |
| GET | `/api/user-state/finance` | Get finance data |
| PUT | `/api/user-state/finance` | Save finance data |
| **Academic Events** | | |
| GET | `/api/academic-events` | List events |
| POST | `/api/academic-events` | Create event |
| PATCH | `/api/academic-events/:id/acknowledge` | Acknowledge event |
| **AI Detection** | | |
| POST | `/api/detect/detect` | Analyze text for tasks |
| POST | `/api/detect/accept` | Save detected tasks |
| POST | `/api/detect/feedback` | Thumbs up/down |
| **Course Hub** | | |
| GET | `/api/courses/:code/materials` | List course materials |
| POST | `/api/courses/:code/materials` | Upload file to course |
| GET | `/api/courses/materials/:id` | Download file |
| DELETE | `/api/courses/materials/:id` | Delete file |
| GET | `/api/courses/materials/search?q=` | Search materials |
| GET | `/api/courses/:code/notes` | List course notes |
| POST | `/api/courses/:code/notes` | Create note |
| PUT | `/api/courses/notes/:id` | Update note |
| DELETE | `/api/courses/notes/:id` | Delete note |
| GET | `/api/courses/notes/search?q=` | Search notes |
| **Admin** | | |
| GET | `/api/admin/users` | List users |
| **Health** | | |
| GET | `/api/health` | Server status |

---

## 📁 Project Structure Explained

### `backend/` — The Server
- **Express.js** handles all API requests
- **MongoDB** stores user data (with an automatic fallback to JSON files if MongoDB isn't running — the app never crashes)
- **JWT tokens** manage user sessions
- **Multer** handles file uploads
- **OpenAI/Gemini** powers the AI task detection

### `src/` — The Frontend
- **React 18** with `react-scripts`
- All pages are in `src/pages/`
- Reusable components in `src/components/`
- Icons in `src/utils/icons.jsx` — 40+ SVG icons that can be used anywhere with `iconMap`
- State management is through React's built-in `useState`/`useEffect` and Context (no Redux needed — it's simple enough without it)

### `electron/` — The Desktop App
- **Electron 43** wraps the React app in a native window
- System tray icon for background monitoring
- Secure preload script — the React app can't access Node.js directly

### `extension/` — The Browser Extension
- **Manifest V3** — Chrome's latest extension standard
- Content script runs on all pages
- Background service worker handles API calls
- No external dependencies — pure vanilla JS

---

## 🎨 Icons

Crymson uses custom SVG icons defined in `src/utils/icons.jsx`. There are over 40 icons:
`Fire`, `Sparkles`, `Target`, `Check`, `Book`, `Clipboard`, `Trophy`, `Money`, `Rocket`, `Party`, `Crown`, `Lightning`, `Sunrise`, `Moon`, `Chart`, `Star`, `Graduation`, `CheckCircle`, `Stopwatch`, `CreditCard`, `Users`, `Wave`, `Calm`, `Exhale`, `BarChart`, `Note`, `Refresh`, `Gear`, `Plus`, `Download`, `Trash`, `Lightbulb`, `Pencil`, `Search`, `CheckSquare`, `Square`, `ThumbsUp`, `ThumbsDown`

Each is Feather-style (24×24 viewBox, `stroke="currentColor"`, `fill="none"`) and can be used by importing or via `iconMap`.

---

## 🤔 Common Questions

### "Do I need MongoDB?"
No. Crymson tries MongoDB first. If it's not running, it automatically falls back to JSON files in `backend/data/`. Everything works the same way.

### "Do I need an OpenAI API key?"
No. Only the task detection feature needs it. Everything else — CGPA, tasks, time, finance, course hub — works perfectly without it.

### "Can I use this on my phone?"
Yes. It's a Progressive Web App (PWA). Open it in Chrome, tap "Add to Home Screen", and it opens like a native app. The share-target page works great for pasting text from other apps.

### "Is my data private?"
Yes. Everything is stored in your own MongoDB database or on your own machine. The AI detection sends text to OpenAI/Gemini only when you explicitly trigger it (clicking the + icon or pasting text in the detector). The browser extension only scans pages you visit and only sends text when you click +.

### "How do I install the Chrome extension?"
1. Open `chrome://extensions`
2. Turn on "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder in Crymson
5. Sign into Crymson at `http://localhost:3000` — the extension connects automatically

### "How do I run the desktop app?"
```bash
npm run start:electron
```

### "How do I contribute?"
This is a personal project by Michael-Olaoluwa. Fork the repo, make changes, and submit a pull request.

---

## 📜 License

MIT — do whatever you want with it.
