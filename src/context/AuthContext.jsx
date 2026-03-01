import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { storeUsername } from '../utils/authHelpers';

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
      // "Sign out on close" logic:
      // beforeunload fires on BOTH tab-close AND reload. To tell them apart we use
      // sessionStorage: it persists across reloads but is cleared when the tab closes.
      //
      // • If _reloadFlag is absent  → fresh open after tab close → clear session (no rememberMe)
      // • If _reloadFlag is present → it was a reload → keep session, clear flag
      const reloadFlag = sessionStorage.getItem('_reloadFlag');
      if (reloadFlag) {
        // It was a reload — just clear the flag and continue normally
        sessionStorage.removeItem('_reloadFlag');
      } else if (!localStorage.getItem('rememberMe') && session) {
        // Tab was closed and re-opened without "Remember Me" — sign out
        const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
        storageKeys.forEach(k => localStorage.removeItem(k));
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      storeUsername(session?.user);
    });

    // Listen for auth state changes within this tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      storeUsername(session?.user);
    });

    // Cross-tab auth sync: listen for storage events from other tabs
    const handleStorage = (event) => {
      // Supabase uses localStorage keys starting with 'sb-' for session
      // Only process events from OTHER tabs (event.storageArea is not our window.localStorage)
      if (event.key && event.key.startsWith('sb-')) {
        // Refresh session from Supabase to sync across tabs
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          // Update username when auth state changes
          if (session?.user?.user_metadata?.username) {
            localStorage.setItem('username', session.user.user_metadata.username);
          } else if (session?.user?.email) {
            localStorage.setItem('username', session.user.email);
          } else {
            localStorage.removeItem('username');
          }
        });
      }
    };
    
    window.addEventListener('storage', handleStorage);

    // If "Remember Me" was not checked, sign out when the browser tab is closed.
    // We set a sessionStorage flag here instead of clearing immediately because
    // beforeunload fires on reload too — sessionStorage lets us tell them apart.
    const handleBeforeUnload = () => {
      if (!localStorage.getItem('rememberMe')) {
        sessionStorage.setItem('_reloadFlag', '1');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Login with Supabase Auth
  const login = useCallback(async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      // If not "remember me", use a shorter session by clearing persistence hint
      // Supabase stores sessions in localStorage by default; we clear on tab close if not remembered
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Store remember-me preference so we can handle session cleanup
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
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
      // Pass through Supabase error message for proper translation matching
      setError(err.message || 'Invalid login credentials');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register with Supabase Auth
  const register = useCallback(async (email, username, password, language = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            language: language, // Store user's preferred language for email templates
          },
        },
      });
      
      if (error) {
        console.error('Supabase signUp error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          details: error
        });
        throw error;
      }
      
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
      // Pass through Supabase error message for proper translation matching
      setError(err.message || 'Registration failed');
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
      setError('Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear auth error
  const clearError = useCallback(() => {
    setError(null);
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
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
