import { type PropsWithChildren } from 'react';
import './PublicLayout.css';

export function PublicLayout({ children }: PropsWithChildren) {
  return (
    <div className="public-layout">
      <div className="public-layout-container">{children}</div>
    </div>
  );
}
