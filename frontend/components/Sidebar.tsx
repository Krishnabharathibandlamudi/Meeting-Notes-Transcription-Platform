'use client';

import {
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  Home,
  LayoutGrid,
  Mic2,
  Settings,
  Sparkles,
  Users,
  Upload,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const nav = [
  ['Home', '/', Home],
  ['Meetings', '/', FileText],
  ['Calendar', '/calendar', CalendarDays],
  ['Contacts', '/contacts', Users],
  ['Channels', '/channels', LayoutGrid],
] as const;

const workspaceNav = [
  ['AI Assistant', '/ai-assistant', Sparkles],
  ['Uploads', '/uploads', Upload],
  ['Settings', '/settings', Settings],
] as const;

export default function Sidebar({
  active,
  mobileOpen = false,
  onClose = () => {},
}: {
  active?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const currentActive = active ?? (pathname === '/' ? 'Meetings' : '');

  return (
    <aside
      className={`${
        mobileOpen
          ? 'fixed inset-y-0 left-0 z-40 flex'
          : 'hidden'
      } lg:flex w-[255px] shrink-0 flex-col border-r border-[#eceaf1] bg-white dark:border-[var(--line)] dark:bg-[var(--panel)]`}
    >
      {/* ==================== LOGO ==================== */}
      <div className="flex h-[76px] items-center justify-between px-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5"
          aria-label="Go to meetings home"
        >
          <div className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white shadow-md shadow-purple-200/30">
            <Mic2 size={19} />
          </div>

          <span className="text-[20px] font-bold tracking-tight dark:text-white">
            fireflies<span className="text-[#6c5ce7]">.</span>
          </span>
        </button>

        <button
          className="lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* ==================== WORKSPACE ==================== */}
      <div className="px-3">

        {/* Workspace Selector */}
        <button
          onClick={() => navigate('/settings')}
          className="mb-5 flex w-full items-center justify-between rounded-2xl border border-[#ebe8f2] bg-gradient-to-r from-[#faf9fd] to-[#f5f1ff] px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[var(--line)] dark:from-[var(--soft)] dark:to-[#282235]"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-[#f2c6a0] text-xs font-bold text-[#30294a]">
              KB
            </div>

            <div>
              <div className="text-xs font-semibold dark:text-white">
                Krishna&apos;s Workspace
              </div>

              <div className="text-[10px] text-muted">
                Free plan
              </div>
            </div>
          </div>

          <ChevronDown size={15} />
        </button>

        {/* ==================== MAIN NAVIGATION ==================== */}
        {nav.map(([name, path, Icon]) => (
          <button
            key={name}
            onClick={() => navigate(path)}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              currentActive === name
                ? 'bg-gradient-to-r from-[#eeeaff] to-[#f9eafa] text-[#5d4fd4] shadow-sm dark:from-[#29234a] dark:to-[#302235] dark:text-[#cfc7ff]'
                : 'text-[#686572] hover:bg-[#f6f4fa] dark:text-[#aaa6b9] dark:hover:bg-[var(--soft)]'
            }`}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-[#efedf3] dark:border-[var(--line)]" />

        {/* Workspace Label */}
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#aaa6b3]">
          Workspace
        </div>

        {/* ==================== WORKSPACE NAV ==================== */}
        {workspaceNav.map(([name, path, Icon]) => (
          <button
            key={name}
            onClick={() => navigate(path)}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
              currentActive === name
                ? 'bg-gradient-to-r from-[#eeeaff] to-[#f9eafa] text-[#5d4fd4] shadow-sm dark:from-[#29234a] dark:to-[#302235] dark:text-[#cfc7ff]'
                : 'text-[#686572] hover:bg-[#f6f4fa] dark:text-[#aaa6b9] dark:hover:bg-[var(--soft)]'
            }`}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </div>

      {/* ==================== BOTTOM SECTION ==================== */}
      <div className="mt-auto p-4">

        {/* =====================================================
            AI INSIGHTS CARD

            IMPORTANT:
            This card intentionally stays LIGHT even in dark mode.
            Inline background guarantees no dark theme override.
        ====================================================== */}

        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, #f1edff 0%, #f8f1ff 50%, #fff0f6 100%)',
          }}
        >
          {/* Sparkle Icon */}
          <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-white text-[#6c5ce7] shadow-sm">
            <Sparkles size={17} />
          </div>

          {/* Heading */}
          <div className="text-xs font-bold text-[#30294a]">
            Unlock more AI insights
          </div>

          {/* Description */}
          <p className="mt-1 text-[11px] leading-4 text-[#79738d]">
            Ask questions, generate summaries and automate your follow-ups.
          </p>

          {/* Upgrade Button */}
          <button
            onClick={() => navigate('/settings')}
            className="mt-3 w-full rounded-lg bg-[#6c5ce7] py-2 text-xs font-semibold text-white transition-all hover:bg-[#5e50d5] hover:shadow-md"
          >
            Upgrade plan
          </button>
        </div>

        {/* ==================== HELP ==================== */}
        <button
          onClick={() => navigate('/help')}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-muted transition-colors hover:bg-[#f6f4fa] dark:hover:bg-[var(--soft)]"
        >
          <CircleHelp size={14} />
          Help center
        </button>
      </div>
    </aside>
  );
}