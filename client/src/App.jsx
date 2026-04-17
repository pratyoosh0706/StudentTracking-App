import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Users, FileText, ClipboardCheck, BarChart3, Search, Home, X, LayoutDashboard } from 'lucide-react';

const Classes = lazy(() => import('./pages/Classes'));
const ClassDetail = lazy(() => import('./pages/ClassDetail'));
const Students = lazy(() => import('./pages/Students'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Reports = lazy(() => import('./pages/Reports'));
const SearchPage = lazy(() => import('./pages/Search'));

import './App.css';

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="loading-spinner loading-spinner-lg"></div>
      <p style={{ color: 'var(--text-light)' }}>Loading...</p>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (path) => {
    closeSidebar();
    navigate(path);
  };

  const getActiveNav = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/classes')) return 'classes';
    if (path === '/students') return 'students';
    if (path === '/assignments') return 'assignments';
    if (path === '/attendance') return 'attendance';
    if (path === '/reports') return 'reports';
    if (path === '/search') return 'search';
    return 'dashboard';
  };

  const bottomNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/classes', icon: Users, label: 'Classes' },
    { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/search', icon: Search, label: 'Search' },
  ];

  return (
    <div className="app">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="logo">
          <GraduationCap size={26} />
          <span>Admin</span>
        </div>
      </div>
      
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
      
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="close-sidebar" onClick={closeSidebar}>
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
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
        <footer className="footer">
          <p>Developed by Pratyoosh Shukla</p>
        </footer>
      </main>

      <nav className="bottom-nav">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = getActiveNav() === item.path.replace('/', '') || 
            (item.path === '/' && location.pathname === '/');
          return (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={isActive ? 'active' : ''}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your activities.</p>
      </div>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>
            <LayoutDashboard size={20} />
            Quick Actions
          </h3>
          <div className="quick-actions">
            <NavLink to="/classes" className="action-btn">
              <Users size={18} />
              Create New Class
            </NavLink>
            <NavLink to="/attendance" className="action-btn">
              <ClipboardCheck size={18} />
              Mark Attendance
            </NavLink>
            <NavLink to="/search" className="action-btn">
              <Search size={18} />
              Search Student
            </NavLink>
            <NavLink to="/reports" className="action-btn">
              <BarChart3 size={18} />
              View Reports
            </NavLink>
          </div>
        </div>
        <div className="dashboard-card info-card">
          <h3>
            <FileText size={20} />
            How to Use
          </h3>
          <ol>
            <li><strong>Create a Class</strong> first to organize students</li>
            <li><strong>Add Students</strong> to each class</li>
            <li><strong>Create Assignments</strong> with deadlines</li>
            <li><strong>Mark attendance</strong> with submission status</li>
            <li><strong>Track progress</strong> via Reports section</li>
          </ol>
        </div>
        <div className="dashboard-card info-card">
          <h3>
            <GraduationCap size={20} />
            Scoring System
          </h3>
          <ul>
            <li><strong>Present + Submitted:</strong> Full marks (+7)</li>
            <li><strong>Late Submission:</strong> -0.5 per day</li>
            <li><strong>Absent:</strong> 0 marks</li>
            <li><strong>Max Score:</strong> 100 marks/year</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
