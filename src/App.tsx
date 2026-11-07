import { useState } from 'react';
import LoginScreen from '@/components/LoginScreen';
import ExchangeScreen from '@/components/ExchangeScreen';
import type { ExchangeSession } from '@/lib/supabase';

export default function App() {
  const [session, setSession] = useState<ExchangeSession | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      {session ? (
        <ExchangeScreen
          session={session}
          onMatchDrawn={(matchName) =>
            setSession((current) => (current ? { ...current, matchName } : current))
          }
          onSignOut={() => setSession(null)}
        />
      ) : (
        <LoginScreen onSignedIn={setSession} />
      )}
    </div>
  );
}
