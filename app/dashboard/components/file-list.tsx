"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  Copy,
  Download,
  Edit2,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Scissors,
  Square,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AUDIO_EXTS,
  formatSize,
  getFileExt,
  IMAGE_EXTS,
  TEXT_EXTS,
  VIDEO_EXTS,
  type Provider,
  type S3Object,
} from "../lib/file-utils";
import type { FileViewMode } from "./toolbar";

type FileListProps = {
  objects: S3Object[];
  selectedKeys: Set<string>;
  prefix: string;
  providers: Provider[];
  allSelected: boolean;
  selectedProvider: Provider | null;
  selectedBucket: string | null;
  nextToken?: string;
  loadingMore: boolean;
  viewMode?: FileViewMode;
  onToggleSelect: (key: string) => void;
  onToggleSelectAll: () => void;
  onFolderClick: (folderKey: string) => void;
  onDownload: (key: string) => void;
  onDelete: (key: string, isFolder?: boolean) => void;
  onRename: (key: string) => void;
  onCopy: (key: string) => void;
  onCut: (key: string) => void;
  onPreview: (obj: S3Object) => void;
  onOpenTransfer: (key: string) => void;
  onLoadMore: () => void;
};

type SortField = "name" | "size" | "lastModified";
type SortOrder = "asc" | "desc";

const ARCHIVE_EXTS = new Set(["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"]);
const CODE_EXTS = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "php",
  "rb",
  "json",
  "yaml",
  "yml",
  "toml",
  "xml",
  "html",
  "css",
  "sql",
  "sh",
]);

