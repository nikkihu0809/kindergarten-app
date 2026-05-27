import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Pencil, Trash2, Camera, X, Clock, MapPin, User, MessageSquare, Calendar, Download } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const WOUND_TYPES = [
  { value: "bite", label: "咬傷" },
  { value: "bump", label: "撞傷" },
  { value: "scrape", label: "擦傷" },
  { value: "other", label: "其他" },
];

const TRACKING_STATUSES = [
  { value: "觀察中", label: "觀察中", color: "bg-amber-100 text-amber-700" },
  { value: "已處理", label: "已處理", color: "bg-blue-100 text-blue-700" },
  { value: "已痊癒", label: "已痊癒", color: "bg-emerald-100 text-emerald-700" },
];

function getTrackingStatusStyle(status: string) {
  const found = TRACKING_STATUSES.find(s => s.value === status);
  return found ? found.color : "bg-gray-100 text-gray-700";
}

function getWoundLabel(value: string): string {
  const found = WOUND_TYPES.find(w => w.value === value);
  return found ? found.label : value || "-";
}

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
    options.push({ value, label });
  }
  return options;
}

async function exportIncidentExcel(
  yearMonth: string,
  data: Array<{
    id: number; date: string; className: string; studentName: string;
    description: string; woundType?: string; time: string; location: string;
    parentResponse: string; handler: string; trackingStatus?: string; photoUrls: string | null;
  }>,
  fetchPhotoFn: (url: string) => Promise<{ base64: string | null; extension: string | null }>
) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: 意外傷害記錄
  const ws1 = workbook.addWorksheet("意外傷害記錄");
  ws1.columns = [
    { header: "日期", key: "date", width: 12 },
    { header: "班級", key: "className", width: 8 },
    { header: "姓名", key: "studentName", width: 12 },
    { header: "傷口描述", key: "woundType", width: 10 },
    { header: "發生時間", key: "time", width: 10 },
    { header: "發生地點", key: "location", width: 12 },
    { header: "發生情況", key: "description", width: 30 },
    { header: "處理人", key: "handler", width: 10 },
    { header: "家長回覆", key: "parentResponse", width: 20 },
    { header: "追蹤狀態", key: "trackingStatus", width: 10 },
    { header: "照片", key: "photo", width: 20 },
  ];

  // Style header row
  const headerRow = ws1.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Sort data
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date) || a.className.localeCompare(b.className));

  for (let i = 0; i < sortedData.length; i++) {
    const inc = sortedData[i];
    const rowIndex = i + 2; // row 1 is header
    let photoUrls: string[] = [];
    try { photoUrls = inc.photoUrls ? JSON.parse(inc.photoUrls) : []; } catch { photoUrls = []; }

    ws1.addRow({
      date: inc.date,
      className: inc.className,
      studentName: inc.studentName,
      woundType: getWoundLabel(inc.woundType || ""),
      time: inc.time || "-",
      location: inc.location || "-",
      description: inc.description,
      handler: inc.handler || "-",
      parentResponse: inc.parentResponse || "-",
      trackingStatus: (inc as any).trackingStatus || "觀察中",
      photo: photoUrls.length > 0 ? `${photoUrls.length} 張` : "",
    });

    // Embed photos
    if (photoUrls.length > 0) {
      const ROW_HEIGHT = 80; // pixels per photo row
      ws1.getRow(rowIndex).height = ROW_HEIGHT * 0.75; // Excel row height is in points (1pt = 0.75px approx)

      for (let j = 0; j < photoUrls.length && j < 3; j++) {
        const imgData = await fetchPhotoFn(photoUrls[j]);
        if (imgData && imgData.base64 && imgData.extension) {
          const imageId = workbook.addImage({
            base64: imgData.base64,
            extension: imgData.extension as "png" | "jpeg",
          });
          // Place image in the photo column (col index 10 = column K)
          ws1.addImage(imageId, {
            tl: { col: 10 + j * 0.9, row: rowIndex - 1 + 0.05 },
            br: { col: 10 + j * 0.9 + 0.85, row: rowIndex - 0.05 },
          } as any);
        }
      }

      // Widen photo column if multiple photos
      if (photoUrls.length > 1) {
        const photoCol = ws1.getColumn(11);
        photoCol.width = Math.max(20, photoUrls.length * 15);
      }
    }

    // Set row alignment
    ws1.getRow(rowIndex).alignment = { vertical: "middle", wrapText: true };
  }

  // Sheet 2: 班級統計
  const ws2 = workbook.addWorksheet("班級統計");
  ws2.columns = [
    { header: "班級", key: "className", width: 8 },
    { header: "事件數", key: "count", width: 10 },
    { header: "涉及幼生數", key: "studentCount", width: 12 },
  ];
  const statsHeaderRow = ws2.getRow(1);
  statsHeaderRow.font = { bold: true };
  statsHeaderRow.alignment = { vertical: "middle", horizontal: "center" };

  const classStats: Record<string, { count: number; students: Set<string> }> = {};
  data.forEach((inc) => {
    if (!classStats[inc.className]) classStats[inc.className] = { count: 0, students: new Set() };
    classStats[inc.className].count++;
    classStats[inc.className].students.add(inc.studentName);
  });
  Object.entries(classStats).sort(([a], [b]) => a.localeCompare(b)).forEach(([className, stat]) => {
    ws2.addRow({ className, count: stat.count, studentCount: stat.students.size });
  });

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `意外傷害報表_${yearMonth}.xlsx`);
}

