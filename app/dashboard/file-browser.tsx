"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronRight,
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Home,
  Settings,
  Plus,
  Edit2,
  X,
  FolderPlus,
  Copy,
  Scissors,
  MoreHorizontal,
  CheckSquare,
  Square,
  Eye,
  PackageOpen,
  ArrowRightLeft,
  Loader2,
  LogOut,
  AlertTriangle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Types ──────────────────────────────────────────────

type Provider = {
  id: string;
  name: string;
  type: string;
  buckets?: { id: string; name: string }[];
};

type Bucket = { Name: string; CreationDate?: string };

type S3Object = {
  Key: string;
  Size: number;
  LastModified: string;
  isFolder: boolean;
};

type ClipboardItem = {
  action: "copy" | "cut";
  providerId: string;
  bucket: string;
  key: string;
};

type PreviewData = {
  key: string;
  type: "image" | "video" | "audio" | "pdf" | "text" | "unsupported";
  url?: string;       // presigned URL for media/pdf
  content?: string;   // text content
  loading: boolean;
};

// ── File type helpers ──────────────────────────────────

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "ogg", "mov", "mkv"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "aac", "m4a", "wma"]);
const TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "ts", "jsx", "tsx", "css", "html", "htm", "xml",
  "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "sh", "bash", "zsh",
  "py", "go", "rs", "java", "c", "cpp", "h", "hpp", "cs", "rb", "php",
  "sql", "graphql", "prisma", "dockerfile", "makefile", "gitignore",
  "log", "csv", "svg",
]);

function getFileExt(key: string): string {
  const name = key.split("/").pop() || "";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
}

function getPreviewType(key: string): PreviewData["type"] {
  const ext = getFileExt(key);
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (TEXT_EXTS.has(ext)) return "text";
  // Check for known text filenames without extension
  const name = key.split("/").pop()?.toLowerCase() || "";
  if (["dockerfile", "makefile", ".gitignore", ".env"].includes(name)) return "text";
  return "unsupported";
}

// ── Main component ─────────────────────────────────────

