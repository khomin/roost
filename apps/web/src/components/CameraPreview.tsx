// ─── Camera live preview ───────────────────────────────────────────────────
// 16:9 WebRTC video with offline / connecting / error states.
// Shared by the Live grid and the single-camera page.

import { useRef } from 'react';
import { Maximize, VideoOff } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { OnlineBadge, RecordingBadge } from './CameraBadges';
import type { Camera } from '../gen/v1/roost/roost_pb';

export function CameraPreview({
  camera,
  fit = 'cover',
  allowFullscreen = false,
}: {
  camera: Camera;
  /** `cover` crops to fill the tile, `contain` shows the whole frame */
  fit?: 'cover' | 'contain';
  allowFullscreen?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { status, errorMsg } = useWebRTC(camera.id, videoRef, camera.isOnline);
  const streaming = camera.isOnline && status === 'streaming';

  return (
    <div className="relative aspect-video bg-black">

      {/* Live video – always mounted so the ref is stable; hidden when offline */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${streaming ? '' : 'hidden'}`}
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

      {allowFullscreen && streaming && (
        <button
          onClick={() => videoRef.current?.requestFullscreen()}
          aria-label="Fullscreen"
          className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 text-gray-300 transition-colors hover:bg-black/70 hover:text-white cursor-pointer"
        >
          <Maximize aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  );
}
