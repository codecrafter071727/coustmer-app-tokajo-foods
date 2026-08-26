import { useMemo } from 'react';

import { useSurgeStatus, useZones } from '@/lib/delivery/hooks';
import type { SurgeStatus } from '@/lib/delivery/types';

/** Resolve active delivery zone for surge chip (same zone list as location sheet). */
export function useActiveZoneSurge(): {
  zoneId: string;
  surge: SurgeStatus | undefined;
  chipLabel: string | null;
  isLoading: boolean;
} {
  const zones = useZones();
  const zoneId = useMemo(() => {
    const list = (zones.data ?? []).filter((z) => z.isActive !== false);
    return list[0]?.id ?? zones.data?.[0]?.id ?? '';
  }, [zones.data]);

  const surgeQuery = useSurgeStatus(zoneId);
  const surge = surgeQuery.data;

  const chipLabel = useMemo(() => {
    if (!surge?.isSurge) return null;
    if (surge.label?.trim()) return surge.label.trim();
    if (typeof surge.multiplier === 'number' && surge.multiplier > 1) {
      return `Surge ${surge.multiplier.toFixed(1)}×`;
    }
    return 'Surge pricing';
  }, [surge]);

  return {
    zoneId,
    surge,
    chipLabel,
    isLoading: zones.isLoading || surgeQuery.isLoading,
  };
}
