import { type PropsWithChildren } from 'react';

export function PublicLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8">
      <div className="w-full max-w-[400px] rounded-xl bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
        {children}
      </div>
    </div>
  );
}
