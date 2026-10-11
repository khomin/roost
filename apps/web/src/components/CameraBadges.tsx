// ─── Camera status badges ──────────────────────────────────────────────────
// Shared by the Live grid and the Cameras list.

export function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        online ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-gray-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-400' : 'bg-gray-500'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export function RecordingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      REC
    </span>
  );
}
