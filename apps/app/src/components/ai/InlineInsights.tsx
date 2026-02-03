import React, { useState, useEffect } from 'react';
import { sendMessage } from '../../services/ai';

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'success';
  title: string;
  content: string;
  actionLabel?: string;
}

export const InlineInsights: React.FC<{ context: string }> = ({ context }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const prompt = `Generate 2 quick financial insights for the "${context}" screen. 
        One should be a "tip" for saving/optimizing, and another should be a "success" or "warning" based on typical trends.
        Format: JSON array of { id, type, title, content, actionLabel }.`;

        const _response = await sendMessage(
          prompt,
          'Provide helpful, premium-feeling financial advice. Be concise.'
        );

        // Simulating parsing and fallback
        setInsights([
          {
            id: '1',
            type: 'tip',
            title: 'Interest Optimization',
            content:
              'Your ABC Credit Card has a high interest rate. Consider a balance transfer to save ~$45/mo.',
            actionLabel: 'Compare Options',
          },
          {
            id: '2',
            type: 'success',
            title: 'On Track!',
            content:
              'You’ve paid 12% more of your total debt this month compared to your average. Great job!',
          },
        ]);
      } catch (error) {
        console.error('Insights Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInsights();
  }, [context]);

  if (isLoading) {
    return (
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 min-w-[300px] animate-pulse rounded-xl border border-white/5 bg-white/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`min-w-[270px] rounded-xl border p-5 backdrop-blur-md transition-all ${
            insight.type === 'tip'
              ? 'border-blue-500/20 bg-blue-500/5'
              : insight.type === 'warning'
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-emerald-500/20 bg-emerald-500/5'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">
              {insight.type === 'tip'
                ? '💡'
                : insight.type === 'warning'
                  ? '⚠️'
                  : '✨'}
            </span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              {insight.title}
            </h4>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-white/70">
            {insight.content}
          </p>
          {insight.actionLabel && (
            <button className="text-xs font-bold text-blue-400 transition-colors hover:text-blue-300">
              {insight.actionLabel} →
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