export function FileBrowser() {
  const { data: session } = useSession();
  const requirePasswordChange = (session as any)?.requirePasswordChange;
  const [showSecurityBanner, setShowSecurityBanner] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: "" });

  // Multi-select
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  // Rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingKey, setRenamingKey] = useState("");
  const [renameValue, setRenameValue] = useState("");

  // New folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  // Preview
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // Cross-cloud transfer
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferKey, setTransferKey] = useState("");
  const [transferDstProvider, setTransferDstProvider] = useState("");
  const [transferDstBucket, setTransferDstBucket] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = React.useRef(0);

  // Provider management
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    name: "", type: "s3", accessKeyId: "", secretAccessKey: "", endpoint: "", region: "",
  });
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => { loadProviders(); }, []);

  // Check if security banner should show (default password + no GitHub bound)
  useEffect(() => {
    if (!requirePasswordChange) return;
    fetch("/api/user/profile").then(r => r.json()).then(data => {
      setShowSecurityBanner(!data.githubId);
    }).catch(() => {});
  }, [requirePasswordChange]);

  // ── Data loading ───────────────────────────────────

  async function loadProviders() {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) setProviders(await res.json());
    } catch { toast.error("加载存储商失败"); }
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
    if (!append) { setSelectedKeys(new Set()); setSearchQuery(""); }
    try {
      const params = new URLSearchParams({ bucket });
      if (prefix) params.append("prefix", prefix);
      if (token) params.append("continuationToken", token);
      const res = await fetch(`/api/fs/${selectedProvider.id}/list?${params}`);
      if (res.ok) {
        const data = await res.json();
        const folders = (data.prefixes || []).map((p: string) => ({
          Key: p, Size: 0, LastModified: new Date().toISOString(), isFolder: true,
        }));
        const files = (data.objects || []).map((obj: any) => ({
          Key: obj.key, Size: obj.size, LastModified: obj.lastModified, isFolder: false,
        }));
        const newItems = [...folders, ...files];
        setObjects(append ? (prev) => [...prev, ...newItems] : newItems);
        setCurrentPrefix(prefix);
        setNextToken(data.nextContinuationToken || undefined);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "加载对象列表失败");
      }
    } catch { toast.error("网络错误"); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }

  function handleLoadMore() {
    if (selectedBucket && nextToken) {
      loadObjects(selectedBucket, currentPrefix, true, nextToken);
    }
  }

  // ── Navigation ─────────────────────────────────────

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

  // ── Multi-select ───────────────────────────────────

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedKeys(selectedKeys.size === filteredObjects.length ? new Set() : new Set(filteredObjects.map((o) => o.Key)));
  }

  // ── File operations ────────────────────────────────

  async function handleDownload(key: string) {
    if (!selectedProvider || !selectedBucket) return;
    try {
      const params = new URLSearchParams({ bucket: selectedBucket, key, download: "true" });
      const res = await fetch(`/api/fs/${selectedProvider.id}/presign?${params}`);
      if (res.ok) {
        const { url } = await res.json();
        const a = document.createElement("a");
        a.href = url; a.download = key.split("/").pop() || "download";
        a.style.display = "none"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "获取下载链接失败");
      }
    } catch { toast.error("下载失败"); }
  }

  async function handleDeleteFile(key: string, isFolder = false) {
    if (!selectedProvider || !selectedBucket) return;
    const name = key.split("/").filter(Boolean).pop() || key;
    const msg = isFolder ? `确定删除文件夹"${name}"及其所有内容？` : `确定删除"${name}"？`;
    if (!confirm(msg)) return;
    try {
      if (isFolder) {
        // Recursive folder delete
        const res = await fetch(`/api/fs/${selectedProvider.id}/delete-recursive`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: selectedBucket, prefix: key }),
        });
        if (res.ok) { toast.success("文件夹删除成功"); loadObjects(selectedBucket, currentPrefix); }
        else { const err = await res.json().catch(() => ({})); toast.error(err.error || "删除失败"); }
      } else {
        const res = await fetch(`/api/fs/${selectedProvider.id}/delete`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: selectedBucket, key }),
        });
        if (res.ok) { toast.success("删除成功"); loadObjects(selectedBucket, currentPrefix); }
        else { const err = await res.json().catch(() => ({})); toast.error(err.error || "删除失败"); }
      }
    } catch { toast.error("网络错误"); }
  }

  async function handleBatchDelete() {
    if (!selectedProvider || !selectedBucket || selectedKeys.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedKeys.size} 个文件/文件夹？`)) return;
    const keys = Array.from(selectedKeys);
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/delete`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, keys }),
      });
      if (res.ok) { toast.success(`已删除 ${keys.length} 个文件`); setSelectedKeys(new Set()); loadObjects(selectedBucket, currentPrefix); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || "批量删除失败"); }
    } catch { toast.error("网络错误"); }
  }

  // ── Upload (shared logic) ──────────────────────────

  async function uploadFiles(files: FileList | File[]) {
    if (!selectedProvider || !selectedBucket) return;
    const fileArr = Array.from(files);
    setUploading(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      setUploadProgress({ current: i + 1, total: fileArr.length, fileName: file.name });
      try {
        const key = currentPrefix + file.name;
        const params = new URLSearchParams({ bucket: selectedBucket, key });
        const res = await fetch(`/api/fs/${selectedProvider.id}/upload?${params}`, {
          method: "POST", body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        res.ok ? ok++ : fail++;
      } catch { fail++; }
    }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0, fileName: "" });
    if (ok > 0) { toast.success(`成功上传 ${ok} 个文件`); loadObjects(selectedBucket, currentPrefix); }
    if (fail > 0) toast.error(`${fail} 个文件上传失败`);
  }

  function handleUploadClick() {
    if (!selectedProvider || !selectedBucket) return;
    const input = document.createElement("input");
    input.type = "file"; input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) uploadFiles(files);
    };
    input.click();
  }

  // ── Drag and drop ──────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length > 0 && selectedProvider && selectedBucket) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [selectedProvider, selectedBucket, currentPrefix]);

  // ── Rename ─────────────────────────────────────────

  function openRenameDialog(key: string) {
    setRenamingKey(key);
    setRenameValue(key.split("/").filter(Boolean).pop() || "");
    setRenameDialogOpen(true);
  }

  async function handleRename() {
    if (!selectedProvider || !selectedBucket || !renamingKey || !renameValue.trim()) return;
    const parts = renamingKey.split("/").filter(Boolean);
    parts[parts.length - 1] = renameValue.trim();
    const newKey = parts.join("/") + (renamingKey.endsWith("/") ? "/" : "");
    if (newKey === renamingKey) { setRenameDialogOpen(false); return; }
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/rename`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, oldKey: renamingKey, newKey }),
      });
      if (res.ok) { toast.success("重命名成功"); setRenameDialogOpen(false); loadObjects(selectedBucket, currentPrefix); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || "重命名失败"); }
    } catch { toast.error("网络错误"); }
  }

  // ── Create folder ──────────────────────────────────

  async function handleCreateFolder() {
    if (!selectedProvider || !selectedBucket || !folderName.trim()) return;
    const folderKey = currentPrefix + folderName.trim() + "/";
    try {
      const res = await fetch(`/api/fs/${selectedProvider.id}/mkdir`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: selectedBucket, prefix: folderKey }),
      });
      if (res.ok) { toast.success("文件夹创建成功"); setFolderDialogOpen(false); setFolderName(""); loadObjects(selectedBucket, currentPrefix); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || "创建文件夹失败"); }
    } catch { toast.error("网络错误"); }
  }

  // ── Copy / Cut / Paste ─────────────────────────────

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srcBucket: clipboard.bucket, srcKey: clipboard.key, dstBucket: selectedBucket, dstKey }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || "粘贴失败"); return; }
      if (clipboard.action === "cut") {
        await fetch(`/api/fs/${clipboard.providerId}/delete`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket: clipboard.bucket, key: clipboard.key }),
        });
        setClipboard(null);
      }
      toast.success("粘贴成功"); loadObjects(selectedBucket, currentPrefix);
    } catch { toast.error("网络错误"); }
  }

  // ── Batch ZIP download ─────────────────────────────

  async function handleBatchDownload() {
    if (!selectedProvider || !selectedBucket || selectedKeys.size === 0) return;
    const fileKeys = Array.from(selectedKeys).filter((k) => !k.endsWith("/"));
    if (fileKeys.length === 0) { toast.error("请选择文件"); return; }
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
        a.href = url; a.download = `download-${Date.now()}.zip`;
        a.style.display = "none"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast.error("打包下载失败");
      }
    } catch { toast.error("网络错误"); }
  }

  // ── Cross-cloud transfer ───────────────────────────

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
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "创建传输任务失败");
      }
    } catch { toast.error("网络错误"); }
    finally { setTransferring(false); }
  }

  // ── Preview ────────────────────────────────────────

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
          setPreview((p) => p ? { ...p, content: data.content, loading: false } : null);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "无法加载文件内容");
          setPreview(null);
        }
      } catch { toast.error("网络错误"); setPreview(null); }
    } else if (type !== "unsupported") {
      // Get presigned URL (without forced download)
      try {
        const params = new URLSearchParams({ bucket: selectedBucket, key: obj.Key });
        const res = await fetch(`/api/fs/${selectedProvider.id}/presign?${params}`);
        if (res.ok) {
          const { url } = await res.json();
          setPreview((p) => p ? { ...p, url, loading: false } : null);
        } else { setPreview(null); }
      } catch { setPreview(null); }
    } else {
      setPreview((p) => p ? { ...p, loading: false } : null);
    }
  }

  // ── Provider management ────────────────────────────

  function openAddDialog() {
    setEditingProvider(null);
    setFormData({ name: "", type: "s3", accessKeyId: "", secretAccessKey: "", endpoint: "", region: "" });
    setAvailableBuckets([]); setSelectedBuckets([]); setDialogOpen(true);
  }

  function openEditDialog(provider: Provider) {
    setEditingProvider(provider);
    setFormData({ name: provider.name, type: provider.type, accessKeyId: "", secretAccessKey: "", endpoint: "", region: "" });
    setAvailableBuckets([]); setSelectedBuckets(provider.buckets?.map((b) => b.name) || []);
    setDialogOpen(true);
  }

  async function handleTestConnection() {
    if (!formData.accessKeyId || !formData.secretAccessKey) { toast.error("请先填写 Access Key ID 和 Secret Access Key"); return; }
    setTestingConnection(true);
    try {
      const res = await fetch("/api/providers/test-connection", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
      });
      if (res.ok) { const data = await res.json(); setAvailableBuckets(data.buckets || []); toast.success(`连接成功，找到 ${data.buckets.length} 个存储桶`); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || "连接失败"); setAvailableBuckets([]); }
    } catch { toast.error("网络错误"); setAvailableBuckets([]); }
    finally { setTestingConnection(false); }
  }

  function toggleBucket(bucketName: string) {
    setSelectedBuckets((prev) => prev.includes(bucketName) ? prev.filter((b) => b !== bucketName) : [...prev, bucketName]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.accessKeyId) { toast.error("请填写必填字段"); return; }
    if (!editingProvider && !formData.secretAccessKey) { toast.error("请填写 Secret Access Key"); return; }
    if (selectedBuckets.length === 0) { toast.error("请至少选择一个存储桶"); return; }
    try {
      const url = editingProvider ? `/api/providers/${editingProvider.id}` : "/api/providers";
      const method = editingProvider ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, buckets: selectedBuckets }) });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "操作失败"); return; }
      toast.success(editingProvider ? "更新成功" : "添加成功"); setDialogOpen(false); loadProviders();
    } catch { toast.error("网络错误"); }
  }

  async function handleDeleteProvider(id: string, name: string) {
    if (!confirm(`确定删除存储商"${name}"？`)) return;
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("删除成功");
        if (selectedProvider?.id === id) { setSelectedProvider(null); setBuckets([]); setSelectedBucket(null); setObjects([]); }
        loadProviders();
      } else toast.error("删除失败");
    } catch { toast.error("网络错误"); }
  }

  // ── Computed ───────────────────────────────────────

  const breadcrumbs = currentPrefix ? currentPrefix.split("/").filter(Boolean) : [];
  const filteredObjects = searchQuery
    ? objects.filter((o) => {
        const name = o.Key.split("/").filter(Boolean).pop() || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : objects;
  const allSelected = filteredObjects.length > 0 && selectedKeys.size === filteredObjects.length;
  const someSelected = selectedKeys.size > 0;
  const previewFileName = preview?.key.split("/").pop() || "";

  // ── Render ─────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="h-[57px] px-4 border-b flex items-center flex-shrink-0">
          <h2 className="font-semibold text-lg">MultiStore Console</h2>
        </div>
        <nav className="p-2 space-y-1 flex-shrink-0 border-b">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start"><Home className="w-4 h-4 mr-2" />文件浏览</Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start"><Settings className="w-4 h-4 mr-2" />设置</Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" className="w-full justify-start"><Info className="w-4 h-4 mr-2" />关于</Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="w-4 h-4 mr-2" />退出登录
          </Button>
        </nav>
        <div className="flex-1 overflow-auto p-2 min-h-0">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="text-xs font-semibold text-muted-foreground">存储商</div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={openAddDialog}><Plus className="w-4 h-4" /></Button>
          </div>
          {providers.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2">暂无存储商，点击上方 + 添加</div>
          ) : (
            <div className="space-y-1">
              {providers.map((provider) => (
                <div key={provider.id}>
                  <div className="group relative">
                    <Button variant={selectedProvider?.id === provider.id ? "secondary" : "ghost"} className="w-full justify-start text-sm pr-8" onClick={() => handleProviderSelect(provider)}>
                      <ChevronRight className="w-4 h-4 mr-1" />{provider.name}
                    </Button>
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); openEditDialog(provider); }}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteProvider(provider.id, provider.name); }}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  {selectedProvider?.id === provider.id && buckets.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {buckets.map((bucket, idx) => (
                        <Button key={`${provider.id}-${bucket.Name}-${idx}`} variant={selectedBucket === bucket.Name ? "secondary" : "ghost"} className="w-full justify-start text-xs" onClick={() => handleBucketSelect(bucket.Name)}>
                          <Folder className="w-3 h-3 mr-1" />{bucket.Name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 border-t">
          <Footer />
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Security banner */}
        {showSecurityBanner && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>你正在使用默认密码，请尽快前往<Link href="/settings" className="underline font-medium mx-1">设置页面</Link>修改密码或绑定 GitHub 登录。</span>
          </div>
        )}
        {/* Drag overlay */}
        {dragOver && selectedBucket && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-background rounded-lg p-6 shadow-lg text-center">
              <Upload className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium">拖放文件到此处上传</p>
              <p className="text-sm text-muted-foreground mt-1">{currentPrefix || "根目录"}</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="h-[57px] border-b px-4 flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => selectedBucket && loadObjects(selectedBucket, currentPrefix)} disabled={!selectedBucket || loading}>
            <RefreshCw className="w-4 h-4 mr-2" />刷新
          </Button>
          <Button size="sm" onClick={handleUploadClick} disabled={!selectedBucket || uploading}>
            <Upload className="w-4 h-4 mr-2" />{uploading ? `${uploadProgress.current}/${uploadProgress.total}` : "上传"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setFolderName(""); setFolderDialogOpen(true); }} disabled={!selectedBucket}>
            <FolderPlus className="w-4 h-4 mr-2" />新建文件夹
          </Button>
          {clipboard && (
            <Button size="sm" variant="outline" onClick={handlePaste} disabled={!selectedBucket}>
              <Copy className="w-4 h-4 mr-2" />粘贴{clipboard.action === "cut" ? "(移动)" : "(复制)"}
            </Button>
          )}
          {someSelected && (
            <>
              <Button size="sm" variant="outline" onClick={handleBatchDownload}>
                <PackageOpen className="w-4 h-4 mr-2" />ZIP 下载 ({selectedKeys.size})
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBatchDelete}>
                <Trash2 className="w-4 h-4 mr-2" />删除 ({selectedKeys.size})
              </Button>
            </>
          )}
          <div className="flex-1" />
          {selectedBucket && (
            <Input
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-8 text-sm"
            />
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="border-b px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>正在上传: {uploadProgress.fileName} ({uploadProgress.current}/{uploadProgress.total})</span>
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        {selectedBucket && (
          <div className="border-b p-4 flex items-center gap-2 text-sm flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(-1)}>{selectedBucket}</Button>
            {breadcrumbs.map((part, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(index)}>{part}</Button>
              </div>
            ))}
          </div>
        )}

        {/* Object List */}
        <div className="flex-1 overflow-auto">
          {!selectedProvider ? (
            <div className="text-center text-muted-foreground py-12">请从左侧选择存储商</div>
          ) : !selectedBucket ? (
            <div className="text-center text-muted-foreground py-12">请选择存储桶</div>
          ) : loading ? (
            <div className="text-center text-muted-foreground py-12">加载中...</div>
          ) : objects.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>此目录为空</p>
              <p className="text-xs mt-2">拖放文件到此处上传</p>
            </div>
          ) : filteredObjects.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>没有匹配的文件</p>
            </div>
          ) : (
            <>
            <table className="w-full text-sm">
              <thead className="border-b sticky top-0 bg-background">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <button onClick={toggleSelectAll} className="flex items-center">
                      {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">大小</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-44">修改时间</th>
                  <th className="w-16 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredObjects.map((obj) => {
                  const isSelected = selectedKeys.has(obj.Key);
                  const displayName = obj.Key.split("/").filter(Boolean).pop() || obj.Key;
                  return (
                    <tr
                      key={obj.Key}
                      className={`border-b hover:bg-muted/50 cursor-pointer ${isSelected ? "bg-muted/30" : ""}`}
                      onClick={() => obj.isFolder ? handleFolderClick(obj.Key) : toggleSelect(obj.Key)}
                      onDoubleClick={() => !obj.isFolder && openPreview(obj)}
                    >
                      <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(obj.Key); }}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {obj.isFolder
                            ? <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            : <File className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          <span className="truncate max-w-xs">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{obj.isFolder ? "--" : formatSize(obj.Size)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{obj.isFolder ? "--" : new Date(obj.LastModified).toLocaleString()}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!obj.isFolder && (
                              <DropdownMenuItem onClick={() => openPreview(obj)}>
                                <Eye className="w-4 h-4 mr-2" />预览
                              </DropdownMenuItem>
                            )}
                            {!obj.isFolder && (
                              <DropdownMenuItem onClick={() => handleDownload(obj.Key)}>
                                <Download className="w-4 h-4 mr-2" />下载
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openRenameDialog(obj.Key)}>
                              <Edit2 className="w-4 h-4 mr-2" />重命名
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(obj.Key)}>
                              <Copy className="w-4 h-4 mr-2" />复制
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCut(obj.Key)}>
                              <Scissors className="w-4 h-4 mr-2" />剪切
                            </DropdownMenuItem>
                            {!obj.isFolder && providers.length > 1 && (
                              <DropdownMenuItem onClick={() => openTransferDialog(obj.Key)}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />跨云传输
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFile(obj.Key, obj.isFolder)}>
                              <Trash2 className="w-4 h-4 mr-2" />删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {nextToken && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />加载中...</> : "加载更多"}
                </Button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* ── Preview Dialog ── */}
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {preview?.loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">加载中...</div>
            ) : preview?.type === "image" && preview.url ? (
              <div className="flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={previewFileName} className="max-w-full max-h-[70vh] object-contain rounded" />
              </div>
            ) : preview?.type === "video" && preview.url ? (
              <div className="flex items-center justify-center p-4">
                <video src={preview.url} controls className="max-w-full max-h-[70vh] rounded" />
              </div>
            ) : preview?.type === "audio" && preview.url ? (
              <div className="flex items-center justify-center p-8">
                <audio src={preview.url} controls className="w-full max-w-md" />
              </div>
            ) : preview?.type === "pdf" && preview.url ? (
              <iframe src={preview.url} className="w-full h-[70vh] rounded border" title={previewFileName} />
            ) : preview?.type === "text" && preview.content !== undefined ? (
              <pre className="p-4 bg-muted rounded text-xs leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap break-words font-mono">
                {preview.content}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                <File className="w-12 h-12" />
                <p>此文件类型暂不支持预览</p>
                <Button onClick={() => { if (preview) handleDownload(preview.key); setPreview(null); }}>
                  <Download className="w-4 h-4 mr-2" />下载文件
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            {preview && preview.type !== "unsupported" && (
              <Button variant="outline" onClick={() => { handleDownload(preview.key); }}>
                <Download className="w-4 h-4 mr-2" />下载
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreview(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename Dialog ── */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>重命名</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>取消</Button>
            <Button onClick={handleRename}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Folder Dialog ── */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>新建文件夹</DialogTitle></DialogHeader>
          <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} placeholder="输入文件夹名称" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cross-cloud Transfer Dialog ── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>跨云传输</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              文件: {transferKey.split("/").pop()}
            </div>
            <div>
              <label className="text-sm font-medium">目标存储商</label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={transferDstProvider}
                onChange={(e) => { setTransferDstProvider(e.target.value); setTransferDstBucket(""); }}
              >
                <option value="">选择存储商</option>
                {providers.filter((p) => p.id !== selectedProvider?.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">目标存储桶</label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={transferDstBucket}
                onChange={(e) => setTransferDstBucket(e.target.value)}
                disabled={!transferDstProvider}
              >
                <option value="">选择存储桶</option>
                {providers.find((p) => p.id === transferDstProvider)?.buckets?.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>取消</Button>
            <Button onClick={handleTransfer} disabled={transferring || !transferDstProvider || !transferDstBucket}>
              {transferring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />传输中...</> : "开始传输"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Provider Management Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingProvider ? "编辑存储商" : "添加存储商"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">名称 *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例如：我的 S3" required />
            </div>
            <div>
              <label className="text-sm font-medium">类型 *</label>
              <select className="w-full border rounded-md px-3 py-2" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="s3">AWS S3</option>
                <option value="oss">阿里云 OSS</option>
                <option value="cos">腾讯云 COS</option>
                <option value="custom">其他 S3 兼容</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Access Key ID *</label>
              <Input value={formData.accessKeyId} onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Secret Access Key {editingProvider ? "(留空保持不变)" : "*"}</label>
              <Input type="password" value={formData.secretAccessKey} onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })} required={!editingProvider} />
            </div>
            <div>
              <label className="text-sm font-medium">Endpoint</label>
              <Input value={formData.endpoint} onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })} placeholder="例如：https://oss-cn-hangzhou.aliyuncs.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Region {formData.type === "oss" && "(OSS 可选)"}</label>
              <Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} placeholder={formData.type === "oss" ? "OSS 可从 Endpoint 自动推断" : "例如：us-east-1"} />
              {formData.type === "oss" && <p className="text-xs text-muted-foreground mt-1">提示：OSS 可以从 Endpoint 自动推断 Region</p>}
            </div>
            <div>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testingConnection || !formData.accessKeyId || !formData.secretAccessKey} className="w-full">
                {testingConnection ? "连接中..." : "测试连接并获取存储桶"}
              </Button>
            </div>
            {availableBuckets.length > 0 && (
              <div>
                <label className="text-sm font-medium">选择存储桶 *</label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableBuckets.map((bucket) => (
                    <label key={bucket} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                      <input type="checkbox" checked={selectedBuckets.includes(bucket)} onChange={() => toggleBucket(bucket)} className="w-4 h-4" />
                      <span className="text-sm">{bucket}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">已选择 {selectedBuckets.length} 个存储桶</p>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">{editingProvider ? "更新" : "添加"}</Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">取消</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
