import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { addressApi } from './api';
import type { CreateAddressPayload, UpdateAddressPayload } from './types';

export const addressKeys = {
  all: ['address'] as const,
  list: () => [...addressKeys.all, 'list'] as const,
  detail: (id: string) => [...addressKeys.all, 'detail', id] as const,
  autocomplete: (q: string) => [...addressKeys.all, 'autocomplete', q] as const,
  serviceability: (lat: number, lng: number) =>
    [...addressKeys.all, 'serviceability', lat, lng] as const,
};

/** GET /addresses — saved address list */
export function useSavedAddresses() {
  return useQuery({
    queryKey: addressKeys.list(),
    queryFn: addressApi.listAddresses,
  });
}

/** GET /addresses/:id */
export function useSavedAddress(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: addressKeys.detail(id ?? ''),
    queryFn: () => addressApi.getAddress(id!),
    enabled: (options?.enabled ?? true) && Boolean(id),
  });
}

/** POST /addresses */
export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAddressPayload) => addressApi.createAddress(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
}

/** PUT /addresses/:id */
export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAddressPayload }) =>
      addressApi.updateAddress(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: addressKeys.list() });
      qc.invalidateQueries({ queryKey: addressKeys.detail(vars.id) });
    },
  });
}

/** DELETE /addresses/:id */
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressApi.deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
}

/** PUT /addresses/:id/default */
export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressApi.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
}

/** GET /addresses/autocomplete?q= */
export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: addressKeys.autocomplete(query),
    queryFn: () => addressApi.autocomplete(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

/** GET /addresses/serviceability?lat=&lng= */
export function useServiceability(lat: number | undefined, lng: number | undefined) {
  return useQuery({
    queryKey: addressKeys.serviceability(lat ?? 0, lng ?? 0),
    queryFn: () => addressApi.checkServiceability(lat!, lng!),
    enabled: lat != null && lng != null,
    staleTime: 60_000,
  });
}
