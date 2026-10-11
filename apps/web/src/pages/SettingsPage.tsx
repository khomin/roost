// ─── Settings Page ─────────────────────────────────────────────────────────
// Notification preferences, currency, Keycloak profile link.

import { useAuth } from '../auth/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const displayName =
    user?.name ?? user?.preferred_username ?? user?.email ?? 'Whale';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">⚙️ Settings</h1>

      {/* Profile card */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{displayName}</p>
            <p className="text-sm text-gray-500">{user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500 mb-2">Account management is handled by your identity provider.</p>
          <a
            href={import.meta.env.VITE_KEYCLOAK_ACCOUNT_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            Open Keycloak account console →
          </a>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Preferences</h2>

        <div className="space-y-4">
          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Base currency</p>
              <p className="text-xs text-gray-500">All values displayed in this currency</p>
            </div>
            <select
              defaultValue="USD"
              className="rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-sm text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div>
              <p className="text-sm text-white">Price alerts</p>
              <p className="text-xs text-gray-500">Get notified when coins hit your targets</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" disabled />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 opacity-50" />
            </label>
          </div>

          {/* Whale alerts */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div>
              <p className="text-sm text-white">Whale movement alerts</p>
              <p className="text-xs text-gray-500">Notify on large wallet transactions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" disabled />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 opacity-50" />
            </label>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-gray-600">More preferences available soon.</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-xs text-gray-500 mb-4">
          Sign out of your current session. You can sign back in anytime.
        </p>
        <button
          onClick={logout}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400
                     hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}