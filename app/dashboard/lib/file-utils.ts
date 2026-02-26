export type Provider = {
  id: string;
  name: string;
  type: string;
  buckets?: { id: string; name: string }[];
};

export type Bucket = { Name: string; CreationDate?: string };

export type BreadcrumbItem = {
  label: string;
  prefix: string;
};

export type InputDialogSubmit = (value: string) => void;

export type ProviderFormData = {
  name: string;
  type: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
};

export type S3Object = {
  Key: string;
  Size: number;
  LastModified: string;
  isFolder: boolean;
};

export type ClipboardItem = {
  action: "copy" | "cut";
  providerId: string;
  bucket: string;
  key: string;
};

export type PreviewData = {
  key: string;
  type: "image" | "video" | "audio" | "pdf" | "text" | "unsupported";
  url?: string;
  content?: string;
  loading: boolean;
};

export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"]);
export const VIDEO_EXTS = new Set(["mp4", "webm", "ogg", "mov", "mkv"]);
export const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "aac", "m4a", "wma"]);
export const TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "ts", "jsx", "tsx", "css", "html", "htm", "xml",
  "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "sh", "bash", "zsh",
  "py", "go", "rs", "java", "c", "cpp", "h", "hpp", "cs", "rb", "php",
  "sql", "graphql", "prisma", "dockerfile", "makefile", "gitignore",
  "log", "csv", "svg",
]);

export function getFileExt(key: string): string {
  const name = key.split("/").pop() || "";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
}

export function getPreviewType(key: string): PreviewData["type"] {
  const ext = getFileExt(key);
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (TEXT_EXTS.has(ext)) return "text";
  const name = key.split("/").pop()?.toLowerCase() || "";
  if (["dockerfile", "makefile", ".gitignore", ".env"].includes(name)) return "text";
  return "unsupported";
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
