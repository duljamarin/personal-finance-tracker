import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Store username in localStorage for display (from user metadata)
      if (session?.user?.user_metadata?.username) {
        localStorage.setItem('username', session.user.user_metadata.username);
      } else if (session?.user?.email) {
        // Fallback to email if no username
        localStorage.setItem('username', session.user.email.split('@')[0]);
      } else {
        localStorage.removeItem('username');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login with Supabase Auth
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setSession(data.session);
      setUser(data.user);
      
      // Store username for display
      if (data.user?.user_metadata?.username) {
        localStorage.setItem('username', data.user.user_metadata.username);
      } else if (data.user?.email) {
        localStorage.setItem('username', data.user.email.split('@')[0]);
      }
      
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register with Supabase Auth
  const register = useCallback(async (email, username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });
      
      if (error) throw error;
      
      // Check if email confirmation is required
      if (data.session) {
        // Email confirmation disabled - user is logged in immediately
        setSession(data.session);
        setUser(data.user);
        
        // Store username for display
        if (username) {
          localStorage.setItem('username', username);
        } else if (data.user?.email) {
          localStorage.setItem('username', data.user.email.split('@')[0]);
        }
      } else if (data.user && !data.session) {
        // Email confirmation enabled - user created but not logged in
        // Session will be null until they confirm their email
        setUser(null);
        setSession(null);
        
        // Throw a specific error to let the UI know
        throw new Error('Please check your email to confirm your account before logging in.');
      }
      
      return data;
    } catch (err) {
      setError(err.message || 'We couldn\'t create your account. Please verify your details or try different credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout with Supabase Auth
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      localStorage.removeItem('username');
    } catch (err) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Provide accessToken for compatibility with existing components
  const accessToken = session?.access_token || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      accessToken, 
      loading, 
      error, 
      login, 
      register, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
