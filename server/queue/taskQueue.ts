import crypto from 'crypto';
import { getDb, saveDb, TaskRecord } from '../db/sqlite';
import { TaskInput, QueueStatus } from './types';
import { ProviderRegistry } from '../providers/providerRegistry';

export class TaskQueue {
  private static instance: TaskQueue;
  private isPaused = false;
  private activeRunning = 0;
  private concurrencyLimit = 2;
  private registry = ProviderRegistry.getInstance();
  private processingLoopActive = false;

  private constructor() {
    // Attempt recovery of stuck running tasks upon server start
    this.recoverInterruptedTasks();
  }

  public static getInstance(): TaskQueue {
    if (!TaskQueue.instance) {
      TaskQueue.instance = new TaskQueue();
    }
    return TaskQueue.instance;
  }

  public setConcurrency(limit: number): void {
    this.concurrencyLimit = Math.max(1, Math.min(10, limit));
    this.triggerProcessing();
  }

  public getConcurrency(): number {
    return this.concurrencyLimit;
  }

  public pause(): void {
    this.isPaused = true;
    this.logActivity('warn', 'Queue processing paused by user', undefined, 'TaskQueue');
  }

  public resume(): void {
    this.isPaused = false;
    this.logActivity('info', 'Queue processing resumed', undefined, 'TaskQueue');
    this.triggerProcessing();
  }

  public async getStatus(): Promise<QueueStatus> {
    const db = await getDb();
    const res = db.exec(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_cnt,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded_cnt,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_cnt
      FROM tasks
    `);

    let pending = 0;
    let running = 0;
    let succeeded = 0;
    let failed = 0;

    if (res.length > 0 && res[0].values.length > 0) {
      const row = res[0].values[0];
      pending = (row[0] as number) || 0;
      running = (row[1] as number) || 0;
      succeeded = (row[2] as number) || 0;
      failed = (row[3] as number) || 0;
    }

    return {
      isPaused: this.isPaused,
      activeCount: running,
      pendingCount: pending,
      succeededCount: succeeded,
      failedCount: failed,
      concurrencyLimit: this.concurrencyLimit
    };
  }

  public async enqueue(input: TaskInput): Promise<TaskRecord> {
    const db = await getDb();
    const id = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const task: TaskRecord = {
      id,
      type: input.type,
      prompt: input.prompt.trim(),
      negative_prompt: input.negative_prompt,
      reference_image: input.reference_image,
      last_frame_image: input.last_frame_image,
      provider: input.provider,
      model: input.model,
      aspect_ratio: input.aspect_ratio || '1:1',
      resolution: input.resolution || '720p',
      status: 'pending',
      progress: 0,
      retry_count: 0,
      max_retries: input.max_retries ?? 2,
      created_at: now,
      batch_id: input.batch_id,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined
    };

    db.run(
      `INSERT INTO tasks (
        id, type, prompt, negative_prompt, reference_image, last_frame_image,
        provider, model, aspect_ratio, resolution, status, progress,
        retry_count, max_retries, created_at, batch_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id, task.type, task.prompt, task.negative_prompt || null,
        task.reference_image || null, task.last_frame_image || null,
        task.provider, task.model, task.aspect_ratio, task.resolution || null,
        task.status, task.progress, task.retry_count, task.max_retries,
        task.created_at, task.batch_id || null, task.metadata || null
      ]
    );

    saveDb();
    this.logActivity('info', `Enqueued ${task.type} task (${task.id})`, task.id, 'TaskQueue');

    // Trigger processing tick
    setTimeout(() => this.triggerProcessing(), 50);

    return task;
  }

