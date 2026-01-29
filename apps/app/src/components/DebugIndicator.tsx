// Declare build-time constants that Vite injects
declare const __BUILD_TIME__: string | undefined;
declare const __BUILD_DATE__: string | undefined;
declare const __BUILD_TIME_ONLY__: string | undefined;
declare const __BUILD_NUMBER__: string | undefined;

// Helper to safely access build-time constants
// These are replaced at build time by Vite's define feature
function getBuildInfo(): {
  buildTime: string;
  buildDate: string;
  buildTimeOnly: string;
  buildNumber: string;
} | null {
  try {
    // These constants are injected at build time by Vite
    // They're declared above but may be undefined in dev mode
    const buildTime =
      typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;
    const buildDate =
      typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : null;
    const buildTimeOnly =
      typeof __BUILD_TIME_ONLY__ !== 'undefined' ? __BUILD_TIME_ONLY__ : null;
    const buildNumber =
      typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : null;

    if (buildTime && buildDate && buildTimeOnly && buildNumber) {
      return { buildTime, buildDate, buildTimeOnly, buildNumber };
    }
  } catch {
    // Constants don't exist in dev mode
  }
  return null;
}

interface DebugIndicatorProps {
  position?: 'fixed-left' | 'inline';
}

export function DebugIndicator({
  position = 'fixed-left',
}: DebugIndicatorProps) {
  const buildInfo = getBuildInfo();

  // Check if debug indicator is disabled via environment variable
  const showDebug = import.meta.env.VITE_SHOW_DEBUG_INDICATOR !== 'false';

  // Only show in production builds (when constants are defined) and if enabled
  if (!buildInfo || !showDebug) {
    return null;
  }

  const { buildDate, buildTimeOnly, buildNumber } = buildInfo;

  const baseClasses =
    'px-3 py-2 bg-slate-900 text-white text-xs font-mono rounded-lg shadow-lg border border-slate-700';
  const positionClasses =
    position === 'fixed-left' ? 'fixed bottom-4 left-4 z-50' : 'w-full mb-3';

  return (
    <div className={`${baseClasses} ${positionClasses}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Build:</span>
          <span className="font-semibold text-sky-400">{buildNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Date:</span>
          <span>{buildDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Time:</span>
          <span>{buildTimeOnly}</span>
        </div>
      </div>
    </div>
  );
}
