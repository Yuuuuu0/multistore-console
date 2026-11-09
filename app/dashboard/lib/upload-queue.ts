import { DIRECT_UPLOAD_NETWORK_ERROR, readUploadApiError, storageUploadError } from "./upload-errors";

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
  onError?: (error: string, task: UploadTask) => void;
  onWarning?: (warning: string, task: UploadTask) => void;
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

  /** 先获取签名再由浏览器 PUT 文件；完成确认失败只警告，不重复发送文件。 */
  async function uploadOne(task: UploadTask): Promise<boolean> {
    const fileName = task.key.split("/").pop() || task.file.name;
    currentFiles.add(fileName);
    reportProgress();
    try {
      for (let attempt = 0; attempt <= 2; attempt++) {
        if (cancelled) return false;
        const contentType = task.file.type || "application/octet-stream";
        const params = new URLSearchParams({ bucket, key: task.key, contentType });
        let res: Response;
        try {
          res = await fetch(`/api/fs/${providerId}/presign-put?${params}`, { cache: "no-store" });
        } catch {
          throw new Error("获取上传签名失败，请检查控制台连接后重试");
        }
        if (!res.ok) {
          if (res.status === 429 && attempt < 2) {
            const data = await res.json().catch(() => ({}));
            await new Promise((r) => setTimeout(r, (data.retryAfterMs || 1500) * (attempt + 1)));
            continue;
          }
          throw new Error(await readUploadApiError(res, "获取上传签名失败"));
        }
        const signed = await res.json();
        if (cancelled) return false;
        let uploaded: Response;
        try {
          uploaded = await fetch(signed.url, {
            method: signed.method,
            headers: signed.headers,
            body: task.file,
            credentials: "omit",
          });
        } catch {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(DIRECT_UPLOAD_NETWORK_ERROR);
        }
        if (!uploaded.ok) {
          if ((uploaded.status === 429 || uploaded.status >= 500) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(storageUploadError(uploaded.status, await uploaded.text()));
        }
        try {
          const confirmed = await fetch(`/api/fs/${providerId}/upload-complete`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bucket, key: task.key, fileSize: task.file.size }),
          });
          if (!confirmed.ok) throw new Error(await readUploadApiError(confirmed, "完成确认失败"));
        } catch (error) {
          options.onWarning?.(`文件已直传成功，但完成确认失败：${error instanceof Error ? error.message : "控制台连接异常"}。请刷新列表核对，不会自动重新上传。`, task);
        }
        return true;
      }
      return false;
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : "上传失败", task);
      return false;
    } finally {
      currentFiles.delete(fileName);
    }
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