  public async enqueueBatch(inputs: TaskInput[], batchName?: string): Promise<{ batchId: string; tasks: TaskRecord[] }> {
    const batchId = `batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const db = await getDb();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO batch_jobs (id, name, total_items, completed_items, failed_items, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [batchId, batchName || `Batch Job ${new Date().toLocaleTimeString()}`, inputs.length, 0, 0, 'running', now]
    );

    const tasks: TaskRecord[] = [];
    for (const input of inputs) {
      input.batch_id = batchId;
      const t = await this.enqueue(input);
      tasks.push(t);
    }

    this.logActivity('info', `Created batch ${batchId} with ${inputs.length} tasks`, undefined, 'BatchRunner');
    return { batchId, tasks };
  }

  public async retryTask(taskId: string): Promise<boolean> {
    const db = await getDb();
    const res = db.exec(`SELECT id, retry_count, max_retries FROM tasks WHERE id = '${taskId}'`);
    if (res.length === 0 || res[0].values.length === 0) return false;

    db.run(
      `UPDATE tasks SET 
        status = 'pending', 
        progress = 0, 
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        retry_count = retry_count + 1 
       WHERE id = ?`,
      [taskId]
    );
    saveDb();

    this.logActivity('info', `Task ${taskId} re-queued for retry`, taskId, 'TaskQueue');
    this.triggerProcessing();
    return true;
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    const db = await getDb();
    db.run(`UPDATE tasks SET status = 'cancelled', completed_at = ? WHERE id = ? AND status IN ('pending', 'running')`, [
      new Date().toISOString(),
      taskId
    ]);
    saveDb();
    this.logActivity('warn', `Task ${taskId} cancelled by user`, taskId, 'TaskQueue');
    return true;
  }

  public async cancelAllPending(): Promise<number> {
    const db = await getDb();
    const res = db.exec(`SELECT COUNT(*) FROM tasks WHERE status = 'pending'`);
    const count = (res[0]?.values[0]?.[0] as number) || 0;

    db.run(`UPDATE tasks SET status = 'cancelled', completed_at = ? WHERE status = 'pending'`, [
      new Date().toISOString()
    ]);
    saveDb();
    this.logActivity('warn', `Cancelled all ${count} pending tasks`, undefined, 'TaskQueue');
    return count;
  }

  private async triggerProcessing(): Promise<void> {
    if (this.processingLoopActive || this.isPaused) return;
    this.processingLoopActive = true;

    try {
      while (!this.isPaused && this.activeRunning < this.concurrencyLimit) {
        const nextTask = await this.claimNextPendingTask();
        if (!nextTask) {
          break; // No more tasks available to execute
        }

        this.activeRunning++;
        // Run asynchronously
        this.runTask(nextTask).finally(() => {
          this.activeRunning--;
          this.triggerProcessing();
        });
      }
    } finally {
      this.processingLoopActive = false;
    }
  }

  private async claimNextPendingTask(): Promise<TaskRecord | null> {
    const db = await getDb();
    const res = db.exec(`
      SELECT 
        id, type, prompt, negative_prompt, reference_image, last_frame_image,
        provider, model, aspect_ratio, resolution, status, progress,
        output_path, output_url, thumbnail_url, error_message,
        retry_count, max_retries, created_at, started_at, completed_at, batch_id, metadata
      FROM tasks 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);

    if (res.length === 0 || res[0].values.length === 0) return null;

    const row = res[0].values[0];
    const task: TaskRecord = {
      id: row[0] as string,
      type: row[1] as any,
      prompt: row[2] as string,
      negative_prompt: row[3] as string | undefined,
      reference_image: row[4] as string | undefined,
      last_frame_image: row[5] as string | undefined,
      provider: row[6] as string,
      model: row[7] as string,
      aspect_ratio: row[8] as string,
      resolution: row[9] as string | undefined,
      status: 'running',
      progress: 5,
      output_path: row[12] as string | undefined,
      output_url: row[13] as string | undefined,
      thumbnail_url: row[14] as string | undefined,
      error_message: row[15] as string | undefined,
      retry_count: row[16] as number,
      max_retries: row[17] as number,
      created_at: row[18] as string,
      started_at: new Date().toISOString(),
      completed_at: undefined,
      batch_id: row[21] as string | undefined,
      metadata: row[22] as string | undefined
    };

    db.run(`UPDATE tasks SET status = 'running', started_at = ?, progress = 5 WHERE id = ?`, [
      task.started_at || new Date().toISOString(),
      task.id
    ]);
    saveDb();

