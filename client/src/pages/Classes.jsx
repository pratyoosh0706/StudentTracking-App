import { useState, useEffect } from 'react';
import { Plus, Users, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newClass, setNewClass] = useState('');

  const fetchClasses = async () => {
    const res = await fetch(`${API_URL}/classes`);
    const data = await res.json();
    setClasses(data);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.trim()) return;

    try {
      const res = await fetch(`${API_URL}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClass }),
      });

      if (res.ok) {
        const data = await res.json();
        setClasses([data, ...classes]);
        setNewClass('');
        setShowModal(false);
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch {
      alert('Failed to create class');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure? This will delete all students and assignments in this class.')) return;

    await fetch(`${API_URL}/classes/${id}`, { method: 'DELETE' });
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Classes</h1>
        <p>Manage your classes and their students</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Classes</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Class
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No classes yet. Create your first class to get started.</p>
          </div>
        ) : (
          <div className="class-list">
            {classes.map(cls => (
              <div key={cls.id} className="class-card">
                <div>
                  <h3>{cls.name}</h3>
                  <p>{cls.student_count} student{cls.student_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="class-actions">
                  <Link to={`/classes/${cls.id}`} className="btn btn-primary btn-sm">
                    Manage <ArrowRight size={16} />
                  </Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClass(cls.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Class</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  value={newClass}
                  onChange={e => setNewClass(e.target.value)}
                  placeholder="e.g., Class 10-A"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Class
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
