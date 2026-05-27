import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, Pencil, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function AllowedEmailsPage() {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");

  const utils = trpc.useUtils();
  const { data: emails = [], isLoading, error } = trpc.allowedEmail.list.useQuery();

  const addMut = trpc.allowedEmail.add.useMutation({
    onSuccess: () => {
      toast.success("已新增帳號");
      utils.allowedEmail.list.invalidate();
      setShowAddDialog(false);
      setNewEmail("");
      setNewName("");
    },
    onError: (e) => {
      if (e.message?.includes("Duplicate")) {
        toast.error("此 Email 已存在白名單中");
      } else {
        toast.error("新增失敗：" + e.message);
      }
    },
  });

  const updateMut = trpc.allowedEmail.update.useMutation({
    onSuccess: () => {
      toast.success("已更新帳號");
      utils.allowedEmail.list.invalidate();
      setShowEditDialog(false);
    },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });

  const deleteMut = trpc.allowedEmail.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除帳號");
      utils.allowedEmail.list.invalidate();
      setShowDeleteDialog(false);
    },
    onError: (e) => toast.error("刪除失敗：" + e.message),
  });

  const toggleMut = trpc.allowedEmail.update.useMutation({
    onSuccess: () => {
      toast.success("已更新狀態");
      utils.allowedEmail.list.invalidate();
    },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });

  // 非管理員顯示無權限提示
  if (user?.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-destructive" />
          <h1 className="text-2xl font-bold tracking-tight">帳號管理</h1>
        </div>
        <Card className="border-destructive/20">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive/30 mx-auto mb-3" />
            <p className="text-muted-foreground">您沒有權限存取此頁面，僅管理員可管理帳號白名單。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newEmail.trim()) {
      toast.error("請輸入 Email");
      return;
    }
    addMut.mutate({ email: newEmail.trim(), name: newName.trim() || undefined });
  };

  const handleOpenEdit = (item: typeof emails[number]) => {
    setEditId(item.id);
    setEditEmail(item.email);
    setEditName(item.name || "");
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (editId === null) return;
    if (!editEmail.trim()) {
      toast.error("Email 不可為空");
      return;
    }
    updateMut.mutate({ id: editId, email: editEmail.trim(), name: editName.trim() });
  };

  const handleToggle = (item: typeof emails[number]) => {
    toggleMut.mutate({ id: item.id, isActive: item.isActive === 1 ? 0 : 1 });
  };

  const handleOpenDelete = (item: typeof emails[number]) => {
    setDeleteId(item.id);
    setDeleteEmail(item.email);
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMut.mutate({ id: deleteId });
  };

  const activeCount = emails.filter(e => e.isActive === 1).length;
  const inactiveCount = emails.filter(e => e.isActive !== 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">帳號管理</h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理允許登入系統的 Google 帳號白名單
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          新增帳號
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary">{emails.length}</p>
            <p className="text-xs text-muted-foreground mt-1">總帳號數</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">啟用中</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground mt-1">已停用</p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary/60 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>只有白名單中<strong>啟用</strong>的 Google 帳號才能登入系統。</p>
              <p>系統擁有者帳號始終可以登入，不受白名單限制。</p>
              <p>停用帳號後，該帳號下次登入時將被拒絕。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">載入失敗：{error.message}</p>
          </CardContent>
        </Card>
      ) : emails.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">尚無帳號白名單，請新增允許登入的 Google 帳號</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              帳號白名單 ({emails.length} 個)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">備註名稱</th>
                    <th className="text-left py-2 px-2 font-medium">狀態</th>
                    <th className="text-left py-2 px-2 font-medium">建立時間</th>
                    <th className="text-right py-2 px-2 font-medium w-28">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((item, idx) => (
                    <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 ${item.isActive !== 1 ? "opacity-50" : ""}`}>
                      <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{item.email}</td>
                      <td className="py-2 px-2 text-muted-foreground">{item.name || "-"}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          item.isActive === 1
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {item.isActive === 1 ? "啟用" : "停用"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {new Date(item.createdAt).toLocaleDateString("zh-TW")}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggle(item)}
                            title={item.isActive === 1 ? "停用" : "啟用"}
                          >
                            {item.isActive === 1 ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-orange-500" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(item)} title="修改">
                            <Pencil className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDelete(item)} title="刪除">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增帳號</DialogTitle>
            <DialogDescription>輸入要允許登入的 Google 帳號 Email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>備註名稱</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="選填，例如：王老師"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>
              {addMut.isPending ? "新增中..." : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改帳號</DialogTitle>
            <DialogDescription>修改帳號的 Email 或備註名稱</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>備註名稱</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="選填，例如：王老師"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? "更新中..." : "儲存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              確認刪除
            </DialogTitle>
            <DialogDescription>
              確定要刪除帳號 <strong>{deleteEmail}</strong> 嗎？刪除後該帳號將無法登入系統。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "刪除中..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
