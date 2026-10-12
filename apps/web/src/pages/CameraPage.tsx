import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCameras } from '../hooks/useApi';
import { EmptyBlock, ErrorBlock, Spinner } from '../components/ui';
import { CameraPreview } from '../components/CameraPreview';
import { cameraFormatLabel, cameraTypeLabel } from '../utils/camera';

// Keep is_online / is_recording fresh while the page is open
const REFETCH_INTERVAL_MS = 5000;

// Narrow the page on short windows so the 16:9 video leaves room for the
// details panel below it. 16rem ≈ page padding + title row + details panel.
const PAGE_WIDTH = 'max-w-[max(28rem,min(72rem,calc((100vh_-_16rem)_*_16_/_9)))]';

export default function CameraPage() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useCameras({
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const camera = data?.cameras.find((c) => c.id === id);

  return (
    <div className={`${PAGE_WIDTH} mx-auto space-y-5`}>
      <div className="flex items-center gap-3">
        <Link
          to="/live"
          aria-label="Back to Live"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        {camera && <h1 className="truncate text-xl font-semibold">{camera.name || camera.id}</h1>}
      </div>

      {isLoading ? (
        <Spinner />
      ) : error && !data ? (
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      ) : !camera ? (
        <EmptyBlock emoji="📷" title="Camera not found" subtitle="It may have been removed." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
            <CameraPreview camera={camera} fit="contain" allowFullscreen />
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-white/5 bg-white/[0.03] p-5 sm:grid-cols-4">
            <Detail label="Type">{cameraTypeLabel(camera.type)}</Detail>
            <Detail label="Format">{cameraFormatLabel(camera) ?? '—'}</Detail>
            <Detail label="Source" mono>{camera.source || '—'}</Detail>
            <Detail label="ID" mono>{camera.id}</Detail>
          </dl>
        </>
      )}
    </div>
  );
}

function Detail({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={`mt-1 break-all text-sm text-gray-300 ${mono ? 'font-mono text-xs' : ''}`}>{children}</dd>
    </div>
  );
}
