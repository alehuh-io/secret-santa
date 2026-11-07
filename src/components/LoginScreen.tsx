import { useState, useEffect } from 'react';
import { Gift, Lock, Loader2, Sparkles, UserCircle } from 'lucide-react';
import {
  supabase,
  Participant,
  SignInResult,
  ExchangeSession,
} from '@/lib/supabase';

const SIGN_IN_ERRORS: Partial<Record<SignInResult['status'], string>> = {
  invalid_password: 'That password doesn\'t match this name. Please try again.',
  weak_password: 'Please choose a password with at least 4 characters.',
  not_found: 'We couldn\'t find that name. Please refresh and try again.',
};

interface LoginScreenProps {
  onSignedIn: (session: ExchangeSession) => void;
}

export default function LoginScreen({ onSignedIn }: LoginScreenProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('participants')
      .select('id, name, family, created_at')
      .order('family')
      .order('name')
      .then(({ data }) => {
        if (data) setParticipants(data as Participant[]);
      });
  }, []);

  const families = Array.from(
    participants.reduce((map, p) => {
      if (!map.has(p.family)) map.set(p.family, []);
      map.get(p.family)!.push(p);
      return map;
    }, new Map<string, Participant[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  const selectedParticipant = participants.find((p) => p.id === selectedId);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('sign_in_participant', {
        p_participant_id: selectedParticipant.id,
        p_password: password,
      });

      const result = Array.isArray(data) ? (data[0] as SignInResult | undefined) : undefined;

      if (rpcError || !result) {
        setError('Something went wrong. Please try again.');
        return;
      }

      if (result.status !== 'ok' && result.status !== 'created') {
        setError(
          SIGN_IN_ERRORS[result.status] ?? 'Something went wrong. Please try again.'
        );
        return;
      }

      onSignedIn({
        participantId: selectedParticipant.id,
        participantName: selectedParticipant.name,
        participantFamily: selectedParticipant.family,
        password,
        matchName: result.match_name,
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating decorative gifts */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { left: '8%', top: '15%', size: 40, delay: 0, opacity: 0.06 },
          { left: '85%', top: '20%', size: 55, delay: 0.5, opacity: 0.05 },
          { left: '15%', top: '75%', size: 35, delay: 1, opacity: 0.06 },
          { left: '78%', top: '70%', size: 48, delay: 1.5, opacity: 0.04 },
          { left: '50%', top: '10%', size: 30, delay: 0.8, opacity: 0.05 },
        ].map((g, i) => (
          <div
            key={i}
            className="absolute text-rose-400 float-decoration"
            style={{
              left: g.left,
              top: g.top,
              animationDelay: `${g.delay}s`,
              opacity: g.opacity,
            }}
          >
            <Gift size={g.size} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-red-500 shadow-lg shadow-rose-300/50 mb-5 gift-box-entrance">
            <Gift className="text-white" size={36} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Secret Santa
          </h1>
          <p className="text-gray-500 mt-2 flex items-center justify-center gap-1.5">
            <Sparkles size={16} className="text-amber-400" />
            Exchange gifts with a surprise match
            <Sparkles size={16} className="text-amber-400" />
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-rose-100/50 border border-rose-100 p-7">
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Name dropdown */}
            <div>
              <label
                htmlFor="name-select"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Your name
              </label>
              <div className="relative">
                <UserCircle
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none z-10"
                />
                <select
                  id="name-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select your name...</option>
                  {families.map(([family, members]) => (
                    <optgroup key={family} label={`${family} family`}>
                      {members.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {selectedParticipant && (
                <p className="text-xs text-rose-400 mt-1.5 pl-1">
                  {selectedParticipant.family} family
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={4}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/60 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedId || !password}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-400 to-red-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-rose-200/60 hover:shadow-rose-300/70 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Continue'
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              First time here? Choose any password (at least 4 characters) and
              remember it. You'll need it every time you sign in.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
