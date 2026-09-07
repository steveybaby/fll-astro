#!/usr/bin/env node

/**
 * Immich → R2 photo sync (headless).
 *
 * Given a date, pulls every Immich asset captured noon-7pm Pacific that day,
 * downloads the originals to a temp dir, and hands them to the existing R2
 * pipeline assigned directly to that meeting date.
 *
 * Usage:
 *   IMMICH_URL=... IMMICH_API_KEY=... node scripts/sync-immich.js 2026-09-06
 *
 * R2 credentials are read from .env exactly as `npm run sync-photos` does.
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

import {
  pacificWindowUtc,
  normalizeBaseUrl,
  fetchAssetsInWindow,
  planAssetDownload,
  downloadAsset,
} from './immich.js';
import { processPhotos } from './process-photos-r2.js';

dotenv.config();

/** Disambiguate a filename that already appeared in this batch. */
function uniqueName(name, used) {
  const safe = name.replace(/[/\\]/g, '_');
  const ext = path.extname(safe);
  const stem = path.basename(safe, ext);
  let candidate = `${stem}${ext}`;
  let n = 1;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem}-${n}${ext}`;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function main() {
  const date = process.argv[2];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('Usage: node scripts/sync-immich.js YYYY-MM-DD');
    process.exit(1);
  }

  const baseUrl = normalizeBaseUrl(process.env.IMMICH_URL);
  const apiKey = process.env.IMMICH_API_KEY;
  if (!apiKey) {
    console.error('IMMICH_API_KEY is not set (put it in .env).');
    process.exit(1);
  }

  const { takenAfter, takenBefore } = pacificWindowUtc(date);
  console.log(`🖼️  Immich sync for ${date}`);
  console.log(`   Window (Pacific noon-7pm) → UTC ${takenAfter} .. ${takenBefore}`);

  const assets = await fetchAssetsInWindow({ baseUrl, apiKey, takenAfter, takenBefore });
  if (assets.length === 0) {
    console.log('   No assets found in that window. Nothing to do.');
    return;
  }
  console.log(`   Found ${assets.length} asset(s).`);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fll-immich-'));
  try {
    const used = new Set();
    for (const asset of assets) {
      const { path: apiPath, outName } = planAssetDownload(asset);
      const filename = uniqueName(outName, used);
      const via = apiPath.includes('/original') ? 'original' : 'preview';
      console.log(`   ⬇️  ${filename} (${via})`);
      const bytes = await downloadAsset({ baseUrl, apiKey, path: apiPath });
      await fs.writeFile(path.join(tmpDir, filename), bytes);
    }

    await processPhotos({ sourceDir: tmpDir, forceMeetingDate: date });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
