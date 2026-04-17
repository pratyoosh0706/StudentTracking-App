import { useState, useEffect } from 'react';
import { Search, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../api';

export default function Attendance() {
  const [rollNumber, setRollNumber] = useState('');
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('present_submitted');
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lateDeadline, setLateDeadline] = useState('');
  const [lateSubmissionDate, setLateSubmissionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const fetchRecent = async () => {
      const data = await api.get(`/attendance/${today}`).catch(() => []);
      setRecentAttendance(data);
    };
    fetchRecent();
  }, []);

  const handleSearch = async () => {
    if (rollNumber.length !== 4) {
      setMessage('Please enter a 4-digit roll number');
      setStudent(null);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const data = await api.get(`/search/${rollNumber}`);

      if (data) {
        setStudent(data);
        setSelectedAssignment('');
        
        const assignmentsData = await api.get(`/classes/${data.class_id}/assignments`);
        setAssignments(assignmentsData);
      } else {
        setStudent(null);
        setMessage('Student not found');
      }
    } catch {
      setStudent(null);
      setMessage('Student not found');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    
    if (!student || !date) return;

    let submissionDate = date;
    let deadlineDate = lateDeadline;

    if (status === 'late_submission') {
      submissionDate = lateSubmissionDate;
      deadlineDate = lateDeadline;
      
      if (!submissionDate || !deadlineDate) {
        alert('Please enter both Submission Date and Deadline Date for late submission');
        return;
      }
    }

    try {
      const result = await api.post('/attendance', {
        studentId: student.id,
        assignmentId: selectedAssignment || null,
        date: submissionDate,
        deadlineDate: deadlineDate,
        status,
      });

      if (status === 'late_submission' && result.lateDays > 0) {
        alert(`Late submission recorded! ${result.lateDays} day(s) late, ${result.marksObtained.toFixed(1)} marks awarded`);
      } else if (status === 'late_submission') {
        alert(`Submission recorded! ${result.marksObtained.toFixed(1)} marks awarded`);
      } else {
        alert(`Attendance marked! ${result.marksObtained > 0 ? `+${result.marksObtained} marks` : 'No marks'}`);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = await api.get(`/attendance/${today}`);
      setRecentAttendance(attendanceData);
      
      setStudent(null);
      setRollNumber('');
      setSelectedAssignment('');
      setStatus('present_submitted');
      setLateDeadline('');
      setLateSubmissionDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Attendance</h1>
        <p>Mark attendance with smart search by roll number</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Mark Individual Attendance</h2>
          
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Enter 4-digit roll number (e.g., 0001)"
              value={rollNumber}
              onChange={e => setRollNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              autoFocus
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '12px' }}
            onClick={handleSearch}
            disabled={loading}
          >
            <Search size={18} /> {loading ? 'Searching...' : 'Search Student'}
          </button>

          {message && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#991b1b' }}>
              {message}
            </div>
          )}

          {student && (
            <div className="search-result" style={{ marginTop: '20px' }}>
              <h4>{student.name}</h4>
              <p><strong>Roll:</strong> {student.roll_number}</p>
              <p><strong>Class:</strong> {student.class_name}</p>
              <p><strong>Email:</strong> {student.email || 'N/A'}</p>
              <div className="marks-display" style={{ marginTop: '12px' }}>
                Marks: {student.marks_obtained || 0}/{student.total_marks || 100}
              </div>
            </div>
          )}

          {student && (
            <form onSubmit={handleMarkAttendance} style={{ marginTop: '20px' }}>
              {status === 'late_submission' ? (
                <>
                  <div className="form-group">
                    <label>Submission Date</label>
                    <input
                      type="date"
                      value={lateSubmissionDate}
                      onChange={e => setLateSubmissionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Deadline Date</label>
                    <input
                      type="date"
                      value={lateDeadline}
                      onChange={e => setLateDeadline(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Assignment (Optional)</label>
                <select value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)}>
                  <option value="">-- Select Assignment --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} (Due: {new Date(a.deadline).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-options">
                  <div
                    className={`status-option submitted ${status === 'present_submitted' ? 'selected' : ''}`}
                    onClick={() => setStatus('present_submitted')}
                  >
                    <Check size={20} style={{ margin: '0 auto 4px' }} />
                    On Time
                    <br /><small>+7 marks</small>
                  </div>
                  <div
                    className={`status-option not-submitted ${status === 'late_submission' ? 'selected' : ''}`}
                    onClick={() => setStatus('late_submission')}
                  >
                    <Clock size={20} style={{ margin: '0 auto 4px' }} />
                    Late Submission
                    <br /><small>-0.5/day</small>
                  </div>
                  <div
                    className={`status-option absent ${status === 'absent' ? 'selected' : ''}`}
                    onClick={() => setStatus('absent')}
                  >
                    <X size={20} style={{ margin: '0 auto 4px' }} />
                    Absent
                    <br /><small>0 marks</small>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '16px' }}>
                Mark Attendance
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Today's Attendance ({date})</h2>
          
          {recentAttendance.length === 0 ? (
            <div className="empty-state">
              <p>No attendance marked today</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Assignment</th>
                  <th>Status</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map(a => (
                  <tr key={a.id}>
                    <td>{a.roll_number}</td>
                    <td>{a.name}</td>
                    <td>{a.assignment_title || '-'}</td>
                    <td>
                      {a.status === 'present_submitted' && (
                        <span className="badge badge-success">On Time</span>
                      )}
                      {a.status === 'late_submission' && (
                        <span className="badge badge-warning">Late</span>
                      )}
                      {a.status === 'absent' && (
                        <span className="badge badge-danger">Absent</span>
                      )}
                    </td>
                    <td>{a.marks_obtained > 0 ? `+${a.marks_obtained}` : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Attendance Rules</h2>
        <ul style={{ color: 'var(--text-light)', paddingLeft: '20px' }}>
          <li><strong>On Time Submission:</strong> Full marks (+7) if submitted before or on deadline</li>
          <li><strong>Late Submission:</strong> Enter submission date and deadline date. Days late × 0.5 = marks deducted from 7</li>
          <li><strong>Absent:</strong> 0 marks</li>
          <li><strong>Maximum marks:</strong> 100 per year (cap applied)</li>
          <li><strong>No duplicates:</strong> Cannot submit the same assignment twice</li>
        </ul>
      </div>
    </div>
  );
}
