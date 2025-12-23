/**
 * Authentication service using Supabase Auth
 */

import { supabase } from './supabase.js';

/**
 * Sign up a new user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    return { user: null, error: error.message };
  }

  // Create default user settings
  if (data.user) {
    await supabase.from('user_settings').insert({
      user_id: data.user.id,
      ai_provider: 'openai',
      ai_model: 'gpt-3.5-turbo'
    });
  }

  return { user: data.user, error: null };
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Sign out the current user
 * @returns {Promise<{error: string|null}>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

/**
 * Get the current logged in user
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with (event, session)
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Get user settings from database
 * @returns {Promise<object|null>}
 */
export async function getUserSettings() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }

  return data;
}

/**
 * Save user settings to database
 * @param {object} settings - Settings to save
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function saveUserSettings(settings) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...settings
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
