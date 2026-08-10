import {
  coverFallbackForCuisines,
  firstImageFromList,
  resolveMediaUrl,
} from '@/lib/restaurant/media';
import { menuItemImageForName } from '@/lib/restaurant/menu-item-images';
import {
  getMenuItemRating,
  getMenuItemReviewCount,
  getRestaurantRating,
} from '@/lib/restaurant/menu-rating';
import type {
  CuisineChip,
  CustomizationGroup,
  CustomizationOption,
  DayTimingSlot,
  KitchenAlert,
  MenuCategory,
  MenuItem,
  Restaurant,
  RestaurantHygiene,
  RestaurantMenu,
  RestaurantOffer,
  RestaurantRatings,
  RestaurantTimings,
} from '@/lib/restaurant/types';

function parseRating(data: Record<string, unknown>): number | undefined {
  return getRestaurantRating(data) ?? undefined;
}

/**
 * Resolve open/closed from restaurant-service fields.
 * Backend uses `isOnline` as the live toggle; timings are weekly schedule.
 */
export function resolveIsOpen(data: Record<string, unknown>): boolean | undefined {
  if (typeof data.isOpen === 'boolean') return data.isOpen;
  if (typeof data.isOnline === 'boolean') return data.isOnline;
  if (typeof data.openNow === 'boolean') return data.openNow;
  if (typeof data.currentlyOpen === 'boolean') return data.currentlyOpen;
  if (typeof data.acceptingOrders === 'boolean') return data.acceptingOrders;

  const settings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : undefined;
  if (typeof settings?.isOnline === 'boolean') return settings.isOnline;
  if (typeof settings?.isOpen === 'boolean') return settings.isOpen;

  const status = String(data.status ?? data.operatingStatus ?? '')
    .toLowerCase()
    .trim();
  if (status === 'offline' || status === 'closed' || status === 'inactive') {
    return false;
  }
  if (status === 'online' || status === 'open') {
    return true;
  }

  return undefined;
}

/** Fill missing fields on menu items using the flat /items list. */
export function enrichMenuItems(
  primary: MenuItem[],
  fallbackItems: MenuItem[]
): MenuItem[] {
  if (!fallbackItems.length) return primary;

  const fallbackById = new Map(fallbackItems.map((item) => [item.id, item]));
  return primary.map((item) => {
    const fallback = fallbackById.get(item.id);
    if (!fallback) return item;

    const merged: MenuItem = {
      ...item,
      tags: item.tags?.length ? item.tags : fallback.tags,
      rating: item.rating ?? fallback.rating,
      reviewCount: item.reviewCount ?? fallback.reviewCount,
      imageUrl: item.imageUrl || fallback.imageUrl,
      description: item.description || fallback.description,
      isVeg: item.isVeg ?? fallback.isVeg,
      isAvailable: item.isAvailable ?? fallback.isAvailable,
    };

    return {
      ...merged,
      rating: getMenuItemRating(merged) ?? undefined,
      reviewCount: getMenuItemReviewCount(merged) ?? merged.reviewCount,
    };
  });
}

