import type { ReactNode } from 'react';
import { Wifi } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function AppShell({ children, title = 'BuildConnect', actions }: AppShellProps) {
  const isOnline = navigator.onLine;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Wifi className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
