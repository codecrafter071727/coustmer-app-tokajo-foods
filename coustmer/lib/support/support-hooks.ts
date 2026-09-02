import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { supportApi } from '@/lib/support/support-api';
import type {
  AddTicketMessagePayload,
  CallbackRequestPayload,
  CreateTicketPayload,
  RateTicketPayload,
} from '@/lib/support/types';
import { useAuthStore } from '@/store/auth-store';

export const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
  faqs: (params?: { category?: string; q?: string }) =>
    [...supportKeys.all, 'faqs', params ?? {}] as const,
  faq: (id: string) => [...supportKeys.all, 'faq', id] as const,
};

function useIsAuthed() {
  return useAuthStore((s) => Boolean(s.token && s.user));
}

function invalidateTickets(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId?: string
) {
  void queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
  if (ticketId) {
    void queryClient.invalidateQueries({
      queryKey: supportKeys.ticket(ticketId),
    });
  }
}

/** GET /customers/support/tickets */
export function useSupportTickets(options?: { enabled?: boolean }) {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: supportKeys.tickets(),
    queryFn: supportApi.getTickets,
    enabled: options?.enabled ?? authed,
    staleTime: 15_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}

/** Alias for screens that already call useTickets */
export const useTickets = useSupportTickets;

/** GET /customers/support/tickets/:ticketId */
export function useSupportTicket(
  ticketId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: supportKeys.ticket(ticketId),
    queryFn: () => supportApi.getTicket(ticketId),
    enabled: (options?.enabled ?? true) && Boolean(ticketId),
    staleTime: 8_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}

export const useTicket = useSupportTicket;

/** POST /customers/support/tickets */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      supportApi.createTicket(payload),
    onSuccess: (ticket) => {
      invalidateTickets(queryClient, ticket.id);
    },
  });
}

export const useCreateTicket = useCreateSupportTicket;

/** POST …/messages */
export function useAddTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddTicketMessagePayload) =>
      supportApi.addMessage(ticketId, payload),
    onSuccess: () => invalidateTickets(queryClient, ticketId),
  });
}

/** POST …/rate */
export function useRateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RateTicketPayload) =>
      supportApi.rateTicket(ticketId, payload),
    onSuccess: () => invalidateTickets(queryClient, ticketId),
  });
}

/** POST …/close */
export function useCloseTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.closeTicket(ticketId),
    onSuccess: () => invalidateTickets(queryClient, ticketId),
  });
}

/** POST …/reopen */
export function useReopenTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      supportApi.reopenTicket(ticketId, reason),
    onSuccess: () => invalidateTickets(queryClient, ticketId),
  });
}

/** POST /customers/support/callback */
export function useRequestCallback() {
  return useMutation({
    mutationFn: (payload: CallbackRequestPayload) =>
      supportApi.requestCallback(payload),
  });
}

/** GET /customers/support/faq */
export function useSupportFaqs(params?: { category?: string; q?: string }) {
  return useQuery({
    queryKey: supportKeys.faqs(params),
    queryFn: () => supportApi.getFaqs(params),
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

export const useFaqs = useSupportFaqs;

/** GET /customers/support/faq/:faqId */
export function useSupportFaq(faqId: string) {
  return useQuery({
    queryKey: supportKeys.faq(faqId),
    queryFn: () => supportApi.getFaq(faqId),
    enabled: Boolean(faqId),
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

export const useFaq = useSupportFaq;
