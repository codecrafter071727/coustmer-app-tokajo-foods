import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { customerApi } from '@/lib/customer/api';
import type {
  AddTicketMessagePayload,
  AppFeedbackPayload,
  CallbackRequestPayload,
  CrashReportPayload,
  CreateTicketPayload,
  RateTicketPayload,
  UpdateCustomerPrefsPayload,
} from '@/lib/customer/types';
import { useDeliveryCoords } from '@/store/delivery-location-store';
import { useAuthStore } from '@/store/auth-store';

export const customerKeys = {
  all: ['customer'] as const,
  config: () => [...customerKeys.all, 'config'] as const,
  health: () => [...customerKeys.all, 'health'] as const,
  home: (lat?: number, lng?: number) => [...customerKeys.all, 'home', lat, lng] as const,
  deals: () => [...customerKeys.all, 'deals'] as const,
  offers: () => [...customerKeys.all, 'offers'] as const,
  recommended: () => [...customerKeys.all, 'recommended'] as const,
  profile: () => [...customerKeys.all, 'profile'] as const,
  favorites: () => [...customerKeys.all, 'favorites'] as const,
  favouriteDishes: () => [...customerKeys.all, 'favouriteDishes'] as const,
  recent: () => [...customerKeys.all, 'recent'] as const,
  onboarding: () => [...customerKeys.all, 'onboarding'] as const,
  tickets: () => [...customerKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...customerKeys.all, 'ticket', id] as const,
  alerts: () => [...customerKeys.all, 'alerts'] as const,
  collections: () => [...customerKeys.all, 'collections'] as const,
  collection: (slug: string) => [...customerKeys.all, 'collection', slug] as const,
  faqs: () => [...customerKeys.all, 'faqs'] as const,
  faq: (id: string) => [...customerKeys.all, 'faq', id] as const,
  loyalty: () => [...customerKeys.all, 'loyalty'] as const,
  loyaltyHistory: () => [...customerKeys.all, 'loyaltyHistory'] as const,
  subscriptionPlans: () => [...customerKeys.all, 'subscriptionPlans'] as const,
  mySubscription: () => [...customerKeys.all, 'mySubscription'] as const,
  scratchCards: () => [...customerKeys.all, 'scratchCards'] as const,
};

function useIsAuthed() {
  return useAuthStore((s) => Boolean(s.token && s.user));
}

/** App config — splash screen: versions, forceUpdate, cities, feature flags */
export function useAppConfig() {
  return useQuery({
    queryKey: customerKeys.config(),
    queryFn: customerApi.getConfig,
    staleTime: 5 * 60_000,
    retry: 2,
  });
}

export function useCustomerServiceHealth() {
  return useQuery({
    queryKey: customerKeys.health(),
    queryFn: customerApi.health,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 5000,
  });
}

export function useHomeFeed() {
  const coords = useDeliveryCoords();
  const hasCoords = Boolean(coords?.lat && coords?.lng);
  return useQuery({
    queryKey: customerKeys.home(coords?.lat, coords?.lng),
    queryFn: () => customerApi.getHome(coords ?? undefined),
    enabled: hasCoords,
    staleTime: 60_000,
    retry: 1,
  });
}

/** Collection rails for home screen */
export function useCollections() {
  return useQuery({
    queryKey: customerKeys.collections(),
    queryFn: customerApi.getCollections,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/** Restaurants within a specific collection */
export function useCollectionRestaurants(slug: string, page = 1) {
  return useQuery({
    queryKey: customerKeys.collection(slug),
    queryFn: () => customerApi.getCollectionRestaurants(slug, page),
    enabled: Boolean(slug),
    staleTime: 2 * 60_000,
  });
}

export function useDeals() {
  return useQuery({
    queryKey: customerKeys.deals(),
    queryFn: customerApi.getDeals,
    staleTime: 60_000,
    retry: 1,
  });
}

/** Home offer ticker — merges banners + deals from multiple customer APIs */
export function useOffersFeed() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.offers(),
    queryFn: customerApi.getOffersFeed,
    enabled: authed,
    staleTime: 60_000,
  });
}

