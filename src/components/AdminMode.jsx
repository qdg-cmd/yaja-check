import { useState } from 'react';
import Dashboard from './Dashboard';
import StudentManager from './StudentManager';
import AdminSettings from './AdminSettings';
import AttendanceStats from './AttendanceStats';
import SeatArranger from './SeatArranger';
import SupervisorManager from './SupervisorManager';
import AdminGuide from './AdminGuide';
import { LogOut, LayoutDashboard, Users, Settings, Grid, BarChart, UserCheck, HelpCircle } from 'lucide-react';

export default function AdminMode({ onLogout, settings, reloadSettings }) {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: '실시간 관제', icon: <LayoutDashboard size={20} /> },
    { id: 'stats', label: '월간 출결 현황', icon: <BarChart size={20} /> },
    { id: 'students', label: '학생 명단 관리', icon: <Users size={20} /> },
    { id: 'supervisors', label: '감독 교사 명단', icon: <UserCheck size={20} /> },
    { id: 'seats', label: '좌석 도면 배치', icon: <Grid size={20} /> },
    { id: 'settings', label: '운영 설정', icon: <Settings size={20} /> },
    { id: 'guide', label: '이용 안내', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="admin-layout">
      
      {/* Mobile Top App Bar (M3 Style) */}
      <div className="admin-mobile-topbar mobile-only">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏫</span>
          <span className="jua text-main" style={{ fontSize: '1.2rem' }}>스마트 관제</span>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={onLogout}
          style={{ padding: '0.4rem 0.9rem', minHeight: '40px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9999px', backgroundColor: '#f1f5f9' }}
        >
          <LogOut size={16} /> 나가기
        </button>
      </div>

      {/* Sidebar (Navigation Drawer on PC, M3 Pill Chips on Mobile) */}
      <div className="admin-sidebar" style={{ backgroundColor: 'white' }}>
        <div className="admin-sidebar-header" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border)', width: '100%' }}>
          <h1 className="jua text-main" style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🏫</span> 스마트 관제
          </h1>
        </div>
        
        <div className="admin-sidebar-menu">
          {menuItems.map(item => {
            const isActive = activeMenu === item.id;
            return (
              <button 
                key={item.id}
                className="menu-item"
                onClick={() => setActiveMenu(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.2rem',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  borderRadius: 'var(--radius-full)', cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--md-sys-color-primary-container, #dbeafe)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-main)',
                  fontWeight: isActive ? 'bold' : '500',
                  transition: 'all 0.2s', textAlign: 'left', minHeight: '44px'
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="admin-sidebar-logout" style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 'var(--radius-full)' }}
            onClick={onLogout}
          >
            <LogOut size={18} /> 로그아웃 (키오스크로)
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content-area" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
        {activeMenu === 'dashboard' && <Dashboard settings={settings} />}
        {activeMenu === 'stats' && <AttendanceStats settings={settings} />}
        {activeMenu === 'students' && <StudentManager settings={settings} />}
        {activeMenu === 'supervisors' && <SupervisorManager />}
        {activeMenu === 'seats' && <SeatArranger />}
        {activeMenu === 'settings' && <AdminSettings settings={settings} reloadSettings={reloadSettings} />}
        {activeMenu === 'guide' && <AdminGuide />}
      </div>

    </div>
  );
}
