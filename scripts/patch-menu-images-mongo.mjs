#!/usr/bin/env node
/**
 * Write name-matched dish photos onto MenuItem.image in Mongo.
 * No login required — uses MONGODB_URL from fd-server/.env
 *
 *   node scripts/patch-menu-images-mongo.mjs
 *   node scripts/patch-menu-images-mongo.mjs --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { menuItemImageForName } from './lib/menu-item-images.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../../restaurant-service/.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

const mongoUrl = process.env.MONGODB_URL?.trim();
if (!mongoUrl) {
  console.error('MONGODB_URL missing in fd-server/.env');
  process.exit(1);
}

function isStockUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  return /unsplash\.com|picsum\.photos|via\.placeholder|placehold\.co|dummyimage|loremflickr/i.test(
    url,
  );
}

function photoKey(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/photo-[\w-]+/);
  return m ? m[0] : url.trim();
}

const require = createRequire(
  path.resolve(__dirname, '../../restaurant-service/package.json'),
);
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 15000,
    dbName: process.env.MENU_MONGO_DB?.trim() || 'restaurants-db',
  });
  const col = mongoose.connection.collection('menuitems');
  const total = await col.countDocuments();
  console.log(
    `Connected. db=${mongoose.connection.name} menuitems=${total} dryRun=${dryRun}`,
  );

  const cursor = col.find({}, { projection: { name: 1, image: 1, images: 1 } });
  let updated = 0;
  let skipped = 0;
  const samples = [];

  for await (const doc of cursor) {
    const name = doc.name || 'Dish';
    const next = menuItemImageForName(name);
    const current = doc.image || (Array.isArray(doc.images) ? doc.images[0] : '');

    if (current && !isStockUrl(current) && photoKey(current) !== photoKey(next)) {
      // Real partner upload — leave alone
      skipped += 1;
      continue;
    }
    if (photoKey(current) === photoKey(next)) {
      skipped += 1;
      continue;
    }

    if (samples.length < 8) {
      samples.push(`${name} → ${photoKey(next)}`);
    }

    if (!dryRun) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { image: next, images: [next] } },
      );
    }
    updated += 1;
  }

  console.log(`Done. updated=${updated} skipped=${skipped}`);
  for (const s of samples) console.log(`  ${s}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
