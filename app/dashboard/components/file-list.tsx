"use client";

import {
  ArrowRightLeft,
  CheckSquare,
  Copy,
  Download,
  Edit2,
  Eye,
  File,
  Folder,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Scissors,
  Square,
  Trash2,
} from "lucide-react";

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

import { formatSize, type Provider, type S3Object } from "../lib/file-utils";

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
          <FolderOpen className="w-4 h-4 mr-2" />打开
        </ContextMenuItem>
      )}
      {!obj.isFolder && (
        <ContextMenuItem onClick={() => onPreview(obj)}>
          <Eye className="w-4 h-4 mr-2" />预览
        </ContextMenuItem>
      )}
      {!obj.isFolder && (
        <ContextMenuItem onClick={() => onDownload(obj.Key)}>
          <Download className="w-4 h-4 mr-2" />下载
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => onRename(obj.Key)}>
        <Edit2 className="w-4 h-4 mr-2" />重命名
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopy(obj.Key)}>
        <Copy className="w-4 h-4 mr-2" />复制
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCut(obj.Key)}>
        <Scissors className="w-4 h-4 mr-2" />剪切
      </ContextMenuItem>
      {!obj.isFolder && providers.length > 1 && (
        <ContextMenuItem onClick={() => onOpenTransfer(obj.Key)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />跨云传输
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => onDelete(obj.Key, obj.isFolder)}>
        <Trash2 className="w-4 h-4 mr-2" />删除
      </ContextMenuItem>
    </>
  );
}

export function FileList(props: FileListProps) {
  return (
    <>
      <table className="w-full text-sm">
        <thead className="border-b sticky top-0 bg-background">
          <tr>
            <th className="w-10 px-4 py-3 text-left">
              <button onClick={props.onToggleSelectAll} className="flex items-center">
                {props.allSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">大小</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground w-44">修改时间</th>
            <th className="w-16 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {props.objects.map((obj) => {
            const isSelected = props.selectedKeys.has(obj.Key);
            const displayName = obj.Key.split("/").filter(Boolean).pop() || obj.Key;
            return (
              <ContextMenu key={obj.Key}>
                <ContextMenuTrigger asChild>
                  <tr
                    className={`border-b hover:bg-muted/50 cursor-pointer ${isSelected ? "bg-muted/30" : ""}`}
                    onClick={() => (obj.isFolder ? props.onFolderClick(obj.Key) : props.onToggleSelect(obj.Key))}
                    onDoubleClick={() => !obj.isFolder && props.onPreview(obj)}
                    onContextMenu={() => {
                      if (!props.selectedKeys.has(obj.Key)) {
                        props.onToggleSelect(obj.Key);
                      }
                    }}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        e.stopPropagation();
                        props.onToggleSelect(obj.Key);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {obj.isFolder ? (
                          <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {obj.isFolder ? "--" : formatSize(obj.Size)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {obj.isFolder ? "--" : new Date(obj.LastModified).toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!obj.isFolder && (
                            <DropdownMenuItem onClick={() => props.onPreview(obj)}>
                              <Eye className="w-4 h-4 mr-2" />预览
                            </DropdownMenuItem>
                          )}
                          {!obj.isFolder && (
                            <DropdownMenuItem onClick={() => props.onDownload(obj.Key)}>
                              <Download className="w-4 h-4 mr-2" />下载
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => props.onRename(obj.Key)}>
                            <Edit2 className="w-4 h-4 mr-2" />重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => props.onCopy(obj.Key)}>
                            <Copy className="w-4 h-4 mr-2" />复制
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => props.onCut(obj.Key)}>
                            <Scissors className="w-4 h-4 mr-2" />剪切
                          </DropdownMenuItem>
                          {!obj.isFolder && props.providers.length > 1 && (
                            <DropdownMenuItem onClick={() => props.onOpenTransfer(obj.Key)}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />跨云传输
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => props.onDelete(obj.Key, obj.isFolder)}>
                            <Trash2 className="w-4 h-4 mr-2" />删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      {props.nextToken && (
        <div className="flex justify-center py-4">
          <Button variant="outline" size="sm" onClick={props.onLoadMore} disabled={props.loadingMore}>
            {props.loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />加载中...
              </>
            ) : (
              "加载更多"
            )}
          </Button>
        </div>
      )}
    </>
  );
}
