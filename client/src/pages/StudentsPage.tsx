import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, Upload, Plus, Trash2, FileSpreadsheet, AlertCircle, Pencil, ExternalLink, UserX } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";

// 欄位名稱別名對照表，支援多種 Excel 格式（全部小寫比對）
const FIELD_ALIASES: Record<string, string[]> = {
  className: ["班級", "班別", "class", "classname", "班名"],
  name: ["姓名", "幼生姓名", "學生姓名", "name", "名字", "幼兒姓名"],
  birthday: ["出生日期", "生日", "birthday", "出生年月日", "生日日期"],
  fatherName: ["父親名", "父親姓名", "爸爸姓名", "父姓名", "fathername", "父親"],
  fatherPhone: ["父親電話", "爸爸電話", "父電話", "fatherphone", "父親手機"],
  motherName: ["母親名", "母親姓名", "媽媽姓名", "母姓名", "mothername", "母親"],
  motherPhone: ["母親電話", "媽媽電話", "母電話", "motherphone", "母親手機"],
  enrollmentDate: ["入托日期", "入學日期", "enrollmentdate", "enrollment", "入園日期"],
  withdrawalDate: ["離托日期", "退學日期", "withdrawaldate", "withdrawal", "離園日期"],
  notes: ["備註", "note", "notes", "remark", "remarks", "說明", "特殊事項"],
};

// 建立 header 名稱到欄位 key 的映射
function buildHeaderMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const trimmed = header.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    for (const [fieldKey, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => a.toLowerCase() === lower || a === trimmed)) {
        mapping[trimmed] = fieldKey;
        break;
      }
    }
  }
  return mapping;
}

function formatCellValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") return String(val);
  return String(val).trim();
}

