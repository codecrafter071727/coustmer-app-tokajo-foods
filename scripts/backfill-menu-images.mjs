#!/usr/bin/env node
/**
 * Backfill name-matched image URLs on API menu items.
 * PUT /restaurants/:id/items/:itemId
 *
 * Updates items with missing images or stock/Unsplash placeholders so photos
 * match the dish name. Skips real partner uploads unless --force.
 *
 * SEED_EMAIL + SEED_PASSWORD required unless --dry-run
 */

import { ApiClient, getApiBase, getId, sleep } from './lib/api-client.mjs';
import { menuItemImageForName } from './lib/menu-item-images.mjs';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const delayMs = Number(process.env.SEED_DELAY_MS ?? 400);

function isStockUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  return /unsplash\.com|picsum\.photos|via\.placeholder|placehold\.co|dummyimage|loremflickr/i.test(
    url,
  );
}

/** Compare Unsplash photo ids so query-string differences don't force rewrites. */
function photoKey(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/photo-[\w-]+/);
  return m ? m[0] : url.trim();
}

async function updateItemImage(client, restaurantId, item, imageUrl) {
  const itemId = getId(item);
  const path = `/api/v1/restaurant-service/restaurants/${restaurantId}/items/${itemId}`;
  const bodies = [{ image: imageUrl }, { imageUrl }];

  for (const body of bodies) {
    try {
      await client.request(path, { method: 'PUT', body });
      return true;
    } catch {
      // try next shape
    }
  }
  return false;
}

async function main() {
  const email = process.env.SEED_EMAIL?.trim();
  const password = process.env.SEED_PASSWORD?.trim();
  console.log(
    `API: ${getApiBase()} | ${dryRun ? 'DRY RUN' : 'UPDATE'}${force ? ' | FORCE' : ''}`,
  );

  if (!dryRun && (!email || !password)) {
    console.error('Set SEED_EMAIL and SEED_PASSWORD');
    process.exit(1);
  }

  const client = new ApiClient();
  if (!dryRun) await client.login(email, password);
  else {
    client.request = async (path) => {
      const res = await fetch(`${getApiBase()}${path}`, {
        headers: { Accept: 'application/json' },
      });
      return res.json();
    };
  }

  let updated = 0;
  let skipped = 0;
  const restaurants = await client.getAllRestaurants();

  for (const restaurant of restaurants) {
    const rid = getId(restaurant);
    const res = await client.request(
      `/api/v1/restaurant-service/restaurants/${rid}/items?limit=100`,
    );
    const items = Array.isArray(res.data) ? res.data : [];

    for (const item of items) {
      const existing = item.image || item.imageUrl;
      const imageUrl = menuItemImageForName(item.name ?? 'Dish');

      if (existing && !isStockUrl(existing) && !force) {
        skipped += 1;
        continue;
      }
      if (existing && photoKey(existing) === photoKey(imageUrl) && !force) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`Would update: ${restaurant.name} → ${item.name}`);
        updated += 1;
        continue;
      }
      if (await updateItemImage(client, rid, item, imageUrl)) {
        console.log(`✓ ${restaurant.name} → ${item.name}`);
        updated += 1;
      }
      await sleep(delayMs);
    }
  }

  console.log(`Done. updated=${updated} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
