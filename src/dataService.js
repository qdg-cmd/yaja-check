import { db, isFirebaseEnabled } from './firebase';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

// Default initial settings
const DEFAULT_SETTINGS = {
  adminPwd: '2026',
  weekdayMaxPeriods: 4,
  weekendMaxPeriods: 5,
  weekdayTimes: {
    1: { start: '19:00', end: '19:50' },
    2: { start: '20:00', end: '20:50' },
    3: { start: '21:00', end: '21:50' },
    4: { start: '22:00', end: '22:50' },
  },
  weekendTimes: {
    1: { start: '09:00', end: '09:50' },
    2: { start: '10:00', end: '10:50' },
    3: { start: '11:00', end: '11:50' },
    4: { start: '13:00', end: '13:50' },
    5: { start: '14:00', end: '14:50' },
  },
  notice: '' // 오늘의 공지사항
};

// Helpers for LocalStorage fallback
const getLocal = (key, defaultVal) => {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultVal;
};
const setLocal = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const getSettings = async () => {
  if (isFirebaseEnabled) {
    const docRef = doc(db, 'settings', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
    await setDoc(docRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return getLocal('app_settings', DEFAULT_SETTINGS);
};

export const updateSettings = async (newSettings) => {
  if (isFirebaseEnabled) {
    await setDoc(doc(db, 'settings', 'config'), newSettings, { merge: true });
  } else {
    const current = getLocal('app_settings', DEFAULT_SETTINGS);
    setLocal('app_settings', { ...current, ...newSettings });
  }
};

export const getStudents = async () => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'students'));
    return snap.docs.map(d => d.data());
  }
  return getLocal('app_students', []);
};

export const saveStudent = async (student) => {
  if (isFirebaseEnabled) {
    await setDoc(doc(db, 'students', student.id), student);
  } else {
    const students = getLocal('app_students', []);
    const idx = students.findIndex(s => s.id === student.id);
    if (idx >= 0) students[idx] = student;
    else students.push(student);
    setLocal('app_students', students);
  }
};

export const deleteStudent = async (id) => {
  if (isFirebaseEnabled) {
    await deleteDoc(doc(db, 'students', id));
  } else {
    let students = getLocal('app_students', []);
    students = students.filter(s => s.id !== id);
    setLocal('app_students', students);
  }
};

export const getSeats = async () => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'seats'));
    return snap.docs.map(d => d.data());
  }
  return getLocal('app_seats', []);
};

export const saveSeats = async (seats) => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'seats'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    await Promise.all(seats.map(s => setDoc(doc(db, 'seats', s.id), s)));
  } else {
    setLocal('app_seats', seats);
  }
};

export const getActiveSessions = async () => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'activeSessions'));
    return snap.docs.map(d => d.data());
  }
  return getLocal('app_sessions', []);
};

export const updateSession = async (studentId, sessionData) => {
  if (isFirebaseEnabled) {
    if (sessionData === null) {
      await deleteDoc(doc(db, 'activeSessions', studentId));
    } else {
      await setDoc(doc(db, 'activeSessions', studentId), sessionData);
    }
  } else {
    let sessions = getLocal('app_sessions', []);
    if (sessionData === null) {
      sessions = sessions.filter(s => s.studentId !== studentId);
    } else {
      const idx = sessions.findIndex(s => s.studentId === studentId);
      if (idx >= 0) sessions[idx] = sessionData;
      else sessions.push(sessionData);
    }
    setLocal('app_sessions', sessions);
  }
};

export const getDailyLog = async (dateStr) => {
  if (isFirebaseEnabled) {
    const docRef = doc(db, 'dailyLogs', dateStr);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
    return { date: dateStr, scheduled: '', actual: '' };
  }
  return getLocal(`log_${dateStr}`, { date: dateStr, scheduled: '', actual: '' });
};

export const saveDailyLog = async (dateStr, data) => {
  if (isFirebaseEnabled) {
    await setDoc(doc(db, 'dailyLogs', dateStr), data, { merge: true });
  } else {
    setLocal(`log_${dateStr}`, data);
  }
};

