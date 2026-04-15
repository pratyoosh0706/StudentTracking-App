# Student Admin Panel

A full-stack admin panel for managing classes, students, assignments, and attendance.

## Tech Stack

- **Frontend**: React + Vite → Vercel
- **Backend**: Express.js → Render
- **Database**: Supabase (PostgreSQL)

---

## Deployment Guide

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings → Database**
4. Copy the **Connection string** (URI format)

---

### 2. Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo
5. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

6. Add Environment Variable:
   ```
   DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```

7. Click **"Create Web Service"**

8. Wait for deployment, then copy your URL:
   `https://student-admin-server.onrender.com`

---

### 3. Deploy Frontend to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import the repo
4. Set **Root Directory**: `client`
5. Add Environment Variable:
   ```
   VITE_API_URL = https://student-admin-server.onrender.com
   ```
6. Click **"Deploy"**

---

## Local Development

```bash
# Clone repo
git clone <repo-url>
cd student-admin-panel

# Set environment variable
set DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# Start backend
cd server
npm install
npm start

# Start frontend (new terminal)
cd client
npm install
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/classes` | List all classes |
| POST | `/api/classes` | Create class |
| DELETE | `/api/classes/:id` | Delete class |
| GET | `/api/classes/:id/students` | List students |
| POST | `/api/classes/:id/students` | Add student |
| GET | `/api/classes/:id/assignments` | List assignments |
| POST | `/api/classes/:id/assignments` | Create assignment |
| GET | `/api/classes/:id/report` | Class report |
| GET | `/api/search/:roll` | Search by roll number |
| POST | `/api/attendance` | Mark attendance |
| POST | `/api/attendance/bulk` | Bulk mark attendance |
| GET | `/api/students` | List all students |
| GET | `/api/students/:id/report` | Student report |

---

## Scoring System

| Status | Marks |
|--------|-------|
| Present + Submitted | +7 |
| Present + Not Submitted | 0 |
| Absent | 0 |
| **Maximum** | 100/year |

---

## Project Structure

```
/
├── client/                 # React Frontend (Vercel)
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── App.jsx       # Main app
│   │   └── App.css       # Styles
│   └── package.json
├── server/                # Express Backend (Render)
│   ├── index.js          # API routes
│   └── package.json
├── vercel.json           # Vercel config
└── README.md
```
