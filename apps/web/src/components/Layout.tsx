import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  Camera,
  LayoutDashboard,
  LogOut,
  Settings2,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/live', label: 'Live', icon: LayoutDashboard },
  { path: '/cameras', label: 'Cameras', icon: Camera },
  { path: '/review', label: 'Review', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings2 },
];


export default function Layout() {
  const { user, logout } = useAuth();

  const displayName =
    user?.name ?? user?.preferred_username ?? user?.email ?? 'Whale';

  return (
    <div className="flex h-screen bg-[#080a12] text-white">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0d101a]">
        {/* Logo */}
        <div className="flex h-[82px] items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/40">
            <span className="text-lg font-black tracking-tight">W</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-white">WhaleTracker</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Portfolio intelligence</div>
          </div>
        </div>

        {/* Nav items */}
        <nav aria-label="Primary navigation" className="flex-1 px-3 py-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  draggable={false}
                  className={({ isActive }) =>
                    `group relative flex select-none items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-[background-color,color] duration-200 ${isActive
                      ? 'bg-white/[0.07] text-white'
                      : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon aria-hidden="true" size={18} strokeWidth={1.8} className="shrink-0 transition-colors" />
                      <span>{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={`ml-auto h-1.5 w-1.5 rounded-full transition-opacity ${isActive ? 'bg-slate-400 opacity-100' : 'bg-slate-600 opacity-0 group-hover:opacity-60'}`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.07] px-4 py-5">
          <div className="flex items-center gap-2 px-2 text-[11px] text-slate-600">
            <Tag aria-hidden="true" size={13} />
            <span>WhaleTracker v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-end border-b border-white/[0.07] px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300">{displayName}</span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400
                         transition-colors hover:border-red-500/40 hover:text-red-400 cursor-pointer"
            >
              <LogOut aria-hidden="true" size={15} />
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Page content injected by router */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}