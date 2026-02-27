export type PartStatus = "pending" | "uploading" | "completed" | "failed";

export type PartProgress = {
  partNumber: number;
  status: PartStatus;
  loaded: number;
  total: number;
};

export type CompletedPart = {
  partNumber: number;
  etag: string;
};

export type MultipartUploadState = {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadId: string;
  providerId: string;
  bucket: string;
  key: string;
  partSize: number;
  totalParts: number;
  parts: PartProgress[];
  completedParts: CompletedPart[];
  uploadedBytes: number;
  speed: number;
  estimatedRemaining: number;
  status: "preparing" | "uploading" | "completing" | "completed" | "failed" | "cancelled";
};

export type ResumeInfo = {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadId: string;
  providerId: string;
  bucket: string;
  key: string;
  partSize: number;
  totalParts: number;
  completedParts: CompletedPart[];
  createdAt: number;
};

type MultipartUploadOptions = {
  file: File;
  providerId: string;
  bucket: string;
  key: string;
  concurrency?: number;
  onProgress: (state: MultipartUploadState) => void;
  onComplete: () => void;
  onError: (error: string) => void;
};

function generateFileId(file: File): string {
  const raw = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getResumeKey(providerId: string, bucket: string, fileId: string): string {
  return `msc-multipart-${providerId}-${bucket}-${fileId}`;
}

export function getResumeInfo(providerId: string, bucket: string, file: File): ResumeInfo | null {
  const fileId = generateFileId(file);
  const key = getResumeKey(providerId, bucket, fileId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const info: ResumeInfo = JSON.parse(raw);
    // 过期检查（7天）
    if (Date.now() - info.createdAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return info;
  } catch {
    return null;
  }
}

export function clearResumeInfo(providerId: string, bucket: string, fileId: string): void {
  const key = getResumeKey(providerId, bucket, fileId);
  localStorage.removeItem(key);
}

export function cleanupExpiredResumes(): void {
  const prefix = "msc-multipart-";
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const info = JSON.parse(raw);
      if (Date.now() - info.createdAt > maxAge) {
        localStorage.removeItem(k);
        i--;
      }
    } catch {
      localStorage.removeItem(k!);
      i--;
    }
  }
}

