import { useState, useEffect } from 'react';
import { Plus, Users, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newClass, setNewClass] = useState('');

  const fetchClasses = async () => {
    setLoading(true);
    const data = await api.get('/classes');
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.trim()) return;

    try {
      const data = await api.post('/classes', { name: newClass });
      setClasses([data, ...classes]);
      setNewClass('');
      setShowModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure? This will delete all students and assignments in this class.')) return;
    await api.delete(`/classes/${id}`);
    setClasses(classes.filter(c => c.id !== id));
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
            <h3>No Classes Yet</h3>
            <p>Create your first class to get started.</p>
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
