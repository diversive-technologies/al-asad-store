import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MEDIA_WIDTHS } from './media-host';

/**
 * R-02 — the media tool, tested offline: key naming, hash stability, the manifest,
 * the refusal of a narrow source, and an upload rehearsed into a local directory.
 * Nothing here reaches the network or needs rclone.
 */

interface Lib {
  WIDTHS: number[];
  hash8: (bytes: Uint8Array) => string;
  parseSourceName: (name: string) => { photoFile: string; frame: string } | null;
  productKey: (photoFile: string, frame: string, width: number, hash: string) => string;
  heroKey: (name: string, hash: string) => string;
  compareFrames: (a: string, b: string) => number;
  cropBox: (w: number, h: number) => { left: number; top: number; width: number; height: number };
  buildManifest: (
    frames: { photoFile: string; frame: string; key1600: string }[],
    hero: { fileName: string; key: string }[],
  ) => unknown;
}

interface Manifest {
  version: number;
  products: Record<string, string[]>;
  hero: Record<string, string>;
}

interface Prepare {
  prepareMedia: (options: { src: string; out: string }) => Promise<{
    outputs: { source: string; key: string; bytes: number }[];
    manifest: Manifest | null;
    problems: string[];
  }>;
}

interface Upload {
  planUpload: (from: string) => Promise<{ keys: string[]; problems: string[] }>;
  rcloneCommands: (from: string) => string[][];
  rcloneEnvironment: (env: Record<string, string>) => {
    missing: string[];
    environment?: Record<string, string>;
  };
  copyToDirectory: (
    from: string,
    target: string,
    keys: string[],
  ) => Promise<{ copied: string[]; skipped: string[] }>;
}

async function load<T>(file: string): Promise<T> {
  const address = pathToFileURL(path.resolve('scripts/media', file)).href;
  return (await import(/* @vite-ignore */ address)) as T;
}

/** Runs a script as a child process, resolving with its exit code and output. */
function run(script: string, args: string[], env: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      process.execPath,
      [path.resolve('scripts/media', script), ...args],
      { env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : Number((error as { code?: number }).code ?? 1);
        resolve({ code, stdout, stderr });
      },
    );
  });
}

let lib: Lib;
let prepare: Prepare;
let upload: Upload;
let work: string;

/** A test photograph with some structure, so AVIF has something to encode. */
async function photo(width: number, height: number): Promise<Buffer> {
  const patch = await sharp({
    create: {
      width: Math.floor(width / 3),
      height: Math.floor(height / 3),
      channels: 3,
      background: { r: 20, g: 120, b: 100 },
    },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 90, b: 60 } } })
    .composite([{ input: patch, left: Math.floor(width / 3), top: Math.floor(height / 3) }])
    .jpeg()
    .toBuffer();
}

beforeAll(async () => {
  lib = await load<Lib>('lib.mjs');
  prepare = await load<Prepare>('prepare.mjs');
  upload = await load<Upload>('upload.mjs');
  work = await mkdtemp(path.join(os.tmpdir(), 'alasad-media-'));
});

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

