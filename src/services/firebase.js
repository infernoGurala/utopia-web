import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGslt8X1GGuIsqlIhwSxEi7iCNf-N6DN4",
  authDomain: "utopia-app-33cf8.firebaseapp.com",
  projectId: "utopia-app-33cf8",
  storageBucket: "utopia-app-33cf8.firebasestorage.app",
  messagingSenderId: "402670858978",
  appId: "1:402670858978:web:200c4504814ccd9ffea4bb" // Note: This should ideally be the web app ID, but using placeholder or similar if unavailable
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
