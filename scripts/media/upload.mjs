#!/usr/bin/env node
/**
 * R-02 — copy the prepared media to the `alasad-media` bucket on Cloudflare R2.
 *
 *   node scripts/media/upload.mjs --from <prepared dir> [--dry-run]
 *   node scripts/media/upload.mjs --from <prepared dir> --target <local dir>
 *
 * Remote mode copies with `rclone` (it must be installed) to `:s3:alasad-media`,
 * setting `Cache-Control: public, max-age=31536000, immutable` (and
 * `content-type: image/avif` on the photographs), skipping keys that already
 * exist. It only ever COPIES: no `sync`, no `move`, no `delete` is run, so an
 * object already in the bucket is never changed or removed (DA-5, plan R-02).
 *
 * Credentials come from the environment and are handed to rclone through its own
 * `RCLONE_S3_*` variables; they are never written to a file or printed:
 *
 *   MEDIA_R2_ENDPOINT          https://<account>.r2.cloudflarestorage.com
 *   MEDIA_R2_ACCESS_KEY_ID
 *   MEDIA_R2_SECRET_ACCESS_KEY
 *
 * `--dry-run` lists what would be copied and the rclone commands, and neither
 * contacts the network nor writes a file. `--target <dir>` copies into a local
 * directory instead (same rules, plain file copy), to rehearse an upload.
 *
 * `media-manifest.json` is for the data build, not for the bucket, and is skipped.
 * Only files whose path is a media key of plan 3.4.4 are copied; anything else in
 * the directory stops the run.
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { CACHE_CONTROL } from './lib.mjs';

export const BUCKET = 'alasad-media';
export const MANIFEST_NAME = 'media-manifest.json';

const PRODUCT_KEY =
  /^products\/[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9_]+-(480|960|1600)-[0-9a-f]{8}\.avif$/;
const HERO_KEY = /^hero\/[^/]+-[0-9a-f]{8}(\.[a-z0-9]+)?$/;

/** Every file under `dir`, as forward-slash keys relative to it. */
async function walk(dir, prefix = '') {
  const found = [];
  for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await walk(dir, relative)));
    else if (entry.isFile()) found.push(relative);
  }
  return found.sort();
}

/**
 * The files to copy and the ones that stop the run. A file is a media key, the
 * manifest (skipped), or a problem.
 */
export async function planUpload(from) {
  const keys = [];
  const problems = [];
  for (const relative of await walk(from)) {
    if (relative === MANIFEST_NAME) continue;
    if (PRODUCT_KEY.test(relative) || HERO_KEY.test(relative)) keys.push(relative);
    else
      problems.push(
        `${relative}: not a media key (products/<photoFile>/<frame>-<width>-<hash8>.avif or hero/<name>-<hash8>.<ext>)`,
      );
  }
  return { keys, problems };
}

/** The two rclone invocations: photographs (content type stated), then everything else. */
export function rcloneCommands(from) {
  const common = [
    'copy',
    from,
    `:s3:${BUCKET}`,
    '--ignore-existing',
    '--exclude',
    MANIFEST_NAME,
    '--header-upload',
    `Cache-Control: ${CACHE_CONTROL}`,
    '--s3-no-check-bucket',
  ];
  return [
    [...common, '--include', '*.avif', '--header-upload', 'Content-Type: image/avif'],
    [...common, '--exclude', '*.avif'],
  ];
}

/** The environment rclone needs for an on-the-fly S3 remote, from the three MEDIA_R2_* variables. */
export function rcloneEnvironment(env) {
  const missing = [
    'MEDIA_R2_ENDPOINT',
    'MEDIA_R2_ACCESS_KEY_ID',
    'MEDIA_R2_SECRET_ACCESS_KEY',
  ].filter((name) => !env[name]);
  if (missing.length > 0) return { missing };
  return {
    missing,
    environment: {
      ...env,
      RCLONE_S3_PROVIDER: 'Cloudflare',
      RCLONE_S3_ENDPOINT: env.MEDIA_R2_ENDPOINT,
      RCLONE_S3_ACCESS_KEY_ID: env.MEDIA_R2_ACCESS_KEY_ID,
      RCLONE_S3_SECRET_ACCESS_KEY: env.MEDIA_R2_SECRET_ACCESS_KEY,
    },
  };
}

/** Copies `keys` from `from` into a local directory, skipping any that exist there. */
export async function copyToDirectory(from, target, keys) {
  const copied = [];
  const skipped = [];
  for (const key of keys) {
    const destination = path.join(target, ...key.split('/'));
    try {
      await stat(destination);
      skipped.push(key);
      continue;
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(from, ...key.split('/')), destination);
    copied.push(key);
  }
  return { copied, skipped };
}

function runRclone(args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn('rclone', args, { env: environment, stdio: 'inherit' });
    child.on('error', (error) =>
      reject(
        error && error.code === 'ENOENT'
          ? new Error('rclone is not installed or not on PATH (https://rclone.org/install/)')
          : error,
      ),
    );
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`rclone exited with ${code}`)),
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => {
    const at = args.indexOf(name);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const from = option('--from');
  const target = option('--target');
  const dryRun = args.includes('--dry-run');
  if (!from) {
    console.error(
      'usage: node scripts/media/upload.mjs --from <prepared dir> [--target <local dir>] [--dry-run]',
    );
    process.exit(2);
  }

  const { keys, problems } = await planUpload(from);
  if (problems.length > 0) {
    console.error(`Nothing was copied. ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  if (keys.length === 0) {
    console.error('Nothing to upload: no media keys found.');
    process.exit(1);
  }

  const destination = target ?? `${BUCKET} (R2)`;
  if (dryRun) {
    console.log(
      `Dry run: would copy ${keys.length} file(s) to ${destination}, skipping keys that exist:`,
    );
    for (const key of keys) console.log(`  ${key}`);
    if (target === undefined) {
      for (const command of rcloneCommands(from)) console.log(`\n  rclone ${command.join(' ')}`);
    }
    return;
  }

  if (target !== undefined) {
    const { copied, skipped } = await copyToDirectory(from, target, keys);
    console.log(
      `Copied ${copied.length}, skipped ${skipped.length} that already exist, into ${target}.`,
    );
    return;
  }

  const { missing, environment } = rcloneEnvironment(process.env);
  if (missing.length > 0) {
    console.error(
      `Set ${missing.join(', ')} in the environment (never in a file in the repository).`,
    );
    process.exit(2);
  }
  for (const command of rcloneCommands(from)) await runRclone(command, environment);
  console.log(`Done: ${keys.length} file(s) offered to ${BUCKET}; existing keys were left alone.`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
