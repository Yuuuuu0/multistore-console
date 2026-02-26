"use client";

import Link from "next/link";
import { AlertTriangle, Upload } from "lucide-react";

import { BreadcrumbNav } from "./components/breadcrumb-nav";
import { FileList } from "./components/file-list";
import { FolderDialog } from "./components/folder-dialog";
import { PreviewDialog } from "./components/preview-dialog";
import { ProviderDialog } from "./components/provider-dialog";
import { RenameDialog } from "./components/rename-dialog";
import { Sidebar } from "./components/sidebar";
import { Toolbar } from "./components/toolbar";
import { TransferDialog } from "./components/transfer-dialog";
import { useFileBrowser } from "./hooks/use-file-browser";

export function FileBrowser() {
  const browser = useFileBrowser();

  return (
    <div
      className="flex h-screen overflow-hidden"
      onDragEnter={browser.handleDragEnter}
      onDragLeave={browser.handleDragLeave}
      onDragOver={browser.handleDragOver}
      onDrop={browser.handleDrop}
    >
      <Sidebar
        providers={browser.providers}
        selectedProvider={browser.selectedProvider}
        selectedBucket={browser.selectedBucket}
        buckets={browser.buckets}
        onProviderSelect={browser.handleProviderSelect}
        onBucketSelect={browser.handleBucketSelect}
        onAddProvider={browser.openAddDialog}
        onEditProvider={browser.openEditDialog}
        onDeleteProvider={browser.handleDeleteProvider}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {browser.showSecurityBanner && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              你正在使用默认密码，请尽快前往
              <Link href="/settings" className="underline font-medium mx-1">
                设置页面
              </Link>
              修改密码或绑定 GitHub 登录。
            </span>
          </div>
        )}

        {browser.dragOver && browser.selectedBucket && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-background rounded-lg p-6 shadow-lg text-center">
              <Upload className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium">拖放文件到此处上传</p>
              <p className="text-sm text-muted-foreground mt-1">{browser.currentPrefix || "根目录"}</p>
            </div>
          </div>
        )}

        <Toolbar
          selectedKeys={browser.selectedKeys}
          objects={browser.objects}
          clipboard={browser.clipboard}
          prefix={browser.currentPrefix}
          selectedProvider={browser.selectedProvider?.id || null}
          selectedBucket={browser.selectedBucket}
          allSelected={browser.allSelected}
          someSelected={browser.someSelected}
          searchTerm={browser.searchQuery}
          uploadProgress={browser.uploadProgress}
          isLoading={browser.loading}
          isUploading={browser.uploading}
          onToggleSelectAll={browser.toggleSelectAll}
          onRefresh={() => browser.selectedBucket && browser.loadObjects(browser.selectedBucket, browser.currentPrefix)}
          onUploadClick={browser.handleUploadClick}
          onBatchDelete={browser.handleBatchDelete}
          onBatchDownload={browser.handleBatchDownload}
          onPaste={browser.handlePaste}
          onCreateFolder={() => {
            browser.setFolderName("");
            browser.setFolderDialogOpen(true);
          }}
          onSearchChange={browser.setSearchQuery}
        />

        <BreadcrumbNav
          selectedBucket={browser.selectedBucket}
          breadcrumbs={browser.breadcrumbs}
          onBreadcrumbClick={browser.handleBreadcrumbClick}
        />

        <div className="flex-1 overflow-auto">
          {!browser.selectedProvider ? (
            <div className="text-center text-muted-foreground py-12">请从左侧选择存储商</div>
          ) : !browser.selectedBucket ? (
            <div className="text-center text-muted-foreground py-12">请选择存储桶</div>
          ) : browser.loading ? (
            <div className="text-center text-muted-foreground py-12">加载中...</div>
          ) : browser.objects.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>此目录为空</p>
              <p className="text-xs mt-2">拖放文件到此处上传</p>
            </div>
          ) : browser.filteredObjects.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>没有匹配的文件</p>
            </div>
          ) : (
            <FileList
              objects={browser.filteredObjects}
              selectedKeys={browser.selectedKeys}
              prefix={browser.currentPrefix}
              providers={browser.providers}
              allSelected={browser.allSelected}
              selectedProvider={browser.selectedProvider}
              selectedBucket={browser.selectedBucket}
              nextToken={browser.nextToken}
              loadingMore={browser.loadingMore}
              onToggleSelect={browser.toggleSelect}
              onToggleSelectAll={browser.toggleSelectAll}
              onFolderClick={browser.handleFolderClick}
              onDownload={browser.handleDownload}
              onDelete={browser.handleDeleteFile}
              onRename={browser.openRenameDialog}
              onCopy={browser.handleCopy}
              onCut={browser.handleCut}
              onPreview={browser.openPreview}
              onOpenTransfer={browser.openTransferDialog}
              onLoadMore={browser.handleLoadMore}
            />
          )}
        </div>
      </div>

      <PreviewDialog
        previewData={browser.preview}
        previewFileName={browser.previewFileName}
        open={!!browser.preview}
        onClose={() => browser.setPreview(null)}
        onDownload={browser.handleDownload}
      />
      <RenameDialog
        open={browser.renameDialogOpen}
        currentName={browser.renameValue}
        onClose={() => browser.setRenameDialogOpen(false)}
        onSubmit={browser.handleRename}
      />
      <FolderDialog
        open={browser.folderDialogOpen}
        onClose={() => browser.setFolderDialogOpen(false)}
        onSubmit={browser.handleCreateFolder}
      />
      <TransferDialog
        open={browser.transferDialogOpen}
        providers={browser.providers}
        selectedProvider={browser.selectedProvider}
        selectedBucket={browser.selectedBucket}
        selectedKeys={browser.selectedKeys}
        transferKey={browser.transferKey}
        transferDstProvider={browser.transferDstProvider}
        transferDstBucket={browser.transferDstBucket}
        transferring={browser.transferring}
        onClose={() => browser.setTransferDialogOpen(false)}
        onTransfer={browser.handleTransfer}
        onChangeDstProvider={browser.setTransferDstProvider}
        onChangeDstBucket={browser.setTransferDstBucket}
      />
      <ProviderDialog
        open={browser.dialogOpen}
        provider={browser.editingProvider}
        formData={browser.formData}
        availableBuckets={browser.availableBuckets}
        selectedBuckets={browser.selectedBuckets}
        testingConnection={browser.testingConnection}
        onClose={() => browser.setDialogOpen(false)}
        onSubmit={browser.handleSubmit}
        onTestConnection={browser.handleTestConnection}
        onFormDataChange={browser.setFormData}
        onToggleBucket={browser.toggleBucket}
      />
    </div>
  );
}
