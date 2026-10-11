import { useRef } from 'react';
import { VideoOff } from 'lucide-react';
import { useCameras } from '../hooks/useApi';
import { useWebRTC } from '../hooks/useWebRTC';
import { EmptyBlock, ErrorBlock, Spinner } from '../components/ui';
import { OnlineBadge, RecordingBadge } from '../components/CameraBadges';
import { cameraFormatLabel, cameraTypeLabel } from '../utils/camera';
import type { Camera } from '../gen/v1/roost/roost_pb';

// Keep is_online / is_recording fresh while the page is open
const REFETCH_INTERVAL_MS = 5000;

export default function LivePage() {
  const { data, isLoading, error, refetch } = useCameras({
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const cameras = data?.cameras ?? [];
  const onlineCount = cameras.filter((c) => c.isOnline).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Live</h1>
        {cameras.length > 0 && (
          <p className="text-xs text-gray-500">
            {onlineCount} of {cameras.length} online
          </p>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : error && !data ? (
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      ) : cameras.length === 0 ? (
        <EmptyBlock
          emoji="📷"
          title="No cameras yet"
          subtitle="Add one on the Cameras page to see it here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <CameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}
    </div>
  );
}

function CameraCard({ camera }: { camera: Camera }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { status, errorMsg } = useWebRTC(camera.id, videoRef, camera.isOnline);
  const format = cameraFormatLabel(camera);

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
      {/* ── Preview area ─────────────────────────────────────────── */}
      <div className="relative aspect-video bg-black">

        {/* Live video – always mounted so the ref is stable; hidden when offline */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${camera.isOnline && status === 'streaming' ? '' : 'hidden'}`}
        />

        {/* Offline placeholder */}
        {!camera.isOnline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoOff aria-hidden="true" size={32} strokeWidth={1.5} className="text-gray-700" />
          </div>
        )}

        {/* Connecting spinner */}
        {camera.isOnline && status === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        )}

        {/* WebRTC error */}
        {camera.isOnline && status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-xs font-medium text-red-400">Stream error</span>
            {errorMsg && <span className="text-[11px] text-gray-500">{errorMsg}</span>}
          </div>
        )}

        {/* Badges – always on top */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <OnlineBadge online={camera.isOnline} />
          {camera.isRecording && <RecordingBadge />}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="p-4">
        <p className="truncate text-sm font-medium text-white">{camera.name || camera.id}</p>
        <p className="mt-1 text-xs text-gray-500">
          {cameraTypeLabel(camera.type)}
          {format && ` · ${format}`}
        </p>
      </div>
    </div>
  );
}
