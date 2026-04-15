import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Mail, Calendar, FileText, Check, X, AlertTriangle } from 'lucide-react';

import { API_URL } from '../config';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [rollNumber, setRollNumber] = useState(searchParams.get('roll') || '');
  const [student, setStudent] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSearch = useCallback(async (roll) => {
    if (roll.length !== 4) {
      setMessage('Please enter a 4-digit roll number');
      setStudent(null);
      setReport(null);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const studentRes = await fetch(`${API_URL}/search/${roll}`);
      const studentData = await studentRes.json();

      if (studentData) {
        setStudent(studentData);
        
        const reportRes = await fetch(`${API_URL}/students/${studentData.id}/report`);
        const reportData = await reportRes.json();
        setReport(reportData);
      } else {
        setStudent(null);
        setReport(null);
        setMessage('Student not found with this roll number');
      }
    } catch {
      setMessage('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const roll = searchParams.get('roll');
    if (roll) {
      setRollNumber(roll);
      handleSearch(roll);
    }
  }, [searchParams, handleSearch]);

  const getGrade = (marks) => {
    if (marks >= 90) return 'A+';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 50) return 'D';
    return 'F';
  };

  const getGradeColor = (marks) => {
    if (marks >= 70) return 'var(--success)';
    if (marks >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present_submitted':
        return <Check size={16} color="var(--success)" />;
      case 'present_not_submitted':
        return <AlertTriangle size={16} color="var(--warning)" />;
      case 'absent':
        return <X size={16} color="var(--danger)" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present_submitted':
        return 'Submitted';
      case 'present_not_submitted':
        return 'Not Submitted';
      case 'absent':
        return 'Absent';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Smart Search</h1>
        <p>Find any student by their 4-digit roll number</p>
      </div>

      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(rollNumber); }}>
          <div className="search-box">
            <Search size={24} />
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
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search Student'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: '#fee2e2', 
            borderRadius: '8px', 
            color: '#991b1b',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>

      {student && report && (
        <>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="student-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{student.name}</h2>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)' }}>
                  <span className="badge badge-info" style={{ fontSize: '14px' }}>#{student.roll_number}</span>
                  <span>{student.class_name}</span>
                </p>
                {student.email && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', marginTop: '8px' }}>
                    <Mail size={16} />
                    {student.email}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: 700, 
                  color: getGradeColor(report.marks_obtained) 
                }}>
                  {getGrade(report.marks_obtained)}
                </div>
                <div className="marks-display" style={{ marginTop: '8px' }}>
                  {report.marks_obtained}/{report.total_marks} marks
                </div>
              </div>
            </div>

            <div className="marks-bar" style={{ marginTop: '24px', height: '12px' }}>
              <div
                className="marks-bar-fill"
                style={{
                  width: `${report.marks_obtained}%`,
                  background: getGradeColor(report.marks_obtained),
                }}
              />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card success">
              <h4>Submitted</h4>
              <div className="value">
                {report.attendance?.filter(a => a.status === 'present_submitted').length || 0}
              </div>
            </div>
            <div className="stat-card warning">
              <h4>Not Submitted</h4>
              <div className="value">
                {report.attendance?.filter(a => a.status === 'present_not_submitted').length || 0}
              </div>
            </div>
            <div className="stat-card danger">
              <h4>Absent</h4>
              <div className="value">
                {report.attendance?.filter(a => a.status === 'absent').length || 0}
              </div>
            </div>
            <div className="stat-card">
              <h4>Total Lectures</h4>
              <div className="value">{report.attendance?.length || 0}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Attendance History</h2>
            </div>
            
            {report.attendance && report.attendance.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Assignment</th>
                    <th>Status</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {report.attendance.map((a, index) => (
                    <tr key={index}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={16} />
                          {new Date(a.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>{a.title || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStatusIcon(a.status)}
                          {getStatusLabel(a.status)}
                        </div>
                      </td>
                      <td>
                        {a.marks_obtained > 0 ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            +{a.marks_obtained}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--danger)' }}>0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <FileText size={48} />
                <p>No attendance records found</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Performance Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Total Marks Obtained</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{report.marks_obtained}</p>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Total Marks Available</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{report.total_marks}</p>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Percentage</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {((report.marks_obtained / report.total_marks) * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Grade</h4>
                <p style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 700,
                  color: getGradeColor(report.marks_obtained)
                }}>
                  {getGrade(report.marks_obtained)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
