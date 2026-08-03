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
  MenuCategory,
  MenuItem,
  Restaurant,
  RestaurantMenu,
  RestaurantOffer,
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
    tags,
    deliveryTime:
      (data.deliveryTime as string) ||
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
