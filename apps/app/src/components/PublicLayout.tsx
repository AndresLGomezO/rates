import { type PropsWithChildren } from 'react';
import { DebugIndicator } from './DebugIndicator';

export function PublicLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1e40af] to-[#334155] p-8">
      <div className="w-full max-w-[400px] rounded-xl bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
        {children}
      </div>
      <DebugIndicator position="fixed-left" />
    </div>
  );
}
