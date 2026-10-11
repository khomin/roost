import { useEffect, useRef, useState } from 'react';
import { create } from '@bufbuild/protobuf';
import { roostService } from '../api/roostService';
import { SignalWebRTCRequestSchema } from '../gen/v1/roost/roost_pb';

export type WebRTCStatus = 'idle' | 'connecting' | 'streaming' | 'error';

/**
 * Manages a single WebRTC receive-only stream for one camera.
 *
 * - Starts automatically when `enabled` flips to true (camera comes online).
 * - Closes the RTCPeerConnection on unmount, cameraId change, or `enabled` → false.
 */
export function useWebRTC(
  cameraId: string,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [status, setStatus] = useState<WebRTCStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // Nothing to do while the camera is offline – cleanup will reset state.
    if (!enabled) return;

    // Capture the video element now so the cleanup closure has a stable ref.
    const videoEl = videoRef.current;

    let cancelled = false;

    async function connect() {
      setStatus('connecting');
      setErrorMsg(null);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (!videoEl) return;
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        videoEl.srcObject = stream;
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        const state = pc.connectionState;
        if (state === 'connected') {
          setStatus('streaming');
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setStatus('error');
          setErrorMsg(`Connection ${state}`);
        }
      };

      // Receive-only – we never send media
      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (cancelled) { pc.close(); return; }

      const req = create(SignalWebRTCRequestSchema, {
        cameraId,
        sdpType: 'offer',
        sdpOffer: offer.sdp ?? '',
      });
      const resp = await roostService.signalWebRTC(req);
      if (cancelled) { pc.close(); return; }

      await pc.setRemoteDescription({ type: 'answer', sdp: resp.sdpAnswer });
    }

    connect().catch((err: Error) => {
      if (cancelled) return;
      setStatus('error');
      setErrorMsg(err.message);
    });

    return () => {
      cancelled = true;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoEl) videoEl.srcObject = null;
      setStatus('idle');
      setErrorMsg(null);
    };
  }, [cameraId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, errorMsg };
}
