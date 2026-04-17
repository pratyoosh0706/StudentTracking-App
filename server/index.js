const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nprogress = require('nprogress');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

nprogress.configure({ showSpinner: false, trickleSpeed: 100 });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  nprogress.start();
  res.on('finish', () => {
    nprogress.done();
  });
  next();
});

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
    
    const rollNumber = String(Math.floor(1000 + Math.random() * 9000));
    
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

app.put('/api/students/:id/marks', async (req, res) => {
  try {
    const { marks } = req.body;
    
    if (marks === undefined || marks === null) {
      return res.status(400).json({ error: 'Marks value required' });
    }
    
    const marksValue = Math.max(0, Math.min(100, Number(marks)));
    
    await pool.query(
      'UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2',
      [marksValue, req.params.id]
    );
    
    res.json({ success: true, marks_obtained: marksValue });
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
    const { studentId, assignmentId, date, status, deadlineDate } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Student ID, date, and status required' });
    }
    
    let marksObtained = 0;
    let lateDays = 0;
    
    // Check for existing attendance with the same student, date, and assignment
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND assignment_id = $3',
      [studentId, date, assignmentId || null]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Attendance already marked for this assignment on this date. Cannot submit again.' 
      });
    }
    
    if (status === 'present_submitted') {
      marksObtained = 7;
    } else if (status === 'late_submission') {
      // Late submission - use deadlineDate if provided, otherwise use assignment deadline
      let deadline = null;
      
      if (deadlineDate) {
        deadline = new Date(deadlineDate);
      } else if (assignmentId) {
        const assignment = await pool.query('SELECT deadline FROM assignments WHERE id = $1', [assignmentId]);
        if (assignment.rows.length > 0) {
          deadline = new Date(assignment.rows[0].deadline);
        }
      }
      
      const submissionDate = new Date(date);
      
      if (deadline) {
        const diffTime = submissionDate - deadline;
        lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        lateDays = Math.max(1, lateDays); // Minimum 1 day late
        const penalty = lateDays * 0.5;
        marksObtained = Math.max(0, 7 - penalty);
      } else {
        // No deadline available
        marksObtained = 7;
        lateDays = 0;
      }
    }
    
    const res2 = await pool.query(`
      INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [studentId, assignmentId || null, date, status, marksObtained, lateDays]);
    
    // Calculate total marks capped at 100
    const totalMarks = await pool.query(`
      SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = $1
    `, [studentId]);
    
    await pool.query(`
      UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
    `, [Math.min(totalMarks.rows[0].total, 100), studentId]);
    
    res.json({ success: true, marksObtained, lateDays });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { classId, assignmentId, date, status, deadlineDate } = req.body;
    
    if (!classId || !date || !status) {
      return res.status(400).json({ error: 'Class ID, date, and status required' });
    }
    
    const students = await pool.query('SELECT id FROM students WHERE class_id = $1', [classId]);
    
    let lateDays = 0;
    let marksObtained = 0;
    
    if (status === 'present_submitted') {
      marksObtained = 7;
    } else if (status === 'late_submission') {
      let deadline = null;
      
      if (deadlineDate) {
        deadline = new Date(deadlineDate);
      } else if (assignmentId) {
        const assignment = await pool.query('SELECT deadline FROM assignments WHERE id = $1', [assignmentId]);
        if (assignment.rows.length > 0) {
          deadline = new Date(assignment.rows[0].deadline);
        }
      }
      
      const submissionDate = new Date(date);
      
      if (deadline) {
        const diffTime = submissionDate - deadline;
        lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        lateDays = Math.max(1, lateDays);
        const penalty = lateDays * 0.5;
        marksObtained = Math.max(0, 7 - penalty);
      } else {
        marksObtained = 7;
        lateDays = 0;
      }
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const student of students.rows) {
      // Check for existing attendance
      const existing = await pool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND assignment_id = $3',
        [student.id, date, assignmentId || null]
      );
      
      if (existing.rows.length > 0) {
        skippedCount++;
        continue;
      }
      
      await pool.query(`
        INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [student.id, assignmentId || null, date, status, marksObtained, lateDays]);
      
      updatedCount++;
      
      // Calculate total marks capped at 100
      const totalMarks = await pool.query(`
        SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = $1
      `, [student.id]);
      
      await pool.query(`
        UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
      `, [Math.min(totalMarks.rows[0].total, 100), student.id]);
    }
    
    res.json({ 
      success: true, 
      count: students.rows.length,
      updated: updatedCount,
      skipped: skippedCount,
      marksPerStudent: marksObtained,
      lateDays: lateDays
    });
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
        COUNT(DISTINCT CASE WHEN att.status = 'late_submission' THEN att.id END) as not_submitted,
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

// Start server with error handling
async function startServer() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');
  } catch (err) {
    console.error('DB connection failed:', err.message);
  }
  
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();