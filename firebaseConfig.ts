import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2reN4qvBhUnHdep9LxS8ppG5xruU8ePw",
  authDomain: "hcp-cmp-platform.firebaseapp.com",
  databaseURL: "https://hcp-cmp-platform-default-rtdb.firebaseio.com",
  projectId: "hcp-cmp-platform",
  storageBucket: "hcp-cmp-platform.firebasestorage.app",
  messagingSenderId: "505950551698",
  appId: "1:505950551698:web:cf1dfb5399aa6ae080b04b",
  measurementId: "G-45NXTTJ5R9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in components
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;