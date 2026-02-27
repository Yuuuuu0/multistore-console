export type UploadTask = {
  file: File;
  key: string;
};

export type UploadProgress = {
  completed: number;
  failed: number;
  total: number;
  currentFiles: string[];
};

type UploadQueueOptions = {
  concurrency: number;
  providerId: string;
  bucket: string;
  onProgress: (progress: UploadProgress) => void;
  onComplete: (result: { ok: number; fail: number }) => void;
};

export function createUploadQueue(options: UploadQueueOptions) {
  const { concurrency, providerId, bucket, onProgress, onComplete } = options;
  let tasks: UploadTask[] = [];
  let completed = 0;
  let failed = 0;
  let cancelled = false;
  const currentFiles = new Set<string>();

  function reportProgress() {
    onProgress({
      completed,
      failed,
      total: tasks.length,
      currentFiles: Array.from(currentFiles),
    });
  }

  async function uploadOne(task: UploadTask): Promise<boolean> {
    const fileName = task.key.split("/").pop() || task.file.name;
    currentFiles.add(fileName);
    reportProgress();

    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      if (cancelled) return false;
      try {
        const params = new URLSearchParams({ bucket, key: task.key });
        const res = await fetch(`/api/fs/${providerId}/upload?${params}`, {
          method: "POST",
          body: task.file,
          headers: { "Content-Type": task.file.type || "application/octet-stream" },
        });

        if (res.ok) {
          currentFiles.delete(fileName);
          return true;
        }

        // 429 时退避重试
        if (res.status === 429 && retries < maxRetries) {
          const data = await res.json().catch(() => ({ retryAfterMs: 1500 }));
          const delay = (data as { retryAfterMs?: number }).retryAfterMs || 1500;
          await new Promise((r) => setTimeout(r, delay * (retries + 1)));
          retries++;
          continue;
        }

        currentFiles.delete(fileName);
        return false;
      } catch {
        if (retries < maxRetries) {
          retries++;
          await new Promise((r) => setTimeout(r, 1000 * retries));
          continue;
        }
        currentFiles.delete(fileName);
        return false;
      }
    }

    currentFiles.delete(fileName);
    return false;
  }

  async function run() {
    let index = 0;

    async function next(): Promise<void> {
      while (index < tasks.length && !cancelled) {
        const task = tasks[index++];
        const ok = await uploadOne(task);
        if (ok) {
          completed++;
        } else {
          failed++;
        }
        reportProgress();
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => next());
    await Promise.all(workers);

    onComplete({ ok: completed, fail: failed });
  }

  return {
    addTasks(newTasks: UploadTask[]) {
      tasks = newTasks;
    },
    start() {
      completed = 0;
      failed = 0;
      cancelled = false;
      currentFiles.clear();
      reportProgress();
      return run();
    },
    cancel() {
      cancelled = true;
    },
  };
}

/**
 * 从 DataTransferItemList 递归读取文件（支持文件夹拖拽）
 */
export async function readEntriesFromDataTransfer(
  items: DataTransferItemList,
  prefix: string
): Promise<UploadTask[]> {
  const tasks: UploadTask[] = [];

  async function readEntry(entry: FileSystemEntry, basePath: string): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      tasks.push({ file, key: basePath + file.name });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirPath = basePath + entry.name + "/";
      const reader = dirEntry.createReader();

      let allEntries: FileSystemEntry[] = [];
      // readEntries 每次最多返回 100 个，需要循环读取
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });
        allEntries = allEntries.concat(batch);
      } while (batch.length > 0);

      for (const child of allEntries) {
        await readEntry(child, dirPath);
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      await readEntry(entry, prefix);
    }
  }

  return tasks;
}

/**
 * 从 FileList 构建上传任务（支持 webkitRelativePath）
 */
export function buildUploadTasks(files: FileList | File[], prefix: string): UploadTask[] {
  const fileArr = Array.from(files);
  return fileArr.map((file) => {
    // webkitRelativePath 包含文件夹路径
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    const key = relativePath ? prefix + relativePath : prefix + file.name;
    return { file, key };
  });
}
