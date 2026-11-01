import { useState, useEffect, useCallback } from 'react';
import { LogOut, Mail, Loader2, Gift, Sparkles, RotateCcw } from 'lucide-react';
import { supabase, Participant, Draw, DrawResult } from '@/lib/supabase';
import GiftBox from './GiftBox';
import CheckList from './CheckList';

interface ExchangeScreenProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function ExchangeScreen({
  userEmail,
  onSignOut,
}: ExchangeScreenProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [myDraw, setMyDraw] = useState<DrawResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [participantsRes, drawsRes] = await Promise.all([
      supabase.from('participants').select('*').order('name'),
      supabase
        .from('draws')
        .select('id, user_id, user_email, participant_id, drawn_at')
        .order('drawn_at'),
    ]);

    if (participantsRes.data) setParticipants(participantsRes.data);
    if (drawsRes.data) setDraws(drawsRes.data as Draw[]);

    // Check if current user already drew
    const { data: myDrawData } = await supabase
      .from('draws')
      .select('participant_id')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (myDrawData) {
      const participant = participantsRes.data?.find(
        (p) => p.id === myDrawData.participant_id
      );
      setMyDraw({
        participant_id: myDrawData.participant_id,
        participant_name: participant?.name ?? null,
        already_drawn: true,
        no_participants_remaining: false,
      });
    }

    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDrawComplete = async (result: DrawResult) => {
    setMyDraw(result);
    // Reload draws to update checklist
    const { data: newDraws } = await supabase
      .from('draws')
      .select('id, user_id, user_email, participant_id, drawn_at')
      .order('drawn_at');
    if (newDraws) setDraws(newDraws as Draw[]);
  };

  const handleResendEmail = async () => {
    setResending(true);
    setResendMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: { emailRedirectTo: window.location.origin },
    });

    setResending(false);

    if (error) {
      setResendMsg(`Couldn't send: ${error.message}`);
    } else {
      setResendMsg('Sign-in link sent to your email!');
    }

    setTimeout(() => setResendMsg(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-300" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-md shadow-rose-200/50">
            <Gift className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">
              Secret Santa
            </h1>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-rose-500 font-medium px-3 py-2 rounded-lg hover:bg-rose-50 transition-all"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      {/* Main content */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Gift box area */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-rose-100/40 border border-rose-100 p-6 sm:p-8 flex flex-col justify-center min-h-[400px]">
          <GiftBox
            userEmail={userEmail}
            existingDraw={myDraw}
            onDrawComplete={handleDrawComplete}
          />

          {/* Resend email button */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center">
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-rose-500 font-medium transition-colors disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw size={15} />
                  Resend sign-in email
                </>
              )}
            </button>
            {resendMsg && (
              <p
                className={`text-xs mt-2 ${
                  resendMsg.includes("Couldn't")
                    ? 'text-red-500'
                    : 'text-emerald-500'
                }`}
              >
                {resendMsg}
              </p>
            )}
          </div>
        </div>

        {/* Checklist sidebar */}
        <div className="space-y-4">
          <CheckList participants={participants} draws={draws} />

          {/* Info card */}
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl border border-amber-100 p-4">
            <div className="flex items-start gap-2.5">
              <Sparkles size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  How it works
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Draw a name to see who you'll buy a gift for. You'll never
                  draw someone from your own family, each name can only be drawn
                  once, and your match is permanent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-8 text-center">
        <p className="text-xs text-gray-300 flex items-center justify-center gap-1.5">
          <Mail size={12} />
          Sign in anytime with your email to see your match
        </p>
      </footer>
    </div>
  );
}
