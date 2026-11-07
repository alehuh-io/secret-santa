import { useState, useEffect, useCallback } from 'react';
import { LogOut, Lock, Loader2, Gift, Sparkles } from 'lucide-react';
import { supabase, Participant, Draw, ExchangeSession } from '@/lib/supabase';
import GiftBox from './GiftBox';
import CheckList from './CheckList';

interface ExchangeScreenProps {
  session: ExchangeSession;
  onMatchDrawn: (matchName: string) => void;
  onSignOut: () => void;
}

export default function ExchangeScreen({
  session,
  onMatchDrawn,
  onSignOut,
}: ExchangeScreenProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [participantsRes, drawsRes] = await Promise.all([
      supabase.from('participants').select('id, name, family, created_at').order('name'),
      supabase.from('draws').select('id, drawer_id, drawn_at').order('drawn_at'),
    ]);

    if (participantsRes.data) setParticipants(participantsRes.data as Participant[]);
    if (drawsRes.data) setDraws(drawsRes.data as Draw[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDrawComplete = async (matchName: string) => {
    onMatchDrawn(matchName);
    const { data: newDraws } = await supabase
      .from('draws')
      .select('id, drawer_id, drawn_at')
      .order('drawn_at');
    if (newDraws) setDraws(newDraws as Draw[]);
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
            <p className="text-xs text-gray-400">
              {session.participantName} &middot; {session.participantFamily} family
            </p>
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
            participantId={session.participantId}
            password={session.password}
            matchName={session.matchName}
            onDrawComplete={handleDrawComplete}
          />
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
          <Lock size={12} />
          Sign in anytime with your name and password to see your match
        </p>
      </footer>
    </div>
  );
}
