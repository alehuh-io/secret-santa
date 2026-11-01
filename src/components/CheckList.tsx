import { Check, Users } from 'lucide-react';
import { Participant, Draw } from '@/lib/supabase';

interface CheckListProps {
  participants: Participant[];
  draws: Draw[];
}

export default function CheckList({ participants, draws }: CheckListProps) {
  // A participant "has drawn" if their email matches a draw's user_email —
  // i.e. they've taken their turn. We deliberately do NOT reveal who was picked.
  const drawnEmails = new Set(draws.map((d) => d.user_email));
  const drawnCount = participants.filter((p) =>
    p.email ? drawnEmails.has(p.email) : false
  ).length;
  const totalCount = participants.length;

  // Group participants by family
  const families = Array.from(
    participants.reduce((map, p) => {
      if (!map.has(p.family)) map.set(p.family, []);
      map.get(p.family)!.push(p);
      return map;
    }, new Map<string, Participant[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-rose-100/40 border border-rose-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-rose-400" />
          <h3 className="font-semibold text-gray-700 text-sm">
            Participant Checklist
          </h3>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          {drawnCount}/{totalCount} drew
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-red-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${totalCount ? (drawnCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="px-3 py-3 space-y-3 max-h-[420px] overflow-y-auto">
        {families.map(([family, members]) => (
          <div key={family}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300 px-3 mb-1">
              {family} family
            </p>
            <ul className="space-y-0.5">
              {members.map((p) => {
                const hasDrawn = p.email ? drawnEmails.has(p.email) : false;

                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      hasDrawn ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 transition-all ${
                        hasDrawn
                          ? 'bg-emerald-400 text-white'
                          : 'border-2 border-gray-200 bg-white'
                      }`}
                    >
                      {hasDrawn && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span
                      className={`text-sm flex-1 truncate ${
                        hasDrawn
                          ? 'text-gray-700'
                          : 'text-gray-700 font-medium'
                      }`}
                    >
                      {p.name}
                    </span>
                    {hasDrawn ? (
                      <span className="text-xs text-emerald-400 flex-shrink-0 font-medium">
                        drew
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 flex-shrink-0">
                        waiting
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
