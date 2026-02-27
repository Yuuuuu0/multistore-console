"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  getPreviewType,
  type BreadcrumbItem,
  type Bucket,
  type ClipboardItem,
  type ProviderFormData,
  type PreviewData,
  type Provider,
  type S3Object,
} from "../lib/file-utils";
import {
  createUploadQueue,
  readEntriesFromDataTransfer,
  buildUploadTasks,
  type UploadProgress,
} from "../lib/upload-queue";
import {
  createMultipartUploader,
  getResumeInfo,
  clearResumeInfo,
  cleanupExpiredResumes,
  type MultipartUploadState,
  type ResumeInfo,
} from "../lib/multipart-upload";

export function useFileBrowser() {
  const { data: session } = useSession();
  const requirePasswordChange = Boolean(
    (session as { requirePasswordChange?: boolean } | null)?.requirePasswordChange,
  );

  const [showSecurityBanner, setShowSecurityBanner] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    completed: 0,
    failed: 0,
    total: 0,
    currentFiles: [],
  });

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingKey, setRenamingKey] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferKey, setTransferKey] = useState("");
  const [transferDstProvider, setTransferDstProvider] = useState("");
  const [transferDstBucket, setTransferDstBucket] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Multipart upload state
  const [multipartState, setMultipartState] = useState<MultipartUploadState | null>(null);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [pendingResumeInfo, setPendingResumeInfo] = useState<ResumeInfo | null>(null);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);
  const [pendingResumeKey, setPendingResumeKey] = useState<string>("");
  const multipartUploaderRef = useRef<ReturnType<typeof createMultipartUploader> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: "",
    type: "s3",
    accessKeyId: "",
    secretAccessKey: "",
    endpoint: "",
    region: "",
  });
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);

  // Refs for upload queue access to latest state
  const selectedProviderRef = useRef(selectedProvider);
  const selectedBucketRef = useRef(selectedBucket);
  const currentPrefixRef = useRef(currentPrefix);
  selectedProviderRef.current = selectedProvider;
  selectedBucketRef.current = selectedBucket;
  currentPrefixRef.current = currentPrefix;

  const breadcrumbParts = currentPrefix ? currentPrefix.split("/").filter(Boolean) : [];
  const breadcrumbs: BreadcrumbItem[] = breadcrumbParts.map((label, index) => ({
    label,
    prefix: breadcrumbParts.slice(0, index + 1).join("/") + "/",
  }));
  const filteredObjects = searchQuery
    ? objects.filter((o) => {
        const name = o.Key.split("/").filter(Boolean).pop() || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : objects;
  const allSelected = filteredObjects.length > 0 && selectedKeys.size === filteredObjects.length;
  const someSelected = selectedKeys.size > 0;
  const previewFileName = preview?.key.split("/").pop() || "";

  useEffect(() => {
    loadProviders();
    cleanupExpiredResumes();
  }, []);

  useEffect(() => {
    if (!requirePasswordChange) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: { githubId?: string }) => {
        setShowSecurityBanner(!data.githubId);
      })
      .catch(() => {});
  }, [requirePasswordChange]);

  async function loadProviders() {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) setProviders(await res.json());
    } catch {
      toast.error("加载存储商失败");
    }
  }

  async function loadBuckets(providerId: string) {
    const provider = providers.find((p) => p.id === providerId);
    if (provider?.buckets) {
      setBuckets(provider.buckets.map((b) => ({ Name: b.name })));
      setSelectedBucket(null);
      setObjects([]);
      setCurrentPrefix("");
      setSelectedKeys(new Set());
    }
  }

  async function loadObjects(bucket: string, prefix: string = "", append = false, token?: string) {
    if (!selectedProvider) return;
    append ? setLoadingMore(true) : setLoading(true);
    if (!append) {
      setSelectedKeys(new Set());
      setSearchQuery("");
    }
    try {
      const params = new URLSearchParams({ bucket });
      if (prefix) params.append("prefix", prefix);
      if (token) params.append("continuationToken", token);
      const res = await fetch(`/api/fs/${selectedProvider.id}/list?${params}`);
      if (res.ok) {
        const data = await res.json();
        const folders = (data.prefixes || []).map((p: string) => ({
          Key: p,
          Size: 0,
          LastModified: new Date().toISOString(),
          isFolder: true,
        }));
        const files = (data.objects || []).map((obj: { key: string; size: number; lastModified: string }) => ({
          Key: obj.key,
          Size: obj.size,
          LastModified: obj.lastModified,
          isFolder: false,
        }));
        const newItems = [...folders, ...files];
        setObjects(append ? (prev) => [...prev, ...newItems] : newItems);
        setCurrentPrefix(prefix);
        setNextToken(data.nextContinuationToken || undefined);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "加载对象列表失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }

  function handleLoadMore() {
    if (selectedBucket && nextToken) {
      loadObjects(selectedBucket, currentPrefix, true, nextToken);
    }
  }

  function handleProviderSelect(provider: Provider) {
    setSelectedProvider(provider);
    loadBuckets(provider.id);
  }

  function handleBucketSelect(bucket: string) {
    setSelectedBucket(bucket);
    loadObjects(bucket);
  }

  function handleFolderClick(folderKey: string) {
    if (selectedBucket) loadObjects(selectedBucket, folderKey);
  }

  function handleBreadcrumbClick(index: number) {
    if (!selectedBucket) return;
    const parts = currentPrefix.split("/").filter(Boolean);
    const newPrefix = index < 0 ? "" : parts.slice(0, index + 1).join("/") + "/";
    loadObjects(selectedBucket, newPrefix);
  }

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedKeys(
      selectedKeys.size === filteredObjects.length ? new Set() : new Set(filteredObjects.map((o) => o.Key)),
    );
  }

  async function handleDownload(key: string) {
    if (!selectedProvider || !selectedBucket) return;
    try {
      const params = new URLSearchParams({ bucket: selectedBucket, key, download: "true" });
      const res = await fetch(`/api/fs/${selectedProvider.id}/presign?${params}`);
      if (res.ok) {
        const { url } = await res.json();
        const a = document.createElement("a");
        a.href = url;
        a.download = key.split("/").pop() || "download";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "获取下载链接失败");
      }
    } catch {
      toast.error("下载失败");
    }
  }

  async function handleDeleteFile(key: string, isFolder = false) {
    if (!selectedProvider || !selectedBucket) return;
    const name = key.split("/").filter(Boolean).pop() || key;
    const msg = isFolder ? `确定删除文件夹"${name}"及其所有内容？` : `确定删除"${name}"？`;
    if (!confirm(msg)) return;
    try {
      if (isFolder) {
        const res = await fetch(`/api/fs/${selectedProvider.id}/delete-recursive`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: selectedBucket, prefix: key }),
        });
        if (res.ok) {
          toast.success("文件夹删除成功");
          loadObjects(selectedBucket, currentPrefix);
        } else {
          const err = await res.json().catch(() => ({} as { error?: string }));
          toast.error(err.error || "删除失败");
        }
      } else {
        const res = await fetch(`/api/fs/${selectedProvider.id}/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: selectedBucket, key }),
        });
        if (res.ok) {
          toast.success("删除成功");
          loadObjects(selectedBucket, currentPrefix);
        } else {
          const err = await res.json().catch(() => ({} as { error?: string }));
          toast.error(err.error || "删除失败");
        }
      }
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleBatchDelete() {
    if (!selectedProvider || !selectedBucket || selectedKeys.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedKeys.size} 个文件/文件夹？`)) return;
    const keys = Array.from(selectedKeys);
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, keys }),
      });
      if (res.ok) {
        toast.success(`已删除 ${keys.length} 个文件`);
        setSelectedKeys(new Set());
        loadObjects(selectedBucket, currentPrefix);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "批量删除失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  // ---- 并行上传引擎 ----
  const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

  function startUpload(tasks: { file: File; key: string }[]) {
    const provider = selectedProviderRef.current;
    const bucket = selectedBucketRef.current;
    if (!provider || !bucket || tasks.length === 0) return;

    // Separate small files (<100MB) and large files (>=100MB)
    const smallTasks = tasks.filter((t) => t.file.size < MULTIPART_THRESHOLD);
    const largeTasks = tasks.filter((t) => t.file.size >= MULTIPART_THRESHOLD);

    // Upload small files via existing queue
    if (smallTasks.length > 0) {
      setUploading(true);
      const queue = createUploadQueue({
        concurrency: 4,
        providerId: provider.id,
        bucket,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onComplete: (result) => {
          setUploading(false);
          setUploadProgress({ completed: 0, failed: 0, total: 0, currentFiles: [] });
          if (result.ok > 0) {
            toast.success(`成功上传 ${result.ok} 个文件`);
            const curBucket = selectedBucketRef.current;
            const curPrefix = currentPrefixRef.current;
            if (curBucket) loadObjects(curBucket, curPrefix);
          }
          if (result.fail > 0) {
            toast.error(`${result.fail} 个文件上传失败`);
          }
        },
      });
      queue.addTasks(smallTasks);
      queue.start();
    }

    // Upload large files via multipart (one at a time)
    if (largeTasks.length > 0) {
      startMultipartUploadChain(largeTasks, 0);
    }
  }

  function startMultipartUploadChain(tasks: { file: File; key: string }[], index: number) {
    if (index >= tasks.length) return;
    const task = tasks[index];
    const provider = selectedProviderRef.current;
    const bucket = selectedBucketRef.current;
    if (!provider || !bucket) return;

    // Check for resume info
    const resume = getResumeInfo(provider.id, bucket, task.file);
    if (resume) {
      setPendingResumeInfo(resume);
      setPendingResumeFile(task.file);
      setPendingResumeKey(task.key);
      setResumeDialogOpen(true);
      return;
    }

    doStartMultipartUpload(task.file, task.key, undefined, tasks, index);
  }

  function doStartMultipartUpload(
    file: File,
    key: string,
    resumeInfo: ResumeInfo | undefined,
    chain?: { file: File; key: string }[],
    chainIndex?: number
  ) {
    const provider = selectedProviderRef.current;
    const bucket = selectedBucketRef.current;
    if (!provider || !bucket) return;

    const uploader = createMultipartUploader({
      file,
      providerId: provider.id,
      bucket,
      key,
      concurrency: 3,
      onProgress: (state) => {
        setMultipartState({ ...state });
      },
      onComplete: () => {
        setMultipartState(null);
        multipartUploaderRef.current = null;
        toast.success(`大文件上传完成: ${file.name}`);
        const curBucket = selectedBucketRef.current;
        const curPrefix = currentPrefixRef.current;
        if (curBucket) loadObjects(curBucket, curPrefix);
        // Continue chain if more large files
        if (chain && chainIndex !== undefined) {
          startMultipartUploadChain(chain, chainIndex + 1);
        }
      },
      onError: (error) => {
        multipartUploaderRef.current = null;
        toast.error(`大文件上传失败: ${error}`);
      },
    });

    multipartUploaderRef.current = uploader;

    if (resumeInfo) {
      uploader.resume(resumeInfo);
    } else {
      uploader.start();
    }
  }

  function handleResumeUpload() {
    setResumeDialogOpen(false);
    if (pendingResumeFile && pendingResumeInfo) {
      doStartMultipartUpload(pendingResumeFile, pendingResumeKey, pendingResumeInfo);
    }
    setPendingResumeInfo(null);
    setPendingResumeFile(null);
    setPendingResumeKey("");
  }

  function handleRestartUpload() {
    setResumeDialogOpen(false);
    if (pendingResumeInfo) {
      clearResumeInfo(pendingResumeInfo.providerId, pendingResumeInfo.bucket, pendingResumeInfo.fileId);
    }
    if (pendingResumeFile) {
      doStartMultipartUpload(pendingResumeFile, pendingResumeKey, undefined);
    }
    setPendingResumeInfo(null);
    setPendingResumeFile(null);
    setPendingResumeKey("");
  }

  function cancelMultipartUpload() {
    multipartUploaderRef.current?.cancel();
    setMultipartState(null);
    multipartUploaderRef.current = null;
  }

  function uploadFiles(files: FileList | File[]) {
    if (!selectedProvider || !selectedBucket) return;
    const tasks = buildUploadTasks(files, currentPrefix);
    startUpload(tasks);
  }

  function handleUploadClick() {
    if (!selectedProvider || !selectedBucket) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) uploadFiles(files);
    };
    input.click();
  }

  function handleFolderUploadClick() {
    if (!selectedProvider || !selectedBucket) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) uploadFiles(files);
    };
    input.click();
  }

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);

      const provider = selectedProviderRef.current;
      const bucket = selectedBucketRef.current;
      const prefix = currentPrefixRef.current;
      if (!provider || !bucket) return;

      // 尝试用 webkitGetAsEntry 递归读取（支持文件夹）
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const firstItem = e.dataTransfer.items[0];
        if (firstItem && typeof firstItem.webkitGetAsEntry === "function") {
          const tasks = await readEntriesFromDataTransfer(e.dataTransfer.items, prefix);
          if (tasks.length > 0) {
            startUpload(tasks);
            return;
          }
        }
      }

      // Fallback: 普通文件拖拽
      if (e.dataTransfer.files.length > 0) {
        const tasks = buildUploadTasks(e.dataTransfer.files, prefix);
        startUpload(tasks);
      }
    },
    [],
  );

  function openRenameDialog(key: string) {
    setRenamingKey(key);
    setRenameValue(key.split("/").filter(Boolean).pop() || "");
    setRenameDialogOpen(true);
  }

  async function handleRename(nextValue?: string) {
    const finalName = (nextValue ?? renameValue).trim();
    if (!selectedProvider || !selectedBucket || !renamingKey || !finalName) return;
    const parts = renamingKey.split("/").filter(Boolean);
    parts[parts.length - 1] = finalName;
    const newKey = parts.join("/") + (renamingKey.endsWith("/") ? "/" : "");
    if (newKey === renamingKey) {
      setRenameDialogOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, oldKey: renamingKey, newKey }),
      });
      if (res.ok) {
        toast.success("重命名成功");
        setRenameDialogOpen(false);
        loadObjects(selectedBucket, currentPrefix);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "重命名失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleCreateFolder(nextValue?: string) {
    const finalName = (nextValue ?? folderName).trim();
    if (!selectedProvider || !selectedBucket || !finalName) return;
    const folderKey = currentPrefix + finalName + "/";
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/mkdir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, prefix: folderKey }),
      });
      if (res.ok) {
        toast.success("文件夹创建成功");
        setFolderDialogOpen(false);
        setFolderName("");
        loadObjects(selectedBucket, currentPrefix);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "创建文件夹失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  function handleCopy(key: string) {
    if (!selectedProvider || !selectedBucket) return;
    setClipboard({ action: "copy", providerId: selectedProvider.id, bucket: selectedBucket, key });
    toast.success("已复制到剪贴板");
  }

  function handleCut(key: string) {
    if (!selectedProvider || !selectedBucket) return;
    setClipboard({ action: "cut", providerId: selectedProvider.id, bucket: selectedBucket, key });
    toast.success("已剪切到剪贴板");
  }

  async function handlePaste() {
    if (!selectedProvider || !selectedBucket || !clipboard) return;
    const fileName = clipboard.key.split("/").filter(Boolean).pop() || clipboard.key;
    const dstKey = currentPrefix + fileName;
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srcBucket: clipboard.bucket, srcKey: clipboard.key, dstBucket: selectedBucket, dstKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "粘贴失败");
        return;
      }
      if (clipboard.action === "cut") {
        await fetch(`/api/fs/${clipboard.providerId}/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: clipboard.bucket, key: clipboard.key }),
        });
        setClipboard(null);
      }
      toast.success("粘贴成功");
      loadObjects(selectedBucket, currentPrefix);
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleBatchDownload() {
    if (!selectedProvider || !selectedBucket || selectedKeys.size === 0) return;
    const fileKeys = Array.from(selectedKeys).filter((k) => !k.endsWith("/"));
    if (fileKeys.length === 0) {
      toast.error("请选择文件");
      return;
    }
    toast.info("正在打包下载...");
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, keys: fileKeys }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `download-${Date.now()}.zip`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast.error("打包下载失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  function openTransferDialog(key: string) {
    setTransferKey(key);
    setTransferDstProvider("");
    setTransferDstBucket("");
    setTransferDialogOpen(true);
  }

  async function handleTransfer() {
    if (!selectedProvider || !selectedBucket || !transferKey || !transferDstProvider || !transferDstBucket) return;
    setTransferring(true);
    try {
      const fileName = transferKey.split("/").pop() || transferKey;
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srcProviderId: selectedProvider.id,
          srcBucket: selectedBucket,
          srcKey: transferKey,
          dstProviderId: transferDstProvider,
          dstBucket: transferDstBucket,
          dstKey: fileName,
        }),
      });
      if (res.ok) {
        toast.success("传输任务已创建，后台执行中");
        setTransferDialogOpen(false);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "创建传输任务失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setTransferring(false);
    }
  }

  async function openPreview(obj: S3Object) {
    if (!selectedProvider || !selectedBucket || obj.isFolder) return;
    const type = getPreviewType(obj.Key);
    setPreview({ key: obj.Key, type, loading: true });

    if (type === "text") {
      try {
        const params = new URLSearchParams({ bucket: selectedBucket, key: obj.Key });
        const res = await fetch(`/api/fs/${selectedProvider.id}/content?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPreview((p) => (p ? { ...p, content: data.content, loading: false } : null));
        } else {
          const err = await res.json().catch(() => ({} as { error?: string }));
          toast.error(err.error || "无法加载文件内容");
          setPreview(null);
        }
      } catch {
        toast.error("网络错误");
        setPreview(null);
      }
    } else if (type !== "unsupported") {
      try {
        const params = new URLSearchParams({ bucket: selectedBucket, key: obj.Key });
        const res = await fetch(`/api/fs/${selectedProvider.id}/presign?${params}`);
        if (res.ok) {
          const { url } = await res.json();
          setPreview((p) => (p ? { ...p, url, loading: false } : null));
        } else {
          setPreview(null);
        }
      } catch {
        setPreview(null);
      }
    } else {
      setPreview((p) => (p ? { ...p, loading: false } : null));
    }
  }

  function openAddDialog() {
    setEditingProvider(null);
    setFormData({ name: "", type: "s3", accessKeyId: "", secretAccessKey: "", endpoint: "", region: "" });
    setAvailableBuckets([]);
    setSelectedBuckets([]);
    setDialogOpen(true);
  }

  function openEditDialog(provider: Provider) {
    setEditingProvider(provider);
    setFormData({ name: provider.name, type: provider.type, accessKeyId: "", secretAccessKey: "", endpoint: "", region: "" });
    setAvailableBuckets([]);
    setSelectedBuckets(provider.buckets?.map((b) => b.name) || []);
    setDialogOpen(true);
  }

  async function handleTestConnection() {
    if (!formData.accessKeyId || !formData.secretAccessKey) {
      toast.error("请先填写 Access Key ID 和 Secret Access Key");
      return;
    }
    setTestingConnection(true);
    try {
      const res = await fetch("/api/providers/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableBuckets(data.buckets || []);
        toast.success(`连接成功，找到 ${data.buckets.length} 个存储桶`);
      } else {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || "连接失败");
        setAvailableBuckets([]);
      }
    } catch {
      toast.error("网络错误");
      setAvailableBuckets([]);
    } finally {
      setTestingConnection(false);
    }
  }

  function toggleBucket(bucketName: string) {
    setSelectedBuckets((prev) =>
      prev.includes(bucketName) ? prev.filter((b) => b !== bucketName) : [...prev, bucketName],
    );
  }

  async function handleSubmit() {
    if (!formData.name || !formData.accessKeyId) {
      toast.error("请填写必填字段");
      return;
    }
    if (!editingProvider && !formData.secretAccessKey) {
      toast.error("请填写 Secret Access Key");
      return;
    }
    if (selectedBuckets.length === 0) {
      toast.error("请至少选择一个存储桶");
      return;
    }
    try {
      const url = editingProvider ? `/api/providers/${editingProvider.id}` : "/api/providers";
      const method = editingProvider ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, buckets: selectedBuckets }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "操作失败");
        return;
      }
      toast.success(editingProvider ? "更新成功" : "添加成功");
      setDialogOpen(false);
      loadProviders();
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleDeleteProvider(id: string, name: string) {
    if (!confirm(`确定删除存储商"${name}"？`)) return;
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("删除成功");
        if (selectedProvider?.id === id) {
          setSelectedProvider(null);
          setBuckets([]);
          setSelectedBucket(null);
          setObjects([]);
        }
        loadProviders();
      } else toast.error("删除失败");
    } catch {
      toast.error("网络错误");
    }
  }

  return {
    availableBuckets,
    allSelected,
    breadcrumbs,
    buckets,
    clipboard,
    currentPrefix,
    dialogOpen,
    dragOver,
    editingProvider,
    filteredObjects,
    folderDialogOpen,
    folderName,
    formData,
    loading,
    loadingMore,
    multipartState,
    nextToken,
    objects,
    pendingResumeInfo,
    preview,
    previewFileName,
    providers,
    renameDialogOpen,
    renameValue,
    resumeDialogOpen,
    searchQuery,
    selectedBucket,
    selectedBuckets,
    selectedKeys,
    selectedProvider,
    showSecurityBanner,
    someSelected,
    testingConnection,
    transferDialogOpen,
    transferDstBucket,
    transferDstProvider,
    transferKey,
    transferring,
    uploading,
    uploadProgress,
    cancelMultipartUpload,
    handleBatchDelete,
    handleBatchDownload,
    handleBreadcrumbClick,
    handleBucketSelect,
    handleCopy,
    handleCreateFolder,
    handleCut,
    handleDeleteFile,
    handleDeleteProvider,
    handleDownload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFolderClick,
    handleFolderUploadClick,
    handleLoadMore,
    handlePaste,
    handleProviderSelect,
    handleRename,
    handleRestartUpload,
    handleResumeUpload,
    handleSubmit,
    handleTestConnection,
    handleTransfer,
    handleUploadClick,
    loadObjects,
    openAddDialog,
    openEditDialog,
    openPreview,
    openRenameDialog,
    openTransferDialog,
    setDialogOpen,
    setFolderDialogOpen,
    setFolderName,
    setFormData,
    setPreview,
    setRenameDialogOpen,
    setRenameValue,
    setResumeDialogOpen,
    setSearchQuery,
    setTransferDialogOpen,
    setTransferDstBucket,
    setTransferDstProvider,
    toggleBucket,
    toggleSelect,
    toggleSelectAll,
  };
}
