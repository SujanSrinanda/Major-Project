import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';

const defaultConfig = {
  apiKey: "AIzaSyDemoPlaceholderKey1234567890",
  authDomain: "sentinelfin-demo.firebaseapp.com",
  projectId: "sentinelfin-demo",
  storageBucket: "sentinelfin-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:demo1234567890"
};

const rawConfig = (firebaseConfigData && firebaseConfigData.apiKey) ? firebaseConfigData : defaultConfig;

const firebaseConfig = {
  apiKey: rawConfig.apiKey || defaultConfig.apiKey,
  authDomain: rawConfig.authDomain || defaultConfig.authDomain,
  projectId: rawConfig.projectId || defaultConfig.projectId,
  storageBucket: rawConfig.storageBucket || defaultConfig.storageBucket,
  messagingSenderId: rawConfig.messagingSenderId || defaultConfig.messagingSenderId,
  appId: rawConfig.appId || defaultConfig.appId,
};

let app;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (err) {
  console.warn('Firebase initializeApp warning:', err);
  app = getApps().length > 0 ? getApp() : initializeApp(defaultConfig);
}

let auth;
try {
  auth = getAuth(app);
} catch (err) {
  console.warn('Firebase getAuth warning:', err);
  auth = {} as any;
}

const googleProvider = new GoogleAuthProvider();

let db;
try {
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase getFirestore warning:', err);
  db = {} as any;
}

export { app, auth, db, googleProvider };
