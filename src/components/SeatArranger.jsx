import { useState, useEffect } from 'react';
import { getSeats, saveSeats, getStudents, saveStudent, getActiveSessions, updateSession } from '../dataService';
import { Plus, Minus, Save, Grid, MousePointer2, Brush, Type, PenTool } from 'lucide-react';
import { useModal } from './ModalProvider';

export default function SeatArranger() {
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [seats, setSeats] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [touchDrag, setTouchDrag] = useState(null);
  
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [gap, setGap] = useState(10);
  
  const [toolMode, setToolMode] = useState('MOVE'); // 'MOVE', 'TOGGLE', 'RENAME'
  const [mapZoom, setMapZoom] = useState(1.0);
  
  const zoomIn = () => setMapZoom(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setMapZoom(prev => Math.max(prev - 0.1, 0.4));

  const GRID_SIZE = 20;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setSeats(await getSeats());
  };

  const handleAddSeat = async (type) => {
    const id = await showPrompt("새로운 좌석 번호/이름을 입력하세요:", "좌석 추가");
    if (!id) return;
    if (seats.some(s => s.id === id)) return await showAlert("이미 존재하는 이름입니다.");
    
    // Spread them out so they don't overlap exactly
    const offset = (seats.length % 10) * GRID_SIZE;
    const newSeats = [...seats, { id, type, x: 20 + offset, y: 20 + offset }];
    setSeats(newSeats);
  };

  const handleDeleteSeat = async (id) => {
    const ok = await showConfirm(`'${id}' 좌석을 삭제하시겠습니까?`, "좌석 삭제");
    if (ok) {
      setSeats(seats.filter(s => s.id !== id));
    }
  };

  const handleSeatClick = async (seat) => {
    if (toolMode === 'MOVE') return; // Handled by drag
    
    if (toolMode === 'TOGGLE') {
      const newType = seat.type === 'assigned' ? 'free' : 'assigned';
      setSeats(seats.map(s => s.id === seat.id ? { ...s, type: newType } : s));
    }
    
    if (toolMode === 'RENAME') {
      const newId = await showPrompt(`'${seat.id}' 좌석의 새 이름을 입력하세요:`, seat.id);
      if (!newId || newId === seat.id) return;
      if (seats.some(s => s.id === newId)) return await showAlert("이미 존재하는 이름입니다.");
      
      setSeats(seats.map(s => s.id === seat.id ? { ...s, id: newId } : s));
      
      // Update relational references
      const students = await getStudents();
      let updated = false;
      for (const st of students) {
        if (st.assignedSeat === seat.id) {
          st.assignedSeat = newId;
          await saveStudent(st);
          updated = true;
        }
      }
      
      const sessions = await getActiveSessions();
      for (const session of sessions) {
        if (session.seatId === seat.id) {
          session.seatId = newId;
          await updateSession(session.studentId, session);
        }
      }
      
      if (updated) await showAlert("해당 좌석이 할당된 학생 정보도 함께 변경되었습니다.");
    }
  };

  const handleSave = async () => {
    await saveSeats(seats);
    await showAlert("도면이 저장되었습니다.");
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDragging(id);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    
    let rawX = (e.clientX - rect.left) / mapZoom - 25; 
    let rawY = (e.clientY - rect.top) / mapZoom - 25;
    
    const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

    setSeats(seats.map(s => s.id === id ? { ...s, x: Math.max(0, x), y: Math.max(0, y) } : s));
    setDragging(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleTouchStart = (e, seat) => {
    if (toolMode !== 'MOVE') return;
    const touch = e.touches[0];
    setTouchDrag({
      seatId: seat.id,
      startX: touch.clientX,
      startY: touch.clientY,
      seatX: seat.x,
      seatY: seat.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!touchDrag) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - touchDrag.startX) / mapZoom;
    const dy = (touch.clientY - touchDrag.startY) / mapZoom;
    
    const rawX = touchDrag.seatX + dx;
    const rawY = touchDrag.seatY + dy;
    const newX = Math.max(0, Math.round(rawX / GRID_SIZE) * GRID_SIZE);
    const newY = Math.max(0, Math.round(rawY / GRID_SIZE) * GRID_SIZE);
    
    setSeats(prev => prev.map(s => s.id === touchDrag.seatId ? { ...s, x: newX, y: newY } : s));
  };

  const handleTouchEnd = () => {
    setTouchDrag(null);
  };

  const handleAutoGrid = async () => {
    const ok = await showConfirm(`현재 배치된 좌석들이 모두 삭제되고 ${rows * cols}개의 자유석이 자동 배치됩니다.\n진행하시겠습니까?`, "자동 바둑판 생성");
    if (!ok) return;
    
    const newSeats = [];
    let count = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (50 + gap) + 20; 
        const y = r * (50 + gap) + 20;
        newSeats.push({ id: String(count), type: 'free', x, y });
        count++;
      }
    }
    setSeats(newSeats);
  };

  return (
    <div className="flex-row-to-col responsive-gap" style={{ flexWrap: 'wrap' }}>
      
      <div className="card fade-in" style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem', alignSelf: 'flex-start' }}>
        <h2 className="jua text-main" style={{ fontSize: '1.5rem', margin: 0 }}>좌석 배치 도구</h2>
        
        <div>
          <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleAddSeat('free')}>
            <Plus size={18} /> 일반 빈자리(자유석) 추가
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleAddSeat('assigned')}>
            <Plus size={18} /> 지정석/고정석 추가
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <h3 className="font-bold text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PenTool size={16} /> 마우스 도구 모드</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${toolMode === 'MOVE' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }} onClick={() => setToolMode('MOVE')}>
              <MousePointer2 size={16} /> 이동
            </button>
            <button className={`btn ${toolMode === 'TOGGLE' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }} onClick={() => setToolMode('TOGGLE')} title="클릭 시 지정석/자유석 전환">
              <Brush size={16} /> 속성 전환
            </button>
            <button className={`btn ${toolMode === 'RENAME' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }} onClick={() => setToolMode('RENAME')} title="클릭 시 이름 변경">
              <Type size={16} /> 이름 변경
            </button>
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <h3 className="font-bold text-sm mb-2 no-wrap-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Grid size={16} /> 자동 바둑판 배열</h3>
          <div className="stack-mobile" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}><label className="text-sm font-bold no-wrap-mobile">가로 열</label><input type="number" className="input-field" style={{width: '100%'}} value={cols} onChange={e=>setCols(Number(e.target.value))} /></div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}><label className="text-sm font-bold no-wrap-mobile">세로 행</label><input type="number" className="input-field" style={{width: '100%'}} value={rows} onChange={e=>setRows(Number(e.target.value))} /></div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}><label className="text-sm font-bold no-wrap-mobile">간격(px)</label><input type="number" className="input-field" style={{width: '100%'}} value={gap} onChange={e=>setGap(Number(e.target.value))} /></div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAutoGrid}>자동 배치 생성</button>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.1rem' }} onClick={handleSave}>
          <Save size={20} /> 도면 저장하기
        </button>
        
        <p className="text-muted text-sm" style={{ lineHeight: 1.6 }}>
          * [이동] 마우스 드래그 또는 터치로 좌석을 끌어서 배치하세요.<br/>
          * [속성 전환] 붓으로 클릭해 지정/자유석을 전환합니다.<br/>
          * [이름 변경] 붓으로 클릭해 좌석 이름을 변경합니다.<br/>
          * 좌석을 더블클릭하면 즉시 삭제됩니다.
        </p>
      </div>

      <div 
        className="card fade-in map-scroll-container"
        style={{ 
          flex: 3, minHeight: '600px', position: 'relative', minWidth: 0,
          backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', 
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          border: '2px dashed var(--border)',
          overflow: 'hidden'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
          <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomIn} title="확대"><Plus size={18} /></button>
          <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={zoomOut} title="축소"><Minus size={18} /></button>
        </div>
        <div style={{ transform: `scale(${mapZoom})`, transformOrigin: 'top left', width: '100%', height: '100%', minWidth: '800px', minHeight: '600px', position: 'absolute', top: 0, left: 0, transition: 'transform 0.2s' }}>
          {seats.map(seat => (
            <div
              key={seat.id}
              draggable={toolMode === 'MOVE'}
              onDragStart={(e) => handleDragStart(e, seat.id)}
              onTouchStart={(e) => handleTouchStart(e, seat)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onDoubleClick={() => handleDeleteSeat(seat.id)}
              onClick={() => handleSeatClick(seat)}
              style={{
                position: 'absolute',
                left: seat.x,
                top: seat.y,
                width: '50px',
                height: '50px',
                backgroundColor: seat.type === 'assigned' ? '#f1f5f9' : 'white',
                border: `2px solid ${seat.type === 'assigned' ? '#cbd5e1' : 'var(--border)'}`,
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: toolMode === 'MOVE' ? 'grab' : 'pointer',
                color: seat.type === 'assigned' ? '#cbd5e1' : 'var(--text-main)',
                fontWeight: 'bold', fontSize: '0.8rem',
                boxShadow: (dragging === seat.id || touchDrag?.seatId === seat.id) ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                opacity: (dragging === seat.id || touchDrag?.seatId === seat.id) ? 0.6 : 1,
                touchAction: toolMode === 'MOVE' ? 'none' : 'auto',
                userSelect: 'none'
              }}
            >
              {seat.id}
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
