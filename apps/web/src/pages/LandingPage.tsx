// ─── Landing Page ─────────────────────────────────────────────────────────────
// Public page. Shown when the user is not authenticated.
// The "Log in" CTA kicks off the PKCE login flow.

import { Fragment, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bird,
  Camera,
  Check,
  Cpu,
  MonitorPlay,
  Server,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const REPO_URL = 'https://github.com/khomin/roost';

export default function LandingPage() {
  const { login, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  // If already logged in, skip the landing page entirely
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/live', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#080a12] text-white selection:bg-violet-500/30">
      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/40">
            <Bird aria-hidden="true" size={18} strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Roost</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] font-medium">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-slate-100"
          >
            GitHub
            <ArrowUpRight aria-hidden="true" size={14} />
          </a>
          <button
            onClick={login}
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10"
          >
            Log in
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-6">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="pt-20 pb-16 sm:pt-28">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Self-hosted · v0.1.0
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Keep an eye on home,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              from your own box.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
            Roost is a small camera monitor I'm building for my own place. A C++
            daemon pulls frames from USB and RTSP cameras, a Go gateway relays
            them over WebRTC, and you watch live in the browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={login}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition-all hover:bg-slate-200 active:scale-[0.98]"
            >
              Open the dashboard
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Read the source
              <ArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </section>

        {/* ── Pipeline ──────────────────────────────────────────────────── */}
        <section className="pb-16">
          <SectionLabel>How a frame gets to you</SectionLabel>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;

              return (
                <Fragment key={step.title}>
                  {i > 0 && (
                    <ArrowRight
                      aria-hidden="true"
                      size={16}
                      className="mx-auto shrink-0 rotate-90 text-slate-700 sm:rotate-0"
                    />
                  )}
                  <div className="flex-1 rounded-2xl border border-white/[0.07] bg-[#0d101a] p-5">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} className="mb-3 text-violet-400" />
                    <h3 className="text-[13px] font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </section>

        {/* ── Status ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-10 pb-24 sm:grid-cols-2">
          <div>
            <SectionLabel>Works today</SectionLabel>
            <ul className="space-y-3">
              {WORKING.map((item) => (
                <StatusItem key={item} icon={Check} iconClassName="text-emerald-400">
                  {item}
                </StatusItem>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>Still on the bench</SectionLabel>
            <ul className="space-y-3">
              {IN_PROGRESS.map((item) => (
                <StatusItem key={item} icon={Wrench} iconClassName="text-slate-500">
                  {item}
                </StatusItem>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.07] px-6 py-6 text-center text-xs text-slate-600">
        Roost — built for fun, not for sale.
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
      {children}
    </h2>
  );
}

function StatusItem({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-[13px] leading-relaxed text-slate-300">
      <Icon aria-hidden="true" size={15} strokeWidth={2} className={`mt-0.5 shrink-0 ${iconClassName}`} />
      <span>{children}</span>
    </li>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PIPELINE: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Camera,
    title: 'Camera',
    description: 'USB webcam or any RTSP stream on your network.',
  },
  {
    icon: Cpu,
    title: 'Vision daemon',
    description: 'C++ and GStreamer. Captures, encodes H.264, writes to shared memory.',
  },
  {
    icon: Server,
    title: 'Gateway',
    description: 'Go. Reads shared memory, handles auth and WebRTC signalling.',
  },
  {
    icon: MonitorPlay,
    title: 'Browser',
    description: 'Plain WebRTC video. No plugins, no cloud relay.',
  },
];

const WORKING = [
  'USB and RTSP cameras',
  'Live view over WebRTC',
  'Add, rename and remove cameras from the UI',
  'Online status per camera',
  'Login through Keycloak',
];

const IN_PROGRESS = [
  'Motion and object detection (YOLO)',
  'Recording clips to S3-compatible storage',
  'Review page for browsing past events',
];
