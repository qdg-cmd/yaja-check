import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ Firebase 설정값 입력란
// 구글 파이어베이스 콘솔(https://console.firebase.google.com/)에서 프로젝트 생성 후 아래 값을 채워넣으세요.
// 아직 채우지 않더라도 로컬 스토리지 모드로 정상 동작합니다.
const firebaseConfig = {
  apiKey: "AIzaSyCiMBQrtqpFUBFxFFZGBUn-w_h2cZbeWUc",
  authDomain: "yaja-check-10686.firebaseapp.com",
  projectId: "yaja-check-10686",
  storageBucket: "yaja-check-10686.firebasestorage.app",
  messagingSenderId: "277308419891",
  appId: "1:277308419891:web:96f65a4e3f0ddb433e1846"
};

let app = null;
let db = null;
export let isFirebaseEnabled = false;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseEnabled = true;
    console.log("🔥 Firebase Firestore 활성화 완료");
  } else {
    console.log("⚠️ Firebase 설정이 비어있어 로컬 스토리지 모드로 동작합니다.");
  }
} catch (error) {
  console.error("Firebase 초기화 에러:", error);
}

export { app, db };
