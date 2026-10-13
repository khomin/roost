import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from '@bufbuild/protobuf';
import type { MessageInitShape } from '@bufbuild/protobuf';
import { roostService } from '../api/roostService';
import { CreateCameraRequestSchema, UpdateCameraRequestSchema } from '../gen/v1/roost/roost_pb';
import type {
  ListCamerasResponse,
  CreateCameraResponse,
  UpdateCameraResponse,
  DeleteCameraResponse,
} from '../gen/v1/roost/roost_pb';

// ─── Query key factory ─────────────────────────────────────────────────────
export const queryKeys = {
  cameras: ['cameras'] as const,
};

// ─── Cameras ───────────────────────────────────────────────────────────────

/**
 * Fetch all cameras. Pass `refetchInterval` (ms) to keep status flags such as
 * is_online / is_recording current while the page is open.
 */
export function useCameras(options?: { refetchInterval?: number }) {
  return useQuery<ListCamerasResponse>({
    queryKey: queryKeys.cameras,
    queryFn: () => roostService.listCameras(),
    refetchInterval: options?.refetchInterval,
  });
}

/** Create a new camera */
export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation<
    CreateCameraResponse,
    Error,
    MessageInitShape<typeof CreateCameraRequestSchema>
  >({
    mutationFn: async (req) => {
      const message = create(CreateCameraRequestSchema, req);
      return roostService.createCamera(message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cameras });
    },
  });
}

/** Update a camera; fields left out are kept as they are */
export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation<
    UpdateCameraResponse,
    Error,
    MessageInitShape<typeof UpdateCameraRequestSchema>
  >({
    mutationFn: async (req) => {
      const message = create(UpdateCameraRequestSchema, req);
      return roostService.updateCamera(message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cameras });
    },
  });
}

/** Delete a camera */
export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation<DeleteCameraResponse, Error, string>({
    mutationFn: (id) => roostService.deleteCamera(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cameras });
    },
  });
}
