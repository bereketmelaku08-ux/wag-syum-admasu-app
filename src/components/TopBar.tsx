import { Download, Home, ShieldCheck } from 'lucide-react';
import type { AppView } from '../types';

interface TopBarProps {
  currentView: AppView;
  onNavigate: (view: AppView, scrollToGuide?: boolean) => void;
}

export function TopBar({ currentView, onNavigate }: TopBarProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-line institutional wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-left text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate max-w-[215px] sm:max-w-none shrink-0 hover:text-blue-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 rounded-md px-1 py-1 sm:text-lg"
          >
            ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="ዋና ማውጫ"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-slate-950 ${
                currentView === 'home' ? 'text-blue-900 font-semibold underline underline-offset-8 decoration-2' : ''
              }`}
            >
              መነሻ
            </button>
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-slate-950 ${
                currentView === 'download' ? 'text-blue-900 font-semibold underline underline-offset-8 decoration-2' : ''
              }`}
            >
              አፕሊኬሽኖች
            </button>
            <button
              type="button"
              onClick={() => onNavigate('download', true)}
              className="whitespace-nowrap shrink-0 py-1 transition-colors hover:text-slate-950"
            >
              አጫጫን መመሪያ
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-slate-950 ${
                currentView === 'admin' ? 'text-blue-900 font-semibold underline underline-offset-8 decoration-2' : ''
              }`}
            >
              አድሚን
            </button>
          </nav>

          {/* Zone 3: Single primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-blue-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2 sm:text-sm"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>አፕ አውርድ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar within 15% height cap */}
      <nav
        aria-label="የሞባይል ማውጫ"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="grid h-14 grid-cols-3 items-center">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              currentView === 'home' ? 'text-blue-900 font-semibold' : 'text-slate-500'
            }`}
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>መነሻ</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('download')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              currentView === 'download' ? 'text-blue-900 font-semibold' : 'text-slate-500'
            }`}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            <span>አውርድ</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              currentView === 'admin' ? 'text-blue-900 font-semibold' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <span>አድሚን</span>
          </button>
        </div>
      </nav>
    </>
  );
}
