import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export function useModal() {
  return useContext(ModalContext);
}

export function ModalProvider({ children }) {
  const [modalConfig, setModalConfig] = useState(null);

  // type: 'alert' | 'confirm' | 'prompt'
  const showModal = useCallback((type, title, message, defaultValue = '') => {
    return new Promise((resolve) => {
      setModalConfig({
        type, title, message, defaultValue,
        onConfirm: (val) => {
          setModalConfig(null);
          resolve(type === 'prompt' ? val : true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(type === 'prompt' ? null : false);
        }
      });
    });
  }, []);

  const showAlert = (message, title = '알림') => showModal('alert', title, message);
  const showConfirm = (message, title = '확인') => showModal('confirm', title, message);
  const showPrompt = (message, title = '입력', defaultValue = '') => showModal('prompt', title, message, defaultValue);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modalConfig && <ModalUI {...modalConfig} />}
    </ModalContext.Provider>
  );
}

function ModalUI({ type, title, message, defaultValue, onConfirm, onCancel }) {
  const [inputVal, setInputVal] = useState(defaultValue);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div className="card fade-in modal-content-wrapper" style={{ width: '90%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
        <h3 className="jua text-main" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{title}</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', wordBreak: 'keep-all', lineHeight: 1.5 }}>
          {message.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
        </p>
        
        {type === 'prompt' && (
          <input 
            type="text" 
            className="input-field" 
            style={{ marginBottom: '1.5rem', textAlign: 'center' }} 
            value={inputVal} 
            onChange={e => setInputVal(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && onConfirm(inputVal)}
          />
        )}
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {type !== 'alert' && (
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>취소</button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirm(type === 'prompt' ? inputVal : true)}>확인</button>
        </div>
      </div>
    </div>
  );
}
