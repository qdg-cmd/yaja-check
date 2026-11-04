import { useState } from 'react';
import { updateSettings } from '../dataService';
import { Save } from 'lucide-react';

export default function AdminSettings({ settings, reloadSettings }) {
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleSave = async () => {
    if (localSettings.adminPwd.length < 4) {
      return alert("비밀번호는 최소 4자리 이상이어야 합니다.");
    }
    await updateSettings(localSettings);
    await reloadSettings();
    alert("설정이 저장되었습니다.");
  };

  const updateTime = (type, period, field, value) => {
    const newTimes = { ...localSettings[type] };
    if (!newTimes[period]) newTimes[period] = {};
    newTimes[period][field] = value;
    setLocalSettings({ ...localSettings, [type]: newTimes });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div className="card fade-in">
        <h2 className="jua" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>운영 및 시간표 설정</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
            <h3 className="font-bold text-success" style={{ marginBottom: '1rem', color: '#166534' }}>📢 오늘의 공지사항</h3>
            <div className="input-group">
              <label className="input-label">학생 화면 전광판에 띄울 공지사항을 입력하세요 (비워두면 숨김)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="예: 오늘은 9시에 일찍 하교합니다."
                value={localSettings.notice || ''} 
                onChange={e => setLocalSettings({...localSettings, notice: e.target.value})}
              />
            </div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-accent" style={{ marginBottom: '1rem' }}>관제센터 접근 보안</h3>
            
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">관리자 비밀번호</label>
              <input 
                type="text" 
                className="input-field" 
                value={localSettings.adminPwd} 
                onChange={e => setLocalSettings({...localSettings, adminPwd: e.target.value})}
              />
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>대시보드에 접근하기 위해 사용하는 비밀번호입니다. (기본: 2026)</span>
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="wrap-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <h3 className="font-bold text-accent no-wrap-mobile">평일 자습 시간표 설정</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="text-sm font-bold no-wrap-mobile">최대 교시 수:</label>
                <select className="input-field" style={{ padding: '0.2rem' }} value={localSettings.weekdayMaxPeriods} onChange={e => setLocalSettings({...localSettings, weekdayMaxPeriods: Number(e.target.value)})}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}교시</option>)}
                </select>
              </div>
            </div>
            
            <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: localSettings.weekdayMaxPeriods }).map((_, i) => (
                <div key={i} className="time-selector-row wrap-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="font-bold text-sm no-wrap-mobile" style={{ width: '40px' }}>{i + 1}교시</span>
                  <input type="time" className="input-field" style={{ padding: '0.4rem', flex: '1 1 100px', minWidth: 0 }} value={localSettings.weekdayTimes?.[i+1]?.start || ''} onChange={e => updateTime('weekdayTimes', i+1, 'start', e.target.value)} />
                  <span className="no-wrap-mobile">~</span>
                  <input type="time" className="input-field" style={{ padding: '0.4rem', flex: '1 1 100px', minWidth: 0 }} value={localSettings.weekdayTimes?.[i+1]?.end || ''} onChange={e => updateTime('weekdayTimes', i+1, 'end', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="wrap-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <h3 className="font-bold text-accent no-wrap-mobile">주말 자습 시간표 설정</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="text-sm font-bold no-wrap-mobile">최대 교시 수:</label>
                <select className="input-field" style={{ padding: '0.2rem' }} value={localSettings.weekendMaxPeriods} onChange={e => setLocalSettings({...localSettings, weekendMaxPeriods: Number(e.target.value)})}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}교시</option>)}
                </select>
              </div>
            </div>
            
            <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: localSettings.weekendMaxPeriods }).map((_, i) => (
                <div key={i} className="time-selector-row wrap-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="font-bold text-sm no-wrap-mobile" style={{ width: '40px' }}>{i + 1}교시</span>
                  <input type="time" className="input-field" style={{ padding: '0.4rem', flex: '1 1 100px', minWidth: 0 }} value={localSettings.weekendTimes?.[i+1]?.start || ''} onChange={e => updateTime('weekendTimes', i+1, 'start', e.target.value)} />
                  <span className="no-wrap-mobile">~</span>
                  <input type="time" className="input-field" style={{ padding: '0.4rem', flex: '1 1 100px', minWidth: 0 }} value={localSettings.weekendTimes?.[i+1]?.end || ''} onChange={e => updateTime('weekendTimes', i+1, 'end', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSave} style={{ alignSelf: 'flex-end', marginTop: '1rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
            <Save size={20} style={{ marginRight: '0.5rem' }} /> 설정 저장하기
          </button>

        </div>
      </div>
    </div>
  );
}