export function createMultipartUploader(options: MultipartUploadOptions) {
  const { file, providerId, bucket, key, concurrency = 3, onProgress, onComplete, onError } = options;
  const fileId = generateFileId(file);
  const abortControllers: AbortController[] = [];
  let cancelled = false;

  // Speed calculation state
  const speedSamples: { time: number; bytes: number }[] = [];
  let lastUploadedBytes = 0;

  const state: MultipartUploadState = {
    fileId,
    fileName: file.name,
    fileSize: file.size,
    uploadId: "",
    providerId,
    bucket,
    key,
    partSize: 0,
    totalParts: 0,
    parts: [],
    completedParts: [],
    uploadedBytes: 0,
    speed: 0,
    estimatedRemaining: 0,
    status: "preparing",
  };

  function report() {
    // Calculate speed
    const now = Date.now();
    speedSamples.push({ time: now, bytes: state.uploadedBytes });
    // Keep only last 5 seconds of samples
    const cutoff = now - 5000;
    while (speedSamples.length > 1 && speedSamples[0].time < cutoff) {
      speedSamples.shift();
    }
    if (speedSamples.length >= 2) {
      const first = speedSamples[0];
      const last = speedSamples[speedSamples.length - 1];
      const elapsed = (last.time - first.time) / 1000;
      if (elapsed > 0) {
        state.speed = (last.bytes - first.bytes) / elapsed;
        const remaining = state.fileSize - state.uploadedBytes;
        state.estimatedRemaining = state.speed > 0 ? remaining / state.speed : 0;
      }
    }
    lastUploadedBytes = state.uploadedBytes;
    onProgress({ ...state, parts: [...state.parts], completedParts: [...state.completedParts] });
  }

  function saveResumeInfo() {
    const info: ResumeInfo = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      uploadId: state.uploadId,
      providerId,
      bucket,
      key,
      partSize: state.partSize,
      totalParts: state.totalParts,
      completedParts: [...state.completedParts],
      createdAt: Date.now(),
    };
    const storageKey = getResumeKey(providerId, bucket, fileId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(info));
    } catch {
      // localStorage full or unavailable
    }
  }

  async function uploadPart(partNumber: number): Promise<boolean> {
    if (cancelled) return false;

    const partIndex = partNumber - 1;
    state.parts[partIndex].status = "uploading";
    report();

    const start = (partNumber - 1) * state.partSize;
    const end = Math.min(start + state.partSize, file.size);
    const blob = file.slice(start, end);

    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      if (cancelled) return false;

      try {
        // Get presigned URL
        const presignRes = await fetch(`/api/fs/${providerId}/multipart/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, key, uploadId: state.uploadId, partNumber }),
        });
        if (!presignRes.ok) {
          throw new Error("获取预签名 URL 失败");
        }
        const { url } = await presignRes.json();

        // Upload part using XMLHttpRequest for progress
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const ctrl = new AbortController();
          abortControllers.push(ctrl);

          ctrl.signal.addEventListener("abort", () => xhr.abort());

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              state.parts[partIndex].loaded = e.loaded;
              // Recalculate total uploaded bytes
              state.uploadedBytes = state.parts.reduce((sum, p) => sum + p.loaded, 0);
              report();
            }
          };

          xhr.onload = () => {
            const idx = abortControllers.indexOf(ctrl);
            if (idx >= 0) abortControllers.splice(idx, 1);

            if (xhr.status >= 200 && xhr.status < 300) {
              const responseEtag = xhr.getResponseHeader("ETag");
              if (responseEtag) {
                resolve(responseEtag);
              } else {
                reject(new Error("No ETag in response"));
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            const idx = abortControllers.indexOf(ctrl);
            if (idx >= 0) abortControllers.splice(idx, 1);
            reject(new Error("Network error"));
          };

          xhr.onabort = () => {
            const idx = abortControllers.indexOf(ctrl);
            if (idx >= 0) abortControllers.splice(idx, 1);
            reject(new Error("Aborted"));
          };

          xhr.open("PUT", url);
          xhr.send(blob);
        });

        // Success
        state.parts[partIndex].status = "completed";
        state.parts[partIndex].loaded = end - start;
        state.completedParts.push({ partNumber, etag });
        state.uploadedBytes = state.parts.reduce((sum, p) => sum + p.loaded, 0);
        saveResumeInfo();
        report();
        return true;
      } catch (e: unknown) {
        if (cancelled) return false;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "Aborted") return false;

        retries++;
        if (retries <= maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * retries));
          continue;
        }

        state.parts[partIndex].status = "failed";
        report();
        return false;
      }
    }
    return false;
  }

  async function uploadAllParts(skipParts: Set<number> = new Set()) {
    state.status = "uploading";
    report();

    const pendingParts: number[] = [];
    for (let i = 1; i <= state.totalParts; i++) {
      if (!skipParts.has(i)) {
        pendingParts.push(i);
      }
    }

    let index = 0;
    let failCount = 0;

    async function worker(): Promise<void> {
      while (index < pendingParts.length && !cancelled) {
        const partNumber = pendingParts[index++];
        const ok = await uploadPart(partNumber);
        if (!ok && !cancelled) failCount++;
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, pendingParts.length) },
      () => worker()
    );
    await Promise.all(workers);

    if (cancelled) return;

    if (failCount > 0) {
      state.status = "failed";
      report();
      onError(`${failCount} 个分片上传失败`);
      return;
    }

    // Complete multipart upload
    state.status = "completing";
    report();

    try {
      const res = await fetch(`/api/fs/${providerId}/multipart/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket,
          key,
          uploadId: state.uploadId,
          parts: state.completedParts,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "合并分片失败" }));
        throw new Error(data.error || "合并分片失败");
      }

      state.status = "completed";
      clearResumeInfo(providerId, bucket, fileId);
      report();
      onComplete();
    } catch (e: unknown) {
      state.status = "failed";
      report();
      onError(e instanceof Error ? e.message : "合并分片失败");
    }
  }

  return {
    async start() {
      state.status = "preparing";
      report();

      try {
        const res = await fetch(`/api/fs/${providerId}/multipart/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket,
            key,
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "创建分片上传失败" }));
          throw new Error(data.error || "创建分片上传失败");
        }

        const { uploadId, partSize, totalParts } = await res.json();
        state.uploadId = uploadId;
        state.partSize = partSize;
        state.totalParts = totalParts;
        state.parts = Array.from({ length: totalParts }, (_, i) => ({
          partNumber: i + 1,
          status: "pending" as PartStatus,
          loaded: 0,
          total: Math.min(partSize, file.size - i * partSize),
        }));

        saveResumeInfo();
        await uploadAllParts();
      } catch (e: unknown) {
        if (!cancelled) {
          state.status = "failed";
          report();
          onError(e instanceof Error ? e.message : "分片上传失败");
        }
      }
    },

    async resume(resumeInfo: ResumeInfo) {
      state.status = "preparing";
      state.uploadId = resumeInfo.uploadId;
      state.partSize = resumeInfo.partSize;
      state.totalParts = resumeInfo.totalParts;
      report();

      try {
        // Verify upload still exists
        const res = await fetch(`/api/fs/${providerId}/multipart/list-parts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket,
            key,
            uploadId: resumeInfo.uploadId,
          }),
        });

        if (!res.ok) {
          // Upload no longer valid, start fresh
          clearResumeInfo(providerId, bucket, fileId);
          return this.start();
        }

        const { parts: remoteParts } = await res.json();
        const completedSet = new Set<number>();
        const completedParts: CompletedPart[] = [];
        let uploadedBytes = 0;

        for (const rp of remoteParts as { partNumber: number; etag: string; size: number }[]) {
          completedSet.add(rp.partNumber);
          completedParts.push({ partNumber: rp.partNumber, etag: rp.etag });
          uploadedBytes += rp.size;
        }

        state.completedParts = completedParts;
        state.uploadedBytes = uploadedBytes;
        state.parts = Array.from({ length: state.totalParts }, (_, i) => {
          const partNumber = i + 1;
          const partTotal = Math.min(state.partSize, file.size - i * state.partSize);
          if (completedSet.has(partNumber)) {
            return { partNumber, status: "completed" as PartStatus, loaded: partTotal, total: partTotal };
          }
          return { partNumber, status: "pending" as PartStatus, loaded: 0, total: partTotal };
        });

        report();
        await uploadAllParts(completedSet);
      } catch (e: unknown) {
        if (!cancelled) {
          state.status = "failed";
          report();
          onError(e instanceof Error ? e.message : "续传失败");
        }
      }
    },

    cancel() {
      cancelled = true;
      state.status = "cancelled";

      // Abort all in-flight XHR requests
      for (const ctrl of abortControllers) {
        ctrl.abort();
      }
      abortControllers.length = 0;

      // Abort the S3 multipart upload
      if (state.uploadId) {
        fetch(`/api/fs/${providerId}/multipart/abort`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, key, uploadId: state.uploadId }),
        }).catch(() => {});
        clearResumeInfo(providerId, bucket, fileId);
      }

      report();
    },
  };
}
