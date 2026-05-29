import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGslt8X1GGuIsqlIhwSxEi7iCNf-N6DN4",
  authDomain: "utopia-app-33cf8.firebaseapp.com",
  projectId: "utopia-app-33cf8",
  storageBucket: "utopia-app-33cf8.firebasestorage.app",
  messagingSenderId: "402670858978",
  appId: "1:402670858978:web:200c4504814ccd9ffea4bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("Fetching app_config/storage_config...");
  try {
    const docSnap = await getDoc(doc(db, "app_config", "storage_config"));
    if (docSnap.exists()) {
      console.log("storage_config data:", docSnap.data());
    } else {
      console.log("storage_config doc does not exist!");
    }
  } catch (err) {
    console.error("Error fetching storage_config:", err);
  }

  console.log("Fetching supabase-focus-1 config...");
  try {
    const docSnap = await getDoc(doc(db, "config", "supabase-focus-1"));
    if (docSnap.exists()) {
      console.log("supabase-focus-1 data:", docSnap.data());
    } else {
      console.log("supabase-focus-1 doc does not exist!");
    }
  } catch (err) {
    console.error("Error fetching supabase-focus-1:", err);
  }
}

main().catch(err => console.error("Unhandled error:", err));