export function useRecommended() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.recommended(),
    queryFn: customerApi.getRecommended,
    enabled: authed,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCustomerProfile() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.profile(),
    queryFn: customerApi.getProfile,
    enabled: authed,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCustomerAlerts(options?: { enabled?: boolean }) {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.alerts(),
    queryFn: customerApi.getMyAlerts,
    enabled: authed && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useFavorites() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.favorites(),
    queryFn: customerApi.getFavorites,
    enabled: authed,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: customerKeys.recent(),
    queryFn: customerApi.getRecent,
  });
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: customerKeys.onboarding(),
    queryFn: customerApi.getOnboardingStatus,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restaurantId: string) => customerApi.addFavorite(restaurantId),
    onSuccess: () => {
      // Soft refresh — do not clear optimistic local list if API is empty
      queryClient.invalidateQueries({
        queryKey: customerKeys.favorites(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restaurantId: string) =>
      customerApi.removeFavorite(restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favorites() });
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (step: number) => customerApi.completeOnboardingStep(step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.onboarding() });
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useTickets() {
  return useQuery({
    queryKey: customerKeys.tickets(),
    queryFn: customerApi.getTickets,
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: customerKeys.ticket(ticketId),
    queryFn: () => customerApi.getTicket(ticketId),
    enabled: Boolean(ticketId),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      customerApi.createTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
    },
  });
}

export function useAddTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddTicketMessagePayload) =>
      customerApi.addTicketMessage(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
    },
  });
}

export function useRateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RateTicketPayload) =>
      customerApi.rateTicket(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
    },
  });
}

export function useCloseTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => customerApi.closeTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.tickets() });
    },
  });
}

export function useRequestCallback() {
  return useMutation({
    mutationFn: (payload: CallbackRequestPayload) =>
      customerApi.requestCallback(payload),
  });
}

export function useFaqs() {
  return useQuery({
    queryKey: customerKeys.faqs(),
    queryFn: customerApi.getFaqs,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

export function useFaq(faqId: string) {
  return useQuery({
    queryKey: customerKeys.faq(faqId),
    queryFn: () => customerApi.getFaq(faqId),
    enabled: Boolean(faqId),
    staleTime: 10 * 60_000,
  });
}

export function useUpdatePrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCustomerPrefsPayload) =>
      customerApi.updatePrefs(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
}

export function useFavouriteDishes() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.favouriteDishes(),
    queryFn: customerApi.getFavouriteDishes,
    enabled: authed,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAddFavouriteDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, restaurantId }: { itemId: string; restaurantId: string }) =>
      customerApi.addFavouriteDish(itemId, restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favouriteDishes() });
    },
  });
}

export function useRemoveFavouriteDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => customerApi.removeFavouriteDish(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favouriteDishes() });
    },
  });
}

export function useLoyalty() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.loyalty(),
    queryFn: customerApi.getLoyalty,
    enabled: authed,
    staleTime: 60_000,
  });
}

export function useLoyaltyHistory() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.loyaltyHistory(),
    queryFn: customerApi.getLoyaltyHistory,
    enabled: authed,
    staleTime: 60_000,
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: customerKeys.subscriptionPlans(),
    queryFn: customerApi.getSubscriptionPlans,
    staleTime: 10 * 60_000,
  });
}

export function useMySubscription() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.mySubscription(),
    queryFn: customerApi.getMySubscription,
    enabled: authed,
    staleTime: 60_000,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.mySubscription() });
    },
  });
}

export function useScratchCards() {
  const authed = useIsAuthed();
  return useQuery({
    queryKey: customerKeys.scratchCards(),
    queryFn: customerApi.getScratchCards,
    enabled: authed,
    staleTime: 30_000,
  });
}

export function useRevealScratchCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => customerApi.revealScratchCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.scratchCards() });
    },
  });
}

export function useReportCrash() {
  return useMutation({
    mutationFn: (payload: CrashReportPayload) => customerApi.reportCrash(payload),
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (payload: AppFeedbackPayload) => customerApi.submitFeedback(payload),
  });
}