export default function IncidentPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [formDate, setFormDate] = useState(getToday);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [woundType, setWoundType] = useState("");
  const [woundTypeOther, setWoundTypeOther] = useState("");
  const [incidentTime, setIncidentTime] = useState(getNow);
  const [location, setLocation] = useState("");
  const [parentResponse, setParentResponse] = useState("");
  const [handler, setHandler] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("觀察中");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: students = [] } = trpc.student.list.useQuery();
  const { data: teachers = [] } = trpc.teacher.list.useQuery();

  // Monthly data
  const [mYear, mMonth] = yearMonth.split("-").map(Number);
  const monthStartDate = `${yearMonth}-01`;
  const monthLastDay = new Date(mYear, mMonth, 0).getDate();
  const monthEndDate = `${yearMonth}-${String(monthLastDay).padStart(2, "0")}`;
  const { data: monthlyIncidents = [], isLoading } = trpc.incident.list.useQuery(
    { startDate: monthStartDate, endDate: monthEndDate }
  );

  const monthlyByClass = useMemo(() => {
    const groups: Record<string, typeof monthlyIncidents> = {};
    monthlyIncidents.forEach((inc) => {
      if (!groups[inc.className]) groups[inc.className] = [];
      groups[inc.className].push(inc);
    });
    return groups;
  }, [monthlyIncidents]);

  // 取得所有班級列表
  const classNames = useMemo(() => {
    const classes = new Set(students.map(s => s.className));
    return Array.from(classes).sort();
  }, [students]);

  // 根據選擇的班級篩選幼生
  const filteredStudents = useMemo(() => {
    if (!selectedClassName) return [];
    return students
      .filter(s => s.className === selectedClassName)
      .sort((a, b) => (a.birthday || "9999").localeCompare(b.birthday || "9999"));
  }, [students, selectedClassName]);

  const addMut = trpc.incident.add.useMutation({
    onSuccess: () => {
      toast.success("意外傷害記錄已新增");
      utils.incident.list.invalidate();
      resetForm();
      setShowAddDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.incident.update.useMutation({
    onSuccess: () => {
      toast.success("意外傷害記錄已更新");
      utils.incident.list.invalidate();
      resetForm();
      setShowEditDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.incident.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除記錄");
      utils.incident.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadPhotoMut = trpc.incident.uploadPhoto.useMutation();
  const fetchPhotoMut = trpc.incident.fetchPhotoBase64.useMutation();

  const fetchPhotoBase64 = async (url: string) => {
    try {
      const result = await fetchPhotoMut.mutateAsync({ url });
      return { base64: result.base64, extension: result.extension };
    } catch {
      return { base64: null, extension: null };
    }
  };

  const resetForm = () => {
    setFormDate(getToday());
    setSelectedClassName("");
    setSelectedStudentId(null);
    setDescription("");
    setWoundType("");
    setWoundTypeOther("");
    setIncidentTime(getNow());
    setLocation("");
    setParentResponse("");
    setHandler("");
    setTrackingStatus("觀察中");
    setPhotoUrls([]);
    setEditingId(null);
  };

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} 超過 5MB 限制`);
          continue;
        }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
        const { url } = await uploadPhotoMut.mutateAsync({
          base64, mimeType: file.type, fileName: file.name,
        });
        setPhotoUrls((prev) => [...prev, url]);
      }
      toast.success("照片上傳成功");
    } catch (err: any) {
      toast.error("照片上傳失敗：" + (err.message || "未知錯誤"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const getWoundTypeValue = () => {
    if (woundType === "other") return woundTypeOther || "其他";
    return woundType;
  };

  const handleAdd = () => {
    if (!selectedStudentId || !selectedStudent) {
      toast.error("請選擇幼生");
      return;
    }
    if (!description) {
      toast.error("請填寫發生情況");
      return;
    }
    addMut.mutate({
      date: formDate,
      className: selectedStudent.className,
      studentId: selectedStudentId,
      studentName: selectedStudent.name,
      description,
      woundType: getWoundTypeValue(),
      time: incidentTime,
      location,
      parentResponse,
      handler,
      trackingStatus,
      photoUrls: photoUrls.length > 0 ? JSON.stringify(photoUrls) : undefined,
    });
  };

  const handleEdit = () => {
    if (!editingId) return;
    updateMut.mutate({
      id: editingId,
      description,
      woundType: getWoundTypeValue(),
      time: incidentTime,
      location,
      parentResponse,
      handler,
      trackingStatus,
      photoUrls: photoUrls.length > 0 ? JSON.stringify(photoUrls) : undefined,
    });
  };

  const openEditDialog = (incident: typeof monthlyIncidents[0]) => {
    setEditingId(incident.id);
    setSelectedStudentId(incident.studentId);
    const student = students.find(s => s.id === incident.studentId);
    setSelectedClassName(student?.className || incident.className);
    setDescription(incident.description);
    const knownTypes = WOUND_TYPES.map(w => w.value);
    if (knownTypes.includes(incident.woundType)) {
      setWoundType(incident.woundType);
      setWoundTypeOther("");
    } else if (incident.woundType) {
      setWoundType("other");
      setWoundTypeOther(incident.woundType);
    } else {
      setWoundType("");
      setWoundTypeOther("");
    }
    setFormDate(incident.date);
    setIncidentTime(incident.time || getNow());
    setLocation(incident.location);
    setParentResponse(incident.parentResponse);
    setHandler(incident.handler);
    setTrackingStatus((incident as any).trackingStatus || "觀察中");
    try {
      setPhotoUrls(incident.photoUrls ? JSON.parse(incident.photoUrls) : []);
    } catch {
      setPhotoUrls([]);
    }
    setShowEditDialog(true);
  };

  const handleExportMonthly = async () => {
    if (!monthlyIncidents || monthlyIncidents.length === 0) {
      toast.warning("本月無意外傷害記錄");
      return;
    }
    try {
      await exportIncidentExcel(yearMonth, monthlyIncidents, fetchPhotoBase64);
      toast.success("意外傷害報表已匯出");
    } catch {
      toast.error("匯出失敗，請重試");
    }
  };

  const monthLabel = `${mYear} 年 ${mMonth} 月`;

  const formContent = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="formDate">
          <Calendar className="h-4 w-4 inline mr-1" />
          日期
        </Label>
        <Input id="formDate" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={isEdit} />
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>班級</Label>
            <Select value={selectedClassName} onValueChange={(v) => { setSelectedClassName(v); setSelectedStudentId(null); }}>
              <SelectTrigger><SelectValue placeholder="選擇班級..." /></SelectTrigger>
              <SelectContent>
                {classNames.map((cls) => (<SelectItem key={cls} value={cls}>{cls}班</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>幼生姓名</Label>
            <Select value={selectedStudentId ? String(selectedStudentId) : ""} onValueChange={(v) => setSelectedStudentId(Number(v))} disabled={!selectedClassName}>
              <SelectTrigger><SelectValue placeholder={selectedClassName ? "選擇幼生..." : "請先選擇班級"} /></SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isEdit && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium">
            {students.find(s => s.id === selectedStudentId)?.className || ""}班 - {students.find(s => s.id === selectedStudentId)?.name || ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="incidentTime"><Clock className="h-4 w-4 inline mr-1" />發生時間</Label>
          <Input id="incidentTime" type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location"><MapPin className="h-4 w-4 inline mr-1" />發生地點</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如：教室、操場" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>傷口描述</Label>
        <Select value={woundType} onValueChange={(v) => { setWoundType(v); if (v !== "other") setWoundTypeOther(""); }}>
          <SelectTrigger><SelectValue placeholder="選擇傷口類型..." /></SelectTrigger>
          <SelectContent>
            {WOUND_TYPES.map((w) => (<SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {woundType === "other" && (
          <Input value={woundTypeOther} onChange={(e) => setWoundTypeOther(e.target.value)} placeholder="請填寫傷口描述..." className="mt-2" />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">發生情況</Label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="請描述意外傷害的發生情況..."
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handler"><User className="h-4 w-4 inline mr-1" />處理人</Label>
        <Select value={handler} onValueChange={setHandler}>
          <SelectTrigger><SelectValue placeholder="選擇處理人..." /></SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}（{t.title}）</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentResponse"><MessageSquare className="h-4 w-4 inline mr-1" />家長回覆</Label>
        <textarea id="parentResponse" value={parentResponse} onChange={(e) => setParentResponse(e.target.value)} placeholder="家長回覆內容..."
          className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      <div className="space-y-2">
        <Label>追蹤狀態</Label>
        <Select value={trackingStatus} onValueChange={setTrackingStatus}>
          <SelectTrigger><SelectValue placeholder="選擇追蹤狀態..." /></SelectTrigger>
          <SelectContent>
            {TRACKING_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label><Camera className="h-4 w-4 inline mr-1" />照片上傳</Label>
        <div className="flex flex-wrap gap-2">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="relative group">
              <img src={url} alt={`照片 ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
              <button type="button" onClick={() => removePhoto(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Camera className="h-5 w-5" />
            <span className="text-xs mt-1">{uploading ? "上傳中" : "新增"}</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            意外傷害記錄
          </h1>
          <p className="text-muted-foreground mt-1">記錄與管理意外傷害事件</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMonthly} disabled={isLoading}>
            <Download className="h-4 w-4 mr-1" />
            匯出 Excel
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            新增記錄
          </Button>
        </div>
      </div>

      {/* Month Selector + Stats */}
      <div className="flex items-center gap-3">
        <Select value={yearMonth} onValueChange={setYearMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">月份</p>
            <p className="text-lg font-semibold text-foreground">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">事件總數</p>
            <p className="text-lg font-semibold text-red-600">{monthlyIncidents.length} 件</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">涉及班級</p>
            <p className="text-lg font-semibold text-primary">{Object.keys(monthlyByClass).length} 班</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">已回覆家長</p>
            <p className="text-lg font-semibold text-emerald-600">
              {monthlyIncidents.filter((i) => i.parentResponse).length} / {monthlyIncidents.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incident List by Class */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">載入中...</CardContent>
        </Card>
      ) : monthlyIncidents.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">本月尚無意外傷害記錄</CardContent>
        </Card>
      ) : (
        Object.entries(monthlyByClass)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([className, classIncidents]) => (
            <Card key={className} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  {className}班（{classIncidents.length} 件）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">日期</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">姓名</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">傷口描述</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">時間</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">地點</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">情況</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">處理人</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">家長回覆</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">追蹤狀態</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">照片</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classIncidents.map((inc) => (
                        <tr key={inc.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{inc.date}</td>
                          <td className="py-2 px-3 font-medium whitespace-nowrap">{inc.studentName}</td>
                          <td className="py-2 px-3 text-xs whitespace-nowrap">
                            {inc.woundType ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                {getWoundLabel(inc.woundType)}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{inc.time || "-"}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{inc.location || "-"}</td>
                          <td className="py-2 px-3 text-xs max-w-[200px] truncate">{inc.description}</td>
                          <td className="py-2 px-3 text-xs whitespace-nowrap">{inc.handler || "-"}</td>
                          <td className="py-2 px-3 text-xs max-w-[150px] truncate">
                            {inc.parentResponse ? (
                              <span className="text-emerald-600">{inc.parentResponse}</span>
                            ) : (
                              <span className="text-red-500">未回覆</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTrackingStatusStyle((inc as any).trackingStatus || "觀察中")}`}>
                              {(inc as any).trackingStatus || "觀察中"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {(() => {
                              let urls: string[] = [];
                              try { urls = inc.photoUrls ? JSON.parse(inc.photoUrls) : []; } catch { urls = []; }
                              return urls.length > 0 ? (
                                <div className="flex gap-1 flex-wrap">
                                  {urls.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                      <img src={url} alt={`照片${idx + 1}`} className="w-10 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(inc)}>
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                if (confirm("確定要刪除此記錄嗎？")) deleteMut.mutate({ id: inc.id });
                              }}>
                                <Trash2 className="h-3 w-3 text-red-500" />
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
          ))
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              新增意外傷害記錄
            </DialogTitle>
          </DialogHeader>
          {formContent(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>取消</Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowEditDialog(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              編輯意外傷害記錄
            </DialogTitle>
          </DialogHeader>
          {formContent(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowEditDialog(false); }}>取消</Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
