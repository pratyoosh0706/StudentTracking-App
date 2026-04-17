import { useState, useEffect } from 'react';
import { FileText, Trash2, Calendar } from 'lucide-react';
import { api } from '../api';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      const classes = await api.get('/classes');
      const allAssignments = [];
      
      for (const cls of classes) {
        const data = await api.get(`/classes/${cls.id}/assignments`);
        data.forEach(a => {
          allAssignments.push({ ...a, class_name: cls.name });
        });
      }
      
      allAssignments.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
      setAssignments(allAssignments);
      setLoading(false);
    };
    fetchAssignments();
  }, []);

  const handleDelete = async (assignmentId) => {
    if (!confirm('Are you sure?')) return;
    await api.delete(`/assignments/${assignmentId}`);
    setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner loading-spinner-lg"></div>
      </div>
    );
  }

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
            <h3>No Assignments Yet</h3>
            <p>Create a class first, then add assignments.</p>
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
