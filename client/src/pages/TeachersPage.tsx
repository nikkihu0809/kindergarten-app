import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Upload, Plus, Trash2, FileSpreadsheet, Pencil } from "lucide-react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type EditingTeacher = {
  id: number;
  name: string;
  title: string;
  phone: string;
  idNumber: string;
  birthday: string;
  hireDate: string;
};

export default function TeachersPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [editing, setEditing] = useState<EditingTeacher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const canManage = user?.role === "supervisor" || user?.role === "admin";

  const utils = trpc.useUtils();
  const { data: teachers = [], isLoading } = trpc.teacher.list.useQuery();

  const addMut = trpc.teacher.add.useMutation({
    onSuccess: () => {
      toast.success("已新增老師");
      utils.teacher.list.invalidate();
      setShowAddDialog(false);
      setName(""); setTitle(""); setPhone(""); setIdNumber(""); setBirthday(""); setHireDate("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.teacher.update.useMutation({
    onSuccess: () => {
      toast.success("已更新老師資料");
      utils.teacher.list.invalidate();
      setShowEditDialog(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkMut = trpc.teacher.bulkUpload.useMutation({
    onSuccess: (data) => {
      toast.success(`已匯入 ${data.count} 位老師`);
      utils.teacher.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.teacher.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); utils.teacher.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const formatExcelDate = (val: any): string => {
    if (!val) return "";
    // Handle Excel serial date numbers
    if (typeof val === "number") {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    const s = String(val).trim();
    // Handle datetime strings like "1981-08-09 00:00:00"
    if (s.includes(" ")) return s.split(" ")[0];
    // Handle ROC date format like "114/8/1"
    const rocMatch = s.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
    if (rocMatch) {
      const year = parseInt(rocMatch[1]) + 1911;
      const month = rocMatch[2].padStart(2, "0");
      const day = rocMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return s;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
      const parsed = rows.map((row) => ({
        name: String(row["姓名"] || row["name"] || "").trim(),
        title: String(row["職稱"] || row["title"] || "").trim(),
        phone: String(row["聯絡電話"] || row["phone"] || "").trim(),
        idNumber: String(row["身分證字號"] || row["idNumber"] || "").trim(),
        birthday: formatExcelDate(row["出生日期"] || row["birthday"] || ""),
        hireDate: formatExcelDate(row["到職日期"] || row["hireDate"] || ""),
      })).filter(r => r.name);

      if (parsed.length === 0) {
        toast.error("Excel 中未找到有效資料，請確認欄位名稱");
        return;
      }
      bulkMut.mutate({ teachers: parsed });
    } catch (err: any) {
      toast.error("讀取 Excel 失敗：" + (err.message || "未知錯誤"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAdd = () => {
    if (!name) { toast.error("姓名為必填"); return; }
    addMut.mutate({ name, title, phone, idNumber, birthday, hireDate });
  };

  const handleEdit = (teacher: any) => {
    setEditing({
      id: teacher.id,
      name: teacher.name,
      title: teacher.title || "",
      phone: teacher.phone || "",
      idNumber: teacher.idNumber || "",
      birthday: teacher.birthday || "",
      hireDate: teacher.hireDate || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editing) return;
    if (!editing.name) { toast.error("姓名為必填"); return; }
    updateMut.mutate({
      id: editing.id,
      name: editing.name,
      title: editing.title,
      phone: editing.phone,
      idNumber: editing.idNumber,
      birthday: editing.birthday,
      hireDate: editing.hireDate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">老師名單管理</h1>
          <p className="text-muted-foreground mt-1">共 {teachers.length} 位老師</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              匯入 Excel
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增老師
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        )}
      </div>

      {/* Upload Hint */}
      {canManage && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-sm font-medium">Excel 匯入格式</p>
                <p className="text-xs text-muted-foreground">
                  欄位名稱：<strong>姓名</strong>、<strong>職稱</strong>、<strong>身分證字號</strong>、<strong>出生日期</strong>、<strong>到職日期</strong>、<strong>聯絡電話</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  注意：匯入將會取代現有所有名單資料
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teachers List */}
      {teachers.length === 0 && !isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">尚無老師資料，請匯入 Excel 或手動新增</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              老師列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">姓名</th>
                    <th className="text-left py-2 px-2 font-medium">職稱</th>
                    <th className="text-left py-2 px-2 font-medium">身分證字號</th>
                    <th className="text-left py-2 px-2 font-medium">出生日期</th>
                    <th className="text-left py-2 px-2 font-medium">到職日期</th>
                    <th className="text-left py-2 px-2 font-medium">聯絡電話</th>
                    {canManage && <th className="text-right py-2 px-2 font-medium w-24">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">{t.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{t.title || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-xs">{(t as any).idNumber || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{(t as any).birthday || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{(t as any).hireDate || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{t.phone || "-"}</td>
                      {canManage && (
                        <td className="py-2 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                              <Pencil className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate({ id: t.id })}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增老師</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="老師姓名" />
              </div>
              <div className="space-y-2">
                <Label>職稱</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：托育人員" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>身分證字號</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="例如：A123456789" />
              </div>
              <div className="space-y-2">
                <Label>聯絡電話</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="例如：0912-345678" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>出生日期</Label>
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>到職日期</Label>
                <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改老師資料</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>姓名 *</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="老師姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>職稱</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="例如：托育人員"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>身分證字號</Label>
                  <Input
                    value={editing.idNumber}
                    onChange={(e) => setEditing({ ...editing, idNumber: e.target.value })}
                    placeholder="例如：A123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>聯絡電話</Label>
                  <Input
                    value={editing.phone}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    placeholder="例如：0912-345678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>出生日期</Label>
                  <Input
                    type="date"
                    value={editing.birthday}
                    onChange={(e) => setEditing({ ...editing, birthday: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>到職日期</Label>
                  <Input
                    type="date"
                    value={editing.hireDate}
                    onChange={(e) => setEditing({ ...editing, hireDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditing(null); }}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