    return task;
  }

  private async runTask(task: TaskRecord): Promise<void> {
    const db = await getDb();
    this.logActivity('info', `Starting task ${task.id} (${task.type} via ${task.provider})`, task.id, 'TaskWorker');

    try {
      const adapter = this.registry.get(task.provider);

      const onProgress = (percent: number, statusText?: string) => {
        db.run(`UPDATE tasks SET progress = ? WHERE id = ?`, [percent, task.id]);
        if (statusText) {
          this.logActivity('info', `[${task.id}] ${statusText}`, task.id, 'TaskWorker');
        }
      };

      let result;
      if (task.type === 'image_gen') {
        result = await adapter.executeImageGen(task, onProgress);
      } else if (task.type === 'image_edit') {
        result = await adapter.executeImageEdit(task, onProgress);
      } else {
        result = await adapter.executeVideoGen(task, onProgress);
      }

      const completedAt = new Date().toISOString();
      db.run(
        `UPDATE tasks SET 
          status = 'succeeded', 
          progress = 100, 
          output_path = ?, 
          output_url = ?, 
          thumbnail_url = ?, 
          completed_at = ? 
         WHERE id = ?`,
        [result.outputPath, result.outputUrl, result.thumbnailUrl || result.outputUrl, completedAt, task.id]
      );

      this.updateBatchStats(task.batch_id, true);
      this.logActivity('success', `Task ${task.id} finished successfully`, task.id, 'TaskWorker');
    } catch (err: any) {
      console.error(`Task ${task.id} failed:`, err);
      const errMsg = err.message || 'Execution failed';
      const completedAt = new Date().toISOString();

      if (task.retry_count < task.max_retries) {
        db.run(
          `UPDATE tasks SET 
            status = 'pending', 
            retry_count = retry_count + 1, 
            progress = 0, 
            error_message = ? 
           WHERE id = ?`,
          [`Attempt ${task.retry_count + 1} failed: ${errMsg}. Re-queued.`, task.id]
        );
        this.logActivity(
          'warn',
          `Task ${task.id} failed. Retrying (${task.retry_count + 1}/${task.max_retries}): ${errMsg}`,
          task.id,
          'TaskWorker'
        );
      } else {
        db.run(
          `UPDATE tasks SET 
            status = 'failed', 
            progress = 0, 
            error_message = ?, 
            completed_at = ? 
           WHERE id = ?`,
          [errMsg, completedAt, task.id]
        );
        this.updateBatchStats(task.batch_id, false);
        this.logActivity('error', `Task ${task.id} failed permanently: ${errMsg}`, task.id, 'TaskWorker');
      }
    } finally {
      saveDb();
    }
  }

  private async updateBatchStats(batchId?: string, success = true): Promise<void> {
    if (!batchId) return;
    const db = await getDb();
    if (success) {
      db.run(`UPDATE batch_jobs SET completed_items = completed_items + 1 WHERE id = ?`, [batchId]);
    } else {
      db.run(`UPDATE batch_jobs SET failed_items = failed_items + 1 WHERE id = ?`, [batchId]);
    }
    // Check if whole batch complete
    const res = db.exec(`SELECT total_items, completed_items, failed_items FROM batch_jobs WHERE id = '${batchId}'`);
    if (res.length > 0 && res[0].values.length > 0) {
      const [total, done, failed] = res[0].values[0] as [number, number, number];
      if (done + failed >= total) {
        db.run(`UPDATE batch_jobs SET status = 'completed', completed_at = ? WHERE id = ?`, [
          new Date().toISOString(),
          batchId
        ]);
        this.logActivity('success', `Batch job ${batchId} completed (${done} succeeded, ${failed} failed)`, undefined, 'BatchRunner');
      }
    }
  }

  public async logActivity(level: 'info' | 'warn' | 'error' | 'success', message: string, taskId?: string, source = 'System'): Promise<void> {
    try {
      const db = await getDb();
      const id = `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO activity_logs (id, level, message, task_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, level, message, taskId || null, source, now]
      );
      // Keep activity logs bounded to last 500 items
      db.run(`DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY created_at DESC LIMIT 500)`);
      saveDb();
    } catch (e) {
      console.warn('Logging error:', e);
    }
  }

  private async recoverInterruptedTasks(): Promise<void> {
    try {
      const db = await getDb();
      // Any tasks stuck in running state when process restarted get marked back to pending
      db.run(`UPDATE tasks SET status = 'pending', progress = 0 WHERE status = 'running'`);
      saveDb();
      setTimeout(() => this.triggerProcessing(), 200);
    } catch (e) {
      console.error('Failed to recover interrupted tasks:', e);
    }
  }
}
