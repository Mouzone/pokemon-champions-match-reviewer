import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "import.meta.env.VITE_FIREBASE_API_KEY",
  authDomain: "matchreviewer-automation.firebaseapp.com",
  projectId: "matchreviewer-automation",
  storageBucket: "matchreviewer-automation.firebasestorage.app",
  messagingSenderId: "209874855598",
  appId: "1:209874855598:web:131263c178cf65d1d6ef3f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-east1'); // Since Cloud Function is deployed in us-east1
