import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

export default function SeatSelectorModal({ student, seats, sessions, onSelect, onClose }) {
  const [selectedSeat, setSelectedSeat] = useState('');
  
  const isOccupied = (seatId) => sessions.some(s => s.seatId === seatId && s.status === 'IN');
  const isOuting = (seatId) => sessions.some(s => s.seatId === seatId && s.status === 'OUTING');

  const handleConfirm = () => {
    if (!selectedSeat) return alert("자리를 선택해주세요.");
    onSelect(selectedSeat);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div className="card fade-in modal-content-wrapper no-padding" style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="jua" style={{ fontSize: '1.8rem', margin: 0 }}>환영합니다, {student.name} 학생!</h2>
            <p style={{ margin: '0.2rem 0 0 0', opacity: 0.9 }}>앉으실 자유석을 선택하고 입실을 완료해주세요.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={28} /></button>
        </div>
        
        <div className="split-layout" style={{ display: 'flex', padding: '1.5rem', gap: '1.5rem', backgroundColor: '#f8fafc' }}>
          
          {/* Mini-map Area */}
          <div style={{ flex: 1.5 }}>
            <h3 className="font-bold text-main" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🗺️ 도면 미니맵
            </h3>
            <div style={{ 
              position: 'relative', width: '100%', height: '350px', 
              background: 'white', borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow-inner)', border: '1px solid var(--border)',
              backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '20px 20px',
              overflow: 'auto'
            }}>
              {/* Map scaled down slightly */}
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', minWidth: '600px', minHeight: '400px' }}>
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

                  const isSelectable = !assigned && !occupied && !outing;

                  return (
                    <div 
                      key={seat.id}
                      onClick={() => isSelectable && setSelectedSeat(seat.id)}
                      style={{
                        position: 'absolute', left: seat.x, top: seat.y,
                        width: '50px', height: '50px',
                        backgroundColor: bgColor, border: `2px solid ${borderColor}`, borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isSelectable ? 'pointer' : 'not-allowed', color: textColor,
                        fontWeight: 'bold', fontSize: '0.75rem', boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        transform: selectedSeat === seat.id ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, border: '2px solid var(--border)', background:'white', borderRadius: 3}}></div>빈자리(선택가능)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'var(--success)', borderRadius: 3}}></div>사용중</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'var(--warning)', borderRadius: 3}}></div>외출중</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{width: 12, height:12, background:'#f1f5f9', borderRadius: 3}}></div>지정석(불가)</span>
            </div>
          </div>

          {/* Selection & Action Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
            
            <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>좌석 선택 (드롭박스)</label>
              <select 
                className="input-field" 
                style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginBottom: '1rem' }}
                value={selectedSeat}
                onChange={e => setSelectedSeat(e.target.value)}
              >
                <option value="">-- 빈자리 선택 --</option>
                {seats.filter(s => s.type !== 'assigned' && !isOccupied(s.id) && !isOuting(s.id)).map(s => (
                  <option key={s.id} value={s.id}>[빈자리] 좌석 {s.id}</option>
                ))}
              </select>

              <div style={{ textAlign: 'center', padding: '1.5rem 0', borderTop: '1px dashed var(--border)' }}>
                <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>선택된 좌석</p>
                <h3 className="jua text-accent" style={{ fontSize: '2.5rem', margin: 0 }}>
                  {selectedSeat || '-'}
                </h3>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleConfirm}
              disabled={!selectedSeat}
            >
              <CheckCircle size={24} /> 입실 완료하기
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
