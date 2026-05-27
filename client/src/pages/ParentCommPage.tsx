import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus, Trash2, Pencil, Save, AlertTriangle, CheckCircle2, Download, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getISOWeek(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekDateRange(weekNumber: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

function formatBirthday(birthday: string): string {
  if (!birthday) return "-";
  try {
    const d = new Date(birthday);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch { return birthday; }
}

function calculateAge(birthday: string): string {
  if (!birthday) return "-";
  try {
    const birth = new Date(birthday);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (now.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months += 12; } }
    return `${years}歲${months}月`;
  } catch { return "-"; }
}

function getWeekOptions() {
  const options: { value: number; label: string }[] = [];
  const now = new Date();
  const currentWeek = getISOWeek(now);
  for (let i = -4; i <= 4; i++) {
    const week = currentWeek + i;
    if (week >= 1 && week <= 53) {
      const range = getWeekDateRange(week);
      options.push({ value: week, label: `第 ${week} 週（${range}）${i === 0 ? " 本週" : ""}` });
    }
  }
  return options;
}

async function exportWeeklyCommExcel(
  weekNumber: number,
  data: {
    classGroups: Record<string, Array<{
      studentName: string; birthday: string; commCount: number;
      communications: Array<{ date: string; method: string; teacherShare: string; parentFeedback: string; }>;
    }>>;
  }
) {
  const XLSX = await import("xlsx");
  const summaryRows: Array<{ 班級: string; 姓名: string; 出生日期: string; 年齡: string; 溝通次數: number; 狀態: string; }> = [];
  Object.entries(data.classGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([className, students]) => {
    students.forEach((s) => {
      summaryRows.push({ 班級: className, 姓名: s.studentName, 出生日期: formatBirthday(s.birthday), 年齡: calculateAge(s.birthday), 溝通次數: s.commCount, 狀態: s.commCount > 0 ? "已溝通" : "未溝通" });
    });
  });
  const ws1 = XLSX.utils.json_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  const detailRows: Array<{ 班級: string; 姓名: string; 日期: string; 方式: string; 老師分享: string; 家長回饋: string; }> = [];
  Object.entries(data.classGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([className, students]) => {
    students.forEach((s) => {
      s.communications.forEach((c) => {
        detailRows.push({ 班級: className, 姓名: s.studentName, 日期: c.date, 方式: c.method === "interview" ? "面談" : "電訪", 老師分享: c.teacherShare, 家長回饋: c.parentFeedback });
      });
    });
  });
  const ws2 = XLSX.utils.json_to_sheet(detailRows);
  ws2["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "溝通統計");
  XLSX.utils.book_append_sheet(wb, ws2, "溝通記錄明細");
  XLSX.writeFile(wb, `家長溝通週報表_第${weekNumber}週.xlsx`);
}

export default function ParentCommPage() {
  const currentWeek = useMemo(() => getISOWeek(new Date()), []);
  const [weekNumber, setWeekNumber] = useState(currentWeek);
  const weekOptions = useMemo(() => getWeekOptions(), []);
  const dateRange = getWeekDateRange(weekNumber);

  // 計算本週起始日期（週一）用於篩選入托前幼生
  const weekStartDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [weekNumber]);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [date, setDate] = useState(getToday);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedClassForInput, setSelectedClassForInput] = useState<string>("");
  const [method, setMethod] = useState<"interview" | "phone">("phone");
  const [teacherShare, setTeacherShare] = useState("");
  const [parentFeedback, setParentFeedback] = useState("");

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState<"interview" | "phone">("phone");
  const [editTeacherShare, setEditTeacherShare] = useState("");
  const [editParentFeedback, setEditParentFeedback] = useState("");
  const [editStudentName, setEditStudentName] = useState("");

  const utils = trpc.useUtils();
  const { data: allStudents = [] } = trpc.student.list.useQuery();
  const { data: weeklyComm, isLoading } = trpc.report.weeklyParentComm.useQuery({ weekNumber });
  const { data: weeklyCheck } = trpc.parentComm.weeklyCheck.useQuery({ weekNumber, weekStartDate });

  // 排除離托幼生
  const students = useMemo(() => allStudents.filter(s => !(s as any).withdrawalDate), [allStudents]);

  const classList = useMemo(() => {
    const classes = Array.from(new Set(students.map(s => s.className).filter(Boolean)));
    return classes.sort();
  }, [students]);

  const filteredStudentsForInput = useMemo(() => {
    if (!selectedClassForInput) return [];
    return students
      .filter(s => s.className === selectedClassForInput)
      .sort((a, b) => (a.birthday || "9999").localeCompare(b.birthday || "9999"));
  }, [students, selectedClassForInput]);

  const addMut = trpc.parentComm.add.useMutation({
    onSuccess: () => {
      toast.success("溝通記錄已新增");
      utils.parentComm.weeklyCheck.invalidate({ weekNumber });
      utils.report.weeklyParentComm.invalidate({ weekNumber });
      setSelectedStudentId(null);
      setTeacherShare("");
      setParentFeedback("");
      setShowAddDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.parentComm.update.useMutation({
    onSuccess: () => {
      toast.success("溝通記錄已更新");
      utils.parentComm.weeklyCheck.invalidate({ weekNumber });
      utils.report.weeklyParentComm.invalidate({ weekNumber });
      setShowEditDialog(false);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.parentComm.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除");
      utils.parentComm.weeklyCheck.invalidate({ weekNumber });
      utils.report.weeklyParentComm.invalidate({ weekNumber });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!selectedStudentId) { toast.error("請選擇幼生"); return; }
    if (!teacherShare && !parentFeedback) { toast.error("請至少填寫老師分享或家長回饋"); return; }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    addMut.mutate({ weekNumber, date, studentId: selectedStudentId, studentName: student.name, method, teacherShare, parentFeedback });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateMut.mutate({
      id: editingId,
      date: editDate,
      method: editMethod,
      teacherShare: editTeacherShare,
      parentFeedback: editParentFeedback,
    });
  };

  const openEditDialog = (c: { id: number; date: string; method: string; teacherShare: string; parentFeedback: string }, studentName: string) => {
    setEditingId(c.id);
    setEditDate(c.date);
    setEditMethod(c.method as "interview" | "phone");
    setEditTeacherShare(c.teacherShare);
    setEditParentFeedback(c.parentFeedback);
    setEditStudentName(studentName);
    setShowEditDialog(true);
  };

  const handleExport = async () => {
    if (!weeklyComm) return;
    try {
      await exportWeeklyCommExcel(weekNumber, weeklyComm);
      toast.success("週報表已匯出");
    } catch { toast.error("匯出失敗，請重試"); }
  };

  const openAddDialog = () => {
    setDate(getToday());
    setSelectedClassForInput("");
    setSelectedStudentId(null);
    setMethod("phone");
    setTeacherShare("");
    setParentFeedback("");
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">家長溝通記錄</h1>
          <p className="text-muted-foreground mt-1">記錄面談與電訪的雙向溝通內容</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={isLoading || !weeklyComm}>
            <Download className="h-4 w-4 mr-1" />
            匯出 Excel
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            新增溝通
          </Button>
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(weekNumber)} onValueChange={(v) => setWeekNumber(Number(v))}>
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weekOptions.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {weekNumber !== currentWeek && (
          <Button variant="ghost" size="sm" onClick={() => setWeekNumber(currentWeek)}>本週</Button>
        )}
      </div>

      {/* Stats Cards */}
      {weeklyComm && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">週次</p>
              <p className="text-lg font-semibold text-foreground">第 {weekNumber} 週</p>
              <p className="text-sm text-primary font-medium mt-0.5">{dateRange}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">溝通總筆數</p>
              <p className="text-lg font-semibold text-primary">{weeklyComm.totalComms} 筆</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">已溝通幼生</p>
              <p className="text-lg font-semibold text-emerald-600">{weeklyComm.completedStudents} / {weeklyComm.totalStudents} 人</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">完成率</p>
              <p className="text-lg font-semibold text-foreground">
                {weeklyComm.totalStudents > 0 ? Math.round((weeklyComm.completedStudents / weeklyComm.totalStudents) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Check Status */}
      {weeklyCheck && weeklyCheck.missing.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50/50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium">
                尚有 {weeklyCheck.missing.length} 位幼生未完成溝通
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {weeklyCheck.missing.map((s) => (
                <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {s.className} - {s.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {weeklyCheck && weeklyCheck.missing.length === 0 && (
        <Card className="border-0 shadow-sm bg-green-50/50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                第 {weekNumber} 週所有幼生的家長溝通記錄已全部完成！
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Groups Table */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">載入中...</CardContent>
        </Card>
      ) : weeklyComm && Object.keys(weeklyComm.classGroups).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">尚無幼生名單資料</CardContent>
        </Card>
      ) : (
        weeklyComm && Object.entries(weeklyComm.classGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([className, classStudents]) => (
            <Card key={className} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {className}班（{classStudents.length} 人）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">姓名</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">出生日期</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">年齡</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">溝通次數</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">狀態</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">最近溝通</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s) => {
                        const lastComm = s.communications.length > 0 ? s.communications[s.communications.length - 1] : null;
                        return (
                          <tr key={s.studentId} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 px-3 font-medium">{s.studentName}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground text-xs">{formatBirthday(s.birthday)}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground text-xs">{calculateAge(s.birthday)}</td>
                            <td className="py-2 px-3 text-center font-medium">{s.commCount}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.commCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {s.commCount > 0 ? "已溝通" : "未溝通"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground text-xs">
                              {lastComm ? `${lastComm.date}（${lastComm.method === "interview" ? "面談" : "電訪"}）` : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Communication details inline */}
                {classStudents.some((s) => s.communications.length > 0) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">溝通記錄明細</p>
                    {classStudents.filter((s) => s.communications.length > 0).map((s) =>
                      s.communications.map((c) => (
                        <div key={c.id} className="bg-muted/30 rounded-lg p-3 text-xs space-y-1 group relative">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.studentName}</span>
                            <span className="text-muted-foreground">{c.date}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${c.method === "interview" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {c.method === "interview" ? "面談" : "電訪"}
                            </span>
                            <div className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openEditDialog(c, s.studentName)}
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  if (confirm("確定要刪除此溝通記錄？")) {
                                    deleteMut.mutate({ id: c.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {c.teacherShare && <p><span className="text-muted-foreground">老師分享：</span>{c.teacherShare}</p>}
                          {c.parentFeedback && <p><span className="text-muted-foreground">家長回饋：</span>{c.parentFeedback}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
      )}

      {/* Add Communication Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              新增溝通記錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>溝通方式</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as "interview" | "phone")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">電訪</SelectItem>
                    <SelectItem value="interview">面談</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>班級</Label>
                <Select value={selectedClassForInput} onValueChange={(v) => { setSelectedClassForInput(v); setSelectedStudentId(null); }}>
                  <SelectTrigger><SelectValue placeholder="請先選擇班級..." /></SelectTrigger>
                  <SelectContent>
                    {classList.map((cls) => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>幼生</Label>
                <Select value={selectedStudentId ? String(selectedStudentId) : ""} onValueChange={(v) => setSelectedStudentId(Number(v))} disabled={!selectedClassForInput}>
                  <SelectTrigger><SelectValue placeholder={selectedClassForInput ? "選擇幼生..." : "請先選擇班級"} /></SelectTrigger>
                  <SelectContent>
                    {filteredStudentsForInput.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>老師分享</Label>
              <textarea
                value={teacherShare}
                onChange={(e) => setTeacherShare(e.target.value)}
                placeholder="老師觀察到的幼生在校表現、學習狀況..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>家長回饋</Label>
              <textarea
                value={parentFeedback}
                onChange={(e) => setParentFeedback(e.target.value)}
                placeholder="家長的回應、在家觀察到的狀況..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={addMut.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              新增記錄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Communication Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setEditingId(null); } setShowEditDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              編輯溝通記錄 - {editStudentName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>溝通方式</Label>
                <Select value={editMethod} onValueChange={(v) => setEditMethod(v as "interview" | "phone")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">電訪</SelectItem>
                    <SelectItem value="interview">面談</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>老師分享</Label>
              <textarea
                value={editTeacherShare}
                onChange={(e) => setEditTeacherShare(e.target.value)}
                placeholder="老師觀察到的幼生在校表現、學習狀況..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>家長回饋</Label>
              <textarea
                value={editParentFeedback}
                onChange={(e) => setEditParentFeedback(e.target.value)}
                placeholder="家長的回應、在家觀察到的狀況..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingId(null); }}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateMut.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