export const getAllDailyLogs = async () => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'dailyLogs'));
    return snap.docs.map(d => d.data());
  }
  const logs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('log_')) {
      logs.push(JSON.parse(localStorage.getItem(key)));
    }
  }
  return logs;
};

export const getAttendanceLogs = async () => {
  if (isFirebaseEnabled) {
    const snap = await getDocs(collection(db, 'attendanceLogs'));
    return snap.docs.map(d => d.data());
  }
  return getLocal('app_attendanceLogs', []);
};

export const saveAttendanceLog = async (dateStr, studentId, periods) => {
  const docId = `${dateStr}_${studentId}`;
  const data = { date: dateStr, studentId, periods };
  if (isFirebaseEnabled) {
    await setDoc(doc(db, 'attendanceLogs', docId), data, { merge: true });
  } else {
    const logs = getLocal('app_attendanceLogs', []);
    const idx = logs.findIndex(l => l.date === dateStr && l.studentId === studentId);
    if (idx >= 0) logs[idx].periods = { ...logs[idx].periods, ...periods };
    else logs.push(data);
    setLocal('app_attendanceLogs', logs);
  }
};

export const runAutomations = async (providedSettings = null) => {
  const settings = providedSettings || await getSettings();
  if (!settings) return;

  const d = new Date();
  const todayYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const currentTime = d.getHours() * 60 + d.getMinutes();
  const dayName = ['일','월','화','수','목','금','토'][d.getDay()];
  const isWeekend = [0, 6].includes(d.getDay());
  const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  
  const times = isWeekend ? settings.weekendTimes : settings.weekdayTimes;
  const maxPeriods = isWeekend ? settings.weekendMaxPeriods : settings.weekdayMaxPeriods;

  const students = await getStudents();
  let activeSessions = await getActiveSessions();
  const logs = await getAttendanceLogs();
  
  // 1. 자정(날짜 변경) 시 미퇴실자 강제 전체 퇴실 처리
  // 또는 밤 11시 30분(23:30) 이후 일괄 퇴실 처리
  if (activeSessions.length > 0) {
    const validSessions = [];
    for (const s of activeSessions) {
      if (currentTime > 23 * 60 + 30 || s.lastUpdated < todayStart) {
        await updateSession(s.studentId, null);
      } else {
        validSessions.push(s);
      }
    }
    activeSessions = validSessions;
  }

  // 2. 미입실자 결석 처리 & 입실자 출석 처리
  for (let i = 1; i <= maxPeriods; i++) {
    const periodStr = String(i);
    const time = times[i];
    if (!time || !time.start || !time.end) continue;
    
    const [sh, sm] = time.start.split(':').map(Number);
    const [eh, em] = time.end.split(':').map(Number);
    const startTime = sh * 60 + sm;
    const endTime = eh * 60 + em;

    if (currentTime >= startTime) {
      for (const student of students) {
        const days = isWeekend ? student.weekendDays : student.weekdayDays;
        const isScheduled = days?.[dayName]?.includes(i);
        
        const studentLog = logs.find(l => l.date === todayYMD && l.studentId === student.id);
        const currentStatus = studentLog?.periods?.[periodStr];
        
        // 이미 출석/자율출석 등으로 기록이 있다면 덮어쓰지 않음 (외출/퇴실해도 기록 유지)
        if (!currentStatus) {
          // 해당 교시 중에 한 번이라도 IN 상태라면 영구 인정
          const isCurrentlyIn = activeSessions.find(s => s.studentId === student.id && s.status === 'IN');
          if (isCurrentlyIn) {
            await saveAttendanceLog(todayYMD, student.id, { [periodStr]: isScheduled ? 'PRESENT' : 'UNSCHEDULED' });
          } else {
            // 미입실 상태인데 교시 시간이 끝났고, 원래 신청한 교시였다면 결석 처리
            if (currentTime > endTime && isScheduled) {
              await saveAttendanceLog(todayYMD, student.id, { [periodStr]: 'ABSENT' });
            }
          }
        }
      }
    }
  }
};
