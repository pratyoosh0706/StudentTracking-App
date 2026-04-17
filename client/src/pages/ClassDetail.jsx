import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, FileText, Calendar } from 'lucide-react';
import { api } from '../api';

export default function ClassDetail() {
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', email: '' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', deadline: '' });
  const [bulkStatus, setBulkStatus] = useState('present_submitted');
  const [bulkAssignment, setBulkAssignment] = useState('');

  const fetchClass = async () => {
    const data = await api.get('/classes');
    const cls = data.find(c => c.id === parseInt(id));
    setClassData(cls);
  };

  const fetchStudents = async () => {
    const data = await api.get(`/classes/${id}/students`);
    setStudents(data);
  };

  const fetchAssignments = async () => {
    const data = await api.get(`/classes/${id}/assignments`);
    setAssignments(data);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClass(), fetchStudents(), fetchAssignments()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim()) return;

    try {
      const data = await api.post(`/classes/${id}/students`, studentForm);
      setStudents(data);
      setStudentForm({ name: '', email: '' });
      setShowStudentModal(false);
      fetchClass();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure?')) return;
    await api.delete(`/students/${studentId}`);
    fetchStudents();
    fetchClass();
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title || !assignmentForm.deadline) return;

    try {
      const data = await api.post(`/classes/${id}/assignments`, assignmentForm);
      setAssignments([data, ...assignments]);
      setAssignmentForm({ title: '', description: '', deadline: '' });
      setShowAssignmentModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure?')) return;
    await api.delete(`/assignments/${assignmentId}`);
    setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  const handleBulkAttendance = async (e) => {
    e.preventDefault();
    
    const today = new Date().toISOString().split('T')[0];
    await api.post('/attendance/bulk', {
      classId: id,
      assignmentId: bulkAssignment || null,
      date: today,
      status: bulkStatus,
    });

    alert('Bulk attendance marked successfully!');
    setShowBulkModal(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner loading-spinner-lg"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="empty-state">
        <h3>Class not found</h3>
        <Link to="/classes" className="btn btn-primary">Back to Classes</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/classes" className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Classes
      </Link>

      <div className="page-header">
        <h1>{classData.name}</h1>
        <p>{students.length} students | {assignments.length} assignments</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
          <Users size={18} /> Students
        </button>
        <button className={`tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
          <FileText size={18} /> Assignments
        </button>
        <button className={`tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          Mark Attendance
        </button>
      </div>

      {activeTab === 'students' && (
        <div className="card">
          <div className="card-header">
            <h2>Students</h2>
            <button className="btn btn-primary" onClick={() => setShowStudentModal(true)}>
              <Plus size={18} /> Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>No Students Yet</h3>
              <p>Add your first student to this class.</p>
            </div>
          ) : (
            students.map(student => (
              <div key={student.id} className="student-card">
                <div className="student-avatar">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="student-info">
                  <h4>{student.name}</h4>
                  <p>{student.email || 'No email'}</p>
                </div>
                <div className="student-roll">#{student.roll_number}</div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(student.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="card">
          <div className="card-header">
            <h2>Assignments</h2>
            <button className="btn btn-primary" onClick={() => setShowAssignmentModal(true)}>
              <Plus size={18} /> Create Assignment
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Assignments Yet</h3>
              <p>Create your first assignment for this class.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Deadline</th>
                  <th>Marks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      {a.description && <p style={{ color: '#64748b', fontSize: '13px' }}>{a.description}</p>}
                    </td>
                    <td>{new Date(a.deadline).toLocaleDateString()}</td>
                    <td><span className="badge badge-info">{a.max_marks} marks</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAssignment(a.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h2>Mark Attendance</h2>
            <button className="btn btn-primary" onClick={() => setShowBulkModal(true)}>
              <Plus size={18} /> Bulk Mark
            </button>
          </div>
          <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
            Use Smart Search to mark individual attendance, or use Bulk Mark to mark all students at once.
          </p>
          <Link to="/attendance" className="btn btn-secondary">
            Go to Attendance Page
          </Link>
        </div>
      )}

      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Student</h2>
              <button className="close-btn" onClick={() => setShowStudentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-group">
                <label>Student Name *</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="Enter student name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="student@example.com"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Add Student
              </button>
            </form>
          </div>
        </div>
      )}

      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Assignment</h2>
              <button className="close-btn" onClick={() => setShowAssignmentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="Assignment title"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={e => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  placeholder="Assignment description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Deadline *</label>
                <input
                  type="datetime-local"
                  value={assignmentForm.deadline}
                  onChange={e => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Mark Attendance</h2>
              <button className="close-btn" onClick={() => setShowBulkModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleBulkAttendance}>
              <div className="form-group">
                <label>Assignment (Optional)</label>
                <select value={bulkAssignment} onChange={e => setBulkAssignment(e.target.value)}>
                  <option value="">-- Select Assignment --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <div className="status-options">
                  <div
                    className={`status-option submitted ${bulkStatus === 'present_submitted' ? 'selected' : ''}`}
                    onClick={() => setBulkStatus('present_submitted')}
                  >
                    Present + Submitted
                    <br /><small>+7 marks</small>
                  </div>
                  <div
                    className={`status-option not-submitted ${bulkStatus === 'present_not_submitted' ? 'selected' : ''}`}
                    onClick={() => setBulkStatus('present_not_submitted')}
                  >
                    Present + Not Submitted
                    <br /><small>-0.5/day</small>
                  </div>
                  <div
                    className={`status-option absent ${bulkStatus === 'absent' ? 'selected' : ''}`}
                    onClick={() => setBulkStatus('absent')}
                  >
                    Absent
                    <br /><small>0 marks</small>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Mark All {students.length} Students
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
