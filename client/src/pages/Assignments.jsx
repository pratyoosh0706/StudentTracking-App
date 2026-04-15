import { useState, useEffect } from 'react';
import { FileText, Trash2, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      const classesRes = await fetch(`${API_URL}/classes`);
      const classes = await classesRes.json();
      
      const allAssignments = [];
      for (const cls of classes) {
        const res = await fetch(`${API_URL}/classes/${cls.id}/assignments`);
        const data = await res.json();
        data.forEach(a => {
          allAssignments.push({ ...a, class_name: cls.name });
        });
      }
      
      allAssignments.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
      setAssignments(allAssignments);
    } catch {
      console.error('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDelete = async (assignmentId) => {
    if (!confirm('Are you sure?')) return;

    await fetch(`${API_URL}/assignments/${assignmentId}`, { method: 'DELETE' });
    fetchAssignments();
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>All Assignments</h1>
        <p>View all assignments across classes</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Assignment List ({assignments.length})</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No assignments yet. Create a class first, then add assignments.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Class</th>
                <th>Deadline</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    {a.description && (
                      <p style={{ color: '#64748b', fontSize: '13px' }}>{a.description}</p>
                    )}
                  </td>
                  <td>{a.class_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      {new Date(a.deadline).toLocaleDateString()}
                    </div>
                  </td>
                  <td><span className="badge badge-info">{a.max_marks} marks</span></td>
                  <td>
                    {isOverdue(a.deadline) ? (
                      <span className="badge badge-danger">Overdue</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>
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
