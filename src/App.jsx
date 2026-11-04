import { useState, useEffect } from 'react';
import KioskMode from './components/KioskMode';
import AdminMode from './components/AdminMode';
import { ModalProvider } from './components/ModalProvider';
import { getSettings, runAutomations } from './dataService';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = async () => setSettings(await getSettings());

  useEffect(() => { 
    load();
    
    // 1분(60초)마다 백그라운드에서 자동화 로직 수행
    const interval = setInterval(() => {
      runAutomations(); // dataService.js 내에서 스스로 최신 settings를 가져오도록 수정됨
    }, 60000); 
    
    return () => clearInterval(interval);
  }, []);

  if (!settings) return null;

  return (
    <ModalProvider>
      <div className="app-container">
        {isAdmin ? (
          <AdminMode onLogout={() => setIsAdmin(false)} settings={settings} reloadSettings={load} />
        ) : (
          <KioskMode onAdminLogin={() => setIsAdmin(true)} settings={settings} />
        )}
      </div>
    </ModalProvider>
  );
}
