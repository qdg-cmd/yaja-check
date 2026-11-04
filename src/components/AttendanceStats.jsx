import { useState, useEffect } from 'react';
import { getStudents, getAttendanceLogs } from '../dataService';

export default function AttendanceStats({ settings }) {
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  });
  const [gradeFilter, setGradeFilter] = useState('');
  const [mode, setMode] = useState('weekday'); // weekday | weekend
  const [activeTab, setActiveTab] = useState('summary'); // summary | 1 | 2 | 3 | 4 | 5
  const [detailModal, setDetailModal] = useState(null); // { date, studentId, periods }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setStudents(await getStudents());
    setLogs(await getAttendanceLogs());
  };

  // Helper to get days in month
  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysCount = getDaysInMonth(year, month);
  
  // Build calendar data
  const calendar = [];
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isWeekend = [0, 6].includes(dayOfWeek);
    calendar.push({ d, dateStr, dayOfWeek, isWeekend });
  }

  // Filter calendar by mode
  const filteredCalendar = calendar.filter(c => mode === 'weekday' ? !c.isWeekend : c.isWeekend);
  
  // Group by weeks for the tabs (roughly chunks of 7 days in the filtered calendar, or by actual week number)
  // Let's just group actual calendar weeks
  const weeks = [];
  let currentWeek = [];
  filteredCalendar.forEach((c) => {
    currentWeek.push(c);
    // If it's a Sunday (0) or end of month, push week
    if ((mode === 'weekday' && c.dayOfWeek === 5) || (mode === 'weekend' && c.dayOfWeek === 0) || c.d === daysCount) {
      if (currentWeek.length > 0) weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek); // Push remainder

  const maxP = mode === 'weekday' ? settings.weekdayMaxPeriods : settings.weekendMaxPeriods;

  const filteredStudents = students.filter(s => {
    if (gradeFilter && s.grade !== gradeFilter) return false;
    return true;
  });

  const getStudentStats = (student) => {
    const studentLogs = logs.filter(l => l.studentId === student.id && l.date.startsWith(selectedMonth));
    let totalAssigned = 0;
    let totalAttended = 0;

    filteredCalendar.forEach(c => {
      const dayName = ['일','월','화','수','목','금','토'][c.dayOfWeek];
      const sDays = mode === 'weekday' ? student.weekdayDays : student.weekendDays;
      const scheduledPeriods = sDays?.[dayName] || [];
      totalAssigned += scheduledPeriods.length;

      const log = studentLogs.find(l => l.date === c.dateStr);
      if (log && log.periods) {
        Object.values(log.periods).forEach(status => {
          if (status === 'PRESENT' || status === 'UNSCHEDULED') {
            totalAttended++;
          }
        });
      }
    });

    const rate = totalAssigned > 0 ? Math.round((totalAttended / totalAssigned) * 100) : 0;
    return { totalAssigned, totalAttended, rate };
  };

  return (
    <div className="card fade-in">
      {/* Top Controls */}
      <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="wrap-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <h2 className="jua text-main no-wrap-mobile" style={{ fontSize: '1.5rem', margin: 0, paddingRight: '0.5rem' }}>📈 월간 출결 현황</h2>
          <input type="month" className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          
          <select className="input-field" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
            <option value="">학년 전체</option>
            <option value="1학년">1학년</option>
            <option value="2학년">2학년</option>
            <option value="3학년">3학년</option>
          </select>
          <button className="btn btn-secondary no-wrap-mobile" onClick={() => {setGradeFilter(''); setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);}}>초기화</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn no-wrap-mobile ${mode === 'weekday' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setMode('weekday'); setActiveTab('summary');}}>평일 명단</button>
          <button className={`btn no-wrap-mobile ${mode === 'weekend' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setMode('weekend'); setActiveTab('summary');}}>주말 명단</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="scrollable-tabs-mobile" style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1rem' }}>
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>전체 요약</TabButton>
        {weeks.map((w, i) => (
          <TabButton key={i} active={activeTab === i} onClick={() => setActiveTab(i)}>
            {i + 1}주차 ({w[0].d}~{w[w.length-1].d}일)
          </TabButton>
        ))}
      </div>

      <div className="table-container desktop-table">
        <table>
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              {activeTab === 'summary' ? (
                <>
                  <th style={{ textAlign: 'center' }}>총 지정 교시</th>
                  <th style={{ textAlign: 'center' }}>총 출석 교시</th>
                  <th style={{ textAlign: 'center' }}>월간 출석률</th>
                </>
              ) : (
                weeks[activeTab]?.map(c => (
                  <th key={c.d} style={{ textAlign: 'center' }}>{c.d}일 ( {['일','월','화','수','목','금','토'][c.dayOfWeek]} )</th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(st => {
              const stats = getStudentStats(st);
              const sDays = mode === 'weekday' ? st.weekdayDays : st.weekendDays;
              const studentLogs = logs.filter(l => l.studentId === st.id && l.date.startsWith(selectedMonth));

              return (
                <tr key={st.id}>
                  <td className="font-bold">{st.id}</td>
                  <td>{st.name}</td>
                  {activeTab === 'summary' ? (
                    <>
                      <td style={{ textAlign: 'center' }}>{stats.totalAssigned}</td>
                      <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 'bold' }}>{stats.totalAttended}</td>
                      <td style={{ textAlign: 'center' }}>{stats.rate}%</td>
                    </>
                  ) : (
                    weeks[activeTab]?.map(c => {
                      const dayName = ['일','월','화','수','목','금','토'][c.dayOfWeek];
                      const scheduledPeriods = sDays?.[dayName] || [];
                      const log = studentLogs.find(l => l.date === c.dateStr);
                      
                      let dotColor = 'transparent';
                      let hasData = false;

                      if (log && log.periods) {
                        const statuses = Object.values(log.periods);
                        if (statuses.includes('PRESENT')) { dotColor = 'var(--success)'; hasData = true; }
                        else if (statuses.includes('UNSCHEDULED')) { dotColor = 'var(--warning)'; hasData = true; }
                        else if (statuses.includes('ABSENT')) { dotColor = 'var(--danger)'; hasData = true; }
                      } else if (scheduledPeriods.length > 0 && new Date(c.dateStr) < new Date()) {
                        // Past scheduled date with no log = absent
                        dotColor = 'var(--danger)';
                        hasData = true;
                      }

                      return (
                        <td key={c.d} style={{ textAlign: 'center' }}>
                          {hasData ? (
                            <div 
                              style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: dotColor, margin: '0 auto', cursor: 'pointer' }}
                              onClick={() => setDetailModal({ date: c.dateStr, student: st, scheduledPeriods, periods: log?.periods || {} })}
                              title="클릭 시 상세 교시 내역 확인"
                            ></div>
                          ) : '-'}
                        </td>
                      );
                    })
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-cards">
        {filteredStudents.map(st => {
          const stats = getStudentStats(st);
          const sDays = mode === 'weekday' ? st.weekdayDays : st.weekendDays;
          const studentLogs = logs.filter(l => l.studentId === st.id && l.date.startsWith(selectedMonth));

          return (
            <div key={st.id} className="mobile-card">
              <div className="mobile-card-header">
                <div>
                  <span className="font-bold text-lg" style={{ marginRight: '8px' }}>{st.name}</span>
                  <span className="text-muted text-sm">{st.id}</span>
                </div>
                {activeTab === 'summary' && (
                  <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{stats.rate}%</div>
                )}
              </div>
              <div className="mobile-card-body">
                {activeTab === 'summary' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f1f5f9', borderRadius: '4px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="text-muted text-sm">총 지정</div>
                      <div className="font-bold">{stats.totalAssigned}교시</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="text-muted text-sm">총 출석</div>
                      <div className="font-bold text-accent">{stats.totalAttended}교시</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {weeks[activeTab]?.map(c => {
                      const dayName = ['일','월','화','수','목','금','토'][c.dayOfWeek];
                      const scheduledPeriods = sDays?.[dayName] || [];
                      const log = studentLogs.find(l => l.date === c.dateStr);
                      
                      let dotColor = 'transparent';
                      let hasData = false;

                      if (log && log.periods) {
                        const statuses = Object.values(log.periods);
                        if (statuses.includes('PRESENT')) { dotColor = 'var(--success)'; hasData = true; }
                        else if (statuses.includes('UNSCHEDULED')) { dotColor = 'var(--warning)'; hasData = true; }
                        else if (statuses.includes('ABSENT')) { dotColor = 'var(--danger)'; hasData = true; }
                      } else if (scheduledPeriods.length > 0 && new Date(c.dateStr) < new Date()) {
                        dotColor = 'var(--danger)';
                        hasData = true;
                      }

                      return (
                        <div key={c.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'white' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{c.d}일</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{dayName}</span>
                          {hasData ? (
                            <div 
                              style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: dotColor, cursor: 'pointer' }}
                              onClick={() => setDetailModal({ date: c.dateStr, student: st, scheduledPeriods, periods: log?.periods || {} })}
                            ></div>
                          ) : <span style={{ color: 'var(--border)' }}>-</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', justifyContent: 'center' }}>
        <span>🟢 전교시/부분 출석</span>
        <span>🟡 미신청 출석</span>
        <span>🔴 결석 (클릭 시 상세 확인)</span>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card fade-in modal-content-wrapper" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 className="jua text-main" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              {detailModal.date} ({detailModal.student.name}) 상세 출결
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {Array.from({ length: maxP }).map((_, i) => {
                const p = String(i + 1);
                const isScheduled = detailModal.scheduledPeriods.includes(i + 1);
                const status = detailModal.periods[p];
                
                let text = '-';
                let color = 'var(--text-muted)';
                if (status === 'PRESENT') { text = '출석'; color = 'var(--success)'; }
                else if (status === 'UNSCHEDULED') { text = '미신청 출석'; color = 'var(--warning)'; }
                else if (status === 'ABSENT' || (!status && isScheduled && new Date(detailModal.date) < new Date())) { text = '결석'; color = 'var(--danger)'; }
                else if (isScheduled) { text = '지정 교시(미도래)'; color = 'var(--border)'; }

                return (
                  <div key={p} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{p}교시</div>
                    <div style={{ color, fontWeight: 'bold' }}>{text}</div>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setDetailModal(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button 
      className="no-wrap-mobile"
      onClick={onClick}
      style={{ 
        padding: '0.8rem 1.5rem', 
        border: 'none', 
        background: 'none', 
        borderBottom: active ? '3px solid var(--accent)' : '3px solid transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer',
        fontSize: '1rem'
      }}
    >
      {children}
    </button>
  );
}
