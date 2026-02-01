import React from 'react';

interface SmartResponseProps {
  content: string;
  isLoading: boolean;
  onFollowUp?: (question: string) => void;
}

export const SmartResponse: React.FC<SmartResponseProps> = ({
  content,
  isLoading,
  onFollowUp,
}) => {
  if (isLoading) {
    return (
      <div className="mt-4 animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-blue-500/20" />
          <div className="h-4 w-32 rounded bg-white/20" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-xl border border-white/20 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl duration-300">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <h3 className="text-sm font-bold text-white">AI INSIGHT</h3>
      </div>

      <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-white/90">
        {content.split('\n').map((line, i) => (
          <p key={i} className="mb-2 last:mb-0">
            {line}
          </p>
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
          Follow-up Questions
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            'How can I pay this off faster?',
            'Which card should I pay first?',
            'Show me the breakdown',
          ].map((q) => (
            <button
              key={q}
              onClick={() => onFollowUp?.(q)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
