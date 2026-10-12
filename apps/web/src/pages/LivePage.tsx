import { Link } from 'react-router-dom';
import { useCameras } from '../hooks/useApi';
import { EmptyBlock, ErrorBlock, Spinner } from '../components/ui';
import { CameraPreview } from '../components/CameraPreview';
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
  const format = cameraFormatLabel(camera);

  return (
    <Link
      to={`/cameras/${camera.id}`}
      className="block overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] transition-colors hover:border-purple-500/30"
    >
      <CameraPreview camera={camera} />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="p-4">
        <p className="truncate text-sm font-medium text-white">{camera.name || camera.id}</p>
        <p className="mt-1 text-xs text-gray-500">
          {cameraTypeLabel(camera.type)}
          {format && ` · ${format}`}
        </p>
      </div>
    </Link>
  );
}
