import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import LoginScreen from '@/components/LoginScreen';
import ExchangeScreen from '@/components/ExchangeScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      {session ? (
        <ExchangeScreen
          userEmail={session.user.email ?? ''}
          onSignOut={() => supabase.auth.signOut()}
        />
      ) : (
        <LoginScreen />
      )}
    </div>
  );
}
