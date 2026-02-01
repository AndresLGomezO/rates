import React, { useState } from 'react';
import { sendMessage } from '../../services/ai';

interface SmartFormAssistProps {
  fieldName: string;
  value: string;
  context?: Record<string, unknown>;
  onSuggestion: (val: string) => void;
}

export const SmartFormAssist: React.FC<SmartFormAssistProps> = ({
  fieldName,
  value,
  context,
  onSuggestion,
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!value || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const prompt = `Analyzing field "${fieldName}" with value "${value}".
  Context: ${JSON.stringify(context)}.
      Is this value typical ? If not, suggest a more standard value or format. 
      Respond with a short suggestion or "OK".`;

      const response = await sendMessage(
        prompt,
        'Be a helpful assistant for form filling. Provide concise suggestions.'
      );

      if (
        response.content.toLowerCase() !== 'ok' &&
        response.content.length < 100
      ) {
        setSuggestion(response.content);
      } else {
        setSuggestion(null);
      }
    } catch (error) {
      console.error('Form Assist Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mt-1 space-y-2">
      <div className="flex justify-end">
        <button
          onClick={() => void handleAnalyze()}
          disabled={!value || isAnalyzing}
          className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 disabled:opacity-30"
        >
          {isAnalyzing ? (
            <>
              <span className="h-2 w-2 animate-ping rounded-full bg-blue-400" />
              Analyzing...
            </>
          ) : (
            <>
              <span>✨</span> Get AI Tip
            </>
          )}
        </button>
      </div>

      {suggestion && (
        <div className="animate-in zoom-in-95 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 duration-200">
          <p className="mb-2 text-xs leading-relaxed text-blue-200">
            <strong>AI Suggestion:</strong> {suggestion}
          </p>
          <button
            onClick={() => {
              // This is a mock, in a real logic we'd extract the value
              if (suggestion.includes('"')) {
                const match = suggestion.match(/"([^"]+)"/);
                if (match) onSuggestion(match[1]);
              }
              setSuggestion(null);
            }}
            className="rounded bg-blue-500/30 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-blue-500/50"
          >
            Apply Suggestion
          </button>
          <button
            onClick={() => setSuggestion(null)}
            className="ml-2 text-[10px] font-bold text-white/40 hover:text-white/60"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
