#!/usr/bin/env node
/**
 * R-02 — prepare the media for the CDN. Reads source photographs, writes the
 * three widths of each as AVIF under the keys of plan 3.4.4, hashes the hero
 * video, posters and logo, and writes `media-manifest.json`.
 *
 *   node scripts/media/prepare.mjs --src <dir> --out <dir> [--manifest <file>]
 *
 * The source directory holds:
 *   products/<photoFile>-<frame>.<jpg|png|webp|avif|tif>   one file per frame
 *   hero/<name>.<ext>                                        video, posters, logo
 *
 * Each photograph is auto-oriented, cropped to 4:5 around its centre and written
 * at widths 480, 960 and 1600 (AVIF, quality 55). A source narrower than 1200 px
 * is refused, and every source is checked before anything is written. Nothing is
 * deleted, and nothing is sent anywhere: `upload.mjs` is a separate step.
 *
 * Uses `sharp`, already a development dependency of this repository.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';

import {
  AVIF_QUALITY,
  PHOTO_EXTENSIONS,
  WIDTHS,
  MIN_SOURCE_WIDTH,
  buildManifest,
  cropBox,
  hash8,
  heroKey,
  parseSourceName,
  productKey,
} from './lib.mjs';

/** Lists the files of a directory, or none when it does not exist. */
async function filesIn(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeKey(outDir, key, bytes) {
  const target = path.join(outDir, ...key.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return target;
}

/**
 * Reads, validates and converts. Returns `{ outputs, manifest, problems }`; when
 * `problems` is not empty nothing has been written.
 */
export async function prepareMedia({ src, out }) {
  const problems = [];
  const sources = [];
  const seen = new Set();

  for (const fileName of await filesIn(path.join(src, 'products'))) {
    const extension = path.extname(fileName).toLowerCase();
    if (!PHOTO_EXTENSIONS.includes(extension)) {
      problems.push(
        `products/${fileName}: not a photograph format (${PHOTO_EXTENSIONS.join(', ')})`,
      );
      continue;
    }
    const parsed = parseSourceName(fileName);
    if (parsed === null) {
      problems.push(
        `products/${fileName}: expected <photoFile>-<frame>${extension}, for example lawn-01-1${extension}`,
      );
      continue;
    }
    const identity = `${parsed.photoFile}/${parsed.frame}`;
    if (seen.has(identity)) {
      problems.push(
        `products/${fileName}: another file is already frame ${parsed.frame} of ${parsed.photoFile}`,
      );
      continue;
    }
    seen.add(identity);

    const bytes = await readFile(path.join(src, 'products', fileName));
    let oriented;
    try {
      oriented = await sharp(bytes).rotate().toBuffer({ resolveWithObject: true });
    } catch {
      problems.push(`products/${fileName}: could not be read as an image`);
      continue;
    }
    if (oriented.info.width < MIN_SOURCE_WIDTH) {
      problems.push(
        `products/${fileName}: ${oriented.info.width} px wide, at least ${MIN_SOURCE_WIDTH} px is needed`,
      );
      continue;
    }
    sources.push({ fileName, ...parsed, image: oriented.data, info: oriented.info });
  }

  if (problems.length > 0) return { outputs: [], manifest: null, problems };

  const outputs = [];
  const frames = [];

  for (const source of sources) {
    const box = cropBox(source.info.width, source.info.height);
    const cropped = await sharp(source.image).extract(box).toBuffer();
    const rendered = new Map();
    for (const width of WIDTHS) {
      const height = Math.round((width * 5) / 4);
      rendered.set(
        width,
        await sharp(cropped)
          .resize({ width, height, fit: 'fill' })
          .avif({ quality: AVIF_QUALITY })
          .toBuffer(),
      );
    }
    const hash = hash8(rendered.get(1600));
    for (const width of WIDTHS) {
      const key = productKey(source.photoFile, source.frame, width, hash);
      const bytes = rendered.get(width);
      await writeKey(out, key, bytes);
      outputs.push({ source: `products/${source.fileName}`, key, bytes: bytes.length });
      if (width === 1600)
        frames.push({ photoFile: source.photoFile, frame: source.frame, key1600: key });
    }
  }

  const hero = [];
  for (const fileName of await filesIn(path.join(src, 'hero'))) {
    const bytes = await readFile(path.join(src, 'hero', fileName));
    const key = heroKey(fileName, hash8(bytes));
    await writeKey(out, key, bytes);
    outputs.push({ source: `hero/${fileName}`, key, bytes: bytes.length });
    hero.push({ fileName, key });
  }

  return { outputs, manifest: buildManifest(frames, hero), problems };
}

function formatTable(outputs) {
  const rows = outputs.map((output) => [
    output.source,
    output.key,
    `${(output.bytes / 1024).toFixed(1)} kB`,
  ]);
  const widths = [0, 1, 2].map((column) => Math.max(...rows.map((row) => row[column].length), 6));
  const line = (row) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ');
  return [line(['source', 'key', 'size']), ...rows.map(line)].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => {
    const at = args.indexOf(name);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const src = option('--src');
  const out = option('--out');
  if (!src || !out) {
    console.error(
      'usage: node scripts/media/prepare.mjs --src <dir> --out <dir> [--manifest <file>]',
    );
    process.exit(2);
  }
  try {
    await stat(src);
  } catch {
    console.error(`source directory not found: ${src}`);
    process.exit(2);
  }

  const { outputs, manifest, problems } = await prepareMedia({ src, out });
  if (problems.length > 0) {
    console.error(`Nothing was written. ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  if (outputs.length === 0) {
    console.error('Nothing to prepare: no files under products/ or hero/.');
    process.exit(1);
  }

  const manifestPath = option('--manifest') ?? path.join(out, 'media-manifest.json');
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(formatTable(outputs));
  console.log(`\n${outputs.length} file(s) written under ${out}; manifest: ${manifestPath}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
