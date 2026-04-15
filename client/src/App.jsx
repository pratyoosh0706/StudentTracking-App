import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, FileText, ClipboardCheck, BarChart3, Search, Home, X } from 'lucide-react';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Students from './pages/Students';
import Assignments from './pages/Assignments';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import SearchPage from './pages/Search';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (path) => {
    closeSidebar();
    navigate(path);
  };

  return (
    <div className="app">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="logo">
          <GraduationCap size={28} />
          <span>Admin Panel</span>
        </div>
      </div>
      
      <div className={`sidebar-overlay ${sidebarOpen ? '' : ''}`} onClick={closeSidebar}></div>
      
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="close-sidebar" onClick={closeSidebar} style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'none'
        }}>
          <X size={24} />
        </button>
        <div className="logo">
          <GraduationCap size={32} />
          <span>Admin Panel</span>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end onClick={() => handleNavClick('/')}>
              <Home size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/classes" onClick={() => handleNavClick('/classes')}>
              <Users size={20} />
              <span>Classes</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/students" onClick={() => handleNavClick('/students')}>
              <GraduationCap size={20} />
              <span>All Students</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/assignments" onClick={() => handleNavClick('/assignments')}>
              <FileText size={20} />
              <span>Assignments</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/attendance" onClick={() => handleNavClick('/attendance')}>
              <ClipboardCheck size={20} />
              <span>Attendance</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" onClick={() => handleNavClick('/reports')}>
              <BarChart3 size={20} />
              <span>Reports</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/search" onClick={() => handleNavClick('/search')}>
              <Search size={20} />
              <span>Smart Search</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:id" element={<ClassDetail />} />
          <Route path="/students" element={<Students />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
        <footer className="footer">
          <p>Developed by Pratyoosh Shukla</p>
        </footer>
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <NavLink to="/classes" className="action-btn">Create New Class</NavLink>
            <NavLink to="/attendance" className="action-btn">Mark Attendance</NavLink>
            <NavLink to="/search" className="action-btn">Search Student</NavLink>
            <NavLink to="/reports" className="action-btn">View Reports</NavLink>
          </div>
        </div>
        <div className="dashboard-card info-card">
          <h3>How to Use</h3>
          <ol>
            <li>Create a Class first</li>
            <li>Add Students to the class</li>
            <li>Create Assignments with deadlines</li>
            <li>Mark attendance with assignment submission</li>
            <li>Track student progress via Reports</li>
          </ol>
        </div>
        <div className="dashboard-card info-card">
          <h3>Scoring System</h3>
          <ul>
            <li><strong>Present + Submitted:</strong> +7 marks</li>
            <li><strong>Present + Not Submitted:</strong> -0.5 per day late</li>
            <li><strong>Absent:</strong> 0 marks (after 2 consecutive: -0.5)</li>
            <li><strong>Maximum:</strong> 100 marks/year</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
