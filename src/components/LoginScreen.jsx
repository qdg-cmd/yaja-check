import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [pwd, setPwd] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(pwd);
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel fade-in" style={{ padding: '3rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 className="jua text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>자율학습 스마트 체크인</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>시스템 접속 비밀번호를 입력해주세요.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Lock size={20} className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="password" 
              className="input-field" 
              style={{ width: '100%', paddingLeft: '3rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} 
              placeholder="비밀번호" 
              value={pwd} 
              onChange={e => setPwd(e.target.value)} 
              autoFocus 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }}>접속하기</button>
        </form>
      </div>
    </div>
  );
}