export function mapRestaurant(data: Record<string, unknown>): Restaurant {
  const cuisinesRaw = data.cuisines ?? data.cuisineTypes ?? data.tags;
  const cuisines = Array.isArray(cuisinesRaw)
    ? (cuisinesRaw as string[]).map(String).filter(Boolean)
    : undefined;

  const addressRaw = data.address;
  let address: string | undefined;
  let cityFromAddress: string | undefined;
  if (typeof addressRaw === 'string') {
    address = addressRaw;
  } else if (addressRaw && typeof addressRaw === 'object') {
    const a = addressRaw as Record<string, unknown>;
    cityFromAddress = a.city ? String(a.city) : undefined;
    address = [a.street, a.area, a.city, a.state, a.pincode]
      .filter(Boolean)
      .map(String)
      .join(', ');
  }

  const location = data.location as { coordinates?: number[] } | undefined;
  const coords = location?.coordinates;
  const fromImages = firstImageFromList(data.images);

  const logoUrl =
    resolveMediaUrl(
      (data.logoUrl as string) ||
        (data.logo as string) ||
        (data.logoImage as string)
    ) || undefined;

  const coverUrl =
    resolveMediaUrl(
      (data.coverUrl as string) ||
        (data.coverImage as string) ||
        (data.bannerUrl as string) ||
        (data.banner as string)
    ) ||
    fromImages ||
    undefined;

  const imageUrl =
    resolveMediaUrl(data.imageUrl as string) ||
    coverUrl ||
    logoUrl ||
    coverFallbackForCuisines(cuisines);

  const prep =
    typeof data.settings === 'object' && data.settings
      ? Number((data.settings as Record<string, unknown>).avgPrepTime)
      : undefined;

  const settings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : undefined;

  const isPureVeg =
    typeof settings?.isPureVeg === 'boolean'
      ? settings.isPureVeg
      : typeof data.isPureVeg === 'boolean'
        ? data.isPureVeg
        : undefined;

  const tagsRaw = data.tags;
  const tags = Array.isArray(tagsRaw)
    ? (tagsRaw as string[])
        .map((t) => String(t).replace(/^,+\s*|,+\s*$/g, '').trim())
        .filter(Boolean)
    : undefined;

  const menuCategoriesRaw = data.categories;
  const menuCategories = Array.isArray(menuCategoriesRaw)
    ? menuCategoriesRaw
        .map((c) => {
          if (typeof c === 'string') return c.trim();
          if (c && typeof c === 'object') {
            const rec = c as Record<string, unknown>;
            return String(rec.name ?? rec.title ?? '').trim();
          }
          return '';
        })
        .filter(Boolean)
    : undefined;

  // Soft-hide deleted restaurants from customer lists
  if (data.isDeleted === true) {
    return {
      id: String(data._id ?? data.id ?? ''),
      name: String(data.name ?? data.restaurantName ?? 'Restaurant'),
      status: 'deleted',
      isOpen: false,
    };
  }

  return {
    id: String(data._id ?? data.id ?? ''),
    name: String(data.name ?? data.restaurantName ?? 'Restaurant'),
    description: (data.description as string) || undefined,
    imageUrl,
    coverUrl: coverUrl || imageUrl,
    logoUrl,
    rating: parseRating(data),
    reviewCount:
      typeof data.reviewCount === 'number'
        ? data.reviewCount
        : Number(data.totalReviews ?? data.reviews ?? data.totalRatings) || undefined,
    cuisines,
    menuCategories,
    tags,
    slug: (data.slug as string) || undefined,
    avgRating: parseRating(data),
    totalRatings:
      typeof data.totalRatings === 'number'
        ? data.totalRatings
        : Number(data.reviewCount ?? data.totalReviews) || undefined,
    offerBadges: extractOfferBadges(data),
    deliveryTimeLabel:
      (data.deliveryTimeLabel as string) ||
      (data.etaLabel as string) ||
      undefined,
    promiseMinutes:
      typeof data.promiseMinutes === 'number'
        ? data.promiseMinutes
        : Number(data.promiseMins) || undefined,
    hygieneScore:
      typeof data.hygieneScore === 'number'
        ? data.hygieneScore
        : Number(
            (data.hygiene as { score?: unknown } | undefined)?.score
          ) || undefined,
    isOnline:
      typeof data.isOnline === 'boolean' ? data.isOnline : undefined,
    isOpenNow:
      typeof data.isOpenNow === 'boolean' ? data.isOpenNow : undefined,
    nextOpenAt: (data.nextOpenAt as string) || undefined,
    deliveryTime:
      (data.deliveryTimeLabel as string) ||
      (data.deliveryTime as string) ||
      (typeof data.promiseMinutes === 'number' && data.promiseMinutes > 0
        ? `${data.promiseMinutes} mins`
        : undefined) ||
      (data.avgDeliveryTime as string) ||
      (typeof prep === 'number' && Number.isFinite(prep) && prep > 0
        ? `${prep}–${prep + 10} mins`
        : '25–35 mins'),
    priceForTwo:
      typeof data.priceForTwo === 'number'
        ? data.priceForTwo
        : Number(data.costForTwo ?? data.priceForTwo) || undefined,
    costForTwo:
      typeof data.costForTwo === 'number'
        ? data.costForTwo
        : Number(data.priceForTwo) || undefined,
    priceRange: (data.priceRange as string) || undefined,
    distance:
      typeof data.distance === 'number'
        ? data.distance
        : Number(data.distanceKm) || undefined,
    isOpen: resolveIsOpen(data),
    address,
    city: (data.city as string) || cityFromAddress || undefined,
    offer: (data.offer as string) || (data.promoText as string) || undefined,
    status: (data.status as string) || (data.verificationStatus as string) || undefined,
    isPureVeg,
    isFeatured: Boolean(data.isFeatured),
    isPromoted: Boolean(data.isPromoted),
    fssaiLicense:
      (data.fssaiLicense as string) ||
      (data.fssai as string) ||
      (data.fssaiNumber as string) ||
      undefined,
    minOrderValue: Number(settings?.minimumOrderValue ?? data.minOrderValue) || undefined,
    freeDeliveryThreshold:
      Number(settings?.freeDeliveryThreshold ?? data.freeDeliveryThreshold) ||
      undefined,
    maxDeliveryRadius:
      Number(settings?.maxDeliveryRadius ?? data.maxDeliveryRadius) || undefined,
    packagingCharge:
      Number(settings?.packagingCharge ?? data.packagingCharge) || undefined,
    isCashOnDelivery:
      typeof settings?.isCashOnDelivery === 'boolean'
        ? settings.isCashOnDelivery
        : undefined,
    isOnlinePayment:
      typeof settings?.isOnlinePayment === 'boolean'
        ? settings.isOnlinePayment
        : undefined,
    acceptScheduledOrders:
      typeof settings?.acceptScheduledOrders === 'boolean'
        ? settings.acceptScheduledOrders
        : undefined,
    lat: typeof data.lat === 'number' ? data.lat : coords?.[1],
    lng: typeof data.lng === 'number' ? data.lng : coords?.[0],
    images: Array.isArray(data.images)
      ? data.images
          .map(String)
          .filter(Boolean)
          .map(resolveMediaUrl)
          .filter((url): url is string => Boolean(url))
      : undefined,
    timings:
      data.timings && typeof data.timings === 'object'
        ? (data.timings as Record<string, unknown>)
        : undefined,
    settings,
  };
}

