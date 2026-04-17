import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function generateRandomRollNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS classes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      console.log('Tables may already exist');
    }
    dbInitialized = true;
  }
}

export async function GET(req, res) {
  await ensureDB();
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    if (path === '/api/classes') {
      const result = await pool.query(`
        SELECT c.*, COUNT(s.id) as student_count 
        FROM classes c 
        LEFT JOIN students s ON c.id = s.class_id 
        GROUP BY c.id 
        ORDER BY c.created_at DESC
      `);
      return Response.json(result.rows);
    }
    
    const studentsMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
    if (studentsMatch && req.method === 'GET') {
      const classId = studentsMatch[1];
      const result = await pool.query(`
        SELECT * FROM students WHERE class_id = $1 ORDER BY name ASC
      `, [classId]);
      return Response.json(result.rows);
    }
    
    const assignmentsMatch = path.match(/^\/api\/classes\/(\d+)\/assignments$/);
    if (assignmentsMatch && req.method === 'GET') {
      const classId = assignmentsMatch[1];
      const result = await pool.query(`
        SELECT * FROM assignments WHERE class_id = $1 ORDER BY deadline DESC
      `, [classId]);
      return Response.json(result.rows);
    }
    
    const reportMatch = path.match(/^\/api\/classes\/(\d+)\/report$/);
    if (reportMatch && req.method === 'GET') {
      const classId = reportMatch[1];
      const result = await pool.query(`
        SELECT 
          s.id, s.name, s.roll_number, s.email,
          COALESCE(sm.marks_obtained, 0) as marks_obtained,
          COALESCE(sm.total_marks, 100) as total_marks
        FROM students s
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.class_id = $1
        ORDER BY s.name ASC
      `, [classId]);
      return Response.json(result.rows);
    }
    
    const searchMatch = path.match(/^\/api\/search\/(\d+)$/);
    if (searchMatch) {
      const rollNumber = searchMatch[1];
      const result = await pool.query(`
        SELECT s.*, c.name as class_name, sm.marks_obtained, sm.total_marks
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.roll_number = $1
      `, [rollNumber]);
      return Response.json(result.rows[0] || null);
    }
    
    if (path === '/api/students' && req.method === 'GET') {
      const result = await pool.query(`
        SELECT s.*, c.name as class_name
        FROM students s
        JOIN classes c ON s.class_id = c.id
        ORDER BY s.name ASC
      `);
      return Response.json(result.rows);
    }
    
    const studentReportMatch = path.match(/^\/api\/students\/(\d+)\/report$/);
    if (studentReportMatch) {
      const studentId = studentReportMatch[1];
      const student = await pool.query(`
        SELECT s.*, c.name as class_name,
          COALESCE(sm.marks_obtained, 0) as marks_obtained,
          COALESCE(sm.total_marks, 100) as total_marks
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.id = $1
      `, [studentId]);
      
      const attendance = await pool.query(`
        SELECT a.date, a.status, a.marks_obtained, a2.title, a2.deadline
        FROM attendance a
        LEFT JOIN assignments a2 ON a.assignment_id = a2.id
        WHERE a.student_id = $1
        ORDER BY a.date DESC
      `, [studentId]);
      
      return Response.json({ ...student.rows[0], attendance: attendance.rows });
    }
    
    const attendanceMatch = path.match(/^\/api\/attendance\/([\d-]+)$/);
    if (attendanceMatch) {
      const date = attendanceMatch[1];
      const result = await pool.query(`
        SELECT a.*, s.name, s.roll_number, s.email, a2.title as assignment_title
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN assignments a2 ON a.assignment_id = a2.id
        WHERE a.date = $1
        ORDER BY s.name ASC
      `, [date]);
      return Response.json(result.rows);
    }
    
    if (path === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, res) {
  await ensureDB();
  
  const url = new URL(req.url);
  const path = url.pathname;
  const body = await req.json();
  
  try {
    if (path === '/api/classes') {
      const { name } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
      
      const result = await pool.query(`
        INSERT INTO classes (name) VALUES ($1) RETURNING *
      `, [name]);
      return Response.json({ ...result.rows[0], student_count: 0 });
    }
    
    const studentsMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
    if (studentsMatch) {
      const classId = studentsMatch[1];
      const { name, email } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
      
      const rollNumber = generateRandomRollNumber();
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const result = await client.query(`
          INSERT INTO students (class_id, name, email, roll_number) VALUES ($1, $2, $3, $4) RETURNING *
        `, [classId, name, email || null, rollNumber]);
        
        await client.query(`
          INSERT INTO student_marks (student_id, total_marks, marks_obtained) VALUES ($1, 100, 0)
        `, [result.rows[0].id]);
        
        const students = await client.query(`
          SELECT * FROM students WHERE class_id = $1 ORDER BY name ASC
        `, [classId]);
        
        await client.query('COMMIT');
        return Response.json(students.rows);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    
    const assignmentsMatch = path.match(/^\/api\/classes\/(\d+)\/assignments$/);
    if (assignmentsMatch) {
      const classId = assignmentsMatch[1];
      const { title, description, deadline } = body;
      if (!title || !deadline) {
        return Response.json({ error: 'Title and deadline required' }, { status: 400 });
      }
      
      const result = await pool.query(`
        INSERT INTO assignments (class_id, title, description, deadline) VALUES ($1, $2, $3, $4) RETURNING *
      `, [classId, title, description || null, deadline]);
      
      return Response.json({ ...result.rows[0], max_marks: 7 });
    }
    
    if (path === '/api/attendance') {
      const { studentId, assignmentId, date, status, deadlineDate } = body;
      if (!studentId || !date || !status) {
        return Response.json({ error: 'Required fields missing' }, { status: 400 });
      }
      
      let marksObtained = 0;
      let lateDays = 0;
      
      const existing = await pool.query(`
        SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND assignment_id = $3
      `, [studentId, date, assignmentId || null]);
      
      if (existing.rows.length > 0) {
        return Response.json({ error: 'Attendance already marked for this assignment on this date' }, { status: 400 });
      }
      
      if (status === 'present_submitted') {
        marksObtained = 7;
      } else if (status === 'late_submission') {
        let deadline = null;
        
        if (deadlineDate) {
          deadline = new Date(deadlineDate + 'T00:00:00');
        } else if (assignmentId) {
          const assignment = await pool.query('SELECT deadline FROM assignments WHERE id = $1', [assignmentId]);
          if (assignment.rows.length > 0) {
            deadline = new Date(assignment.rows[0].deadline + 'T00:00:00');
          }
        }
        
        const submissionDate = new Date(date + 'T00:00:00');
        
        if (deadline) {
          const diffTime = submissionDate.getTime() - deadline.getTime();
          lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          lateDays = Math.max(1, lateDays);
          const penalty = lateDays * 0.5;
          marksObtained = Math.max(0, 7 - penalty);
        } else {
          marksObtained = 7;
          lateDays = 0;
        }
      }
      
      await pool.query(`
        INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [studentId, assignmentId || null, date, status, marksObtained, lateDays]);
      
      const totalMarks = await pool.query(`
        SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = $1
      `, [studentId]);
      
      await pool.query(`
        UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
      `, [Math.min(totalMarks.rows[0].total, 100), studentId]);
      
      return Response.json({ success: true, marksObtained, lateDays });
    }
    
    if (path === '/api/attendance/bulk') {
      const { classId, assignmentId, date, status } = body;
      
      const students = await pool.query(`
        SELECT id FROM students WHERE class_id = $1
      `, [classId]);
      
      let marksObtained = status === 'present_submitted' ? 7 : 0;
      
      for (const student of students.rows) {
        const existing = await pool.query(`
          SELECT * FROM attendance WHERE student_id = $1 AND date = $2
        `, [student.id, date]);
        
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
      
      return Response.json({ success: true, count: students.rows.length });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, res) {
  await ensureDB();
  
  const url = new URL(req.url);
  const path = url.pathname;
  const body = await req.json();
  
  try {
    const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
    if (studentMatch) {
      const studentId = studentMatch[1];
      const { name, email } = body;
      
      await pool.query(`
        UPDATE students SET name = $1, email = $2 WHERE id = $3
      `, [name, email, studentId]);
      
      return Response.json({ success: true });
    }
    
    const marksMatch = path.match(/^\/api\/students\/(\d+)\/marks$/);
    if (marksMatch) {
      const studentId = marksMatch[1];
      const { marks } = body;
      
      if (marks === undefined || marks === null) {
        return Response.json({ error: 'Marks value required' }, { status: 400 });
      }
      
      const marksValue = Math.max(0, Math.min(100, Number(marks)));
      
      await pool.query(`
        UPDATE student_marks SET marks_obtained = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2
      `, [marksValue, studentId]);
      
      return Response.json({ success: true, marks_obtained: marksValue });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, res) {
  await ensureDB();
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    const classMatch = path.match(/^\/api\/classes\/(\d+)$/);
    if (classMatch) {
      const classId = classMatch[1];
      await pool.query('DELETE FROM classes WHERE id = $1', [classId]);
      return Response.json({ success: true });
    }
    
    const assignmentMatch = path.match(/^\/api\/assignments\/(\d+)$/);
    if (assignmentMatch) {
      const assignmentId = assignmentMatch[1];
      await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
      return Response.json({ success: true });
    }
    
    const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
    if (studentMatch) {
      const studentId = studentMatch[1];
      await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
      return Response.json({ success: true });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}