import { useState, useEffect, useRef } from 'react';
import { getStudents, saveStudent, deleteStudent } from '../dataService';
import { Trash2, Plus, Download, Upload, RefreshCw, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useModal } from './ModalProvider';

export default function StudentManager({ settings }) {
  const { showPrompt, showConfirm, showAlert } = useModal();
  const [students, setStudents] = useState([]);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('weekday'); 

  useEffect(() => { loadData(); }, []);
  const loadData = async () => setStudents(await getStudents());

  const handleResetPwd = async (st) => {
    const ok = await showConfirm(`${st.name} 학생의 비밀번호를 '0000'으로 초기화하시겠습니까?`, "비밀번호 초기화");
    if (ok) {
      await saveStudent({ ...st, password: '0000' });
      loadData();
      await showAlert("초기화되었습니다.");
    }
  };

  const handleToggleDay = async (student, day, period, isWeekend) => {
    const daysKey = isWeekend ? 'weekendDays' : 'weekdayDays';
    const stDays = student[daysKey] || {};
    const dayArr = stDays[day] || [];
    
    if (dayArr.includes(period)) {
      stDays[day] = dayArr.filter(p => p !== period);
    } else {
      stDays[day] = [...dayArr, period].sort((a,b)=>a-b);
    }
    
    await saveStudent({ ...student, [daysKey]: stDays });
    loadData();
  };

  const handleDelete = async (id) => {
    const ok = await showConfirm("정말 삭제하시겠습니까? 관련 데이터가 지워집니다.", "학생 삭제");
    if (ok) {
      await deleteStudent(id);
      loadData();
    }
  };

  const handleAddStudent = async () => {
    const id = await showPrompt("새 학생의 학번을 입력하세요:", "학생 추가");
    if (!id) return;
    const existing = students.find(s => s.id === id);
    if (existing) {
      return await showAlert("이미 존재하는 학번입니다.");
    }
    const name = await showPrompt("학생의 이름을 입력하세요:", "학생 추가");
    if (!name) return;
    
    const newSt = {
      id, name, grade: '1학년', password: '0000', assignedSeat: '',
      weekdayDays: {}, weekendDays: {}
    };
    await saveStudent(newSt);
    loadData();
  };

  const handleChange = async (st, field, value) => {
    const updated = { ...st, [field]: value };
    await saveStudent(updated);
    setStudents(students.map(s => s.id === st.id ? updated : s));
  };

  const maxP = mode === 'weekday' ? settings.weekdayMaxPeriods : settings.weekendMaxPeriods;
  const daysList = mode === 'weekday' ? ['월','화','수','목','금'] : ['토','일'];

  const downloadTemplate = () => {
    const data = [
      ['학년', '학번', '이름', '비밀번호', '지정석', ...daysList.flatMap(d => Array.from({length: maxP}).map((_, i) => `${d}${i+1}`))]
    ];

    if (students.length === 0) {
      // 학생이 한 명도 없으면 예시 데이터(양식) 제공
      data.push(['1학년', '10101', '홍길동', '0000', 'S1', ...daysList.flatMap(d => Array.from({length: maxP}).map((_, i) => (i < 2 ? 'O' : 'X')))]);
    } else {
      // 현재 학생 데이터 엑셀화
      const sortedStudents = [...students].sort((a,b) => a.id.localeCompare(b.id));
      for (const st of sortedStudents) {
        const daysData = mode === 'weekday' ? (st.weekdayDays || {}) : (st.weekendDays || {});
        const row = [st.grade || '1학년', st.id, st.name, st.password || '0000', st.assignedSeat || ''];
        
        for (const d of daysList) {
          for (let p = 1; p <= maxP; p++) {
            const isO = (daysData[d] || []).includes(p);
            row.push(isO ? 'O' : 'X');
          }
        }
        data.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === 'weekday' ? '평일명단' : '주말명단');
    XLSX.writeFile(wb, `스마트출석부_${mode === 'weekday' ? '평일' : '주말'}명단.xlsx`);
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
        if (!row['학번'] || !row['이름']) continue;
        const id = String(row['학번']);
        
        let parsedDays = {};
        daysList.forEach(d => {
          parsedDays[d] = [];
          for (let p = 1; p <= maxP; p++) {
             const val = row[`${d}${p}`];
             if (val === 'O' || val === 'o' || val === 'ㅇ') {
               parsedDays[d].push(p);
             }
          }
        });

        const st = {
          id,
          name: String(row['이름']),
          grade: row['학년'] ? String(row['학년']) : '1학년',
          password: row['비밀번호'] ? String(row['비밀번호']) : '0000',
          assignedSeat: row['지정석'] ? String(row['지정석']) : ''
        };

        const existing = students.find(s => s.id === id) || {};
        if (mode === 'weekday') {
          st.weekdayDays = parsedDays;
          st.weekendDays = existing.weekendDays || {};
        } else {
          st.weekendDays = parsedDays;
          st.weekdayDays = existing.weekdayDays || {};
        }
        if (!row['지정석'] && existing.assignedSeat) st.assignedSeat = existing.assignedSeat;

        await saveStudent({...existing, ...st});
        count++;
      }
      await showAlert(`${count}명의 학생 데이터가 업로드되었습니다.`);
      loadData();
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  return (
    <div className="card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="jua" style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-main)' }}>전체 학생 관리</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${mode === 'weekday' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('weekday')}>평일 명단</button>
          <button className={`btn ${mode === 'weekend' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('weekend')}>주말 명단</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleAddStudent}>
          <Plus size={18} /> 학생 추가
        </button>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={downloadTemplate} title="현재 등록된 학생 명단 엑셀을 다운로드합니다. 수정 후 다시 업로드하면 덮어쓰기 됩니다.">
          <Download size={18} /> 현재 명단(엑셀) 다운로드
        </button>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', border: 'none' }} onClick={() => fileInputRef.current?.click()}>
          <Upload size={18} /> 엑셀 일괄 업로드
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
      </div>

      <div className="table-container desktop-table">
        <table>
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              <th>학년</th>
              <th>지정석(선택)</th>
              <th style={{ width: '120px' }}>비밀번호 초기화</th>
              {daysList.map(d => (
                <th key={d} style={{ textAlign: 'center' }}>
                  {d}요일
                  <div style={{ display: 'flex', fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>
                    {Array.from({length: maxP}).map((_, i) => <div key={i} style={{flex: 1}}>{i+1}</div>)}
                  </div>
                </th>
              ))}
              <th style={{ width: '60px' }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {students.map(st => (
              <StudentRow 
                key={st.id} 
                st={st} 
                mode={mode} 
                maxP={maxP} 
                daysList={daysList}
                handleResetPwd={handleResetPwd}
                handleToggleDay={handleToggleDay}
                handleDelete={handleDelete}
                handleChange={handleChange}
              />
            ))}
            {students.length === 0 && (
              <tr><td colSpan={7 + daysList.length} style={{ textAlign: 'center', padding: '2rem' }}>등록된 학생이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mobile-cards">
        {students.map(st => (
          <MobileStudentCard
            key={st.id}
            st={st}
            mode={mode}
            maxP={maxP}
            daysList={daysList}
            handleResetPwd={handleResetPwd}
            handleToggleDay={handleToggleDay}
            handleDelete={handleDelete}
            handleChange={handleChange}
          />
        ))}
        {students.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">등록된 학생이 없습니다.</div>
        )}
      </div>

    </div>
  );
}

function MobileStudentCard({ st, mode, maxP, daysList, handleResetPwd, handleToggleDay, handleDelete, handleChange }) {
  const [localSeat, setLocalSeat] = useState(st.assignedSeat || '');
  useEffect(() => { setLocalSeat(st.assignedSeat || ''); }, [st.assignedSeat]);

  return (
    <div className="mobile-card">
      <div className="mobile-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="font-bold text-lg">{st.name}</span>
          <span className="text-muted text-sm">{st.id}</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDelete(st.id)}>
          <Trash2 size={18} />
        </button>
      </div>
      <div className="mobile-card-body">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <select className="input-field" style={{ flex: 1, padding: '0.4rem' }} value={st.grade || '1학년'} onChange={e => handleChange(st, 'grade', e.target.value)}>
            <option>1학년</option><option>2학년</option><option>3학년</option>
          </select>
          <input 
            type="text" className="input-field" style={{ flex: 1, padding: '0.4rem' }} placeholder="지정석 (예: S1)" 
            value={localSeat} onChange={e => setLocalSeat(e.target.value)}
            onBlur={() => { if (localSeat !== (st.assignedSeat || '')) handleChange(st, 'assignedSeat', localSeat); }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
          {daysList.map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', width: '30px' }}>{d}</span>
              <div style={{ display: 'flex', flex: 1, gap: '2px' }}>
                {Array.from({length: maxP}).map((_, i) => {
                  const daysData = st[mode === 'weekday' ? 'weekdayDays' : 'weekendDays'] || {};
                  const isActive = (daysData[d] || []).includes(i + 1);
                  return (
                    <div 
                      key={i}
                      onClick={() => handleToggleDay(st, d, i + 1, mode === 'weekend')}
                      style={{ 
                        flex: 1, height: '30px', backgroundColor: isActive ? 'var(--accent)' : 'white',
                        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer', borderRadius: '3px', transition: '0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isActive ? 'white' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold'
                      }}
                    >{i+1}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }} onClick={() => handleResetPwd(st)}>
          <RefreshCw size={14} style={{ display: 'inline', marginRight: '4px' }} /> 비밀번호 0000 초기화
        </button>
      </div>
    </div>
  );
}

function StudentRow({ st, mode, maxP, daysList, handleResetPwd, handleToggleDay, handleDelete, handleChange }) {
  const [localName, setLocalName] = useState(st.name || '');
  const [localSeat, setLocalSeat] = useState(st.assignedSeat || '');
  
  useEffect(() => { setLocalName(st.name || ''); }, [st.name]);
  useEffect(() => { setLocalSeat(st.assignedSeat || ''); }, [st.assignedSeat]);

  const daysKey = mode === 'weekday' ? 'weekdayDays' : 'weekendDays';
  const daysData = st[daysKey] || {};

  return (
    <tr>
      <td className="font-bold">{st.id}</td>
      <td>
        <input 
          type="text" className="input-field" style={{ padding: '0.4rem', width: '100px' }} 
          value={localName} onChange={e => setLocalName(e.target.value)} 
          onBlur={() => { if (localName !== st.name) handleChange(st, 'name', localName); }}
        />
      </td>
      <td>
        <select className="input-field" style={{ padding: '0.4rem' }} value={st.grade || '1학년'} onChange={e => handleChange(st, 'grade', e.target.value)}>
          <option>1학년</option><option>2학년</option><option>3학년</option>
        </select>
      </td>
      <td>
        <input 
          type="text" className="input-field" style={{ padding: '0.4rem', width: '80px' }} placeholder="예: S1" 
          value={localSeat} onChange={e => setLocalSeat(e.target.value)} 
          onBlur={() => { if (localSeat !== (st.assignedSeat || '')) handleChange(st, 'assignedSeat', localSeat); }}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleResetPwd(st)}>
          <RefreshCw size={14} style={{ display: 'inline', marginRight: '4px' }} /> 0000 설정
        </button>
      </td>
      {daysList.map(d => (
        <td key={d} style={{ padding: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {Array.from({length: maxP}).map((_, i) => {
              const isActive = (daysData[d] || []).includes(i + 1);
              return (
                <div 
                  key={i}
                  onClick={() => handleToggleDay(st, d, i + 1, mode === 'weekend')}
                  style={{ 
                    flex: 1, height: '24px', backgroundColor: isActive ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer', borderRadius: '3px', transition: '0.2s'
                  }}
                  title={`${d}요일 ${i+1}교시 ${isActive ? '취소' : '선택'}`}
                ></div>
              );
            })}
          </div>
        </td>
      ))}
      <td style={{ textAlign: 'center' }}>
        <button onClick={() => handleDelete(st.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}