function extractOfferBadges(data: Record<string, unknown>): string[] | undefined {
  const raw =
    data.offerBadges ??
    data.offers ??
    data.activeOffers ??
    data.offerTitles;
  const badges: string[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (typeof row === 'string' && row.trim()) {
        badges.push(row.trim());
        continue;
      }
      if (row && typeof row === 'object') {
        const rec = row as Record<string, unknown>;
        const title = String(rec.title ?? rec.code ?? rec.name ?? '').trim();
        if (title) badges.push(title);
      }
    }
  }
  const single = (data.offer as string) || (data.promoText as string);
  if (single && !badges.includes(single)) badges.unshift(single);
  const unique = [...new Set(badges)].slice(0, 2);
  return unique.length ? unique : undefined;
}

export function mapCuisineChip(
  data: Record<string, unknown> | string,
  index = 0
): CuisineChip {
  if (typeof data === 'string') {
    const name = data.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { id: slug || `cuisine-${index}`, name, slug: slug || `cuisine-${index}` };
  }
  const name = String(data.name ?? data.label ?? data.title ?? data.cuisine ?? '').trim();
  const slug = String(
    data.slug ??
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ??
      `cuisine-${index}`
  );
  return {
    id: String(data._id ?? data.id ?? slug),
    name: name || slug,
    slug,
    restaurantCount:
      typeof data.restaurantCount === 'number'
        ? data.restaurantCount
        : Number(data.count) || undefined,
    imageUrl: (data.imageUrl as string) || (data.image as string) || undefined,
  };
}

export function mapRestaurantTimings(data: Record<string, unknown>): RestaurantTimings {
  const slots: RestaurantTimings['slots'] = {};
  const week =
    data.slots && typeof data.slots === 'object'
      ? (data.slots as Record<string, unknown>)
      : data.week && typeof data.week === 'object'
        ? (data.week as Record<string, unknown>)
        : data.timings && typeof data.timings === 'object'
          ? (data.timings as Record<string, unknown>)
          : data;

  for (const [dayRaw, value] of Object.entries(week)) {
    const day = dayRaw.toLowerCase();
    if (
      ['isopennow', 'nextopenat', 'success', 'message', '_id', 'id'].includes(day)
    ) {
      continue;
    }
    if (typeof value === 'string') {
      slots[day] = value;
      continue;
    }
    if (Array.isArray(value)) {
      slots[day] = value.map((row) => mapTimingSlot(row));
      continue;
    }
    if (value && typeof value === 'object') {
      slots[day] = [mapTimingSlot(value)];
    }
  }

  return {
    isOpenNow:
      typeof data.isOpenNow === 'boolean'
        ? data.isOpenNow
        : typeof data.openNow === 'boolean'
          ? data.openNow
          : undefined,
    nextOpenAt: (data.nextOpenAt as string) || (data.nextOpen as string) || undefined,
    slots,
    raw: data,
  };
}

