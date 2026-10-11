import type { MessageShape } from '@bufbuild/protobuf';
import { requestJson, requestJsonWithBody } from './grpcGateway';
import {
  ListCamerasResponseSchema,
  CreateCameraRequestSchema,
  CreateCameraResponseSchema,
  DeleteCameraResponseSchema,
  SignalWebRTCRequestSchema,
  SignalWebRTCResponseSchema,
} from '../gen/v1/roost/roost_pb';

export const roostService = {
  listCameras: () =>
    requestJson('GET', '/v1/cameras', ListCamerasResponseSchema),

  createCamera: (req: MessageShape<typeof CreateCameraRequestSchema>) =>
    requestJsonWithBody(
      'POST',
      '/v1/cameras',
      CreateCameraRequestSchema,
      req,
      CreateCameraResponseSchema,
    ),

  deleteCamera: (id: string) =>
    requestJson(
      'DELETE',
      `/v1/cameras/${encodeURIComponent(id)}`,
      DeleteCameraResponseSchema,
    ),

  signalWebRTC: (req: MessageShape<typeof SignalWebRTCRequestSchema>) =>
    requestJsonWithBody(
      'POST',
      `/v1/cameras/${encodeURIComponent(req.cameraId)}/signal`,
      SignalWebRTCRequestSchema,
      req,
      SignalWebRTCResponseSchema,
    ),
};
