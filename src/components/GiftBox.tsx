import { useState, useRef } from 'react';
import { Gift, Sparkles, PartyPopper, Frown } from 'lucide-react';
import { supabase, DrawResult } from '@/lib/supabase';

interface GiftBoxProps {
  userEmail: string;
  existingDraw: DrawResult | null;
  onDrawComplete: (result: DrawResult) => void;
}

type AnimationState = 'idle' | 'shaking' | 'opening' | 'revealed' | 'empty';

export default function GiftBox({
  userEmail,
  existingDraw,
  onDrawComplete,
}: GiftBoxProps) {
  const [state, setState] = useState<AnimationState>(
    existingDraw?.already_drawn ? 'revealed' : 'idle'
  );
  const [result, setResult] = useState<DrawResult | null>(existingDraw);
  const [error, setError] = useState<string | null>(null);
  const drawingRef = useRef(false);

  const handleDraw = async () => {
    if (drawingRef.current) return;
    drawingRef.current = true;
    setError(null);
    setState('shaking');

    // Hold the shake animation for suspense
    await new Promise((r) => setTimeout(r, 1800));

    const { data, error: rpcError } = await supabase.rpc(
      'draw_random_participant',
      { p_user_email: userEmail }
    );

    if (rpcError) {
      setError(rpcError.message);
      setState('idle');
      drawingRef.current = false;
      return;
    }

    const drawResult = data as DrawResult;
    setResult(drawResult);

    if (drawResult.no_participants_remaining) {
      setState('empty');
      onDrawComplete(drawResult);
      drawingRef.current = false;
      return;
    }

    setState('opening');
    await new Promise((r) => setTimeout(r, 600));
    setState('revealed');
    onDrawComplete(drawResult);
    drawingRef.current = false;
  };

  // Already drew — show their match
  if (state === 'revealed' && result?.participant_name) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <div className="mb-5 gift-reveal-pop">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 shadow-xl shadow-rose-200/60">
            <PartyPopper className="text-white" size={40} strokeWidth={2} />
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-2">Your gift match is</p>
        <h2 className="text-4xl font-bold text-gray-800 mb-3 tracking-tight gift-reveal-name">
          {result.participant_name}
        </h2>
        <p className="text-gray-400 text-sm max-w-xs">
          You're all set! Buy something special for them. Your match is saved
          and won't change.
        </p>
      </div>
    );
  }

  // All names drawn
  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
          <Frown className="text-gray-400" size={36} />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          All names have been drawn
        </h2>
        <p className="text-gray-400 text-sm max-w-xs">
          Every participant has been matched. Check the list to see who got who!
        </p>
      </div>
    );
  }

  // Idle or shaking — the gift box
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div
        className={`mb-6 ${state === 'shaking' ? 'gift-shake' : 'gift-idle-bob'}`}
      >
        <div className="relative">
          {/* Box body */}
          <div
            className={`w-36 h-36 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 shadow-2xl shadow-rose-300/60 flex items-center justify-center transition-transform duration-500 ${
              state === 'opening' ? 'scale-110' : ''
            }`}
          >
            <Gift
              className={`text-white transition-all duration-500 ${
                state === 'opening' ? 'scale-125 opacity-0' : 'scale-100 opacity-100'
              }`}
              size={60}
              strokeWidth={1.5}
            />
          </div>
          {/* Sparkle accents when shaking */}
          {state === 'shaking' && (
            <>
              <Sparkles
                className="absolute -top-2 -left-3 text-amber-300 sparkle-anim"
                size={24}
                style={{ animationDelay: '0s' }}
              />
              <Sparkles
                className="absolute -top-1 -right-4 text-amber-300 sparkle-anim"
                size={20}
                style={{ animationDelay: '0.3s' }}
              />
              <Sparkles
                className="absolute -bottom-2 -left-4 text-rose-300 sparkle-anim"
                size={18}
                style={{ animationDelay: '0.6s' }}
              />
              <Sparkles
                className="absolute -bottom-1 -right-3 text-rose-300 sparkle-anim"
                size={22}
                style={{ animationDelay: '0.9s' }}
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        {state === 'shaking' ? 'Drawing your match...' : 'Ready to draw?'}
      </h2>
      <p className="text-gray-400 text-sm max-w-xs mb-5">
        {state === 'shaking'
          ? 'Shake shake shake...'
          : 'Click the button to reveal your secret gift match. You only get one draw!'}
      </p>

      <button
        onClick={handleDraw}
        disabled={state === 'shaking'}
        className="flex items-center gap-2 bg-gradient-to-r from-rose-400 to-red-500 text-white font-medium px-7 py-3 rounded-xl shadow-lg shadow-rose-200/60 hover:shadow-rose-300/70 hover:scale-[1.04] active:scale-[0.97] transition-all disabled:opacity-60 disabled:hover:scale-100"
      >
        <Gift size={18} />
        {state === 'shaking' ? 'Drawing...' : 'Draw my match'}
      </button>
    </div>
  );
}
