import { createClient } from '@supabase/supabase-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

let supabaseClient = null;

export const initSupabase = async () => {
  if (supabaseClient) return supabaseClient;

  try {
    const configDoc = await getDoc(doc(db, 'config', 'supabase'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      const { url, anon_key } = data;
      supabaseClient = createClient(url, anon_key);
      return supabaseClient;
    } else {
      throw new Error('Supabase config not found in Firestore.');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    throw error;
  }
};

export const getSupabase = () => {
  if (!supabaseClient) {
    console.warn('Supabase client not initialized yet. Call initSupabase() first.');
  }
  return supabaseClient;
};
