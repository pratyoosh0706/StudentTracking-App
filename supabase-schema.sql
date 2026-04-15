-- Run this in Supabase SQL Editor

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  roll_number TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, roll_number));

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP NOT NULL,
  max_marks INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT NOW());

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present_submitted', 'present_not_submitted', 'absent')),
  marks_obtained REAL DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW());

-- Student marks table
CREATE TABLE IF NOT EXISTS student_marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_marks REAL DEFAULT 100,
  marks_obtained REAL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW());