import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzlahXu1M1lAiWa-r06DwRervGaLPrbNM",
  authDomain: "amitluzo.firebaseapp.com",
  projectId: "amitluzo",
  storageBucket: "amitluzo.firebasestorage.app",
  messagingSenderId: "141982751007",
  appId: "1:141982751007:web:7587bf9760ccadff5d782a",
  measurementId: "G-3YKP2PY4WD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };