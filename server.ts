import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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

interface SessionPayload {
  username: string;
  exp: number;
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const APK_DIR = path.resolve(DATA_DIR, 'apks');
const METADATA_FILE = path.resolve(DATA_DIR, 'apps.json');

fs.mkdirSync(APK_DIR, { recursive: true });
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2), 'utf8');
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
  if (!base) return 'wag-siyu-app.apk';
  return base.toLowerCase().endsWith('.apk') ? base : `${base}.apk`;
}

function resolveSafeApkPath(storedFilename: string): string | null {
  const safeBase = path.basename(storedFilename);
  if (!safeBase || !safeBase.endsWith('.apk')) return null;
  const resolved = path.resolve(APK_DIR, safeBase);
  if (!resolved.startsWith(APK_DIR + path.sep)) return null;
  return resolved;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, APK_DIR);
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
  app.get('/api/apps', (_req, res) => {
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
  });

  // Public API: download a published APK file
  app.get('/api/apps/:id/download', (req, res) => {
    const { id } = req.params;
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
  app.get('/api/admin/apps', requireAdmin, (_req, res) => {
    const records = readRecords().sort(
      (a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)
    );
    res.json({ apps: records });
  });

  // Admin: Upload APK file (starts in 'staged' state until admin clicks 'ልቀቅ')
  app.post('/api/admin/upload', requireAdmin, upload.single('apk'), (req, res) => {
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
  app.post('/api/admin/apps/:id/publish', requireAdmin, (req, res) => {
    const { id } = req.params;
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
  app.post('/api/admin/apps/:id/unpublish', requireAdmin, (req, res) => {
    const { id } = req.params;
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
  app.delete('/api/admin/apps/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
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
    console.log(`Wag Siyu APK Portal listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
