import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { createClient } from "@supabase/supabase-js";

const firebaseConfig = {
  apiKey: "AIzaSyBGslt8X1GGuIsqlIhwSxEi7iCNf-N6DN4",
  authDomain: "utopia-app-33cf8.firebaseapp.com",
  projectId: "utopia-app-33cf8",
  storageBucket: "utopia-app-33cf8.firebasestorage.app",
  messagingSenderId: "402670858978",
  appId: "1:402670858978:web:200c4504814ccd9ffea4bb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log("Signing in anonymously...");
  const cred = await signInAnonymously(auth);
  console.log("Signed in successfully as:", cred.user.uid);

  console.log("Fetching Supabase config from Firestore...");
  const configDoc = await getDoc(doc(db, 'config', 'supabase'));
  if (!configDoc.exists()) {
    console.error("Supabase config not found in Firestore!");
    return;
  }
  const { url, anon_key } = configDoc.data();
  console.log("Supabase URL:", url);
  const supabase = createClient(url, anon_key);

  console.log("\nQuerying folder paths from Supabase...");
  const { data: folders, error: folderError } = await supabase
    .from('folders')
    .select('path, scope, parent_path')
    .limit(40);
  if (folderError) {
    console.error("Error fetching folders:", folderError);
  } else {
    console.log("Sample Folders:");
    folders.forEach(f => console.log(`  Path: "${f.path}" | Parent: "${f.parent_path}" | Scope: "${f.scope}"`));
  }

  console.log("\nQuerying note paths from Supabase...");
  const { data: notes, error: noteError } = await supabase
    .from('notes')
    .select('path, folder_path')
    .limit(40);
  if (noteError) {
    console.error("Error fetching notes:", noteError);
  } else {
    console.log("Sample Notes:");
    notes.forEach(n => console.log(`  Path: "${n.path}" | Folder: "${n.folder_path}"`));
  }
}

main().catch(err => console.error("Unhandled error:", err));
