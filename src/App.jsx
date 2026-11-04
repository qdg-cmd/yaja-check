import { useState, useEffect } from 'react';
import KioskMode from './components/KioskMode';
import AdminMode from './components/AdminMode';
import { ModalProvider } from './components/ModalProvider';
import { DEFAULT_SETTINGS, getSettings, runAutomations } from './dataService';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const load = async () => {
    try {
      const s = await getSettings();
      if (s) setSettings(s);
    } catch (e) {
      console.warn("Settings load error, continuing with defaults:", e);
    }
  };

  useEffect(() => { 
    load();
    
    // 1분(60초)마다 백그라운드에서 자동화 로직 수행
    const interval = setInterval(() => {
      runAutomations();
    }, 60000); 
    
    return () => clearInterval(interval);
  }, []);

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
