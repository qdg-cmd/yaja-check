import { useState, useEffect, useRef } from 'react';
import { getAllDailyLogs, saveDailyLog } from '../dataService';
import { UserCheck, Calendar, Download, Upload, Trash2 } from 'lucide-react';
import { useModal } from './ModalProvider';
import * as XLSX from 'xlsx';

export default function SupervisorManager() {
  const { showAlert, showConfirm } = useModal();
  const [logs, setLogs] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newScheduled, setNewScheduled] = useState('');
  const [stats, setStats] = useState({}); 

  const handleDelete = async (date) => {
    const ok = await showConfirm(`${date}의 감독 교사 일정을 삭제하시겠습니까?`, "일정 삭제");
    if (ok) {
      // In a real app we'd call deleteDailyLog, but since we save empty strings, we can just save it empty.
      await saveDailyLog(date, { date, scheduled: '', actual: '' });
      await showAlert("삭제되었습니다.");
      loadData();
    }
  };

  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const allLogs = await getAllDailyLogs();
    allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    setLogs(allLogs);

    const counts = {};
    allLogs.forEach(l => {
      if (l.actual) {
        if (!counts[l.actual]) {
          counts[l.actual] = { total: 0, friday: 0 };
        }
        counts[l.actual].total += 1;
        if (l.date) {
          const parts = l.date.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (d.getDay() === 5) {
              counts[l.actual].friday += 1;
            }
          }
        }
      }
    });
    setStats(counts);
  };

  const handleAdd = async () => {
    if (!newDate || !newScheduled) return await showAlert("날짜와 예정된 교사 이름을 모두 입력하세요.");
    const existing = logs.find(l => l.date === newDate) || { date: newDate, actual: '' };
    await saveDailyLog(newDate, { ...existing, scheduled: newScheduled });
    setNewDate('');
    setNewScheduled('');
    loadData();
  };

  const updateActual = async (log, actualName) => {
    await saveDailyLog(log.date, { ...log, actual: actualName });
    loadData();
  };

  const downloadTemplate = () => {
    const data = [
      ['날짜(YYYY-MM-DD)', '예정된교사']
    ];
    
    if (logs.length === 0) {
      // 데이터가 없으면 예시(양식) 제공
      data.push(['2026-08-01', '홍길동']);
      data.push(['2026-08-02', '이순신']);
    } else {
      // 현재 저장된 교사 일정 데이터를 엑셀화
      const sortedLogs = [...logs].sort((a,b) => a.date.localeCompare(b.date));
      for (const log of sortedLogs) {
        if (log.scheduled) {
          data.push([log.date, log.scheduled]);
        }
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '일정표');
    XLSX.writeFile(wb, `감독교사_일정명단.xlsx`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let count = 0;
      for (const row of data) {
        let dateStr = row['날짜(YYYY-MM-DD)'] || row['날짜'];
        const scheduled = row['예정된교사'] || row['예정된 교사'] || row['교사'];
        
        if (!dateStr || !scheduled) continue;
        
        // Handle excel serial dates
        if (typeof dateStr === 'number') {
          const dateObj = XLSX.SSF.parse_date_code(dateStr);
          dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2,'0')}-${String(dateObj.d).padStart(2,'0')}`;
        }

        const existing = logs.find(l => l.date === dateStr) || { date: String(dateStr), actual: '' };
        await saveDailyLog(String(dateStr), { ...existing, scheduled: String(scheduled) });
        count++;
      }
      await showAlert(`${count}일 치 일정이 업로드되었습니다.`);
      loadData();
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  return (
    <div className="flex-row-to-col responsive-gap" style={{ flexWrap: 'wrap' }}>
      
      <div className="card fade-in" style={{ flex: '1 1 60%', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="jua text-main" style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--accent)" /> 감독 교사 일정표
          </h2>
          <div className="wrap-mobile" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }} onClick={downloadTemplate} title="현재 저장된 일정을 엑셀로 다운로드합니다. 수정 후 다시 업로드하면 덮어쓰기 됩니다.">
              <Download size={16} /> 현재 일정(엑셀) 다운로드
            </button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }} onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> 일괄 업로드
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
          </div>
        </div>
        
        <div className="stack-mobile" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label no-wrap-mobile">날짜 선택</label>
            <input type="date" className="input-field" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label no-wrap-mobile">예정된 교사</label>
            <input type="text" className="input-field" placeholder="예: 김선생" value={newScheduled} onChange={e => setNewScheduled(e.target.value)} />
          </div>
          <button className="btn btn-primary no-wrap-mobile" onClick={handleAdd}>배정 추가</button>
        </div>

        <div className="table-container desktop-table">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>예정된 교사 (Scheduled)</th>
                <th>실제 감독 교사 (Actual)</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {logs.filter(l => l.scheduled || l.actual).map(log => (
                <SupervisorRow key={log.date} log={log} updateActual={updateActual} handleDelete={handleDelete} />
              ))}
              {logs.filter(l => l.scheduled || l.actual).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>등록된 일정이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {logs.filter(l => l.scheduled || l.actual).map(log => (
            <div key={log.date} className="mobile-card">
              <div className="mobile-card-header">
                <span className="font-bold text-lg">{log.date}</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDelete(log.date)}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="mobile-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted">예정된 교사</span>
                  <span className="font-bold">{log.scheduled || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span className="text-muted">실제 감독</span>
                  <SupervisorActualInput log={log} updateActual={updateActual} />
                </div>
              </div>
            </div>
          ))}
          {logs.filter(l => l.scheduled || l.actual).length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">등록된 일정이 없습니다.</div>
          )}
        </div>
      </div>

      <div className="card fade-in" style={{ flex: '1 1 35%', alignSelf: 'flex-start' }}>
        <h2 className="jua text-main" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={24} color="var(--success)" /> 교사별 누적 감독 횟수
        </h2>
        <div className="table-container desktop-table">
          <table>
            <thead>
              <tr>
                <th>교사 이름</th>
                <th style={{ textAlign: 'center' }}>총 감독 횟수</th>
                <th style={{ textAlign: 'center' }}>금요일 감독</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).sort((a,b) => {
                if (b[1].total !== a[1].total) return b[1].total - a[1].total;
                return b[1].friday - a[1].friday;
              }).map(([name, data]) => (
                <tr key={name}>
                  <td className="font-bold">{name}</td>
                  <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 'bold' }}>{data.total}회</td>
                  <td style={{ textAlign: 'center', color: data.friday > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: data.friday > 0 ? 'bold' : 'normal' }}>
                    {data.friday}회
                  </td>
                </tr>
              ))}
              {Object.keys(stats).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards">
          {Object.entries(stats).sort((a,b) => {
            if (b[1].total !== a[1].total) return b[1].total - a[1].total;
            return b[1].friday - a[1].friday;
          }).map(([name, data]) => (
            <div key={name} className="mobile-card" style={{ padding: '0.8rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-bold">{name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="text-accent font-bold">총 {data.total}회</span>
                  <span style={{ fontSize: '0.8rem', color: data.friday > 0 ? '#b45309' : 'var(--text-muted)', backgroundColor: data.friday > 0 ? '#fef3c7' : '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 'bold' }}>
                    금요 {data.friday}회
                  </span>
                </div>
              </div>
            </div>
          ))}
          {Object.keys(stats).length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">기록이 없습니다.</div>
          )}
        </div>
        <p className="text-muted text-sm" style={{ marginTop: '1rem', textAlign: 'center' }}>* 누적 횟수는 '실제 감독 교사'를 기준으로 합산됩니다.</p>
      </div>

    </div>
  );
}

function SupervisorRow({ log, updateActual, handleDelete }) {
  return (
    <tr>
      <td className="font-bold">{log.date}</td>
      <td>{log.scheduled || '-'}</td>
      <td>
        <SupervisorActualInput log={log} updateActual={updateActual} />
      </td>
      <td>
        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDelete(log.date)}>
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

function SupervisorActualInput({ log, updateActual }) {
  const [val, setVal] = useState(log.actual || '');
  useEffect(() => { setVal(log.actual || ''); }, [log.actual]);
  
  return (
    <input 
      type="text" 
      className="input-field" 
      style={{ padding: '0.4rem', width: '150px' }}
      value={val} 
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== (log.actual || '')) updateActual(log, val); }}
      placeholder="입력 시 통계 반영"
    />
  );
}
