import { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { API_URL } from '../config';

export default function Reports() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalMarks: 0,
    avgMarks: 0,
    below50: 0,
  });

  const fetchClasses = useCallback(async () => {
    const res = await fetch(`${API_URL}/classes`);
    const data = await res.json();
    setClasses(data);
    if (data.length > 0) {
      setSelectedClass(data[0].id);
    }
  }, []);

  const fetchReport = useCallback(async (classId) => {
    const res = await fetch(`${API_URL}/classes/${classId}/report`);
    const data = await res.json();
    setReport(data);
    
    const totalStudents = data.length;
    const totalMarks = data.reduce((sum, s) => sum + (s.marks_obtained || 0), 0);
    const avgMarks = totalStudents > 0 ? (totalMarks / totalStudents).toFixed(1) : 0;
    const below50 = data.filter(s => (s.marks_obtained || 0) < 50).length;
    
    setOverallStats({ totalStudents, totalMarks, avgMarks, below50 });
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (selectedClass) {
      fetchReport(selectedClass);
    }
  }, [selectedClass, fetchReport]);

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

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>View student performance reports</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Select Class</h2>
        </div>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          style={{ maxWidth: '300px' }}
        >
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {report.length > 0 && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Students</h4>
              <div className="value">{overallStats.totalStudents}</div>
            </div>
            <div className="stat-card">
              <h4>Total Marks</h4>
              <div className="value">{overallStats.totalMarks}</div>
            </div>
            <div className="stat-card">
              <h4>Average Marks</h4>
              <div className="value">{overallStats.avgMarks}</div>
            </div>
            <div className="stat-card danger">
              <h4>Below 50 Marks</h4>
              <div className="value">{overallStats.below50}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Student Performance Report</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Submitted</th>
                  <th>Not Submitted</th>
                  <th>Absent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info">{s.roll_number}</span></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="marks-bar" style={{ width: '100px' }}>
                          <div
                            className="marks-bar-fill"
                            style={{
                              width: `${s.marks_obtained}%`,
                              background: getGradeColor(s.marks_obtained),
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {s.marks_obtained}/{s.total_marks}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: getGradeColor(s.marks_obtained), fontWeight: 700 }}>
                        {getGrade(s.marks_obtained)}
                      </span>
                    </td>
                    <td><span className="badge badge-success">{s.submitted || 0}</span></td>
                    <td><span className="badge badge-warning">{s.not_submitted || 0}</span></td>
                    <td><span className="badge badge-danger">{s.absent || 0}</span></td>
                    <td>
                      <Link to={`/search?roll=${s.roll_number}`} className="btn btn-secondary btn-sm">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {report.length === 0 && selectedClass && (
        <div className="card">
          <div className="empty-state">
            <BarChart3 size={48} />
            <p>No data available for this class</p>
          </div>
        </div>
      )}

      {!selectedClass && (
        <div className="card">
          <div className="empty-state">
            <BarChart3 size={48} />
            <p>No classes available. Create a class first.</p>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Grading System</h2>
        <table>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Marks Range</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--success)', fontWeight: 700 }}>A+</td>
              <td>90-100</td>
              <td>Excellent</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--success)', fontWeight: 700 }}>A</td>
              <td>80-89</td>
              <td>Very Good</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--warning)', fontWeight: 700 }}>B</td>
              <td>70-79</td>
              <td>Good</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--warning)', fontWeight: 700 }}>C</td>
              <td>60-69</td>
              <td>Average</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--warning)', fontWeight: 700 }}>D</td>
              <td>50-59</td>
              <td>Pass</td>
            </tr>
            <tr>
              <td style={{ color: 'var(--danger)', fontWeight: 700 }}>F</td>
              <td>Below 50</td>
              <td>Fail / Needs Improvement</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
