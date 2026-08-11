// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, ref, onValue, set, update, get, child } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCvpK9bQpqVJTJJ7SfPgfyW_YjfsgPZuMQ",
  authDomain: "man-11-robotic.firebaseapp.com",
  databaseURL: "https://man-11-robotic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "man-11-robotic",
  storageBucket: "man-11-robotic.firebasestorage.app",
  messagingSenderId: "234906918891",
  appId: "1:234906918891:web:6ebbfbf38b9bd4b51603ae",
  measurementId: "G-WFMYEMCNTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const rtdb = getDatabase(app);
