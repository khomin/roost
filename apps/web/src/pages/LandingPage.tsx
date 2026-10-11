// ─── Landing Page ─────────────────────────────────────────────────────────────
// Public page. Shown when the user is not authenticated.
// The "Get Started" / "Log In" CTA kicks off the PKCE login flow.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LandingPage() {
  const { login, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  // If already logged in, skip the landing page entirely
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden selection:bg-purple-500/30">
      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Top-right glow */}
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        {/* Bottom-left glow */}
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/30">
            <span className="text-lg">🐋</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">WhaleTracker</span>
        </div>
        <button
          onClick={login}
          className="group relative inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200
                     hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-200 transition-all cursor-pointer"
        >
          Log in
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center gap-6 pt-16 pb-8">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full border border-purple-500/25
                       bg-purple-500/8 px-4 py-1.5 text-xs font-medium text-purple-300
                       ring-1 ring-purple-500/10"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75" />
            <span className="relative rounded-full h-2 w-2 bg-purple-400" />
          </span>
          Multi-chain portfolio tracking
        </span>

        {/* Headline */}
        <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
          <span className="bg-gradient-to-br from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Track every wallet.
          </span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
            Across every chain.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="max-w-lg text-base sm:text-lg text-gray-400 leading-relaxed">
          WhaleTracker gives you a single dashboard for Bitcoin, Ethereum,
          Solana, Tron and more — with live prices and portfolio history.
        </p>

        {/* CTA */}
        <button
          onClick={login}
          className="group relative mt-4 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4
                     text-base font-semibold text-gray-950
                     shadow-[0_0_40px_-8px_rgba(168,85,247,0.4)]
                     hover:shadow-[0_0_60px_-8px_rgba(168,85,247,0.6)]
                     hover:bg-gray-100 active:scale-[0.97] transition-all cursor-pointer"
        >
          Get Started
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Trust line */}
        <p className="text-xs text-gray-600 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <ShieldIcon className="h-3 w-3" /> Keycloak
          </span>
          <span className="h-3 w-px bg-gray-800" />
          <span>PKCE OAuth2</span>
          <span className="h-3 w-px bg-gray-800" />
          <span>No seed phrases stored</span>
        </p>
      </main>

      {/* ── Supported chains ────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-10 max-w-3xl mx-auto w-full">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-gray-600 mb-5">
          Supported Chains
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {CHAINS.map((chain) => (
            <div
              key={chain.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02]
                         px-3.5 py-2 text-sm text-gray-300 hover:border-white/10 hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-base">{chain.icon}</span>
              <span className="text-xs font-medium">{chain.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────── */}
      <section className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-px px-6 pb-20 max-w-4xl mx-auto w-full">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02]
                       p-6 text-left hover:border-purple-500/25 hover:bg-white/[0.04]
                       transition-all duration-300"
          >
            {/* Icon */}
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl
                         bg-purple-500/10 ring-1 ring-purple-500/20 mb-4
                         group-hover:bg-purple-500/15 group-hover:ring-purple-500/30 transition-all"
            >
              {f.icon}
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-6 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} WhaleTracker. Read-only wallet monitoring.
      </footer>
    </div>
  );
}

// ─── Icons (inline SVGs) ──────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Feature icons (inline SVGs — cleaner than emoji) ─────────────────────────
function PulseIcon() {
  return (
    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h2l3 5 2-4h2M9 17H7l-3-5-2 4H1" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-8 4 4 4-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <PulseIcon />,
    title: 'Live Prices',
    description:
      'Real-time market data powered by CoinGecko and Alchemy for every asset in your portfolio.',
  },
  {
    icon: <ChartIcon />,
    title: 'Portfolio Overview',
    description:
      'See total balance, per-chain breakdown, and 24h change at a glance.',
  },
  {
    icon: <LockIcon />,
    title: 'Non-custodial',
    description:
      'Read-only wallet monitoring. We never ask for private keys or seed phrases.',
  },
];

const CHAINS = [
  { name: 'Bitcoin', icon: '₿' },
  { name: 'Ethereum', icon: 'Ξ' },
  { name: 'Solana', icon: '◎' },
  { name: 'Tron', icon: 'TRX' },
  { name: 'BNB Chain', icon: 'BNB' },
  { name: 'Polygon', icon: 'MATIC' },
  { name: 'Arbitrum', icon: 'ARB' },
  { name: 'Optimism', icon: 'OP' },
];
