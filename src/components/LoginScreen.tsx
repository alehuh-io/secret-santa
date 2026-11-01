import { useState } from 'react';
import { Gift, Mail, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
                <Mail className="text-emerald-500" size={28} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Check your inbox
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                We sent a magic sign-in link to
                <br />
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <p className="text-gray-400 text-xs mt-4">
                Click the link in the email to sign in and draw your gift match.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-5 text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-600 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
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
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-400 to-red-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-rose-200/60 hover:shadow-rose-300/70 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send sign-in link
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                You'll receive a one-time link to sign in. No password needed.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
