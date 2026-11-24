import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import dotenv from 'dotenv';

dotenv.config();

interface ApkRecord {
  id: string;
  appName: string;
  version: string;
  description: string;
  originalFilename: string;
  storedFilename: string;
  sizeBytes: number;
  status: 'staged' | 'published';
  uploadedAt: string;
  publishedAt: string | null;
  downloadCount: number;
}

interface PublicApkDto {
  id: string;
  appName: string;
  version: string;
  description: string;
  originalFilename: string;
  sizeBytes: number;
  publishedAt: string | null;
  downloadCount: number;
}

interface AdminApkDto extends PublicApkDto {
  status: 'staged' | 'published';
  uploadedAt: string;
}

interface SessionPayload {
  username: string;
  exp: number;
}

interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  url: string;
  browser_download_url: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  created_at: string;
  published_at: string | null;
  assets: GitHubAsset[];
}

interface ParsedReleaseMeta {
  appName?: string;
  version?: string;
  description?: string;
  originalFilename?: string;
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const APK_DIR = path.resolve(DATA_DIR, 'apks');
const TMP_UPLOAD_DIR = path.resolve(os.tmpdir(), 'wagsiyum-apk-uploads');
const METADATA_FILE = path.resolve(DATA_DIR, 'apps.json');

fs.mkdirSync(APK_DIR, { recursive: true });
fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2), 'utf8');
}

const DEFAULT_GITHUB_REPO = 'bereketmelaku08-ux/wag-syum-admasu-app';
const RAW_GITHUB_REPO = (process.env.GITHUB_REPO || DEFAULT_GITHUB_REPO)
  .trim()
  .replace(/^['"]|['"]$/g, '');
const GITHUB_REPO = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(RAW_GITHUB_REPO)
  ? RAW_GITHUB_REPO
  : DEFAULT_GITHUB_REPO;
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');
const IS_VALID_GITHUB_TOKEN_FORMAT =
  /^(gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{20,}|[0-9a-f]{40})$/.test(GITHUB_TOKEN);
let githubAuthRejected = false;
function isGitHubStorageActive(): boolean {
  return IS_VALID_GITHUB_TOKEN_FORMAT && !githubAuthRejected;
}

// Server-side credential verification using salted scrypt hash (no plaintext secret stored)
const DEFAULT_ADMIN_USERNAME = 'wag@siyum';
const DEFAULT_PASSWORD_HASH =
  'wagsiyum_2026_v2:f46f7508d58172301d9687746d433b5b3489f508d44879effe4d9359afdf7d398e43853e16d893f628a1b8c8932e9b947f7dc93ce32453d1493497027a007ef4';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function verifyAdminCredentials(username: string, password: string): boolean {
  const inputUser = username.trim();
  const userBuf = Buffer.from(inputUser, 'utf8');
  const expectedUserBuf = Buffer.from(DEFAULT_ADMIN_USERNAME, 'utf8');
  const userMatches =
    userBuf.length === expectedUserBuf.length && crypto.timingSafeEqual(userBuf, expectedUserBuf);

  const [salt, storedHex] = DEFAULT_PASSWORD_HASH.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHex, 'hex');
  const passwordMatches =
    derived.length === storedBuf.length && crypto.timingSafeEqual(derived, storedBuf);

  return userMatches && passwordMatches;
}

function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!decoded.username || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'እባክዎ መጀመሪያ በአድሚን ይግቡ።' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'የአድሚን ክፍለ ጊዜዎ አልቋል። እባክዎ እንደገና ይግቡ።' });
    return;
  }
  next();
}

