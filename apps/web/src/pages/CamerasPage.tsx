import { useState, type SubmitEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCameras, useCreateCamera, useDeleteCamera } from '../hooks/useApi';
import { EmptyBlock, ErrorBlock, Field, Modal, Spinner } from '../components/ui';
import { OnlineBadge, RecordingBadge } from '../components/CameraBadges';
import { cameraFormatLabel, cameraTypeLabel } from '../utils/camera';
import type { Camera } from '../gen/v1/roost/roost_pb';
import { CameraType } from '../gen/v1/vision/vision_pb';

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white ' +
  'placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50';

export default function CamerasPage() {
  const { data, isLoading, error, refetch } = useCameras();
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState<Camera | null>(null);

  const cameras = data?.cameras ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cameras</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white
                     transition-colors hover:bg-purple-500 cursor-pointer"
        >
          <Plus aria-hidden="true" size={15} />
          <span>Add camera</span>
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error && !data ? (
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      ) : cameras.length === 0 ? (
        <EmptyBlock emoji="📷" title="No cameras yet" subtitle="Add your first camera to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Format</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cameras.map((camera) => (
                <tr key={camera.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{camera.name || '—'}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-gray-600">{camera.id}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-gray-600">{camera.source}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{cameraTypeLabel(camera.type)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <OnlineBadge online={camera.isOnline} />
                      {camera.isRecording && <RecordingBadge />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{cameraFormatLabel(camera) ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setToDelete(camera)}
                      aria-label={`Delete ${camera.name || camera.id}`}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddCameraModal onClose={() => setShowAdd(false)} />}
      {toDelete && <DeleteCameraModal camera={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

// ── Add camera ────────────────────────────────────────────────────────────

function AddCameraModal({ onClose }: { onClose: () => void }) {
  const createCamera = useCreateCamera();
  const [name, setName] = useState('');
  const [type, setType] = useState<CameraType>(CameraType.RTSP);
  const [source, setSource] = useState('');

  const canSubmit = name.trim() !== '' && source.trim() !== '' && !createCamera.isPending;

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    createCamera.mutate(
      { name: name.trim(), type, source: source.trim() },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal title="Add camera" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Front door"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(Number(e.target.value) as CameraType)}
            className={INPUT_CLASS}
          >
            <option value={CameraType.RTSP}>RTSP</option>
            <option value={CameraType.USB}>USB</option>
          </select>
        </Field>

        <Field label="Source">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={type === CameraType.USB ? '/dev/video0' : 'rtsp://user:pass@192.168.1.10:554/stream'}
            className={`${INPUT_CLASS} font-mono`}
          />
        </Field>

        {createCamera.error && (
          <p className="text-xs text-red-400">{createCamera.error.message}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors
                       hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {createCamera.isPending ? 'Adding…' : 'Add camera'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete camera ─────────────────────────────────────────────────────────

function DeleteCameraModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const deleteCamera = useDeleteCamera();

  return (
    <Modal title="Delete camera" onClose={onClose}>
      <p className="text-sm text-gray-400">
        Delete <span className="font-medium text-white">{camera.name || camera.id}</span>? This cannot be undone.
      </p>

      {deleteCamera.error && (
        <p className="mt-3 text-xs text-red-400">{deleteCamera.error.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-6">
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => deleteCamera.mutate(camera.id, { onSuccess: onClose })}
          disabled={deleteCamera.isPending}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors
                     hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {deleteCamera.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}
