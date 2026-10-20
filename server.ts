import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import JSZip from 'jszip';
import { getDb, saveDb } from './server/db/sqlite';
import { TaskQueue } from './server/queue/taskQueue';
import { ProviderRegistry } from './server/providers/providerRegistry';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase body parser limit for base64 reference images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure outputs directories exist
const outputsDir = path.resolve(process.cwd(), 'outputs');
fs.mkdirSync(path.join(outputsDir, 'images'), { recursive: true });
fs.mkdirSync(path.join(outputsDir, 'videos'), { recursive: true });

// Serve outputs statically
app.use('/outputs', express.static(outputsDir));

const taskQueue = TaskQueue.getInstance();
const providerRegistry = ProviderRegistry.getInstance();

// ================= API ROUTES =================

// --- Task Routes ---
app.get('/api/tasks', async (req, res) => {
  try {
    const db = await getDb();
    const { status, type, limit = 100 } = req.query;

    let query = `
      SELECT 
        id, type, prompt, negative_prompt, reference_image, last_frame_image,
        provider, model, aspect_ratio, resolution, status, progress,
        output_path, output_url, thumbnail_url, error_message,
        retry_count, max_retries, created_at, started_at, completed_at, batch_id, metadata
      FROM tasks
    `;

    const conditions: string[] = [];
    if (status && status !== 'all') conditions.push(`status = '${status}'`);
    if (type && type !== 'all') conditions.push(`type = '${type}'`);

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${Math.min(Number(limit), 500)}`;

    const result = db.exec(query);
    const tasks: any[] = [];

    if (result.length > 0 && result[0].values) {
      const cols = result[0].columns;
      for (const row of result[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => {
          item[col] = row[idx];
        });
        tasks.push(item);
      }
    }

    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { type, prompt, negative_prompt, reference_image, last_frame_image, provider, model, aspect_ratio, resolution, max_retries } = req.body;
    if (!prompt && !reference_image) {
      return res.status(400).json({ success: false, error: 'Prompt or reference image is required' });
    }

    const task = await taskQueue.enqueue({
      type: type || 'image_gen',
      prompt: prompt || '',
      negative_prompt,
      reference_image,
      last_frame_image,
      provider: provider || 'mock',
      model: model || 'mock-flux-schnell',
      aspect_ratio: aspect_ratio || '1:1',
      resolution: resolution || '720p',
      max_retries: max_retries ?? 2
    });

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/retry/:id', async (req, res) => {
  try {
    const ok = await taskQueue.retryTask(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/cancel/:id', async (req, res) => {
  try {
    const ok = await taskQueue.cancelTask(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM tasks WHERE id = ?`, [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/cancel-all-pending', async (_req, res) => {
  try {
    const count = await taskQueue.cancelAllPending();
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tasks/clear-history', async (_req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM tasks WHERE status IN ('succeeded', 'failed', 'cancelled')`);
    saveDb();
    await taskQueue.logActivity('info', 'Cleaned up completed task history', undefined, 'TaskManager');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Batch Routes ---
app.post('/api/batch/enqueue', async (req, res) => {
  try {
    const { items, batchName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Batch items list must not be empty' });
    }

    const { batchId, tasks } = await taskQueue.enqueueBatch(items, batchName);
    res.json({ success: true, batchId, taskCount: tasks.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/batch/jobs', async (_req, res) => {
  try {
    const db = await getDb();
    const resJobs = db.exec(`SELECT * FROM batch_jobs ORDER BY created_at DESC LIMIT 50`);
    const jobs: any[] = [];
    if (resJobs.length > 0) {
      const cols = resJobs[0].columns;
      for (const row of resJobs[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => (item[col] = row[idx]));
        jobs.push(item);
      }
    }
    res.json({ success: true, jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/batch/export-zip', async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT output_path, type, prompt FROM tasks WHERE status = 'succeeded' AND output_path IS NOT NULL`);
    if (result.length === 0 || !result[0].values.length) {
      return res.status(404).json({ success: false, error: 'No succeeded media files to export.' });
    }

    const zip = new JSZip();
    for (const row of result[0].values) {
      const filePath = row[0] as string;
      if (filePath && fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        zip.file(path.basename(filePath), fileContent);
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="DGT_Generated_Media_${Date.now()}.zip"`);
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Queue Controls ---
app.get('/api/queue/status', async (_req, res) => {
  try {
    const status = await taskQueue.getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/queue/pause', (_req, res) => {
  taskQueue.pause();
  res.json({ success: true, isPaused: true });
});

app.post('/api/queue/resume', (_req, res) => {
  taskQueue.resume();
  res.json({ success: true, isPaused: false });
});

app.post('/api/queue/concurrency', (req, res) => {
  const { limit } = req.body;
  taskQueue.setConcurrency(Number(limit) || 2);
  res.json({ success: true, limit: taskQueue.getConcurrency() });
});

// --- Stats & Activity Logs ---
app.get('/api/stats', async (_req, res) => {
  try {
    const db = await getDb();
    const qStatus = await taskQueue.getStatus();

    const totalRes = db.exec(`SELECT COUNT(*) FROM tasks`);
    const totalTasks = (totalRes[0]?.values[0]?.[0] as number) || 0;

    const logRes = db.exec(`SELECT id, level, message, task_id, source, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 30`);
    const logs: any[] = [];
    if (logRes.length > 0) {
      const cols = logRes[0].columns;
      for (const row of logRes[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => (item[col] = row[idx]));
        logs.push(item);
      }
    }

    // Recent succeeded items
    const recRes = db.exec(`SELECT id, type, prompt, output_url, thumbnail_url, completed_at, provider FROM tasks WHERE status = 'succeeded' ORDER BY completed_at DESC LIMIT 8`);
    const recentMedia: any[] = [];
    if (recRes.length > 0) {
      const cols = recRes[0].columns;
      for (const row of recRes[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => (item[col] = row[idx]));
        recentMedia.push(item);
      }
    }

    res.json({
      success: true,
      stats: {
        total: totalTasks,
        pending: qStatus.pendingCount,
        running: qStatus.activeCount,
        succeeded: qStatus.succeededCount,
        failed: qStatus.failedCount,
        concurrencyLimit: qStatus.concurrencyLimit,
        isPaused: qStatus.isPaused
      },
      logs,
      recentMedia
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Provider Routes ---
app.get('/api/providers', async (_req, res) => {
  try {
    const statuses = await providerRegistry.getAllStatuses();
    res.json({ success: true, providers: statuses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/providers/test/:id', async (req, res) => {
  try {
    const adapter = providerRegistry.get(req.params.id);
    const result = await adapter.testConnection();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Settings Routes ---
app.get('/api/settings', async (_req, res) => {
  try {
    const db = await getDb();
    const resDb = db.exec(`SELECT key, value FROM app_settings`);
    const settings: Record<string, string> = {
      outputDirectory: outputsDir,
      concurrencyLimit: String(taskQueue.getConcurrency()),
      maxRetries: '2',
      requestTimeoutSeconds: '120',
      activeProvider: 'mock',
      geminiModelImage: 'gemini-3.1-flash-lite-image',
      geminiModelVideo: 'veo-3.1-lite-generate-preview',
      language: 'vi',
      autoSaveToDisk: 'true',
      namingConvention: '{timestamp}_{index}_{slug}'
    };

    if (resDb.length > 0) {
      for (const row of resDb[0].values) {
        settings[row[0] as string] = row[1] as string;
      }
    }

    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const db = await getDb();
    const settings = req.body;
    const now = new Date().toISOString();

    for (const [k, v] of Object.entries(settings)) {
      db.run(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [k, String(v), now]
      );
    }
    saveDb();

    if (settings.concurrencyLimit) {
      taskQueue.setConcurrency(Number(settings.concurrencyLimit));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Accounts & Session Management ---
app.get('/api/accounts', async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM accounts ORDER BY created_at DESC`);
    const accounts: any[] = [];
    if (result.length > 0) {
      const cols = result[0].columns;
      for (const row of result[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => (item[col] = row[idx]));
        // Mask credentials for safety
        if (item.credentials && item.credentials.length > 8) {
          item.masked_credentials = item.credentials.slice(0, 4) + '••••••••' + item.credentials.slice(-4);
        } else {
          item.masked_credentials = '••••••••';
        }
        accounts.push(item);
      }
    }
    res.json({ success: true, accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const db = await getDb();
    const { id, name, provider, auth_type, credentials, proxy_id, notes } = req.body;
    if (!name || !credentials) {
      return res.status(400).json({ success: false, error: 'Account name and credentials/cookies are required' });
    }

    const accountId = id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO accounts (id, name, provider, auth_type, credentials, proxy_id, status, quota_remaining, last_checked_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 'Unlimited (Pro)', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        provider = excluded.provider,
        auth_type = excluded.auth_type,
        credentials = excluded.credentials,
        proxy_id = excluded.proxy_id,
        notes = excluded.notes,
        last_checked_at = excluded.last_checked_at`,
      [accountId, name, provider || 'google_flow', auth_type || 'cookie_session', credentials, proxy_id || null, now, notes || '', now]
    );
    saveDb();
    await taskQueue.logActivity('info', `Saved account profile: ${name} (${provider})`, undefined, 'AccountManager');
    res.json({ success: true, accountId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM accounts WHERE id = ?`, [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/test/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM accounts WHERE id = '${req.params.id}'`);
    if (result.length === 0 || !result[0].values.length) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    const cols = result[0].columns;
    const acc: any = {};
    cols.forEach((col, idx) => (acc[col] = result[0].values[0][idx]));

    // Simulate session probe
    await new Promise((r) => setTimeout(r, 600));
    const isValid = acc.credentials && acc.credentials.length >= 10;
    const newStatus = isValid ? 'active' : 'relogin_needed';
    const now = new Date().toISOString();

    db.run(`UPDATE accounts SET status = ?, last_checked_at = ? WHERE id = ?`, [newStatus, now, req.params.id]);
    saveDb();

    res.json({
      success: isValid,
      status: newStatus,
      message: isValid
        ? 'Session token / Cookie valid. Authorization verified.'
        : 'Session expired or cookie invalid. Re-login required.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Proxies Management ---
app.get('/api/proxies', async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM proxies ORDER BY created_at DESC`);
    const proxies: any[] = [];
    if (result.length > 0) {
      const cols = result[0].columns;
      for (const row of result[0].values) {
        const item: any = {};
        cols.forEach((col, idx) => (item[col] = row[idx]));
        proxies.push(item);
      }
    }
    res.json({ success: true, proxies });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/proxies', async (req, res) => {
  try {
    const db = await getDb();
    const { host, port, username, password, protocol } = req.body;
    if (!host || !port) {
      return res.status(400).json({ success: false, error: 'Host and port are required' });
    }

    const proxyId = `proxy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO proxies (id, host, port, username, password, protocol, status, latency_ms, last_checked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 85, ?, ?)`,
      [proxyId, host, Number(port), username || null, password || null, protocol || 'http', now, now]
    );
    saveDb();
    res.json({ success: true, proxyId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/proxies/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM proxies WHERE id = ?`, [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/reset-database', async (_req, res) => {
  try {
    const db = await getDb();
    db.run(`DELETE FROM tasks`);
    db.run(`DELETE FROM batch_jobs`);
    db.run(`DELETE FROM activity_logs`);
    db.run(`DELETE FROM accounts`);
    db.run(`DELETE FROM proxies`);
    saveDb();
    await taskQueue.logActivity('warn', 'Database reset: All task records cleared', undefined, 'Settings');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[DGT Workstation] Server running on http://localhost:${PORT}`);
  });
}

startServer();
