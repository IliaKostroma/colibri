/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Detect if running as PWA (standalone mode)
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone === true;

// Custom storage that tries to be more persistent
// On iOS PWA, localStorage can be cleared, so we also save to sessionStorage as backup
const customStorage = {
  getItem: (key) => {
    try {
      // Try localStorage first
      const value = localStorage.getItem(key);
      if (value) return value;
      // Fall back to sessionStorage
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      // Also save to sessionStorage as backup
      sessionStorage.setItem(key, value);
    } catch (e) {
      // Try sessionStorage if localStorage fails
      try {
        sessionStorage.setItem(key, value);
      } catch (e2) {
        console.warn('Storage not available');
      }
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: isPWA ? customStorage : undefined,
    storageKey: 'colibri-auth'
  }
});