type TabType = "active" | "withdrawn";

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<Array<{
    className: string; name: string; birthday: string;
    fatherName: string; fatherPhone: string; motherName: string; motherPhone: string;
    enrollmentDate: string; withdrawalDate: string; notes: string;
  }>>([]);
  const [className, setClassName] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [withdrawalDate, setWithdrawalDate] = useState("");
  const [notes, setNotes] = useState("");

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editName, setEditName] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editFatherPhone, setEditFatherPhone] = useState("");
  const [editMotherName, setEditMotherName] = useState("");
  const [editMotherPhone, setEditMotherPhone] = useState("");
  const [editEnrollmentDate, setEditEnrollmentDate] = useState("");
  const [editWithdrawalDate, setEditWithdrawalDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: students = [], isLoading } = trpc.student.list.useQuery();

  // 分離在托與離托幼生
  const activeStudents = useMemo(() => students.filter(s => !(s as any).withdrawalDate), [students]);
  const withdrawnStudents = useMemo(() => students.filter(s => !!(s as any).withdrawalDate), [students]);
  const displayStudents = activeTab === "active" ? activeStudents : withdrawnStudents;

  const addMut = trpc.student.add.useMutation({
    onSuccess: () => {
      toast.success("已新增幼生");
      utils.student.list.invalidate();
      setShowAddDialog(false);
      setClassName(""); setName(""); setBirthday(""); setFatherName(""); setFatherPhone(""); setMotherName(""); setMotherPhone(""); setEnrollmentDate(""); setWithdrawalDate(""); setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkMut = trpc.student.bulkUpload.useMutation({
    onSuccess: (data) => {
      toast.success(`已成功匯入 ${data.count} 位幼生`);
      utils.student.list.invalidate();
      setShowPreviewDialog(false);
      setPreviewData([]);
    },
    onError: (e) => toast.error("匯入失敗：" + e.message),
  });

  const updateMut = trpc.student.update.useMutation({
    onSuccess: () => {
      toast.success("已更新幼生資料");
      utils.student.list.invalidate();
      setShowEditDialog(false);
    },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });

  const deleteMut = trpc.student.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); utils.student.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleOpenEdit = (s: typeof students[number]) => {
    setEditId(s.id);
    setEditClassName(s.className);
    setEditName(s.name);
    setEditBirthday(s.birthday || "");
    setEditFatherName(s.fatherName || "");
    setEditFatherPhone(s.fatherPhone || "");
    setEditMotherName(s.motherName || "");
    setEditMotherPhone(s.motherPhone || "");
    setEditEnrollmentDate(s.enrollmentDate || "");
    setEditWithdrawalDate((s as any).withdrawalDate || "");
    setEditNotes(s.notes || "");
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (editId === null) return;
    if (!editClassName || !editName) { toast.error("班級和姓名為必填"); return; }
    updateMut.mutate({
      id: editId,
      className: editClassName,
      name: editName,
      birthday: editBirthday,
      fatherName: editFatherName,
      fatherPhone: editFatherPhone,
      motherName: editMotherName,
      motherPhone: editMotherPhone,
      enrollmentDate: editEnrollmentDate,
      withdrawalDate: editWithdrawalDate,
      notes: editNotes,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info(`正在讀取檔案：${file.name}...`);

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { cellDates: true, type: "array" });

      if (!wb.SheetNames.length) {
        toast.error("Excel 檔案中沒有工作表");
        return;
      }

      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) {
        toast.error("無法讀取工作表");
        return;
      }

      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false, dateNF: "yyyy-mm-dd" });

      if (rawRows.length < 2) {
        toast.error("Excel 檔案至少需要包含標題列和一列資料");
        return;
      }

      let headerRowIdx = 0;
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
          headerRowIdx = i;
          break;
        }
      }

      const headerRow = rawRows[headerRowIdx].map(h => String(h ?? "").trim());
      const headerMapping = buildHeaderMapping(headerRow);

      const mappedFields = Object.values(headerMapping);
      if (!mappedFields.includes("className") || !mappedFields.includes("name")) {
        toast.error(
          `找不到必要欄位。偵測到的標題：「${headerRow.filter(h => h).join("」、「")}」。` +
          `\n請確認 Excel 包含「班級」或「班別」欄位，以及「姓名」或「幼生姓名」欄位。`
        );
        return;
      }

      const parsed: Array<{
        className: string; name: string; birthday: string;
        fatherName: string; fatherPhone: string; motherName: string; motherPhone: string;
        enrollmentDate: string; withdrawalDate: string; notes: string;
      }> = [];

      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === "")) {
          continue;
        }

        const record: Record<string, string> = {
          className: "", name: "", birthday: "",
          fatherName: "", fatherPhone: "", motherName: "", motherPhone: "",
          enrollmentDate: "", withdrawalDate: "", notes: "",
        };

        for (let j = 0; j < headerRow.length; j++) {
          const header = headerRow[j];
          const fieldKey = headerMapping[header];
          if (fieldKey && row[j] !== undefined) {
            record[fieldKey] = formatCellValue(row[j]);
          }
        }

        if (record.className && record.name) {
          parsed.push({
            className: record.className,
            name: record.name,
            birthday: record.birthday || "",
            fatherName: record.fatherName || "",
            fatherPhone: record.fatherPhone || "",
            motherName: record.motherName || "",
            motherPhone: record.motherPhone || "",
            enrollmentDate: record.enrollmentDate || "",
            withdrawalDate: record.withdrawalDate || "",
            notes: record.notes || "",
          });
        }
      }

      if (parsed.length === 0) {
        toast.error("Excel 中未找到有效資料。請確認至少包含「班級/班別」和「姓名/幼生姓名」欄位，且有資料列。");
        return;
      }

      setPreviewData(parsed);
      setShowPreviewDialog(true);

      const classGroups = parsed.reduce<Record<string, number>>((acc, s) => {
        acc[s.className] = (acc[s.className] || 0) + 1;
        return acc;
      }, {});
      const classInfo = Object.entries(classGroups).map(([c, n]) => `${c}班 ${n}人`).join("、");
      toast.success(`成功解析 ${parsed.length} 位幼生（${classInfo}），請確認後匯入`);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "未知錯誤";
      console.error("Excel 讀取錯誤:", err);
      toast.error("讀取 Excel 失敗：" + msg);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    toast.info(`正在匯入 ${previewData.length} 位幼生...`);
    bulkMut.mutate({ students: previewData });
  };

  const handleAdd = () => {
    if (!className || !name) { toast.error("班級和姓名為必填"); return; }
    addMut.mutate({ className, name, birthday, fatherName, fatherPhone, motherName, motherPhone, enrollmentDate, withdrawalDate, notes });
  };

  // Group by class
  const grouped = displayStudents.reduce<Record<string, typeof students>>((acc, s) => {
    if (!acc[s.className]) acc[s.className] = [];
    acc[s.className].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">幼生名單管理</h1>
          <p className="text-muted-foreground mt-1">在托 {activeStudents.length} 位 / 離托 {withdrawnStudents.length} 位</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkMut.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {bulkMut.isPending ? "匯入中..." : "匯入 Excel"}
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增幼生
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("active")}
        >
          <GraduationCap className="h-4 w-4 mr-1.5" />
          在托幼生 ({activeStudents.length})
        </Button>
        <Button
          variant={activeTab === "withdrawn" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("withdrawn")}
        >
          <UserX className="h-4 w-4 mr-1.5" />
          離托幼生 ({withdrawnStudents.length})
        </Button>
      </div>

      {/* Upload Hint */}
      {activeTab === "active" && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-sm font-medium">Excel 匯入格式</p>
                <p className="text-xs text-muted-foreground">
                  必要欄位：<strong>班級（或班別）</strong>、<strong>姓名（或幼生姓名）</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  選填欄位：出生日期、入托日期、離托日期、父親名、父親電話、母親名、母親電話、備註
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  匯入將會取代現有所有名單資料
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students by Class */}
      {Object.keys(grouped).length === 0 && !isLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            {activeTab === "active" ? (
              <>
                <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">尚無在托幼生資料，請匯入 Excel 或手動新增</p>
              </>
            ) : (
              <>
                <UserX className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">目前沒有離托幼生</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cls, studs]) => (
        <Card key={cls} className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {activeTab === "active" ? (
                <GraduationCap className="h-4 w-4 text-primary" />
              ) : (
                <UserX className="h-4 w-4 text-muted-foreground" />
              )}
              {cls}班 ({studs.length} 人)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">姓名</th>
                    <th className="text-left py-2 px-2 font-medium">出生日期</th>
                    <th className="text-left py-2 px-2 font-medium">入托日期</th>
                    <th className="text-left py-2 px-2 font-medium">離托日期</th>
                    <th className="text-left py-2 px-2 font-medium">父親</th>
                    <th className="text-left py-2 px-2 font-medium">父親電話</th>
                    <th className="text-left py-2 px-2 font-medium">母親</th>
                    <th className="text-left py-2 px-2 font-medium">母親電話</th>
                    <th className="text-left py-2 px-2 font-medium">備註</th>
                    <th className="text-right py-2 px-2 font-medium w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {studs.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium">
                        <Link href={`/student/${s.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                          {s.name}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{s.birthday || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.enrollmentDate || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{(s as any).withdrawalDate || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.fatherName || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.fatherPhone || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.motherName || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.motherPhone || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{s.notes || "-"}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(s)} title="修改">
                            <Pencil className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate({ id: s.id })} title="刪除">
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
      ))}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增幼生</DialogTitle>
            <DialogDescription>手動輸入幼生資料</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>班級 *</Label>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="例如：A" />
              </div>
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="幼生姓名" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>出生日期</Label>
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>入托日期</Label>
                <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>離托日期</Label>
                <Input type="date" value={withdrawalDate} onChange={(e) => setWithdrawalDate(e.target.value)} />
              </div>
              <div className="space-y-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>父親姓名</Label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="選填" />
              </div>
              <div className="space-y-2">
                <Label>父親電話</Label>
                <Input value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>母親姓名</Label>
                <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} placeholder="選填" />
              </div>
              <div className="space-y-2">
                <Label>母親電話</Label>
                <Input value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：過敏、特殊需求等" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Import Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>確認匯入資料</DialogTitle>
            <DialogDescription>
              共偵測到 {previewData.length} 位幼生，匯入後將取代現有所有名單。請確認資料正確後再點擊匯入。
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">班級</th>
                  <th className="text-left py-2 px-3 font-medium">姓名</th>
                  <th className="text-left py-2 px-3 font-medium">出生日期</th>
                  <th className="text-left py-2 px-3 font-medium">入托日期</th>
                  <th className="text-left py-2 px-3 font-medium">離托日期</th>
                  <th className="text-left py-2 px-3 font-medium">父親</th>
                  <th className="text-left py-2 px-3 font-medium">母親</th>
                  <th className="text-left py-2 px-3 font-medium">備註</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 px-3">{s.className}</td>
                    <td className="py-1.5 px-3 font-medium">{s.name}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.birthday || "-"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.enrollmentDate || "-"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.withdrawalDate || "-"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.fatherName || "-"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.motherName || "-"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{s.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPreviewDialog(false); setPreviewData([]); }}>取消</Button>
            <Button onClick={handleConfirmImport} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? "匯入中..." : `確認匯入 ${previewData.length} 位幼生`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>修改幼生資料</DialogTitle>
            <DialogDescription>編輯幼生的基本資料</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>班級 *</Label>
                <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} placeholder="例如：A" />
              </div>
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="幼生姓名" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>出生日期</Label>
                <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>入托日期</Label>
                <Input type="date" value={editEnrollmentDate} onChange={(e) => setEditEnrollmentDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>離托日期</Label>
                <Input type="date" value={editWithdrawalDate} onChange={(e) => setEditWithdrawalDate(e.target.value)} />
              </div>
              <div className="space-y-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>父親姓名</Label>
                <Input value={editFatherName} onChange={(e) => setEditFatherName(e.target.value)} placeholder="選填" />
              </div>
              <div className="space-y-2">
                <Label>父親電話</Label>
                <Input value={editFatherPhone} onChange={(e) => setEditFatherPhone(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>母親姓名</Label>
                <Input value={editMotherName} onChange={(e) => setEditMotherName(e.target.value)} placeholder="選填" />
              </div>
              <div className="space-y-2">
                <Label>母親電話</Label>
                <Input value={editMotherPhone} onChange={(e) => setEditMotherPhone(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="例如：過敏、特殊需求等" />
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
    </div>
  );
}
