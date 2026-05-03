# TaskFlow — Thought-to-Task Converter

A premium full-stack productivity app: **React 18 + Vite** frontend, **Node.js/Express + Prisma** backend, **Django** scheduling microservice.

---

## ✨ Features

- **Enhanced Task Cards** with compact top-right control panel:
  - 🕐 **Clock icon** → Timing popup with 3 modes (Specific date, Deadline, Duration quick-select)
  - 🚩 **Flag icon** → Importance popup (High 🔴 / Medium 🟡 / Low 🟢)
- **Color-coded priority badges** with left-border accents on cards
- **Overdue detection** — pulsing red border + ⚠ badge
- **Real-time WebSocket reminders** — 15 minutes before due time
- **Browser notifications** (with permission)
- **Django scheduler** polls every 60s as a secondary reminder system
- Filter chips: All · Active · Completed · High · Medium · Low · Overdue
- JWT auth with register/login

---

## 🗂 Project Structure

```
Task MANAGER/
├── backend/           # Node.js + Express + Prisma (SQLite)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.js
│       ├── middleware/auth.js
│       ├── routes/auth.js, tasks.js, reminders.js
│       ├── services/reminderPoller.js
│       └── utils/timingHelpers.js
├── frontend/          # React 18 + Vite
│   └── src/
│       ├── components/
│       │   ├── TaskCard.jsx        ← Main card with clock+flag controls
│       │   ├── TimingPopup.jsx     ← 3-tab timing picker
│       │   ├── ImportancePopup.jsx ← Priority selector
│       │   ├── CreateTaskPanel.jsx ← New task form
│       │   └── AppShell.jsx        ← Sidebar + routing
│       ├── pages/Dashboard, Login, Register
│       ├── context/Auth, Toast
│       ├── hooks/useWebSocket.js
│       └── utils/taskHelpers.js
└── scheduler/         # Django + APScheduler
    ├── manage.py
    ├── scheduler_project/
    └── reminders/
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://python.org/) with pip

### 1. Run setup script (Windows PowerShell)
```powershell
cd "Task MANAGER"
.\setup.ps1
```

### 2. Start the backend
```powershell
cd backend
npm run dev
# → http://localhost:3001
```

### 3. Start the frontend
```powershell
cd frontend
npm run dev
# → http://localhost:5173
```

### 4. Start Django scheduler (optional)
```powershell
cd scheduler
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
# → http://localhost:8001
```

---

## 🎯 Task Timing Options

| Type | How it works | Example |
|------|-------------|---------|
| **Specific** | Exact date + time | May 5, 2:00 PM |
| **Deadline** | Due by end of day | Until May 10 |
| **Duration** | From now + offset | ⏱ 4 Hours |

Reminders fire **15 minutes before** the due time via WebSocket.

---

## 🎨 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Vanilla CSS with CSS variables (dark mode) |
| Backend | Node.js, Express, Prisma ORM, SQLite |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Realtime | WebSocket (ws library) |
| Scheduler | Django 4.2 + APScheduler |
