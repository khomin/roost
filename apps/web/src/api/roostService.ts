import type { MessageShape } from '@bufbuild/protobuf';
import { requestJson, requestJsonWithBody } from './grpcGateway';
import {
  ListCamerasResponseSchema,
  CreateCameraRequestSchema,
  CreateCameraResponseSchema,
  UpdateCameraRequestSchema,
  UpdateCameraResponseSchema,
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

  updateCamera: (req: MessageShape<typeof UpdateCameraRequestSchema>) =>
    requestJsonWithBody(
      'PATCH',
      `/v1/cameras/${encodeURIComponent(req.id)}`,
      UpdateCameraRequestSchema,
      req,
      UpdateCameraResponseSchema,
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