function mapTimingSlot(value: unknown): DayTimingSlot {
  if (!value || typeof value !== 'object') {
    return { label: String(value ?? '') };
  }
  const rec = value as Record<string, unknown>;
  return {
    open: String(rec.open ?? rec.openTime ?? rec.start ?? '') || undefined,
    close: String(rec.close ?? rec.closeTime ?? rec.end ?? '') || undefined,
    label:
      (rec.label as string) ||
      ([rec.open ?? rec.openTime, rec.close ?? rec.closeTime]
        .filter(Boolean)
        .join(' – ') || undefined),
  };
}

function maskFssai(value?: string): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (/[x*•]/i.test(raw)) return raw;
  const digits = raw.replace(/\s+/g, '');
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 4)}${'X'.repeat(Math.max(4, digits.length - 8))}${digits.slice(-4)}`;
}

export function mapRestaurantHygiene(data: Record<string, unknown>): RestaurantHygiene {
  const nested =
    data.hygiene && typeof data.hygiene === 'object'
      ? (data.hygiene as Record<string, unknown>)
      : data;
  const maskedRaw = String(
    nested.fssaiMasked ??
      nested.fssaiLicenseMasked ??
      nested.maskedFssai ??
      data.fssaiMasked ??
      data.fssaiLicenseMasked ??
      ''
  ).trim();
  return {
    fssaiMasked: maskFssai(maskedRaw) || undefined,
    hygieneScore:
      typeof nested.hygieneScore === 'number'
        ? nested.hygieneScore
        : typeof nested.score === 'number'
          ? nested.score
          : Number(data.hygieneScore) || undefined,
    raw: data,
  };
}

export function mapCustomizationGroup(
  data: Record<string, unknown>
): CustomizationGroup {
  const optionsRaw = data.options ?? data.choices ?? data.items ?? [];
  const options: CustomizationOption[] = Array.isArray(optionsRaw)
    ? optionsRaw.map((row, i) => {
        const rec = (row && typeof row === 'object'
          ? row
          : { name: row }) as Record<string, unknown>;
        return {
          id: String(rec._id ?? rec.id ?? rec.name ?? `opt-${i}`),
          name: String(rec.name ?? rec.label ?? rec.title ?? 'Option'),
          price: Number(rec.price ?? rec.extraPrice ?? rec.addonPrice ?? 0) || 0,
          isVeg: typeof rec.isVeg === 'boolean' ? rec.isVeg : undefined,
          isAvailable:
            rec.isAvailable !== undefined ? Boolean(rec.isAvailable) : true,
        };
      })
    : [];

  return {
    id: String(data._id ?? data.id ?? data.name ?? ''),
    name: String(data.name ?? data.title ?? data.groupName ?? 'Options'),
    type: (data.type as string) || (data.kind as string) || undefined,
    required: Boolean(data.required ?? data.isRequired),
    min: typeof data.min === 'number' ? data.min : Number(data.minSelect) || undefined,
    max: typeof data.max === 'number' ? data.max : Number(data.maxSelect) || undefined,
    options,
  };
}

export function mapUnavailableIds(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data
      .map((row) =>
        typeof row === 'string'
          ? row
          : String(
              (row as { _id?: string; id?: string; itemId?: string })?._id ??
                (row as { id?: string })?.id ??
                (row as { itemId?: string })?.itemId ??
                ''
            )
      )
      .filter(Boolean);
  }
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    return mapUnavailableIds(
      rec.itemIds ?? rec.unavailable ?? rec.items ?? rec.ids ?? rec.data
    );
  }
  return [];
}

export function mapRestaurantRatings(data: Record<string, unknown>): RestaurantRatings {
  const breakdownRaw =
    data.ratingBreakdown ??
    data.breakdown ??
    data.distribution ??
    data.histogram ??
    {};
  const rec =
    breakdownRaw && typeof breakdownRaw === 'object'
      ? (breakdownRaw as Record<string, unknown>)
      : {};
  const star = (n: 1 | 2 | 3 | 4 | 5) =>
    Number(rec[n] ?? rec[String(n)] ?? rec[`${n}star`] ?? rec[`${n}Star`] ?? 0) || 0;

  return {
    avgRating:
      Number(data.avgRating ?? data.average ?? data.rating ?? 0) || 0,
    totalRatings:
      Number(data.totalRatings ?? data.total ?? data.count ?? 0) || 0,
    breakdown: { 1: star(1), 2: star(2), 3: star(3), 4: star(4), 5: star(5) },
  };
}

export function mapKitchenAlert(data: Record<string, unknown>): KitchenAlert {
  const typeRaw = String(data.type ?? data.kind ?? data.alertType ?? '').toLowerCase();
  let type: KitchenAlert['type'] = typeRaw || 'notify-open';
  if (typeRaw.includes('stock')) type = 'notify-stock';
  else if (typeRaw.includes('open')) type = 'notify-open';

  const restaurantRef =
    data.restaurant && typeof data.restaurant === 'object'
      ? (data.restaurant as { _id?: string; id?: string; name?: string })
      : undefined;
  const itemRef =
    data.item && typeof data.item === 'object'
      ? (data.item as { _id?: string; id?: string; name?: string })
      : undefined;

  return {
    id: String(data._id ?? data.id ?? `${data.restaurantId ?? ''}-${data.itemId ?? type}`),
    type,
    restaurantId:
      String(data.restaurantId ?? restaurantRef?._id ?? restaurantRef?.id ?? '') ||
      undefined,
    restaurantName:
      (data.restaurantName as string) || restaurantRef?.name || undefined,
    itemId:
      String(data.itemId ?? data.menuItemId ?? itemRef?._id ?? itemRef?.id ?? '') ||
      undefined,
    itemName: (data.itemName as string) || itemRef?.name || undefined,
    active: data.active !== undefined ? Boolean(data.active) : true,
    pushed: typeof data.pushed === 'boolean' ? data.pushed : undefined,
  };
}

export function mapCategory(data: Record<string, unknown>): MenuCategory {
  return {
    id: String(data._id ?? data.id ?? data.name ?? ''),
    name: String(data.name ?? data.title ?? 'Category'),
    description: (data.description as string) || undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    itemCount: typeof data.itemCount === 'number' ? data.itemCount : undefined,
  };
}

export function mapMenuItem(
  data: Record<string, unknown>,
  categoryHint?: Pick<MenuCategory, 'id' | 'name'>
): MenuItem {
  const categoryObj =
    data.category && typeof data.category === 'object'
      ? (data.category as Record<string, unknown>)
      : undefined;

  const categoryIdRaw =
    data.categoryId ?? categoryObj?._id ?? categoryObj?.id ?? categoryHint?.id;

  const categoryName =
    (data.categoryName as string) ||
    (categoryObj?.name as string) ||
    categoryHint?.name;

  const imageFromList = firstImageFromList(data.images);
  const itemName = String(data.name ?? data.title ?? 'Item');
  const itemId = String(data._id ?? data.id ?? '');

  const apiImage =
    resolveMediaUrl(
      (data.imageUrl as string) || (data.image as string) || imageFromList
    ) || undefined;

  const tags = Array.isArray(data.tags)
    ? (data.tags as unknown[]).map(String).filter(Boolean)
    : undefined;

  const isBestSeller =
    data.isBestSeller !== undefined
      ? Boolean(data.isBestSeller)
      : tags?.some((t) => t.toLowerCase().includes('best')) ?? false;
  const isRecommended =
    data.isRecommended !== undefined
      ? Boolean(data.isRecommended)
      : tags?.some((t) =>
          t.toLowerCase().includes('chef') ||
          t.toLowerCase().includes('recommend')
        ) ?? false;
  const isNew =
    data.isNew !== undefined
      ? Boolean(data.isNew)
      : tags?.some((t) => t.toLowerCase() === 'new') ?? false;

  const mapped: MenuItem = {
    id: itemId,
    name: itemName,
    description: (data.description as string) || undefined,
    price: Number(data.price ?? data.basePrice ?? 0),
    imageUrl: apiImage || menuItemImageForName(itemId || itemName),
    categoryId: categoryIdRaw ? String(categoryIdRaw) : undefined,
    categoryName,
    isVeg: data.isVeg !== undefined ? Boolean(data.isVeg) : undefined,
    isVegan: data.isVegan !== undefined ? Boolean(data.isVegan) : undefined,
    isAvailable:
      data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
    isBestSeller,
    isRecommended,
    isNew,
    spiceLevel: (data.spiceLevel as string) || undefined,
    tags,
    sortOrder:
      typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    rating: getMenuItemRating({ ...data, tags }) ?? undefined,
    reviewCount: getMenuItemReviewCount({ ...data, tags }) ?? undefined,
    allergens: Array.isArray(data.allergens)
      ? (data.allergens as unknown[]).map(String).filter(Boolean)
      : undefined,
    totalOrdered:
      typeof data.totalOrdered === 'number' ? data.totalOrdered : undefined,
  };

  return mapped;
}

export function mapOffer(data: Record<string, unknown>): RestaurantOffer {
  return {
    id: String(data._id ?? data.id ?? ''),
    title: String(data.title ?? data.name ?? 'Offer'),
    description: (data.description as string) || undefined,
    code: (data.code as string) || (data.couponCode as string) || undefined,
    discountType: (data.discountType as string) || undefined,
    discountValue:
      typeof data.discountValue === 'number'
        ? data.discountValue
        : Number(data.discount) || undefined,
    minOrderAmount:
      typeof data.minOrderAmount === 'number'
        ? data.minOrderAmount
        : Number(data.minOrder) || undefined,
    validUntil: (data.validUntil as string) || (data.expiresAt as string) || undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

function isNestedMenuGroup(row: Record<string, unknown>): boolean {
  return Array.isArray(row.items) || Array.isArray(row.menuItems);
}

export function normalizeMenu(data: unknown): RestaurantMenu {
  if (!data || typeof data !== 'object') {
    return { categories: [], items: [] };
  }

  const payload = data as Record<string, unknown>;

  // { categories: [...], items: [...] }
  if (Array.isArray(payload.categories) || Array.isArray(payload.items)) {
    const categories = Array.isArray(payload.categories)
      ? payload.categories.map((c) => mapCategory(c as Record<string, unknown>))
      : [];
    let items = Array.isArray(payload.items)
      ? payload.items.map((i) => mapMenuItem(i as Record<string, unknown>))
      : [];

    // Categories may embed items (Swiggy-style grouped menu)
    if (
      !items.length &&
      Array.isArray(payload.categories) &&
      payload.categories.some(
        (c) =>
          c &&
          typeof c === 'object' &&
          Array.isArray((c as Record<string, unknown>).items)
      )
    ) {
      for (const raw of payload.categories as Record<string, unknown>[]) {
        const category = mapCategory(raw);
        const groupItems = Array.isArray(raw.items) ? raw.items : [];
        for (const rawItem of groupItems) {
          items.push(mapMenuItem(rawItem as Record<string, unknown>, category));
        }
      }
    }

    return { categories, items };
  }

  // [{ category, items }] — restaurant-service full menu shape
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { categories: [], items: [] };
    }

    const first = data[0] as Record<string, unknown>;
    if (isNestedMenuGroup(first)) {
      const categories: MenuCategory[] = [];
      const items: MenuItem[] = [];

      for (const group of data as Record<string, unknown>[]) {
        const catRaw = (group.category ?? group) as Record<string, unknown>;
        const category = mapCategory(catRaw);
        categories.push(category);

        const groupItems = Array.isArray(group.items)
          ? group.items
          : Array.isArray(group.menuItems)
            ? group.menuItems
            : [];
        for (const rawItem of groupItems) {
          items.push(
            mapMenuItem(rawItem as Record<string, unknown>, category)
          );
        }
      }

      // Stable category order
      categories.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      return { categories, items };
    }

    return {
      categories: [],
      items: data.map((i) => mapMenuItem(i as Record<string, unknown>)),
    };
  }

  // { menu: [...] }
  if (Array.isArray(payload.menu)) {
    return normalizeMenu(payload.menu);
  }

  return { categories: [], items: [] };
}

export function toList<T>(
  data: unknown,
  mapper: (row: Record<string, unknown>) => T
): T[] {
  if (Array.isArray(data)) {
    return data.map((row) => mapper(row as Record<string, unknown>));
  }
  return [];
}

/** Map restaurant-service model to customer home card shape. */
export function restaurantToCard(restaurant: Restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    imageUrl: restaurant.imageUrl ?? restaurant.coverUrl ?? restaurant.logoUrl,
    rating: restaurant.rating,
    cuisines: restaurant.cuisines,
    deliveryTime: restaurant.deliveryTime,
    priceForTwo: restaurant.priceForTwo ?? restaurant.costForTwo,
    city: restaurant.city,
    offer: restaurant.offer,
    status: restaurant.status,
    isOpen: restaurant.isOpen,
  };
}
