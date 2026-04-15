import { Pool } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Initialize database tables
async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      roll_number TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, roll_number)
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline TIMESTAMP NOT NULL,
      max_marks INTEGER DEFAULT 7,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      assignment_id INTEGER,
      date DATE NOT NULL,
      status TEXT NOT NULL,
      marks_obtained REAL DEFAULT 0,
      late_days INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS student_marks (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      total_marks REAL DEFAULT 100,
      marks_obtained REAL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

function generateRandomRollNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Initialize DB on first request
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

export async function GET(req, res) {
  await ensureDB();
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    // /api/classes
    if (path === '/api/classes') {
      const classes = await sql`
        SELECT c.*, COUNT(s.id) as student_count 
        FROM classes c 
        LEFT JOIN students s ON c.id = s.class_id 
        GROUP BY c.id 
        ORDER BY c.created_at DESC
      `;
      return Response.json(classes);
    }
    
    // /api/classes/:id/students
    const studentsMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
    if (studentsMatch && req.method === 'GET') {
      const classId = studentsMatch[1];
      const students = await sql`
        SELECT * FROM students WHERE class_id = ${classId} ORDER BY name ASC
      `;
      return Response.json(students);
    }
    
    // /api/classes/:id/assignments
    const assignmentsMatch = path.match(/^\/api\/classes\/(\d+)\/assignments$/);
    if (assignmentsMatch && req.method === 'GET') {
      const classId = assignmentsMatch[1];
      const assignments = await sql`
        SELECT * FROM assignments WHERE class_id = ${classId} ORDER BY deadline DESC
      `;
      return Response.json(assignments);
    }
    
    // /api/classes/:id/report
    const reportMatch = path.match(/^\/api\/classes\/(\d+)\/report$/);
    if (reportMatch && req.method === 'GET') {
      const classId = reportMatch[1];
      const report = await sql`
        SELECT 
          s.id, s.name, s.roll_number, s.email,
          COALESCE(sm.marks_obtained, 0) as marks_obtained,
          COALESCE(sm.total_marks, 100) as total_marks
        FROM students s
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.class_id = ${classId}
        ORDER BY s.name ASC
      `;
      return Response.json(report);
    }
    
    // /api/search/:rollNumber
    const searchMatch = path.match(/^\/api\/search\/(\d+)$/);
    if (searchMatch) {
      const rollNumber = searchMatch[1];
      const student = await sql`
        SELECT s.*, c.name as class_name, sm.marks_obtained, sm.total_marks
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.roll_number = ${rollNumber}
      `;
      return Response.json(student[0] || null);
    }
    
    // /api/students
    if (path === '/api/students' && req.method === 'GET') {
      const students = await sql`
        SELECT s.*, c.name as class_name
        FROM students s
        JOIN classes c ON s.class_id = c.id
        ORDER BY s.name ASC
      `;
      return Response.json(students);
    }
    
    // /api/students/:id/report
    const studentReportMatch = path.match(/^\/api\/students\/(\d+)\/report$/);
    if (studentReportMatch) {
      const studentId = studentReportMatch[1];
      const student = await sql`
        SELECT s.*, c.name as class_name,
          COALESCE(sm.marks_obtained, 0) as marks_obtained,
          COALESCE(sm.total_marks, 100) as total_marks
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN student_marks sm ON s.id = sm.student_id
        WHERE s.id = ${studentId}
      `;
      
      const attendance = await sql`
        SELECT a.date, a.status, a.marks_obtained, a2.title, a2.deadline
        FROM attendance a
        LEFT JOIN assignments a2 ON a.assignment_id = a2.id
        WHERE a.student_id = ${studentId}
        ORDER BY a.date DESC
      `;
      
      return Response.json({ ...student[0], attendance });
    }
    
    // /api/attendance/:date
    const attendanceMatch = path.match(/^\/api\/attendance\/([\d-]+)$/);
    if (attendanceMatch) {
      const date = attendanceMatch[1];
      const attendance = await sql`
        SELECT a.*, s.name, s.roll_number, s.email, a2.title as assignment_title
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN assignments a2 ON a.assignment_id = a2.id
        WHERE a.date = ${date}
        ORDER BY s.name ASC
      `;
      return Response.json(attendance);
    }
    
    // /api/health
    if (path === '/api/health') {
      return Response.json({ status: 'ok' });
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
    // /api/classes
    if (path === '/api/classes') {
      const { name } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
      
      try {
        const result = await sql`
          INSERT INTO classes (name) VALUES (${name}) RETURNING *
        `;
        return Response.json({ ...result[0], student_count: 0 });
      } catch (e) {
        if (e.message?.includes('duplicate')) {
          return Response.json({ error: 'Class already exists' }, { status: 400 });
        }
        throw e;
      }
    }
    
    // /api/classes/:id/students
    const studentsMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
    if (studentsMatch) {
      const classId = studentsMatch[1];
      const { name, email } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
      
      const rollNumber = generateRandomRollNumber();
      
      const result = await sql`
        INSERT INTO students (class_id, name, email, roll_number) 
        VALUES (${classId}, ${name}, ${email || null}, ${rollNumber}) 
        RETURNING *
      `;
      
      await sql`
        INSERT INTO student_marks (student_id, total_marks, marks_obtained) 
        VALUES (${result[0].id}, 100, 0)
      `;
      
      const students = await sql`
        SELECT * FROM students WHERE class_id = ${classId} ORDER BY name ASC
      `;
      
      return Response.json(students);
    }
    
    // /api/classes/:id/assignments
    const assignmentsMatch = path.match(/^\/api\/classes\/(\d+)\/assignments$/);
    if (assignmentsMatch) {
      const classId = assignmentsMatch[1];
      const { title, description, deadline } = body;
      if (!title || !deadline) {
        return Response.json({ error: 'Title and deadline required' }, { status: 400 });
      }
      
      const result = await sql`
        INSERT INTO assignments (class_id, title, description, deadline) 
        VALUES (${classId}, ${title}, ${description || null}, ${deadline}) 
        RETURNING *
      `;
      
      return Response.json({ ...result[0], max_marks: 7 });
    }
    
    // /api/attendance
    if (path === '/api/attendance') {
      const { studentId, assignmentId, date, status } = body;
      if (!studentId || !date || !status) {
        return Response.json({ error: 'Required fields missing' }, { status: 400 });
      }
      
      let marksObtained = 0;
      if (status === 'present_submitted') {
        marksObtained = 7;
      }
      
      const existing = await sql`
        SELECT * FROM attendance WHERE student_id = ${studentId} AND date = ${date}
      `;
      
      if (existing.length > 0) {
        await sql`
          UPDATE attendance 
          SET assignment_id = ${assignmentId || null}, status = ${status}, 
              marks_obtained = ${marksObtained}, late_days = 0
          WHERE id = ${existing[0].id}
        `;
      } else {
        await sql`
          INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
          VALUES (${studentId}, ${assignmentId || null}, ${date}, ${status}, ${marksObtained}, 0)
        `;
      }
      
      const totalMarks = await sql`
        SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = ${studentId}
      `;
      
      await sql`
        UPDATE student_marks 
        SET marks_obtained = ${Math.min(totalMarks[0].total, 100)}, updated_at = NOW()
        WHERE student_id = ${studentId}
      `;
      
      return Response.json({ success: true, marksObtained });
    }
    
    // /api/attendance/bulk
    if (path === '/api/attendance/bulk') {
      const { classId, assignmentId, date, status } = body;
      
      const students = await sql`
        SELECT id FROM students WHERE class_id = ${classId}
      `;
      
      let marksObtained = status === 'present_submitted' ? 7 : 0;
      
      for (const student of students) {
        await sql`
          INSERT INTO attendance (student_id, assignment_id, date, status, marks_obtained, late_days)
          VALUES (${student.id}, ${assignmentId || null}, ${date}, ${status}, ${marksObtained}, 0)
        `;
        
        const totalMarks = await sql`
          SELECT COALESCE(SUM(marks_obtained), 0) as total FROM attendance WHERE student_id = ${student.id}
        `;
        
        await sql`
          UPDATE student_marks 
          SET marks_obtained = ${Math.min(totalMarks[0].total, 100)}, updated_at = NOW()
          WHERE student_id = ${student.id}
        `;
      }
      
      return Response.json({ success: true, count: students.length });
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
    // /api/students/:id
    const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
    if (studentMatch) {
      const studentId = studentMatch[1];
      const { name, email } = body;
      
      await sql`
        UPDATE students SET name = ${name}, email = ${email} WHERE id = ${studentId}
      `;
      
      return Response.json({ success: true });
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
    // /api/classes/:id
    const classMatch = path.match(/^\/api\/classes\/(\d+)$/);
    if (classMatch) {
      const classId = classMatch[1];
      await sql`DELETE FROM classes WHERE id = ${classId}`;
      return Response.json({ success: true });
    }
    
    // /api/students/:id
    const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
    if (studentMatch) {
      const studentId = studentMatch[1];
      await sql`DELETE FROM students WHERE id = ${studentId}`;
      return Response.json({ success: true });
    }
    
    // /api/assignments/:id
    const assignmentMatch = path.match(/^\/api\/assignments\/(\d+)$/);
    if (assignmentMatch) {
      const assignmentId = assignmentMatch[1];
      await sql`DELETE FROM assignments WHERE id = ${assignmentId}`;
      return Response.json({ success: true });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
