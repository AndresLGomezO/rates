import React, { useState, useEffect } from 'react';
import { sendMessage } from '../../services/ai';

interface AIAlert {
  id: string;
  type: 'insight' | 'action' | 'alert';
  message: string;
}

export const SmartNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AIAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Generate some proactive notifications
    const generateNotifications = async () => {
      try {
        const _response = await sendMessage(
          'Analyze my simulated financial state and provide 3 immediate proactive alerts or insights.',
          'Format as a simple list of messages.'
        );

        setNotifications([
          {
            id: '1',
            type: 'insight',
            message: 'You could save $120/year by switching your Fiber plan.',
          },
          {
            id: '2',
            type: 'alert',
            message: 'Mortgage payment due in 2 days. Balance is ready.',
          },
          {
            id: '3',
            type: 'action',
            message:
              'Review your coffee spending: it increased by 20% this week.',
          },
        ]);
      } catch (err) {
        console.error('Notifications Error:', err);
      }
    };

    void generateNotifications();
  }, []);

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 transition-colors hover:text-white"
        aria-label="AI Notifications"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        )}
      </button>

      {isOpen && (
        <div className="animate-in slide-in-from-top-2 absolute right-0 z-[100] mt-3 w-80 max-w-[240px] rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
              AI Insights
            </h3>
            <button
              className="text-[10px] font-bold text-blue-400"
              onClick={() => setNotifications([])}
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="group relative flex cursor-pointer gap-3 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <span className="text-sm">
                  {n.type === 'insight'
                    ? '💡'
                    : n.type === 'alert'
                      ? '📅'
                      : '📈'}
                </span>
                <p className="text-xs font-medium leading-relaxed text-white/80">
                  {n.message}
                </p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="py-4 text-center text-xs italic text-white/30">
                No new insights from AI.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <button className="w-full rounded-lg bg-blue-600/20 py-2 text-[10px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30">
              Go to Command Center
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
