"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Edit, Plus } from "lucide-react";

type Provider = {
  id: string;
  name: string;
  type: string;
  accessKeyId: string;
  endpoint: string | null;
  region: string | null;
  forcePathStyle: boolean;
  disableChunked: boolean;
  createdAt: string;
};

export function ProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "s3",
    accessKeyId: "",
    secretAccessKey: "",
    endpoint: "",
    region: "",
    forcePathStyle: false,
    disableChunked: false,
  });

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    console.log("[ProviderManager] 开始加载存储商列表");
    try { const res = await fetch("/api/providers");
    console.log("[ProviderManager] API 响应:", res.status, res.statusText);
    
    if (res.ok) {
      const data = await res.json();
      console.log("[ProviderManager] 加载成功，数量:", data.length);
      setProviders(data);
    } else {
      const data = await res.json().catch(() => ({}));
      console.error("[ProviderManager] 加载失败:", res.status, data);
      toast.error(data.error || `加载失败 (${res.status})`);
    } } catch (error: unknown) { console.error("[ProviderManager] 网络错误:", error);
    toast.error("网络错误"); } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    setEditingProvider(null);
    setFormData({
      name: "",
      type: "s3",
      accessKeyId: "",
      secretAccessKey: "",
      endpoint: "",
      region: "",
      forcePathStyle: false,
      disableChunked: false,
    });
    setDialogOpen(true);
  }

  function openEditDialog(provider: Provider) {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      accessKeyId: provider.accessKeyId,
      secretAccessKey: "",
      endpoint: provider.endpoint || "",
      region: provider.region || "",
      forcePathStyle: provider.forcePathStyle,
      disableChunked: provider.disableChunked,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.accessKeyId) {
      toast.error("请填写必填字段");
      return;
    }

    if (!editingProvider && !formData.secretAccessKey) {
      toast.error("请填写 Secret Access Key");
      return;
    }

    try { const url = editingProvider ? `/api/providers/${editingProvider.id}` : "/api/providers";
    const method = editingProvider ? "PUT" : "POST";
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "操作失败");
      return;
    }
    
    toast.success(editingProvider ? "更新成功" : "添加成功");
    setDialogOpen(false);
    loadProviders(); } catch (error: unknown) { toast.error("网络错误"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此存储商？")) return;

    try { const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("删除成功");
      loadProviders();
    } else {
      toast.error("删除失败");
    } } catch (error: unknown) { toast.error("网络错误"); }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          管理您的对象存储提供商
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加存储商
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "编辑存储商" : "添加存储商"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">名称 *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：我的 S3"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">类型 *</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="s3">AWS S3</option>
                  <option value="oss">阿里云 OSS</option>
                  <option value="cos">腾讯云 COS</option>
                  <option value="custom">其他 S3 兼容</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Access Key ID *</label>
                <Input
                  value={formData.accessKeyId}
                  onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Secret Access Key {editingProvider ? "(留空保持不变)" : "*"}
                </label>
                <Input
                  type="password"
                  value={formData.secretAccessKey}
                  onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
                  required={!editingProvider}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Endpoint</label>
                <Input
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="例如：https://oss-cn-hangzhou.aliyuncs.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Region {formData.type === "oss" && "(OSS 可选)"}
                </label>
                <Input
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder={formData.type === "oss" ? "OSS 可从 Endpoint 自动推断" : "例如：us-east-1"}
                />
                {formData.type === "oss" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    提示：OSS 可以从 Endpoint 自动推断 Region，无需手动填写
                  </p>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  {editingProvider ? "更新" : "添加"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无存储商，点击上方按钮添加
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>Access Key ID</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {provider.type === "s3" && "AWS S3"}
                    {provider.type === "oss" && "阿里云 OSS"}
                    {provider.type === "cos" && "腾讯云 COS"}
                    {provider.type === "custom" && "S3 兼容"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {provider.accessKeyId.substring(0, 12)}...
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {provider.endpoint || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(provider)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