function readRecords(): ApkRecord[] {
  try {
    const raw = fs.readFileSync(METADATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApkRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRecords(records: ApkRecord[]): void {
  const tmpPath = `${METADATA_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(tmpPath, METADATA_FILE);
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._\-\u1200-\u137F ]+/g, '_').trim();
  if (!base) return 'wag-siyum-app.apk';
  return base.toLowerCase().endsWith('.apk') ? base : `${base}.apk`;
}

function sanitizeGitHubAssetFilename(name: string): string {
  const ascii = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!ascii || ascii === '.apk') return 'wag-siyum-app.apk';
  return ascii.toLowerCase().endsWith('.apk') ? ascii : `${ascii}.apk`;
}

function resolveSafeApkPath(storedFilename: string): string | null {
  const safeBase = path.basename(storedFilename);
  if (!safeBase || !safeBase.endsWith('.apk')) return null;
  const resolved = path.resolve(APK_DIR, safeBase);
  if (!resolved.startsWith(APK_DIR + path.sep)) return null;
  return resolved;
}

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// --- GitHub Releases permanent storage helpers ---
let cachedRepoPrivate: boolean | null = null;

async function githubApiFetch<T>(apiPath: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'WagSiyum-APK-Portal',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      githubAuthRejected = true;
    }
    const errText = await res.text().catch(() => '');
    throw new Error(`GitHub API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function isGitHubRepoPrivate(): Promise<boolean> {
  if (cachedRepoPrivate !== null) return cachedRepoPrivate;
  const repoInfo = await githubApiFetch<{ private: boolean }>(`/repos/${GITHUB_REPO}`);
  cachedRepoPrivate = Boolean(repoInfo.private);
  return cachedRepoPrivate;
}

function buildReleaseBody(meta: ParsedReleaseMeta): string {
  const cleanDesc = (meta.description || '').trim();
  const payload = JSON.stringify({
    appName: meta.appName,
    version: meta.version,
    description: cleanDesc,
    originalFilename: meta.originalFilename,
  });
  return `${cleanDesc ? `${cleanDesc}\n\n` : ''}<!-- WAGSIYUM_META:${payload} -->`;
}

function parseReleaseMeta(release: GitHubRelease, apkAsset: GitHubAsset): ParsedReleaseMeta {
  const body = release.body || '';
  const match = body.match(/<!--\s*WAGSIYUM_META:([\s\S]*?)\s*-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]) as ParsedReleaseMeta;
      return parsed;
    } catch {
      // Fall through to defaults
    }
  }
  return {
    appName: release.name || apkAsset.name.replace(/\.apk$/i, ''),
    version: '1.0',
    description: body.trim(),
    originalFilename: apkAsset.name,
  };
}

function mapReleaseToAdminDto(release: GitHubRelease): AdminApkDto | null {
  const apkAsset = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  if (!apkAsset) return null;
  const meta = parseReleaseMeta(release, apkAsset);
  return {
    id: String(release.id),
    appName: meta.appName || release.name || apkAsset.name.replace(/\.apk$/i, ''),
    version: meta.version || '1.0',
    description: meta.description || '',
    originalFilename: meta.originalFilename || apkAsset.name,
    sizeBytes: apkAsset.size,
    status: release.draft ? 'staged' : 'published',
    uploadedAt: release.created_at,
    publishedAt: release.draft ? null : release.published_at || release.created_at,
    downloadCount: apkAsset.download_count || 0,
  };
}

async function listGitHubReleases(): Promise<GitHubRelease[]> {
  return githubApiFetch<GitHubRelease[]>(`/repos/${GITHUB_REPO}/releases?per_page=50`);
}

// Multer writes uploaded APKs temporarily to disk (zero RAM bloat for large files)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, isGitHubStorageActive() ? TMP_UPLOAD_DIR : APK_DIR);
  },
  filename: (_req, _file, cb) => {
    const id = crypto.randomUUID();
    cb(null, `${id}.apk`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024, // 250 MB max APK size
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.apk') {
      cb(new Error('እባክዎ ትክክለኛ የኤፒኬ (.apk) ፋይል ብቻ ይምረጡ።'));
      return;
    }
    cb(null, true);
  },
});

function getPublicBaseUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  return `${req.protocol}://${host}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.get('/robots.txt', (req, res) => {
    const baseUrl = getPublicBaseUrl(req);
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/admin/\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getPublicBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    res.type('application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n` +
        `    <loc>${escapeXml(baseUrl + '/')}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>1.0</priority>\n` +
        `  </url>\n` +
        `</urlset>\n`
    );
  });

  // Public API: get published APKs (no login required)
  app.get('/api/apps', async (_req, res) => {
    if (isGitHubStorageActive()) {
      try {
        const releases = await listGitHubReleases();
        const apps: PublicApkDto[] = releases
          .filter((r) => !r.draft)
          .map(mapReleaseToAdminDto)
          .filter((item): item is AdminApkDto => item !== null)
          .sort((a, b) => {
            const tA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
            const tB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
            return tB - tA;
          })
          .map(({ status: _status, uploadedAt: _uploadedAt, ...pub }) => pub);
        res.json({ apps });
        return;
      } catch (err) {
        console.warn('GitHub releases fetch failed, falling back to local storage:', err);
      }
    }

    try {
      const records = readRecords()
        .filter((item) => item.status === 'published')
        .sort((a, b) => {
          const tA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
          const tB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
          return tB - tA;
        })
        .map((item) => ({
          id: item.id,
          appName: item.appName,
          version: item.version,
          description: item.description,
          originalFilename: item.originalFilename,
          sizeBytes: item.sizeBytes,
          publishedAt: item.publishedAt,
          downloadCount: item.downloadCount,
        }));

      res.json({ apps: records });
    } catch (err) {
      console.error('Failed to fetch public apps:', err);
      res.status(500).json({ error: 'አፕሊኬሽኖችን ማምጣት አልተቻለም።' });
    }
  });

  // Public API: download a published APK file
  app.get('/api/apps/:id/download', async (req, res) => {
    const { id } = req.params;

    if (isGitHubStorageActive() && /^\d+$/.test(id)) {

      try {
        const release = await githubApiFetch<GitHubRelease>(`/repos/${GITHUB_REPO}/releases/${id}`);
        if (release.draft) {
          res.status(404).json({ error: 'ይህ አፕሊኬሽን አልተገኘም።' });
          return;
        }
        const apkAsset = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
        if (!apkAsset) {
          res.status(404).json({ error: 'የኤፒኬ ፋይሉ አልተገኘም።' });
          return;
        }

        const isPrivate = await isGitHubRepoPrivate();
        if (!isPrivate) {
          res.redirect(302, apkAsset.browser_download_url);
          return;
        }

        // Stream asset for private repos
        const assetRes = await fetch(apkAsset.url, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/octet-stream',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WagSiyum-APK-Portal',
          },
        });
        if (!assetRes.ok || !assetRes.body) {
          res.status(502).json({ error: 'ፋይሉን ማውረድ አልተቻለም።' });
          return;
        }
        const meta = parseReleaseMeta(release, apkAsset);
        const downloadName = sanitizeFilename(meta.originalFilename || apkAsset.name);
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${downloadName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');
        Readable.fromWeb(assetRes.body as unknown as import('node:stream/web').ReadableStream).pipe(res);
        return;
      } catch (err) {
        console.error('GitHub download error:', err);
        res.status(404).json({ error: 'ይህ አፕሊኬሽን አልተገኘም።' });
        return;
      }
    }

    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      res.status(400).json({ error: 'ልክ ያልሆነ መለያ።' });
      return;
    }

    const records = readRecords();
    const index = records.findIndex((item) => item.id === id && item.status === 'published');
    if (index === -1) {
      res.status(404).json({ error: 'ይህ አፕሊኬሽን አልተገኘም።' });
      return;
    }

    const record = records[index];
    const safePath = resolveSafeApkPath(record.storedFilename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'የኤፒኬ ፋይሉ በሰርቨሩ ላይ አልተገኘም።' });
      return;
    }

    records[index] = {
      ...record,
      downloadCount: record.downloadCount + 1,
    };
    writeRecords(records);

    const downloadName = sanitizeFilename(record.originalFilename);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(safePath);
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const body = req.body as { username?: unknown; password?: unknown };
    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'እባክዎ የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ።' });
      return;
    }

    if (!verifyAdminCredentials(body.username, body.password)) {
      res.status(401).json({ error: 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል ነው።' });
      return;
    }

    const token = createSessionToken(body.username.trim());
    res.json({
      token,
      username: body.username.trim(),
    });
  });

  // Admin: Verify session
  app.get('/api/admin/session', requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });

  // Admin: List all APKs (staged + published)
  app.get('/api/admin/apps', requireAdmin, async (_req, res) => {
    if (isGitHubStorageActive()) {
      try {
        const releases = await listGitHubReleases();
        const apps = releases
          .map(mapReleaseToAdminDto)
          .filter((item): item is AdminApkDto => item !== null)
          .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
        res.json({ apps, storageMode: 'github' });
        return;
      } catch (err) {
        console.warn('GitHub admin list failed, falling back to local storage:', err);
      }
    }

    try {
      const records = readRecords().sort(
        (a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)
      );
      res.json({ apps: records, storageMode: 'local' });
    } catch (err) {
      console.error('Failed to fetch admin apps:', err);
      res.status(500).json({ error: 'የአፕሊኬሽኖችን ዝርዝር ማምጣት አልተቻለም።' });
    }
  });

  // Admin: Upload APK file (starts in 'staged' / draft state until admin clicks 'ልቀቅ')
  app.post('/api/admin/upload', requireAdmin, upload.single('apk'), async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'እባክዎ የኤፒኬ (.apk) ፋይል ይምረጡ።' });
      return;
    }

    const body = req.body as {
      appName?: unknown;
      version?: unknown;
      description?: unknown;
    };

    const originalFilename = sanitizeFilename(file.originalname || 'app.apk');
    const fallbackName = originalFilename.replace(/\.apk$/i, '').replace(/[_-]+/g, ' ').trim();
    const appName =
      typeof body.appName === 'string' && body.appName.trim().length > 0
        ? body.appName.trim().slice(0, 100)
        : fallbackName || 'ዋግ ስዩም አድማሱ ወሰን አፕሊኬሽን';
    const version =
      typeof body.version === 'string' && body.version.trim().length > 0
        ? body.version.trim().slice(0, 32)
        : '1.0';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 400) : '';

    if (isGitHubStorageActive()) {
      let createdReleaseId: number | null = null;
      try {
        const tagName = `apk-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const release = await githubApiFetch<GitHubRelease>(`/repos/${GITHUB_REPO}/releases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag_name: tagName,
            name: appName,
            body: buildReleaseBody({ appName, version, description, originalFilename }),
            draft: true,
            prerelease: false,
          }),
        });
        createdReleaseId = release.id;

        const assetName = sanitizeGitHubAssetFilename(originalFilename);
        const uploadUrl = `https://uploads.github.com/repos/${GITHUB_REPO}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;
        const webStream = Readable.toWeb(fs.createReadStream(file.path));

        const assetRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Length': String(file.size),
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WagSiyum-APK-Portal',
          },
          body: webStream as unknown as BodyInit,
          duplex: 'half',
        } as RequestInit & { duplex: 'half' });

        if (!assetRes.ok) {
          const errText = await assetRes.text().catch(() => '');
          throw new Error(`Asset upload failed (${assetRes.status}): ${errText.slice(0, 200)}`);
        }

        const uploadedAsset = (await assetRes.json()) as GitHubAsset;
        const appDto: AdminApkDto = {
          id: String(release.id),
          appName,
          version,
          description,
          originalFilename,
          sizeBytes: uploadedAsset.size || file.size,
          status: 'staged',
          uploadedAt: release.created_at,
          publishedAt: null,
          downloadCount: 0,
        };

        res.status(201).json({ app: appDto });
      } catch (err) {
        console.error('GitHub release upload error:', err);
        if (createdReleaseId !== null) {
          await githubApiFetch(`/repos/${GITHUB_REPO}/releases/${createdReleaseId}`, {
            method: 'DELETE',
          }).catch(() => undefined);
        }
        res.status(502).json({
          error: 'ፋይሉን ወደ GitHub ቋሚ ማከማቻ መጫን አልተቻለም። እባክዎ የGITHUB_TOKEN ፍቃድን ያረጋግጡ።',
        });
      } finally {
        safeUnlink(file.path);
      }
      return;
    }

    const id = path.basename(file.filename, '.apk');
    const newRecord: ApkRecord = {
      id,
      appName,
      version,
      description,
      originalFilename,
      storedFilename: file.filename,
      sizeBytes: file.size,
      status: 'staged',
      uploadedAt: new Date().toISOString(),
      publishedAt: null,
      downloadCount: 0,
    };

    const records = readRecords();
    records.unshift(newRecord);
    writeRecords(records);

    res.status(201).json({ app: newRecord });
  });

  // Admin: Publish staged APK ('ልቀቅ')
  app.post('/api/admin/apps/:id/publish', requireAdmin, async (req, res) => {
    const { id } = req.params;

    if (isGitHubStorageActive() && /^\d+$/.test(id)) {

      try {
        const updated = await githubApiFetch<GitHubRelease>(`/repos/${GITHUB_REPO}/releases/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: false }),
        });
        const dto = mapReleaseToAdminDto(updated);
        if (!dto) {
          res.status(404).json({ error: 'አፕሊኬሽኑ አልተገኘም።' });
          return;
        }
        res.json({ app: dto });
      } catch (err) {
        console.error('GitHub publish error:', err);
        res.status(502).json({ error: 'አፕሊኬሽኑን መልቀቅ አልተቻለም።' });
      }
      return;
    }

    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      res.status(400).json({ error: 'ልክ ያልሆነ መለያ።' });
      return;
    }

    const records = readRecords();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'አፕሊኬሽኑ አልተገኘም።' });
      return;
    }

    const body = (req.body || {}) as {
      appName?: unknown;
      version?: unknown;
      description?: unknown;
    };

    const existing = records[index];
    const updated: ApkRecord = {
      ...existing,
      appName:
        typeof body.appName === 'string' && body.appName.trim().length > 0
          ? body.appName.trim().slice(0, 100)
          : existing.appName,
      version:
        typeof body.version === 'string' && body.version.trim().length > 0
          ? body.version.trim().slice(0, 32)
          : existing.version,
      description:
        typeof body.description === 'string'
          ? body.description.trim().slice(0, 400)
          : existing.description,
      status: 'published',
      publishedAt: new Date().toISOString(),
    };

    records[index] = updated;
    writeRecords(records);

    res.json({ app: updated });
  });

  // Admin: Unpublish APK
  app.post('/api/admin/apps/:id/unpublish', requireAdmin, async (req, res) => {
    const { id } = req.params;

    if (isGitHubStorageActive() && /^\d+$/.test(id)) {

      try {
        const updated = await githubApiFetch<GitHubRelease>(`/repos/${GITHUB_REPO}/releases/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: true }),
        });
        const dto = mapReleaseToAdminDto(updated);
        if (!dto) {
          res.status(404).json({ error: 'አፕሊኬሽኑ አልተገኘም።' });
          return;
        }
        res.json({ app: dto });
      } catch (err) {
        console.error('GitHub unpublish error:', err);
        res.status(502).json({ error: 'ማስቆም አልተቻለም።' });
      }
      return;
    }

    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      res.status(400).json({ error: 'ልክ ያልሆነ መለያ።' });
      return;
    }

    const records = readRecords();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'አፕሊኬሽኑ አልተገኘም።' });
      return;
    }

    const updated: ApkRecord = {
      ...records[index],
      status: 'staged',
    };
    records[index] = updated;
    writeRecords(records);

    res.json({ app: updated });
  });

  // Admin: Delete APK
  app.delete('/api/admin/apps/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    if (isGitHubStorageActive() && /^\d+$/.test(id)) {

      try {
        const release = await githubApiFetch<GitHubRelease>(`/repos/${GITHUB_REPO}/releases/${id}`);
        await githubApiFetch(`/repos/${GITHUB_REPO}/releases/${id}`, {
          method: 'DELETE',
        });
        if (!release.draft && release.tag_name) {
          await githubApiFetch(
            `/repos/${GITHUB_REPO}/git/refs/tags/${encodeURIComponent(release.tag_name)}`,
            { method: 'DELETE' }
          ).catch(() => undefined);
        }
        res.json({ deletedId: id });
      } catch (err) {
        console.error('GitHub delete error:', err);
        res.status(502).json({ error: 'ማጥፋት አልተቻለም።' });
      }
      return;
    }

    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      res.status(400).json({ error: 'ልክ ያልሆነ መለያ።' });
      return;
    }

    const records = readRecords();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'አፕሊኬሽኑ አልተገኘም።' });
      return;
    }

    const [removed] = records.splice(index, 1);
    const safePath = resolveSafeApkPath(removed.storedFilename);
    if (safePath && fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }
    writeRecords(records);

    res.json({ deletedId: id });
  });

  // Error handler for upload / API errors
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'የፋይሉ መጠን ከ250 ሜጋባይት መብለጥ የለበትም።' });
        return;
      }
      res.status(400).json({ error: `የመጫን ስህተት: ${err.message}` });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'ያልታወቀ የሰርቨር ስህተት ተከስቷል።' });
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(distIndex);

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Wag Siyum APK Portal listening on http://0.0.0.0:${PORT} (storage: ${
        isGitHubStorageActive() ? `github:${GITHUB_REPO}` : 'local'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
