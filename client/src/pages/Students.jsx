import { useState, useEffect } from 'react';
import { GraduationCap, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
      setStudents(data);
    } catch {
      console.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    await fetch(`${API_URL}/students/${studentId}`, { method: 'DELETE' });
    fetchStudents();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>All Students</h1>
        <p>View and manage all students across classes</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Student List ({students.length})</h2>
        </div>

        {students.length === 0 ? (
          <div className="empty-state">
            <GraduationCap size={48} />
            <p>No students yet. Create a class first, then add students.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Class</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td><span className="badge badge-info">{student.roll_number}</span></td>
                  <td><strong>{student.name}</strong></td>
                  <td>{student.email || '-'}</td>
                  <td>{student.class_name}</td>
                  <td>
                    <Link to={`/search?roll=${student.roll_number}`} className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }}>
                      View
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(student.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
