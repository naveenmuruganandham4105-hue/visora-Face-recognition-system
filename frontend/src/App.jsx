import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Camera, UserPlus, Database, ScanFace } from 'lucide-react';
import Enroll from './components/Enroll';
import Train from './components/Train';
import Recognize from './components/Recognize';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: '80px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa', borderRadius: '4px 0 0 0' }}></div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: '3px solid #a78bfa', borderRight: '3px solid #a78bfa', borderRadius: '0 4px 0 0' }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa', borderRadius: '0 0 0 4px' }}></div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: '3px solid #a78bfa', borderRight: '3px solid #a78bfa', borderRadius: '0 0 4px 0' }}></div>
              
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#eyeGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '48px', height: '48px', filter: 'drop-shadow(0px 0px 8px rgba(96, 165, 250, 0.6))' }}>
                <defs>
                  <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" fill="#60a5fa" />
              </svg>
            </div>
            <h1 style={{ 
              marginTop: '0.5rem', 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              background: 'linear-gradient(to right, #60a5fa, #c084fc)', 
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              letterSpacing: '1px'
            }}>
              Visora
            </h1>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <NavLink 
              to="/enroll" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <UserPlus size={20} />
              Enroll Face
            </NavLink>

            <NavLink 
              to="/train" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Database size={20} />
              Train Model
            </NavLink>

            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Camera size={20} />
              Live Recognition
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Recognize />} />
            <Route path="/enroll" element={<Enroll />} />
            <Route path="/train" element={<Train />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