describe('key naming', () => {
  it('uses the same three widths as the storefront loader', () => {
    expect(lib.WIDTHS).toEqual([...MEDIA_WIDTHS]);
  });

  it('splits a source name at the last hyphen, so a photoFile may contain hyphens', () => {
    expect(lib.parseSourceName('lawn-suit-01-3.jpg')).toEqual({
      photoFile: 'lawn-suit-01',
      frame: '3',
    });
    expect(lib.parseSourceName('AA1004-front.PNG')).toEqual({
      photoFile: 'AA1004',
      frame: 'front',
    });
    for (const bad of ['lawn.jpg', '-1.jpg', 'lawn-.jpg', 'lawn-1', 'a b-1.jpg', 'lawn-1 2.jpg']) {
      expect(lib.parseSourceName(bad)).toBeNull();
    }
  });

  it('builds the keys of plan 3.4.4', () => {
    expect(lib.productKey('lawn-01', '2', 960, '0a1b2c3d')).toBe(
      'products/lawn-01/2-960-0a1b2c3d.avif',
    );
    expect(lib.heroKey('Film.MP4', 'deadbeef')).toBe('hero/Film-deadbeef.mp4');
    expect(lib.heroKey('logo.svg', 'deadbeef')).toBe('hero/logo-deadbeef.svg');
  });

  it('hashes to the first 8 hex characters of the SHA-256, the same every time', () => {
    const bytes = Buffer.from('al-asad');
    const expected = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    expect(lib.hash8(bytes)).toBe(expected);
    expect(lib.hash8(Buffer.from('al-asad'))).toBe(expected);
    expect(lib.hash8(Buffer.from('al-asaD'))).not.toBe(expected);
  });

  it('orders frames naturally: 2 before 10, numbers before words', () => {
    expect(['10', 'back', '2', '1', 'front'].sort(lib.compareFrames)).toEqual([
      '1',
      '2',
      '10',
      'back',
      'front',
    ]);
  });

  it('crops 4:5 about the centre', () => {
    expect(lib.cropBox(2000, 2000)).toEqual({ left: 200, top: 0, width: 1600, height: 2000 });
    expect(lib.cropBox(1600, 3000)).toEqual({ left: 0, top: 500, width: 1600, height: 2000 });
    expect(lib.cropBox(1600, 2000)).toEqual({ left: 0, top: 0, width: 1600, height: 2000 });
  });

  it('writes the manifest with frames in order and keys sorted', () => {
    const manifest = lib.buildManifest(
      [
        { photoFile: 'b', frame: '2', key1600: 'products/b/2-1600-aaaaaaaa.avif' },
        { photoFile: 'a', frame: '1', key1600: 'products/a/1-1600-bbbbbbbb.avif' },
        { photoFile: 'b', frame: '10', key1600: 'products/b/10-1600-cccccccc.avif' },
        { photoFile: 'b', frame: '1', key1600: 'products/b/1-1600-dddddddd.avif' },
      ],
      [
        { fileName: 'poster.jpg', key: 'hero/poster-11111111.jpg' },
        { fileName: 'film.mp4', key: 'hero/film-22222222.mp4' },
      ],
    ) as Manifest;
    expect(manifest).toEqual({
      version: 1,
      products: {
        a: ['products/a/1-1600-bbbbbbbb.avif'],
        b: [
          'products/b/1-1600-dddddddd.avif',
          'products/b/2-1600-aaaaaaaa.avif',
          'products/b/10-1600-cccccccc.avif',
        ],
      },
      hero: { 'film.mp4': 'hero/film-22222222.mp4', 'poster.jpg': 'hero/poster-11111111.jpg' },
    });
    expect(Object.keys(manifest.products)).toEqual(['a', 'b']);
  });
});

