import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleProfiles } from '../mock/sampleData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Obtener sesión inicial de Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setIsDemo(false);
          setLoading(false);
        }
      });

      // 2. Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          setIsDemo(false);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Modo Demo disponible (Sin sesión activa al inicio)
      setUser(null);
      setProfile(null);
      setIsDemo(true);
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        // Fallback básico si aún no se ha creado el perfil
        setProfile({
          id: userId,
          email: user?.email || 'usuario@vending.com',
          full_name: user?.user_metadata?.full_name || 'Usuario PWA',
          role: 'viewer'
        });
      }
    } catch (err) {
      console.error('Error al obtener perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } else {
      alert('Modo Demo activo. Google OAuth requiere configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    }
  };

  const loginWithEmail = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } else {
      // Demo login
      const matched = sampleProfiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || sampleProfiles[0];
      setUser(matched);
      setProfile(matched);
      setIsDemo(true);
      return { user: matched };
    }
  };

  const switchDemoRole = (roleName) => {
    const matched = sampleProfiles.find(p => p.role === roleName) || {
      ...sampleProfiles[0],
      role: roleName,
      full_name: `Usuario ${roleName.toUpperCase()}`
    };
    setUser(matched);
    setProfile(matched);
    setIsDemo(true);
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    role: profile?.role || 'viewer',
    isAdmin: (profile?.role || 'viewer') === 'admin',
    isTechnician: (profile?.role || 'viewer') === 'technician' || (profile?.role || 'viewer') === 'admin',
    loading,
    isDemo,
    loginWithGoogle,
    loginWithEmail,
    switchDemoRole,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
