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

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
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