// AVIF encoding is slow, and slower still when the whole suite runs at once.
describe('prepare', { timeout: 60_000 }, () => {
  it('writes three AVIF widths per frame at 4:5, hashed from the 1600 file, with a stable manifest', async () => {
    const src = path.join(work, 'src-ok');
    await mkdir(path.join(src, 'products'), { recursive: true });
    await mkdir(path.join(src, 'hero'), { recursive: true });
    await writeFile(path.join(src, 'products', 'lawn-01-1.jpg'), await photo(1400, 1400));
    await writeFile(path.join(src, 'products', 'lawn-01-2.jpg'), await photo(1300, 1800));
    await writeFile(path.join(src, 'hero', 'film.mp4'), Buffer.from('not really a film'));
    await writeFile(path.join(src, 'hero', 'poster-dark.jpg'), await photo(300, 200));

    const first = await prepare.prepareMedia({ src, out: path.join(work, 'out-ok') });
    const second = await prepare.prepareMedia({ src, out: path.join(work, 'out-ok-again') });

    expect(first.problems).toEqual([]);
    // The same input gives the same keys: the hash is stable.
    expect(second.manifest).toEqual(first.manifest);

    const manifest = first.manifest as Manifest;
    const frames = manifest.products['lawn-01'] ?? [];
    expect(frames).toHaveLength(2);
    const hash = /^products\/lawn-01\/1-1600-([0-9a-f]{8})\.avif$/.exec(frames[0] ?? '')?.[1] ?? '';
    expect(hash).toHaveLength(8);

    for (const width of [480, 960, 1600]) {
      const file = path.join(work, 'out-ok', 'products', 'lawn-01', `1-${width}-${hash}.avif`);
      const meta = await sharp(file).metadata();
      expect(meta.format).toBe('heif');
      expect(meta.width).toBe(width);
      expect(meta.height).toBe((width * 5) / 4);
    }
    const big = await readFile(
      path.join(work, 'out-ok', 'products', 'lawn-01', `1-1600-${hash}.avif`),
    );
    expect(createHash('sha256').update(big).digest('hex').startsWith(hash)).toBe(true);

    expect(Object.keys(manifest.hero)).toEqual(['film.mp4', 'poster-dark.jpg']);
    expect(manifest.hero['film.mp4']).toBe(
      `hero/film-${createHash('sha256').update('not really a film').digest('hex').slice(0, 8)}.mp4`,
    );
    expect(first.outputs.some((output) => output.source === 'hero/film.mp4')).toBe(true);
    expect(first.outputs.filter((output) => output.source.startsWith('products/'))).toHaveLength(6);
  });

  it('refuses a source narrower than 1200 px and writes nothing', async () => {
    const src = path.join(work, 'src-narrow');
    const out = path.join(work, 'out-narrow');
    await mkdir(path.join(src, 'products'), { recursive: true });
    await writeFile(path.join(src, 'products', 'ok-1.jpg'), await photo(1300, 1700));
    await writeFile(path.join(src, 'products', 'thin-1.jpg'), await photo(1199, 1600));

    const result = await prepare.prepareMedia({ src, out });

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('thin-1.jpg');
    expect(result.problems[0]).toContain('1199');
    expect(result.manifest).toBeNull();
    await expect(readdir(out)).rejects.toThrow();
  });

  it('refuses a misnamed file and a duplicated frame', async () => {
    const src = path.join(work, 'src-names');
    await mkdir(path.join(src, 'products'), { recursive: true });
    await writeFile(path.join(src, 'products', 'noframe.jpg'), await photo(1300, 1700));
    await writeFile(path.join(src, 'products', 'a-1.jpg'), await photo(1300, 1700));
    await writeFile(path.join(src, 'products', 'a-1.png'), await photo(1300, 1700));

    const result = await prepare.prepareMedia({ src, out: path.join(work, 'out-names') });

    expect(result.problems.join('\n')).toContain('noframe.jpg');
    expect(result.problems.join('\n')).toContain('already frame 1');
  });

  it('runs from the command line and exits 1 on a problem', async () => {
    const src = path.join(work, 'src-cli');
    await mkdir(path.join(src, 'products'), { recursive: true });
    await writeFile(path.join(src, 'products', 'thin-1.jpg'), await photo(800, 1000));

    const result = await run('prepare.mjs', ['--src', src, '--out', path.join(work, 'out-cli')]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Nothing was written');
  });
});

describe('upload', { timeout: 60_000 }, () => {
  it('plans only media keys, skips the manifest and stops on a stray file', async () => {
    const dir = path.join(work, 'prepared-plan');
    await mkdir(path.join(dir, 'products', 'a'), { recursive: true });
    await mkdir(path.join(dir, 'hero'), { recursive: true });
    await writeFile(path.join(dir, 'products', 'a', '1-480-0a1b2c3d.avif'), 'x');
    await writeFile(path.join(dir, 'hero', 'film-0a1b2c3d.mp4'), 'x');
    await writeFile(path.join(dir, 'media-manifest.json'), '{}');

    expect(await upload.planUpload(dir)).toEqual({
      keys: ['hero/film-0a1b2c3d.mp4', 'products/a/1-480-0a1b2c3d.avif'],
      problems: [],
    });

    await writeFile(path.join(dir, 'notes.txt'), 'x');
    const { problems } = await upload.planUpload(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('notes.txt');
  });

  it('builds copy-only rclone commands with the cache header and never a delete', () => {
    const commands = upload.rcloneCommands('./prepared');
    expect(commands).toHaveLength(2);
    for (const command of commands) {
      expect(command[0]).toBe('copy');
      expect(command).toContain(':s3:alasad-media');
      expect(command).toContain('--ignore-existing');
      expect(command).toContain('Cache-Control: public, max-age=31536000, immutable');
      expect(command).toContain('media-manifest.json');
      expect(command.join(' ')).not.toMatch(/sync|move|delete|purge/);
    }
    expect(commands[0]).toContain('Content-Type: image/avif');
  });

  it('asks for the three credentials by name and never invents them', () => {
    expect(upload.rcloneEnvironment({}).missing).toEqual([
      'MEDIA_R2_ENDPOINT',
      'MEDIA_R2_ACCESS_KEY_ID',
      'MEDIA_R2_SECRET_ACCESS_KEY',
    ]);
    const ready = upload.rcloneEnvironment({
      MEDIA_R2_ENDPOINT: 'https://x.r2.cloudflarestorage.com',
      MEDIA_R2_ACCESS_KEY_ID: 'id',
      MEDIA_R2_SECRET_ACCESS_KEY: 'secret',
    });
    expect(ready.missing).toEqual([]);
    expect(ready.environment?.RCLONE_S3_PROVIDER).toBe('Cloudflare');
  });

  it('rehearses an upload into a local directory: the expected tree, existing keys skipped', async () => {
    const src = path.join(work, 'src-rehearse');
    await mkdir(path.join(src, 'products'), { recursive: true });
    await writeFile(path.join(src, 'products', 'lawn-01-1.jpg'), await photo(1250, 1560));
    const prepared = path.join(work, 'prepared-rehearse');
    const { manifest } = await prepare.prepareMedia({ src, out: prepared });
    await writeFile(path.join(prepared, 'media-manifest.json'), JSON.stringify(manifest));

    const { keys } = await upload.planUpload(prepared);
    const target = path.join(work, 'bucket');
    const first = await upload.copyToDirectory(prepared, target, keys);
    const again = await upload.copyToDirectory(prepared, target, keys);

    expect(first.copied).toHaveLength(3);
    expect(again.copied).toEqual([]);
    expect(again.skipped).toHaveLength(3);
    const tree = (await readdir(path.join(target, 'products', 'lawn-01'))).sort();
    expect(tree).toEqual(keys.map((key) => key.split('/').pop() ?? '').sort());
    expect(await readdir(target)).toEqual(['products']);
  });

  it('a dry run from the command line lists the keys and writes nothing', async () => {
    const prepared = path.join(work, 'prepared-dry');
    await mkdir(path.join(prepared, 'products', 'a'), { recursive: true });
    await writeFile(path.join(prepared, 'products', 'a', '1-480-0a1b2c3d.avif'), 'x');
    const target = path.join(work, 'never-created');

    const result = await run('upload.mjs', ['--from', prepared, '--target', target, '--dry-run']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('products/a/1-480-0a1b2c3d.avif');
    await expect(readdir(target)).rejects.toThrow();
  });

  it('refuses to run against the bucket without credentials, before touching rclone', async () => {
    const prepared = path.join(work, 'prepared-dry');

    const result = await run('upload.mjs', ['--from', prepared], {
      MEDIA_R2_ENDPOINT: '',
      MEDIA_R2_ACCESS_KEY_ID: '',
      MEDIA_R2_SECRET_ACCESS_KEY: '',
    });

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('MEDIA_R2_ENDPOINT');
  });
});
