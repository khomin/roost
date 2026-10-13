import { CameraMode } from '../gen/v1/roost/roost_pb';
import type { Camera } from '../gen/v1/roost/roost_pb';
import { CameraType } from '../gen/v1/vision/vision_pb';

export function cameraTypeLabel(type: CameraType): string {
  switch (type) {
    case CameraType.USB:
      return 'USB';
    case CameraType.RTSP:
      return 'RTSP';
    default:
      return 'Unknown';
  }
}

export function cameraModeLabel(mode: CameraMode): string {
  return mode === CameraMode.ON_DEMAND ? 'On demand' : 'Always on';
}

/** An on-demand camera that is stopped only because nobody is watching it */
export function isStandby(camera: Camera): boolean {
  return camera.mode === CameraMode.ON_DEMAND && !camera.isOnline;
}

/** e.g. "1920×1080 @ 30 fps"; undefined until the camera has reported a format */
export function cameraFormatLabel(camera: Camera): string | undefined {
  if (!camera.width || !camera.height) return undefined;
  const resolution = `${camera.width}×${camera.height}`;
  return camera.fps ? `${resolution} @ ${camera.fps} fps` : resolution;
}
