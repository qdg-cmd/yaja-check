import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, HelpCircle, UserCheck, Plus, Minus } from 'lucide-react';
import { getStudents, saveStudent, getActiveSessions, updateSession, getSeats, getDailyLog, saveDailyLog, saveAttendanceLog } from '../dataService';
import { useModal } from './ModalProvider';

export default function KioskMode({ onAdminLogin, settings }) {
  const { showAlert, showConfirm, showPrompt } = useModal();
  
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [seats, setSeats] = useState([]);
  
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInStudent, setLoggedInStudent] = useState(null);
  const [session, setSession] = useState(null);
  
  const [showRegModal, setShowRegModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState('');
  
  const [supervisor, setSupervisor] = useState('');
  const todayStr = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '');

  const [flash, setFlash] = useState(null);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setStudents(await getStudents());
    setSessions(await getActiveSessions());
    setSeats(await getSeats());
    
    // YYYY-MM-DD
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const log = await getDailyLog(ds);
    setSupervisor(log.actual || log.scheduled || '');
  };

  const handleAdminClick = async () => {
    const pwd = await showPrompt("관리자 비밀번호를 입력하세요:", "관리자 로그인");
    if (pwd === settings.adminPwd) {
      const d = new Date();
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const log = await getDailyLog(ds);
      
      if (!log.actual) {
        const name = await showPrompt(`오늘의 실제 감독 교사 이름을 입력하세요\n(예정: ${log.scheduled || '없음'})`, "감독 교사 입력", log.scheduled || '');
        if (name) {
          await saveDailyLog(ds, { ...log, actual: name });
        }
      }
      onAdminLogin();
    } else if (pwd !== null) {
      await showAlert("비밀번호가 틀렸습니다.");
    }
  };

  const handleLogin = async () => {
    const st = students.find(s => s.id === studentId);
    if (!st) {
      const ok = await showConfirm("등록되지 않은 학번입니다.\n신규 가입하시겠습니까?", "로그인 실패");
      if (ok) setShowRegModal(true);
      return;
    }
    if (st.password && st.password !== password) {
      return await showAlert("비밀번호가 틀렸습니다.");
    }
    
    setLoggedInStudent(st);
    setSession(sessions.find(s => s.studentId === st.id) || null);
    
    if (st.assignedSeat) {
      setSelectedSeat(st.assignedSeat);
    } else {
      setSelectedSeat('');
    }
    
    setStudentId('');
    setPassword('');
  };

  const getCurrentPeriod = () => {
    const isWeekend = [0, 6].includes(new Date().getDay());
    const times = isWeekend ? settings.weekendTimes : settings.weekdayTimes;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const [period, time] of Object.entries(times)) {
      if (!time.start || !time.end) continue;
      const [sh, sm] = time.start.split(':').map(Number);
      const [eh, em] = time.end.split(':').map(Number);
      if (currentTime >= sh * 60 + sm && currentTime <= eh * 60 + em) {
        return period;
      }
    }
    return null;
  };

  const markAttendance = async (student) => {
    const p = getCurrentPeriod();
    if (p) {
      const isWeekend = [0, 6].includes(new Date().getDay());
      const days = isWeekend ? student.weekendDays : student.weekdayDays;
      const dayName = ['일','월','화','수','목','금','토'][new Date().getDay()];
      
      const isScheduled = days?.[dayName]?.includes(Number(p));
      const status = isScheduled ? 'PRESENT' : 'UNSCHEDULED';
      
      const d = new Date();
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      await saveAttendanceLog(ds, student.id, { [p]: status });
    }
  };

  const triggerFlash = (type, msg) => {
    setFlash({ type, msg });
    
    // Play sound using Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'IN') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'OUTING') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'OUT') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.2); // C5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.log('Audio playback failed', e);
    }

    setTimeout(() => {
      setFlash(null);
      reset();
    }, 2000);
  };

  const handleCheckIn = async (seatId) => {
    if (!seatId) return await showAlert("자리를 선택해주세요.");
    const newSession = { studentId: loggedInStudent.id, seatId, status: 'IN', lastUpdated: Date.now() };
    await updateSession(loggedInStudent.id, newSession);
    await markAttendance(loggedInStudent);
    triggerFlash('IN', '입실이 완료되었습니다!');
  };

  const handleOuting = async () => {
    const dest = await showPrompt("외출 사유/장소를 입력하세요\n(예: 체육관, 3-2반 교실 등)", "외출");
    if (!dest) return;
    await updateSession(loggedInStudent.id, { ...session, status: 'OUTING', destination: dest, lastUpdated: Date.now() });
    triggerFlash('OUTING', '외출 처리되었습니다.');
  };

  const handleReturn = async () => {
    await updateSession(loggedInStudent.id, { ...session, status: 'IN', destination: '', lastUpdated: Date.now() });
    await markAttendance(loggedInStudent);
    triggerFlash('IN', '복귀(입실) 완료되었습니다!');
  };

  const handleCheckOut = async () => {
    const ok = await showConfirm("완전 퇴실하시겠습니까?\n(자리가 반납됩니다)");
    if (ok) {
      await updateSession(loggedInStudent.id, null);
      triggerFlash('OUT', '퇴실 처리되었습니다. 수고하셨습니다!');
    }
  };

  const handleChangePin = async () => {
    const newPin = await showPrompt("새로운 4자리 숫자 비밀번호를 입력하세요:", "");
    if (!newPin) return;
    if (!/^\d{4,}$/.test(newPin)) {
      return await showAlert("비밀번호는 4자리 이상의 숫자로 입력해주세요.");
    }
    
    loggedInStudent.password = newPin;
    await saveStudent(loggedInStudent);
    await showAlert("비밀번호가 성공적으로 변경되었습니다.");
  };

  const reset = () => {
    setLoggedInStudent(null);
    setSession(null);
    setSelectedSeat('');
    loadData();
  };

  const isOccupied = (seatId) => sessions.some(s => s.seatId === seatId && s.status === 'IN');
  const isOuting = (seatId) => sessions.some(s => s.seatId === seatId && s.status === 'OUTING');

  const [showMobileMap, setShowMobileMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(0.8);

  const zoomIn = () => setMapZoom(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setMapZoom(prev => Math.max(prev - 0.1, 0.4));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
      
      {flash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: flash.type === 'IN' ? 'var(--success)' : flash.type === 'OUTING' ? 'var(--warning)' : 'var(--danger)',
          color: 'white', fontSize: '3rem', fontWeight: 'bold', fontFamily: '"Jua", sans-serif',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {flash.msg}
        </div>
      )}

      {/* Header */}
      <div className="kiosk-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="jua text-main kiosk-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span>스마트 출석부</span>
          {supervisor && (
            <span className="supervisor-badge" style={{ fontSize: '0.9rem', color: 'var(--accent)', background: 'var(--md-sys-color-primary-container, #eff6ff)', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontWeight: 'bold' }}>
              🧑‍🏫 {supervisor} 선생님
            </span>
          )}
        </div>
        
        <div className="kiosk-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary mobile-only" onClick={() => setShowMobileMap(true)}>
            🔍 좌석 확인
          </button>
          
          <button 
            onClick={() => setShowGuideModal(true)} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HelpCircle size={18} /> 학생 안내
          </button>
          
          <button 
            onClick={handleAdminClick} 
            className="btn btn-primary mobile-fab-extended"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserCheck size={18} /> <span>👨‍🏫 감독교사 모드</span>
          </button>
        </div>
      </div>
      
      {/* Notice Banner */}
      {settings?.notice && settings.notice.trim() !== '' && (
        <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.8rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span>📢</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{settings.notice}</span>
        </div>
      )}

      {/* Split Layout */}
      <div className="split-layout" style={{ flex: 1, display: 'flex' }}>
        
        {/* Left: Seat Map (Hidden on mobile) */}
        <div className={`kiosk-map-pane ${showMobileMap ? 'show-modal' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="jua text-main" style={{ fontSize: '1.5rem', margin: 0 }}>🗺️ 실시간 좌석 미니맵</h2>
            {showMobileMap && <button className="btn btn-secondary" onClick={() => setShowMobileMap(false)}>닫기</button>}
          </div>
          <div className="map-scroll-container" style={{ 
            flex: 1, position: 'relative', 
            background: 'white', borderRadius: 'var(--radius-lg)', 
            boxShadow: 'var(--shadow-inner)', border: '1px solid var(--border)',
            backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '20px 20px',
            overflow: 'auto',
            minHeight: '400px'
          }}>
            <div style={{ position: 'sticky', top: '10px', left: '10px', display: 'inline-flex', gap: '0.5rem', zIndex: 10 }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomIn} title="확대"><Plus size={18} /></button>
              <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomOut} title="축소"><Minus size={18} /></button>
            </div>
            <div style={{ transform: `scale(${mapZoom})`, transformOrigin: 'top left', minWidth: '800px', minHeight: '600px', transition: 'transform 0.2s' }}>
              {seats.map(seat => {
                const occupied = isOccupied(seat.id);
                const outing = isOuting(seat.id);
                const assigned = seat.type === 'assigned';
                
                let bgColor = 'white';
                let borderColor = 'var(--border)';
                let textColor = 'var(--text-main)';
                let label = seat.id;
                
                if (assigned) { bgColor = '#f1f5f9'; textColor = '#cbd5e1'; label = '지정석'; }
                else if (occupied) { bgColor = 'var(--success)'; borderColor = 'var(--success)'; textColor = 'white'; label = '사용중'; }
                else if (outing) { bgColor = 'var(--warning)'; borderColor = 'var(--warning)'; textColor = 'white'; label = '외출중'; }
                else if (selectedSeat === seat.id) { bgColor = 'var(--accent)'; borderColor = 'var(--accent)'; textColor = 'white'; }

                const isSelectable = !assigned && !occupied && !outing && loggedInStudent && !session;

                return (
                  <div 
                    key={seat.id}
                    onClick={() => isSelectable && setSelectedSeat(seat.id)}
                    style={{
                      position: 'absolute', left: seat.x, top: seat.y,
                      width: '50px', height: '50px',
                      backgroundColor: bgColor, border: `2px solid ${borderColor}`, borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isSelectable ? 'pointer' : (loggedInStudent && !session ? 'not-allowed' : 'default'), 
                      color: textColor, fontWeight: 'bold', fontSize: '0.75rem', boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s',
                      transform: selectedSeat === seat.id ? 'scale(1.1)' : 'scale(1)',
                      userSelect: 'none'
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, border: '2px solid var(--border)', background:'white', borderRadius: 3}}></div>빈자리</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'var(--success)', borderRadius: 3}}></div>사용중</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'var(--warning)', borderRadius: 3}}></div>외출중</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'#f1f5f9', borderRadius: 3}}></div>지정석</span>
          </div>
        </div>

        {/* Right: Action Area */}
        <div className="kiosk-action-pane">
          
          {!loggedInStudent ? (
            <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: 'none', border: 'none' }}>
              <h2 className="jua text-main" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>환영합니다!</h2>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>학번과 비밀번호를 입력하세요.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <input 
                  type="text" className="input-field" placeholder="학번 입력" value={studentId} 
                  onChange={e => setStudentId(e.target.value)} onKeyDown={e => e.key === 'Enter' && document.getElementById('pwd').focus()}
                />
                <input 
                  id="pwd" type="password" className="input-field" placeholder="비밀번호 입력" value={password} 
                  onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={handleLogin}>로그인</button>
              </div>

              <button onClick={() => setShowRegModal(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
                <UserPlus size={18} /> 신규 학생 가입하기
              </button>
            </div>
          ) : (
            <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
              <h2 className="jua text-main" style={{ fontSize: '2rem', marginBottom: '1rem' }}>{loggedInStudent.name} 학생</h2>
              
              {!session ? (
                <>
                  {loggedInStudent.assignedSeat ? (
                    <p className="text-muted" style={{ marginBottom: '2rem' }}>학생의 <b>지정석({loggedInStudent.assignedSeat})</b>으로 입실합니다.</p>
                  ) : (
                    <p className="text-muted" style={{ marginBottom: '2rem' }}>왼쪽 지도에서 앉을 <b>빈자리</b>를 선택해주세요.</p>
                  )}
                  
                  <select 
                    className="input-field" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginBottom: '1.5rem', opacity: loggedInStudent.assignedSeat ? 0.7 : 1 }}
                    value={selectedSeat} onChange={e => setSelectedSeat(e.target.value)}
                    disabled={!!loggedInStudent.assignedSeat}
                  >
                    {loggedInStudent.assignedSeat ? (
                      <option value={loggedInStudent.assignedSeat}>[지정석] 좌석 {loggedInStudent.assignedSeat}</option>
                    ) : (
                      <option value="">-- 빈자리 직접 선택 --</option>
                    )}
                    {!loggedInStudent.assignedSeat && seats.filter(s => s.type !== 'assigned' && !isOccupied(s.id) && !isOuting(s.id)).map(s => (
                      <option key={s.id} value={s.id}>[빈자리] 좌석 {s.id}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleCheckIn(selectedSeat)} disabled={!selectedSeat}
                  >
                    <CheckCircle size={24} /> 입실 완료하기
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>현재 상태: <strong className="text-accent">{session.status === 'IN' ? '입실 중' : '외출 중'}</strong> (좌석: {session.seatId})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {session.status === 'IN' ? (
                      <button className="btn btn-secondary" style={{ padding: '1.5rem', fontSize: '1.2rem', backgroundColor: 'var(--warning)', color: 'white', border: 'none' }} onClick={handleOuting}>외출하기</button>
                    ) : (
                      <button className="btn btn-primary" style={{ padding: '1.5rem', fontSize: '1.2rem' }} onClick={handleReturn}>복귀하기 (입실)</button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '1.5rem', fontSize: '1.2rem', backgroundColor: 'var(--danger)', color: 'white', border: 'none' }} onClick={handleCheckOut}>완전 퇴실하기</button>
                  </div>
                </>
              )}
              
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleChangePin}>비밀번호 변경</button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }} onClick={reset}>취소 및 처음으로</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRegModal && <RegistrationModal onClose={() => setShowRegModal(false)} onRegister={() => { setShowRegModal(false); loadData(); }} settings={settings} showAlert={showAlert} />}
      
      {showGuideModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card fade-in" style={{ width: '90%', maxWidth: '500px', padding: '2.5rem' }}>
            <h2 className="jua text-main" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>📖 학생 이용 안내</h2>
            <div style={{ lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '2rem' }}>
              <p><b>1. 처음 오신 분 (신규 가입)</b></p>
              <p style={{ marginLeft: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>하단의 [신규 학생 가입하기]를 눌러 학번, 이름, 비밀번호를 설정하고 자율학습 시간을 신청하세요.</p>
              
              <p><b>2. 입실 방법</b></p>
              <p style={{ marginLeft: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>학번과 비밀번호로 로그인 후, 왼쪽 지도에서 앉고 싶은 자리를 클릭하고 [입실 완료하기]를 누르세요.</p>
              
              <p><b>3. 외출 및 퇴실</b></p>
              <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>화장실이나 편의점 등 잠시 자리를 비울 때는 [외출하기]를 누르고 사유를 입력하세요. 자습이 완전히 끝나고 집에 갈 때만 [완전 퇴실하기]를 눌러야 자리가 반납됩니다.</p>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={() => setShowGuideModal(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrationModal({ onClose, onRegister, settings, showAlert }) {
  const [form, setForm] = useState({ id: '', name: '', grade: '1학년', password: '', weekdayDays: {월:[], 화:[], 수:[], 목:[], 금:[]}, weekendDays: {토:[], 일:[]} });
  
  const handleSave = async () => {
    if (!form.id || !form.name || !form.password) return await showAlert("필수 항목을 모두 입력하세요.");
    await saveStudent(form);
    await showAlert("가입 완료! 로그인해주세요.");
    onRegister();
  };

  const togglePeriod = (isWeekend, day, period) => {
    const key = isWeekend ? 'weekendDays' : 'weekdayDays';
    const dayData = form[key][day] || [];
    const newData = dayData.includes(period) ? dayData.filter(p => p !== period) : [...dayData, period].sort((a,b)=>a-b);
    setForm({ ...form, [key]: { ...form[key], [day]: newData } });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card fade-in modal-content-wrapper" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="jua text-main" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>신규 학생 등록</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="input-group">
            <label className="input-label">학번</label>
            <input className="input-field" placeholder="예: 10101" value={form.id} onChange={e => setForm({...form, id: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label">이름</label>
            <input className="input-field" placeholder="예: 홍길동" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label">학년</label>
            <select className="input-field" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
              <option value="1학년">1학년</option><option value="2학년">2학년</option><option value="3학년">3학년</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">비밀번호 설정</label>
            <input type="password" className="input-field" placeholder="4자리 이상" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 className="font-bold text-accent" style={{ marginBottom: '1rem' }}>자습 시간표 신청</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <p className="text-sm font-bold text-muted mb-2">평일 (월~금)</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {['월','화','수','목','금'].map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '20px', fontWeight: 'bold' }}>{d}</span>
                  {Array.from({length: settings.weekdayMaxPeriods}).map((_, i) => {
                    const active = form.weekdayDays[d].includes(i+1);
                    return (
                      <button key={i} onClick={() => togglePeriod(false, d, i+1)} style={{ flex: 1, padding: '0.3rem', border: '1px solid var(--border)', backgroundColor: active ? 'var(--accent)' : 'white', color: active ? 'white' : 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}>
                        {i+1}교시
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-muted mb-2">주말 (토~일)</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {['토','일'].map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '20px', fontWeight: 'bold' }}>{d}</span>
                  {Array.from({length: settings.weekendMaxPeriods}).map((_, i) => {
                    const active = form.weekendDays[d].includes(i+1);
                    return (
                      <button key={i} onClick={() => togglePeriod(true, d, i+1)} style={{ flex: 1, padding: '0.3rem', border: '1px solid var(--border)', backgroundColor: active ? 'var(--accent)' : 'white', color: active ? 'white' : 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}>
                        {i+1}교시
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>가입하기</button>
        </div>
      </div>
    </div>
  );
}