function renderObjectIcon(obj: S3Object) {
  if (obj.isFolder) {
    return <Folder className="w-4 h-4 text-primary fill-primary/15 shrink-0" />;
  }
  const ext = getFileExt(obj.Key);
  if (IMAGE_EXTS.has(ext)) {
    return <FileImage className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (VIDEO_EXTS.has(ext)) {
    return <FileVideo className="w-4 h-4 text-purple-500 shrink-0" />;
  }
  if (AUDIO_EXTS.has(ext)) {
    return <FileAudio className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (ARCHIVE_EXTS.has(ext)) {
    return <FileArchive className="w-4 h-4 text-orange-500 shrink-0" />;
  }
  if (CODE_EXTS.has(ext)) {
    return <FileCode className="w-4 h-4 text-sky-500 shrink-0" />;
  }
  if (ext === "pdf" || TEXT_EXTS.has(ext)) {
    return <FileText className="w-4 h-4 text-cyan-500 shrink-0" />;
  }
  return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function FileContextMenuItems({
  obj,
  providers,
  onPreview,
  onDownload,
  onRename,
  onCopy,
  onCut,
  onOpenTransfer,
  onDelete,
  onFolderClick,
}: {
  obj: S3Object;
  providers: Provider[];
  onPreview: (obj: S3Object) => void;
  onDownload: (key: string) => void;
  onRename: (key: string) => void;
  onCopy: (key: string) => void;
  onCut: (key: string) => void;
  onOpenTransfer: (key: string) => void;
  onDelete: (key: string, isFolder?: boolean) => void;
  onFolderClick: (key: string) => void;
}) {
  return (
    <>
      {obj.isFolder && (
        <ContextMenuItem onClick={() => onFolderClick(obj.Key)}>
          <FolderOpen className="w-4 h-4 mr-2" />
          打开文件夹
        </ContextMenuItem>
      )}
      {!obj.isFolder && (
        <ContextMenuItem onClick={() => onPreview(obj)}>
          <Eye className="w-4 h-4 mr-2" />
          预览文件
        </ContextMenuItem>
      )}
      {!obj.isFolder && (
        <ContextMenuItem onClick={() => onDownload(obj.Key)}>
          <Download className="w-4 h-4 mr-2" />
          下载
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => onRename(obj.Key)}>
        <Edit2 className="w-4 h-4 mr-2" />
        重命名
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopy(obj.Key)}>
        <Copy className="w-4 h-4 mr-2" />
        复制
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCut(obj.Key)}>
        <Scissors className="w-4 h-4 mr-2" />
        剪切
      </ContextMenuItem>
      {!obj.isFolder && providers.length > 1 && (
        <ContextMenuItem onClick={() => onOpenTransfer(obj.Key)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          跨云传输
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        onClick={() => onDelete(obj.Key, obj.isFolder)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除
      </ContextMenuItem>
    </>
  );
}

function FileDropdownMenu({
  obj,
  providers,
  onPreview,
  onDownload,
  onRename,
  onCopy,
  onCut,
  onOpenTransfer,
  onDelete,
  onFolderClick,
}: {
  obj: S3Object;
  providers: Provider[];
  onPreview: (obj: S3Object) => void;
  onDownload: (key: string) => void;
  onRename: (key: string) => void;
  onCopy: (key: string) => void;
  onCut: (key: string) => void;
  onOpenTransfer: (key: string) => void;
  onDelete: (key: string, isFolder?: boolean) => void;
  onFolderClick: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          className="h-7 w-7"
          aria-label="更多操作"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {obj.isFolder && (
          <DropdownMenuItem onClick={() => onFolderClick(obj.Key)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            打开文件夹
          </DropdownMenuItem>
        )}
        {!obj.isFolder && (
          <DropdownMenuItem onClick={() => onPreview(obj)}>
            <Eye className="w-4 h-4 mr-2" />
            预览文件
          </DropdownMenuItem>
        )}
        {!obj.isFolder && (
          <DropdownMenuItem onClick={() => onDownload(obj.Key)}>
            <Download className="w-4 h-4 mr-2" />
            下载
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onRename(obj.Key)}>
          <Edit2 className="w-4 h-4 mr-2" />
          重命名
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopy(obj.Key)}>
          <Copy className="w-4 h-4 mr-2" />
          复制
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCut(obj.Key)}>
          <Scissors className="w-4 h-4 mr-2" />
          剪切
        </DropdownMenuItem>
        {!obj.isFolder && providers.length > 1 && (
          <DropdownMenuItem onClick={() => onOpenTransfer(obj.Key)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            跨云传输
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(obj.Key, obj.isFolder)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 对象存储列表与矩阵卡片视图组件
 */
export function FileList(props: FileListProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const viewMode = props.viewMode || "table";

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  const sortedObjects = useMemo(() => {
    const items = [...props.objects];
    items.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      const nameA = a.Key.split("/").filter(Boolean).pop() || a.Key;
      const nameB = b.Key.split("/").filter(Boolean).pop() || b.Key;
      let cmp = 0;
      if (sortField === "name") {
        cmp = nameA.localeCompare(nameB, "zh-CN");
      } else if (sortField === "size") {
        cmp = a.Size - b.Size;
      } else {
        cmp =
          new Date(a.LastModified).getTime() -
          new Date(b.LastModified).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return items;
  }, [props.objects, sortField, sortOrder]);

  function renderSortIndicator(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      {viewMode === "grid" ? (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedObjects.map((obj) => {
            const isSelected = props.selectedKeys.has(obj.Key);
            const displayName =
              obj.Key.split("/").filter(Boolean).pop() || obj.Key;
            const ext = !obj.isFolder ? getFileExt(obj.Key).toUpperCase() : "";

            return (
              <ContextMenu key={obj.Key}>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() =>
                      obj.isFolder
                        ? props.onFolderClick(obj.Key)
                        : props.onToggleSelect(obj.Key)
                    }
                    onDoubleClick={() => !obj.isFolder && props.onPreview(obj)}
                    onContextMenu={() => {
                      if (!props.selectedKeys.has(obj.Key)) {
                        props.onToggleSelect(obj.Key);
                      }
                    }}
                    className={`group rounded-lg border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/8 shadow-xs"
                        : "bg-card/80 hover:border-primary/40 hover:bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onToggleSelect(obj.Key);
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                          {renderObjectIcon(obj)}
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <FileDropdownMenu
                          obj={obj}
                          providers={props.providers}
                          onPreview={props.onPreview}
                          onDownload={props.onDownload}
                          onRename={props.onRename}
                          onCopy={props.onCopy}
                          onCut={props.onCut}
                          onOpenTransfer={props.onOpenTransfer}
                          onDelete={props.onDelete}
                          onFolderClick={props.onFolderClick}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div
                        className="text-xs font-medium truncate"
                        title={displayName}
                      >
                        {displayName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>
                          {obj.isFolder ? "DIR" : formatSize(obj.Size)}
                        </span>
                        {ext && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-mono h-4 px-1"
                          >
                            {ext}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <FileContextMenuItems
                    obj={obj}
                    providers={props.providers}
                    onPreview={props.onPreview}
                    onDownload={props.onDownload}
                    onRename={props.onRename}
                    onCopy={props.onCopy}
                    onCut={props.onCut}
                    onOpenTransfer={props.onOpenTransfer}
                    onDelete={props.onDelete}
                    onFolderClick={props.onFolderClick}
                  />
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead className="border-b sticky top-0 bg-background/95 backdrop-blur z-10 select-none">
              <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 sm:px-4 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={props.onToggleSelectAll}
                    className="flex items-center"
                    aria-label="全选或取消全选"
                  >
                    {props.allSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <span>对象名称 // KEY</span>
                    {renderSortIndicator("name")}
                  </button>
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-right font-medium w-28">
                  <button
                    type="button"
                    onClick={() => handleSort("size")}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-foreground transition-colors ml-auto"
                  >
                    <span>大小</span>
                    {renderSortIndicator("size")}
                  </button>
                </th>
                <th className="hidden md:table-cell px-4 py-2.5 text-right font-medium w-48">
                  <button
                    type="button"
                    onClick={() => handleSort("lastModified")}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-foreground transition-colors ml-auto"
                  >
                    <span>修改时间</span>
                    {renderSortIndicator("lastModified")}
                  </button>
                </th>
                <th className="w-28 px-3 sm:px-4 py-2.5 text-right font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedObjects.map((obj) => {
                const isSelected = props.selectedKeys.has(obj.Key);
                const displayName =
                  obj.Key.split("/").filter(Boolean).pop() || obj.Key;
                const ext = !obj.isFolder
                  ? getFileExt(obj.Key).toUpperCase()
                  : "";

                return (
                  <ContextMenu key={obj.Key}>
                    <ContextMenuTrigger asChild>
                      <tr
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/8 hover:bg-primary/12"
                            : "hover:bg-muted/45"
                        }`}
                        onClick={() =>
                          obj.isFolder
                            ? props.onFolderClick(obj.Key)
                            : props.onToggleSelect(obj.Key)
                        }
                        onDoubleClick={() =>
                          !obj.isFolder && props.onPreview(obj)
                        }
                        onContextMenu={() => {
                          if (!props.selectedKeys.has(obj.Key)) {
                            props.onToggleSelect(obj.Key);
                          }
                        }}
                      >
                        <td
                          className="px-3 sm:px-4 py-2.5"
                          onClick={(
                            e: React.MouseEvent<HTMLTableCellElement>,
                          ) => {
                            e.stopPropagation();
                            props.onToggleSelect(obj.Key);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground" />
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 max-w-[200px] sm:max-w-md">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderObjectIcon(obj)}
                            <span
                              className={`truncate ${
                                obj.isFolder ? "font-medium" : ""
                              }`}
                              title={displayName}
                            >
                              {displayName}
                            </span>
                            {ext && (
                              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                                {ext}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {obj.isFolder ? "--" : formatSize(obj.Size)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-2.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {obj.isFolder
                            ? "--"
                            : new Date(obj.LastModified).toLocaleString()}
                        </td>
                        <td
                          className="px-3 sm:px-4 py-2.5 text-right"
                          onClick={(
                            e: React.MouseEvent<HTMLTableCellElement>,
                          ) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-0.5">
                            {!obj.isFolder && (
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity"
                                title="预览"
                                onClick={() => props.onPreview(obj)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!obj.isFolder && (
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity"
                                title="下载"
                                onClick={() => props.onDownload(obj.Key)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <FileDropdownMenu
                              obj={obj}
                              providers={props.providers}
                              onPreview={props.onPreview}
                              onDownload={props.onDownload}
                              onRename={props.onRename}
                              onCopy={props.onCopy}
                              onCut={props.onCut}
                              onOpenTransfer={props.onOpenTransfer}
                              onDelete={props.onDelete}
                              onFolderClick={props.onFolderClick}
                            />
                          </div>
                        </td>
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <FileContextMenuItems
                        obj={obj}
                        providers={props.providers}
                        onPreview={props.onPreview}
                        onDownload={props.onDownload}
                        onRename={props.onRename}
                        onCopy={props.onCopy}
                        onCut={props.onCut}
                        onOpenTransfer={props.onOpenTransfer}
                        onDelete={props.onDelete}
                        onFolderClick={props.onFolderClick}
                      />
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {props.nextToken && (
        <div className="flex justify-center py-5 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={props.onLoadMore}
            disabled={props.loadingMore}
            className="font-mono text-xs"
          >
            {props.loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                正在加载更多对象...
              </>
            ) : (
              "加载更多对象 // LOAD MORE"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
