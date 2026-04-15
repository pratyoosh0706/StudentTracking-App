const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Initialize Database Schema
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        roll_number TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, roll_number)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        deadline TIMESTAMP NOT NULL,
        max_marks INTEGER DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        assignment_id INTEGER,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present_submitted', 'present_not_submitted', 'absent')),
        marks_obtained REAL DEFAULT 0,
        late_days INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_marks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        total_marks REAL DEFAULT 100,
        marks_obtained REAL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

// Helper function to generate random unique roll number
async function generateRandomRollNumber() {
  let rollNumber;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    rollNumber = String(Math.floor(1000 + Math.random() * 9000));
    const res = await pool.query('SELECT id FROM students WHERE roll_number = $1', [rollNumber]);
    
    if (res.rows.length === 0) {
      return rollNumber;
    }
    attempts++;
  }
  
  return rollNumber;
}

// ============ CLASS ROUTES ============

app.get('/api/classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(s.id) as student_count 
      FROM classes c 
      LEFT JOIN students s ON c.id = s.class_id 
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name required' });
    
    const result = await pool.query('INSERT INTO classes (name) VALUES ($1) RETURNING *', [name]);
    res.json({ ...result.rows[0], student_count: 0 });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Class already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM classes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENT ROUTES ============

app.get('/api/classes/:classId/students', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM students WHERE class_id = $1 ORDER BY name ASC
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classes/:classId/students', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email } = req.body;
    const classId = req.params.classId;
    
    if (!name) return res.status(400).json({ error: 'Student name required' });
    
    const rollNumber = await generateRandomRollNumber();
    
    await client.query('BEGIN');
    
    const result = await client.query(
      'INSERT INTO students (class_id, name, email, roll_number) VALUES ($1, $2, $3, $4) RETURNING *',
      [classId, name, email || null, rollNumber]
    );
    
    await client.query(
      'INSERT INTO student_marks (student_id, total_marks, marks_obtained) VALUES ($1, 100, 0)',
      [result.rows[0].id]
    );
    
    const students = await client.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY name ASC',
      [classId]
    );
    
    await client.query('COMMIT');
    res.json(students.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    await pool.query(
      'UPDATE students SET name = $1, email = $2 WHERE id = $3',
      [name, email, req.params.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Smart search by roll number
app.get('/api/search/:rollNumber', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name, sm.marks_obtained, sm.total_marks
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_marks sm ON s.id = sm.student_id
      WHERE s.roll_number = $1
    `, [req.params.rollNumber]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ASSIGNMENT ROUTES ============

app.get('/api/classes/:classId/assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM assignments WHERE class_id = $1 ORDER BY deadline DESC
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classes/:classId/assignments', async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: 'Title and deadline required' });
    }
    
    const result = await pool.query(
      'INSERT INTO assignments (class_id, title, description, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.classId, title, description || null, deadline]
    );
    
    res.json({ 
      ...result.rows[0], 
      max_marks: 7 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ATTENDANCE ROUTES ============

app.get('/api/attendance/:date', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.name, s.roll_number, s.email, a2.title as assignment_title
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN assignments a2 ON a.assignment_id = a2.id
      WHERE a.date = $1
      ORDER BY s.name ASC
    `, [req.params.date]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { studentId, assignmentId, date, status } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Student ID, date, and status required' });
    }
    
    let assignment = null;
    if (assignmentId) {
      const result = await pool.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
      assignment = result.rows[0];
    }
    
    let marksObtained = 0;
    let lateDays = 0;
    
    if (status === 'present_submitted') {
      marksObtained = 7;
    } else if (status === 'present_not_submitted' && assignment) {
      const deadline = new Date(assignment.deadline);
      const submissionDate = new Date(date);
      if (submissionDate > deadline) {
        lateDays = Math.ceil((submissionDate - deadline) / (1000 * 60 * 60 * 24));
        marksObtained = Math.max(0, 7 - (lateDays * 0.5));
      }
    }
    
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
      [studentId, date]
    );
    
    let result;
    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE attendance 
        SET assignment_id = $1, status = $2, marks_obtained = $3, late_days = $4
        WHERE id = $5
      `, [assignmentId || null, status, marksObtained, lateDays, existing.rows[0].id]);
      result = existing.rows[0].id;
    } else {
      const res2 = await pool.query(`
        INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [studentId, assignmentId || null, date, status, marksObtained, lateDays]);
      result = res2.rows[0].id;
    }
    
    const totalMarks = await pool.query(`
      SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = $1
    `, [studentId]);
    
    await pool.query(`
      UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
    `, [Math.min(totalMarks.rows[0].total, 100), studentId]);
    
    res.json({ success: true, marksObtained });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { classId, assignmentId, date, status } = req.body;
    
    if (!classId || !date || !status) {
      return res.status(400).json({ error: 'Class ID, date, and status required' });
    }
    
    const students = await pool.query('SELECT id FROM students WHERE class_id = $1', [classId]);
    
    let assignment = null;
    if (assignmentId) {
      const result = await pool.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
      assignment = result.rows[0];
    }
    
    let marksObtained = 0;
    if (status === 'present_submitted') {
      marksObtained = 7;
    }
    
    for (const student of students.rows) {
      const existing = await pool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [student.id, date]
      );
      
      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE attendance SET assignment_id = $1, status = $2, marks_obtained = $3, late_days = 0
          WHERE id = $4
        `, [assignmentId || null, status, marksObtained, existing.rows[0].id]);
      } else {
        await pool.query(`
          INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
          VALUES ($1, $2, $3, $4, $5, 0)
        `, [student.id, assignmentId || null, date, status, marksObtained]);
      }
      
      const totalMarks = await pool.query(`
        SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = $1
      `, [student.id]);
      
      await pool.query(`
        UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
      `, [Math.min(totalMarks.rows[0].total, 100), student.id]);
    }
    
    res.json({ success: true, count: students.rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REPORT ROUTES ============

app.get('/api/classes/:classId/report', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.roll_number, s.email,
        COALESCE(sm.marks_obtained, 0) as marks_obtained,
        COALESCE(sm.total_marks, 100) as total_marks,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(DISTINCT CASE WHEN att.status = 'present_submitted' THEN att.id END) as submitted,
        COUNT(DISTINCT CASE WHEN att.status = 'present_not_submitted' THEN att.id END) as not_submitted,
        COUNT(DISTINCT CASE WHEN att.status = 'absent' THEN att.id END) as absent
      FROM students s
      LEFT JOIN student_marks sm ON s.id = sm.student_id
      LEFT JOIN attendance att ON s.id = att.student_id
      LEFT JOIN assignments a ON a.class_id = s.class_id
      WHERE s.class_id = $1
      GROUP BY s.id
      ORDER BY s.name ASC
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id/report', async (req, res) => {
  try {
    const student = await pool.query(`
      SELECT s.*, c.name as class_name,
        COALESCE(sm.marks_obtained, 0) as marks_obtained,
        COALESCE(sm.total_marks, 100) as total_marks
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_marks sm ON s.id = sm.student_id
      WHERE s.id = $1
    `, [req.params.id]);
    
    const attendance = await pool.query(`
      SELECT a.date, a.status, a.marks_obtained, a2.title, a2.deadline
      FROM attendance a
      LEFT JOIN assignments a2 ON a.assignment_id = a2.id
      WHERE a.student_id = $1
      ORDER BY a.date DESC
    `, [req.params.id]);
    
    res.json({ ...student.rows[0], attendance: attendance.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name
      FROM students s
      JOIN classes c ON s.class_id = c.id
      ORDER BY s.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, async () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  await initDB();
});
