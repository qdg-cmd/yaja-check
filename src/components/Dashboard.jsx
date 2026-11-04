import { useState, useEffect } from 'react';
import { getStudents, getSeats, getActiveSessions, getDailyLog, getAttendanceLogs, saveAttendanceLog, updateSession } from '../dataService';
import { Users, DoorOpen, Coffee, Plus, Minus } from 'lucide-react';
import { useModal } from './ModalProvider';
import * as XLSX from 'xlsx';

export default function Dashboard({ settings }) {
  const { showConfirm, showAlert } = useModal();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [seats, setSeats] = useState([]);
  const [supervisor, setSupervisor] = useState({ scheduled: '', actual: '' });
  const [logs, setLogs] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayYMD = formatYMD(new Date());
  const isToday = selectedDate === todayYMD;

  const dateObj = new Date(selectedDate);
  const isWeekend = [0, 6].includes(dateObj.getDay());
  const maxPeriods = isWeekend ? settings?.weekendMaxPeriods || 5 : settings?.weekdayMaxPeriods || 4;

  useEffect(() => {
    loadData();
    let timer;
    if (isToday) {
      timer = setInterval(() => {
        loadData();
        setCurrentPeriod(getCurrentP());
      }, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [settings, selectedDate]);

  const getCurrentP = () => {
    const times = isWeekend ? settings.weekendTimes : settings.weekdayTimes;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const [period, time] of Object.entries(times)) {
      if (!time?.start || !time?.end) continue;
      const [sh, sm] = time.start.split(':').map(Number);
      const [eh, em] = time.end.split(':').map(Number);
      if (currentTime >= sh * 60 + sm && currentTime <= eh * 60 + em) {
        return period;
      }
    }
    return null;
  };

  const loadData = async () => {
    setStudents(await getStudents());
    if (isToday) setSessions(await getActiveSessions());
    setSeats(await getSeats());
    
    const daily = await getDailyLog(selectedDate);
    setSupervisor({ scheduled: daily.scheduled || '', actual: daily.actual || '' });
    
    setLogs(await getAttendanceLogs());
  };

  const toggleStatus = async (studentId, period) => {
    const studentLog = logs.find(l => l.date === selectedDate && l.studentId === studentId);
    const currentStatus = studentLog?.periods?.[period];
    
    let newStatus = 'PRESENT';
    if (currentStatus === 'PRESENT') newStatus = 'ABSENT';
    else if (currentStatus === 'ABSENT') newStatus = 'UNSCHEDULED';
    else if (currentStatus === 'UNSCHEDULED') newStatus = null;
    
    const update = { [period]: newStatus };
    if (newStatus === null) {
       if (currentStatus === 'UNSCHEDULED') newStatus = 'PRESENT'; 
       update[period] = newStatus;
    }

    await saveAttendanceLog(selectedDate, studentId, update);
    loadData();
  };

  const handleForceCheckout = async (studentId, studentName) => {
    if (!isToday) return;
    const ok = await showConfirm(`${studentName} 학생을 강제로 '퇴실' 처리하시겠습니까?\n해당 학생의 자리가 즉시 반납됩니다.`, "강제 퇴실");
    if (ok) {
      await updateSession(studentId, null);
      await showAlert("퇴실 처리되었습니다.");
      loadData();
    }
  };

  const inCount = isToday ? sessions.filter(s => s.status === 'IN').length : 0;
  const outingCount = isToday ? sessions.filter(s => s.status === 'OUTING').length : 0;
  
  const isOccupied = (seatId) => isToday && sessions.some(s => s.seatId === seatId && s.status === 'IN');
  const isOuting = (seatId) => isToday && sessions.some(s => s.seatId === seatId && s.status === 'OUTING');

  const [showMobileMap, setShowMobileMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(0.65);

  const zoomIn = () => setMapZoom(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setMapZoom(prev => Math.max(prev - 0.1, 0.4));

  const exportAttendanceHistory = async () => {
    try {
      const allLogs = await getAttendanceLogs();
      const allStudents = await getStudents();
      
      const stMap = {};
      allStudents.forEach(s => stMap[s.id] = s);

      // Create matrix: Row = Student, Col = Date_Period
      const headers = ['학년', '학번', '이름'];
      
      // Get all unique dates from logs
      const uniqueDates = [...new Set(allLogs.map(l => l.date))].sort();
      
      uniqueDates.forEach(d => {
        const dObj = new Date(d);
        const isWknd = [0,6].includes(dObj.getDay());
        const maxP = isWknd ? (settings?.weekendMaxPeriods || 5) : (settings?.weekdayMaxPeriods || 4);
        for(let p=1; p<=maxP; p++){
          headers.push(`${d} ${p}교시`);
        }
      });

      const data = [headers];

      const sortedStudents = [...allStudents].sort((a,b) => a.id.localeCompare(b.id));
      sortedStudents.forEach(st => {
        const row = [st.grade || '1학년', st.id, st.name];
        uniqueDates.forEach(d => {
          const log = allLogs.find(l => l.date === d && l.studentId === st.id);
          const dObj = new Date(d);
          const isWknd = [0,6].includes(dObj.getDay());
          const maxP = isWknd ? (settings?.weekendMaxPeriods || 5) : (settings?.weekdayMaxPeriods || 4);
          
          for(let p=1; p<=maxP; p++){
            let status = '결석'; // Default
            if (log && log.periods && log.periods[p]) {
              const val = log.periods[p];
              if (val === 'PRESENT') status = '출석';
              else if (val === 'UNSCHEDULED') status = '자율출석';
              else if (val === 'ABSENT') status = '결석';
              else status = val;
            } else {
               status = '-'; // Not recorded
            }
            row.push(status);
          }
        });
        data.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '전체출결기록');
      XLSX.writeFile(wb, `스마트출석부_전체출결기록.xlsx`);
    } catch(e) {
      console.error(e);
      showAlert("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="stat-cards-container">
        <div className="card fade-in stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p className="text-muted font-bold no-wrap-mobile" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>조회 일자</p>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 'bold', fontFamily: 'inherit' }} />
            <button className="btn btn-secondary" style={{ padding: '0.3rem', fontSize: '0.8rem' }} onClick={exportAttendanceHistory}>
              전체 출결 엑셀 다운로드
            </button>
          </div>
        </div>
        
        {isToday && (
          <>
            <StatCard icon={<DoorOpen size={24} color="var(--success)" />} title="현재 입실 (IN)" value={`${inCount}명`} />
            <StatCard icon={<Coffee size={24} color="var(--warning)" />} title="현재 외출 (OUTING)" value={`${outingCount}명`} />
          </>
        )}
        <StatCard icon={<span style={{fontSize:'1.5rem'}}>🧑‍🏫</span>} title={`실제 감독 교사`} value={supervisor.actual || '미지정'} />
      </div>

      <div className="split-layout" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        
        {isToday && (
          <div className={`card fade-in kiosk-map-pane ${showMobileMap ? 'show-modal' : ''}`} style={{ flex: '1 1 42%', position: 'sticky', top: '2rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="jua text-main" style={{ fontSize: '1.2rem', margin: 0 }}>🗺️ 실시간 점유 현황</h3>
              {showMobileMap && <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem' }} onClick={() => setShowMobileMap(false)}>닫기</button>}
            </div>
            
            <div className="map-scroll-container" style={{ 
              position: 'relative', height: '480px', 
              background: 'white', borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow-inner)', border: '1px solid var(--border)',
              backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '20px 20px',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'sticky', top: '10px', left: '10px', display: 'inline-flex', gap: '0.5rem', zIndex: 10 }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomIn} title="확대"><Plus size={18} /></button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomOut} title="축소"><Minus size={18} /></button>
              </div>
              <div style={{ transform: `scale(${mapZoom})`, transformOrigin: 'top left', minWidth: '880px', minHeight: '620px', transition: 'transform 0.2s' }}>
                {seats.map(seat => {
                  const session = sessions.find(s => s.seatId === seat.id && (s.status === 'IN' || s.status === 'OUTING'));
                  const occupied = session?.status === 'IN';
                  const outing = session?.status === 'OUTING';
                  const assigned = seat.type === 'assigned';
                  
                  let studentName = null;
                  if (session) {
                    const st = students.find(s => s.id === session.studentId);
                    if (st) studentName = st.name;
                  } else if (assigned) {
                    const st = students.find(s => s.assignedSeat === seat.id);
                    if (st) studentName = st.name;
                  }
                  
                  let bgColor = 'white'; let borderColor = 'var(--border)'; let textColor = 'var(--text-main)';
                  let nameColor = 'var(--text-main)';
                  
                  if (assigned && !session) { 
                    bgColor = '#f1f5f9'; textColor = '#94a3b8'; nameColor = '#94a3b8';
                  } else if (occupied) { 
                    bgColor = 'var(--success)'; borderColor = 'var(--success)'; textColor = 'white'; nameColor = 'white';
                  } else if (outing) { 
                    bgColor = 'var(--warning)'; borderColor = 'var(--warning)'; textColor = 'white'; nameColor = 'white';
                  }

                  return (
                    <div key={seat.id} style={{
                      position: 'absolute', left: seat.x, top: seat.y, width: '50px', height: '50px',
                      backgroundColor: bgColor, border: `2px solid ${borderColor}`, borderRadius: '6px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      color: textColor, boxShadow: 'var(--shadow-sm)'
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{seat.id}</span>
                      {studentName && (
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          marginTop: '-1px', 
                          color: nameColor,
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          maxWidth: '46px' 
                        }}>
                          {studentName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="card fade-in" style={{ flex: '1 1 58%', overflow: 'hidden', padding: '1.25rem' }}>
          
          {isToday && (
            <div className="mobile-only" style={{ marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onClick={() => setShowMobileMap(true)}>
                🗺️ 실시간 좌석 도면 팝업 보기
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="jua text-main" style={{ fontSize: '1.5rem', margin: 0 }}>{selectedDate} 출결 현황 ({isWeekend ? '주말' : '평일'})</h2>
            {isToday && currentPeriod && <span style={{ background: 'var(--success)', color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 'bold' }}>현재 {currentPeriod}교시 진행중</span>}
          </div>
          
          <div className="table-container desktop-table dashboard-table-container" style={{ overflowX: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '65px', textAlign: 'center' }}>학번</th>
                  <th style={{ width: '75px', textAlign: 'center' }}>이름</th>
                  {isToday && <th style={{ width: '50px', textAlign: 'center' }}>좌석</th>}
                  {isToday && <th style={{ width: '75px', textAlign: 'center' }}>상태</th>}
                  {isToday && <th style={{ width: '85px', textAlign: 'center' }}>외출 사유</th>}
                  {Array.from({ length: maxPeriods }).map((_, i) => (
                    <th key={i} style={{ textAlign: 'center', width: '42px' }}>{i + 1}교시</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(st => {
                  const session = isToday ? sessions.find(s => s.studentId === st.id) : null;
                  const studentLog = logs.find(l => l.date === selectedDate && l.studentId === st.id);
                  const dayName = ['일','월','화','수','목','금','토'][dateObj.getDay()];
                  const days = isWeekend ? st.weekendDays : st.weekdayDays;
                  
                  let statusLabel = '퇴실';
                  let statusDot = 'status-out';
                  if (session?.status === 'IN') { statusLabel = '입실중'; statusDot = 'status-in'; }
                  if (session?.status === 'OUTING') { statusLabel = '외출중'; statusDot = 'status-outing'; }

                  return (
                    <tr key={st.id}>
                      <td className="font-bold" style={{ textAlign: 'center' }}>{st.id}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{st.name}</td>
                      {isToday && <td className="text-accent font-bold" style={{ textAlign: 'center' }}>{session?.seatId || '-'}</td>}
                      {isToday && (
                        <td 
                          onClick={() => session ? handleForceCheckout(st.id, st.name) : null}
                          style={{ cursor: session ? 'pointer' : 'default', textAlign: 'center' }}
                          title={session ? "클릭 시 강제 퇴실 처리" : ""}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: session ? 1 : 0.5 }}>
                            <span className={`status-dot ${statusDot}`}></span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', textDecoration: session ? 'underline' : 'none', whiteSpace: 'nowrap' }}>{statusLabel}</span>
                          </div>
                        </td>
                      )}
                      {isToday && <td className="text-muted text-sm" style={{ textAlign: 'center' }}>{session?.destination || '-'}</td>}
                      
                      {Array.from({ length: maxPeriods }).map((_, i) => {
                        const period = String(i + 1);
                        const isScheduled = days?.[dayName]?.includes(Number(period));
                        const status = studentLog?.periods?.[period];
                        
                        let display = <span style={{ color: 'var(--border)' }}>-</span>;
                        
                        if (status === 'PRESENT') display = <span style={{ color: 'var(--success)', fontSize: '1.15rem' }}>🟢</span>;
                        else if (status === 'ABSENT') display = <span style={{ color: 'var(--danger)', fontSize: '1.15rem' }}>🔴</span>;
                        else if (status === 'UNSCHEDULED') display = <span style={{ color: 'var(--warning)', fontSize: '1.15rem' }}>🟡</span>;
                        else if (isScheduled) {
                          if (!isToday || (isToday && Number(period) < Number(currentPeriod))) {
                            display = <span style={{ color: 'var(--danger)', fontSize: '1.15rem' }}>🔴</span>;
                          } else {
                            display = <span style={{ color: 'var(--danger)', fontSize: '1.15rem', opacity: 0.3 }}>🔴</span>; 
                          }
                        }

                        return (
                          <td key={i} style={{ textAlign: 'center' }}>
                            <button className="attendance-btn" onClick={() => toggleStatus(st.id, period)}>
                              {display}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      등록된 학생이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {students.map(st => {
              const session = isToday ? sessions.find(s => s.studentId === st.id) : null;
              const studentLog = logs.find(l => l.date === selectedDate && l.studentId === st.id);
              const dayName = ['일','월','화','수','목','금','토'][dateObj.getDay()];
              const days = isWeekend ? st.weekendDays : st.weekdayDays;
              
              let statusLabel = '퇴실';
              let statusDot = 'status-out';
              if (session?.status === 'IN') { statusLabel = '입실중'; statusDot = 'status-in'; }
              if (session?.status === 'OUTING') { statusLabel = '외출중'; statusDot = 'status-outing'; }

              return (
                <div key={st.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div>
                      <span className="font-bold text-lg" style={{ marginRight: '8px' }}>{st.name}</span>
                      <span className="text-muted text-sm">{st.id}</span>
                    </div>
                    {isToday && (
                      <div 
                        onClick={() => session ? handleForceCheckout(st.id, st.name) : null}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: session ? 'pointer' : 'default', opacity: session ? 1 : 0.5 }}
                      >
                        <span className={`status-dot ${statusDot}`}></span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 'bold', textDecoration: session ? 'underline' : 'none' }}>{statusLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="mobile-card-body">
                    {isToday && session && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span><b style={{ color: 'var(--text-main)' }}>좌석:</b> <span className="text-accent font-bold">{session.seatId}</span></span>
                        {session.status === 'OUTING' && <span><b style={{ color: 'var(--warning)' }}>사유:</b> {session.destination}</span>}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
                      {Array.from({ length: maxPeriods }).map((_, i) => {
                        const period = String(i + 1);
                        const isScheduled = days?.[dayName]?.includes(Number(period));
                        const status = studentLog?.periods?.[period];
                        
                        let display = <span style={{ color: 'var(--border)' }}>-</span>;
                        if (status === 'PRESENT') display = <span style={{ color: 'var(--success)' }}>🟢</span>;
                        else if (status === 'ABSENT') display = <span style={{ color: 'var(--danger)' }}>🔴</span>;
                        else if (status === 'UNSCHEDULED') display = <span style={{ color: 'var(--warning)' }}>🟡</span>;
                        else if (isScheduled) {
                          if (!isToday || (isToday && Number(period) < Number(currentPeriod))) display = <span style={{ color: 'var(--danger)' }}>🔴</span>;
                          else display = <span style={{ color: 'var(--danger)', opacity: 0.3 }}>🔴</span>; 
                        }

                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{period}교시</span>
                            <button className="attendance-btn" onClick={() => toggleStatus(st.id, period)} style={{ padding: '2px 8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>{display}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {students.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">등록된 학생이 없습니다.</div>
            )}
          </div>
          
          <div style={{ padding: '0 1rem' }}>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span>🟢 정상 출석</span>
              <span>🔴 결석/미입실</span>
              <span>🟡 미신청 자율출석</span>
              <span className="text-muted">(동그라미 클릭 시 수정)</span>
            </div>
            {isToday && (
              <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                * '상태' 글자(입실중/외출중)를 클릭하면 강제 퇴실 처리할 수 있습니다.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="card fade-in stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <p className="text-muted font-bold" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
        <p className="jua" style={{ fontSize: '1.2rem', color: 'var(--text-main)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
      </div>
    </div>
  );
}
