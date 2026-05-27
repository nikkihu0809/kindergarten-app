import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Thermometer, LogIn, LogOut, CalendarOff, Trash2, CheckCircle, Pencil, Users, FileText, Download, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 取得某月的工作日天數（週一到週五） */
function getWorkingDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) workingDays++;
  }
  return workingDays;
}

type Mode = "checkin" | "checkout" | "leave";

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [mode, setMode] = useState<Mode>("checkin");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [temperature, setTemperature] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedClassForInput, setSelectedClassForInput] = useState<string>("");
  const [showEndDayDialog, setShowEndDayDialog] = useState(false);
  const [showFeverWarning, setShowFeverWarning] = useState(false);
  const [pendingFeverSubmit, setPendingFeverSubmit] = useState(false);
  // 重複打卡相關 state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<{ id: number; studentName: string; time: string; temperature?: string; type: string } | null>(null);
  const [pendingDuplicateAction, setPendingDuplicateAction] = useState<"checkin" | "checkout" | null>(null);
  // 手動修改打卡 state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ id: number; studentName: string; time: string; temperature?: string; type: string; notes?: string } | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editTemperature, setEditTemperature] = useState("");
  const [editNotes, setEditNotes] = useState("");
  // 修改請假 state
  const [showEditLeaveDialog, setShowEditLeaveDialog] = useState(false);
  const [editingLeave, setEditingLeave] = useState<{ id: number; studentName: string; leaveType: string; leaveReason: string } | null>(null);
  const [editLeaveType, setEditLeaveType] = useState("");
  const [editLeaveReason, setEditLeaveReason] = useState("");
  // 月報表匯出 state
  const [showMonthlyExportDialog, setShowMonthlyExportDialog] = useState(false);
  const [exportYearMonth, setExportYearMonth] = useState(getCurrentYearMonth);
  const [isExporting, setIsExporting] = useState(false);

  const utils = trpc.useUtils();
  const { data: allStudents = [] } = trpc.student.list.useQuery();
  const { data: attendance = [] } = trpc.attendance.listByDate.useQuery({ date: selectedDate });
  const { data: endDayData } = trpc.attendance.endDayCheck.useQuery({ date: selectedDate });

  // 排除離托幼生
  const students = useMemo(() => allStudents.filter(s => !(s as any).withdrawalDate), [allStudents]);

  // 取得所有班級列表
  const classList = useMemo(() => {
    const classes = Array.from(new Set(students.map(s => s.className).filter(Boolean)));
    return classes.sort();
  }, [students]);

  // 根據選擇的班級篩選幼生，按年紀大到小排序
  const filteredStudentsForInput = useMemo(() => {
    if (!selectedClassForInput) return [];
    return students
      .filter(s => s.className === selectedClassForInput)
      .sort((a, b) => (a.birthday || "9999").localeCompare(b.birthday || "9999"));
  }, [students, selectedClassForInput]);

  const checkinMut = trpc.attendance.checkin.useMutation({
    onSuccess: () => { toast.success("上課打卡成功"); utils.attendance.listByDate.invalidate({ date: selectedDate }); utils.attendance.endDayCheck.invalidate({ date: selectedDate }); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const checkoutMut = trpc.attendance.checkout.useMutation({
    onSuccess: () => { toast.success("下課打卡成功"); utils.attendance.listByDate.invalidate({ date: selectedDate }); utils.attendance.endDayCheck.invalidate({ date: selectedDate }); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const leaveMut = trpc.attendance.leave.useMutation({
    onSuccess: () => { toast.success("請假登記成功"); utils.attendance.listByDate.invalidate({ date: selectedDate }); utils.attendance.endDayCheck.invalidate({ date: selectedDate }); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.attendance.update.useMutation({
    onSuccess: () => { toast.success("打卡記錄已更新"); utils.attendance.listByDate.invalidate({ date: selectedDate }); utils.attendance.endDayCheck.invalidate({ date: selectedDate }); resetForm(); setShowEditDialog(false); setEditingRecord(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.attendance.delete.useMutation({
    onSuccess: () => { toast.success("已刪除記錄"); utils.attendance.listByDate.invalidate({ date: selectedDate }); utils.attendance.endDayCheck.invalidate({ date: selectedDate }); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setSelectedStudentId(null);
    setTemperature("");
    setLeaveReason("");
    setLeaveType("");
    setNotes("");
    setShowDuplicateDialog(false);
    setDuplicateRecord(null);
    setPendingDuplicateAction(null);
  };

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const handleSubmit = () => {
    if (!selectedStudentId || !selectedStudent) {
      toast.error("請選擇幼生");
      return;
    }
    const time = getNow();

    if (mode === "checkin") {
      const existingCheckin = attendance.find(a => a.type === "checkin" && a.studentId === selectedStudentId);
      if (existingCheckin && !pendingFeverSubmit && !pendingDuplicateAction) {
        setDuplicateRecord({
          id: existingCheckin.id,
          studentName: existingCheckin.studentName,
          time: existingCheckin.time,
          temperature: existingCheckin.temperature ?? undefined,
          type: "checkin",
        });
        setPendingDuplicateAction("checkin");
        setShowDuplicateDialog(true);
        return;
      }

      const tempValue = temperature ? parseFloat(temperature) : 0;
      if (temperature && tempValue >= 37.5 && !pendingFeverSubmit) {
        setShowFeverWarning(true);
        return;
      }
      setPendingFeverSubmit(false);
      setPendingDuplicateAction(null);
      checkinMut.mutate({ date: selectedDate, studentId: selectedStudentId, studentName: selectedStudent.name, time, temperature, notes });
    } else if (mode === "checkout") {
      const existingCheckout = attendance.find(a => a.type === "checkout" && a.studentId === selectedStudentId);
      if (existingCheckout && !pendingDuplicateAction) {
        setDuplicateRecord({
          id: existingCheckout.id,
          studentName: existingCheckout.studentName,
          time: existingCheckout.time,
          type: "checkout",
        });
        setPendingDuplicateAction("checkout");
        setShowDuplicateDialog(true);
        return;
      }
      setPendingDuplicateAction(null);
      checkoutMut.mutate({ date: selectedDate, studentId: selectedStudentId, studentName: selectedStudent.name, time, notes });
    } else {
      if (!leaveType) { toast.error("請選擇假別"); return; }
      if (!leaveReason) { toast.error("請輸入請假事由"); return; }
      leaveMut.mutate({ date: selectedDate, studentId: selectedStudentId, studentName: selectedStudent.name, leaveType, leaveReason, notes });
    }
  };

  const handleDuplicateUpdate = () => {
    if (!duplicateRecord) return;
    const time = getNow();
    if (duplicateRecord.type === "checkin") {
      updateMut.mutate({ id: duplicateRecord.id, time, temperature: temperature || undefined, notes: notes || undefined });
    } else {
      updateMut.mutate({ id: duplicateRecord.id, time, notes: notes || undefined });
    }
    setShowDuplicateDialog(false);
    setDuplicateRecord(null);
    setPendingDuplicateAction(null);
  };

  const handleDuplicateAddNew = () => {
    setShowDuplicateDialog(false);
    setDuplicateRecord(null);
    setTimeout(() => { handleSubmit(); }, 0);
  };

  const openEditRecord = (record: { id: number; studentName: string; time: string; temperature?: string | null; type: string; notes?: string | null }) => {
    setEditingRecord({
      id: record.id,
      studentName: record.studentName,
      time: record.time,
      temperature: record.temperature ?? undefined,
      type: record.type,
      notes: record.notes ?? undefined,
    });
    setEditTime(record.time);
    setEditTemperature(record.temperature ?? "");
    setEditNotes(record.notes ?? "");
    setShowEditDialog(true);
  };

  const handleEditSave = () => {
    if (!editingRecord) return;
    updateMut.mutate({
      id: editingRecord.id,
      time: editTime,
      temperature: editingRecord.type === "checkin" ? editTemperature || undefined : undefined,
      notes: editNotes || undefined,
    });
  };

  const [editLeaveNotes, setEditLeaveNotes] = useState("");

  const openEditLeave = (record: { id: number; studentName: string; leaveType: string; leaveReason: string; notes?: string | null }) => {
    setEditingLeave(record);
    setEditLeaveType(record.leaveType);
    setEditLeaveReason(record.leaveReason);
    setEditLeaveNotes(record.notes ?? "");
    setShowEditLeaveDialog(true);
  };

  const handleEditLeaveSave = () => {
    if (!editingLeave) return;
    if (!editLeaveType) { toast.error("請選擇假別"); return; }
    if (!editLeaveReason) { toast.error("請輸入請假事由"); return; }
    updateMut.mutate({
      id: editingLeave.id,
      leaveType: editLeaveType,
      leaveReason: editLeaveReason,
      notes: editLeaveNotes || undefined,
    });
    setShowEditLeaveDialog(false);
    setEditingLeave(null);
  };

  const handleEndDay = () => {
    if (endDayData && endDayData.missingCheckout.length > 0) {
      setShowEndDayDialog(true);
    } else {
      toast.success("所有上課幼生皆已完成下課打卡！");
    }
  };

  // ==================== 月報表匯出 ====================
  const handleMonthlyExport = async () => {
    setIsExporting(true);
    try {
      const result = await utils.attendance.monthlyDetail.fetch({ yearMonth: exportYearMonth });
      if (!result || !result.students || result.students.length === 0) {
        toast.error("該月份無資料可匯出");
        setIsExporting(false);
        return;
      }

      const { attendance: monthlyAttendance, students: allStudents } = result;
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const workingDays = getWorkingDaysInMonth(exportYearMonth);

      // ===== 工作表1：月出席統計 =====
      const studentStatsMap = new Map<number, {
        studentId: number;
        studentName: string;
        className: string;
        birthday: string;
        enrollmentDate: string;
        attendDays: Set<string>;
        leaveDays: Set<string>;
        leaveReasons: string[];
      }>();

      allStudents.forEach(s => {
        studentStatsMap.set(s.id, {
          studentId: s.id,
          studentName: s.name,
          className: s.className,
          birthday: s.birthday || "",
          enrollmentDate: s.enrollmentDate || "",
          attendDays: new Set(),
          leaveDays: new Set(),
          leaveReasons: [],
        });
      });

      monthlyAttendance.forEach((a: any) => {
        const stat = studentStatsMap.get(a.studentId);
        if (!stat) return;
        if (a.type === "checkin") {
          stat.attendDays.add(a.date);
        } else if (a.type === "leave") {
          stat.leaveDays.add(a.date);
          if (a.leaveReason) {
            const typeLabel = a.leaveType ? `[${a.leaveType}]` : "";
            stat.leaveReasons.push(`${a.date}${typeLabel}: ${a.leaveReason}`);
          }
        }
      });

      const statsData = Array.from(studentStatsMap.values())
        .sort((a, b) => {
          const classCompare = a.className.localeCompare(b.className);
          if (classCompare !== 0) return classCompare;
          return (a.birthday || "9999").localeCompare(b.birthday || "9999");
        })
        .map(s => {
          const attendDays = s.attendDays.size;
          const leaveDays = s.leaveDays.size;
          const absentDays = Math.max(0, workingDays - attendDays - leaveDays);
          const attendRate = workingDays > 0 ? ((attendDays / workingDays) * 100).toFixed(1) + "%" : "0%";
          return {
            "班級": s.className,
            "姓名": s.studentName,
            "出生日期": s.birthday || "-",
            "入托日期": s.enrollmentDate || "-",
            "工作日天數": workingDays,
            "出席天數": attendDays,
            "請假天數": leaveDays,
            "缺席天數": absentDays,
            "出席率": attendRate,
            "請假事由彙總": s.leaveReasons.length > 0 ? s.leaveReasons.join("; ") : "-",
          };
        });

      const ws1 = XLSX.utils.json_to_sheet(statsData);
      ws1["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "月出席統計");

      // ===== 工作表2：每日打卡明細 =====
      const studentMap = new Map(allStudents.map(s => [s.id, s]));
      const detailData = monthlyAttendance
        .sort((a: any, b: any) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          const sA = studentMap.get(a.studentId);
          const sB = studentMap.get(b.studentId);
          const classA = sA?.className || "";
          const classB = sB?.className || "";
          const classCompare = classA.localeCompare(classB);
          if (classCompare !== 0) return classCompare;
          return (sA?.birthday || "9999").localeCompare(sB?.birthday || "9999");
        })
        .map((a: any) => {
          const student = studentMap.get(a.studentId);
          return {
            "日期": a.date,
            "班級": student?.className || "",
            "姓名": a.studentName,
            "出生日期": student?.birthday || "-",
            "入托日期": student?.enrollmentDate || "-",
            "類型": a.type === "checkin" ? "上課打卡" : a.type === "checkout" ? "下課打卡" : "請假",
            "假別": a.leaveType || "-",
            "時間": a.time || "-",
            "體溫(°C)": a.temperature || "-",
            "請假事由": a.leaveReason || "-",
            "備註": a.notes || "-",
          };
        });

      const ws2 = XLSX.utils.json_to_sheet(detailData);
      ws2["!cols"] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "每日打卡明細");

      const [yearStr, monthStr] = exportYearMonth.split("-");
      XLSX.writeFile(wb, `出席月報表_${yearStr}年${monthStr}月.xlsx`);
      toast.success("月報表已匯出");
      setShowMonthlyExportDialog(false);
    } catch (err) {
      console.error(err);
      toast.error("匯出失敗，請重試");
    } finally {
      setIsExporting(false);
    }
  };

  // 合併上課/下課/請假記錄為同一張表格，按年紀排序
  const mergedRecords = useMemo(() => {
    const studentMap = new Map<number, {
      studentId: number;
      studentName: string;
      className: string;
      birthday: string;
      checkin?: { id: number; time: string; temperature?: string | null; notes?: string | null };
      checkout?: { id: number; time: string; notes?: string | null };
      leave?: { id: number; leaveType?: string; leaveReason: string; notes?: string | null };
    }>();

    students.forEach(s => {
      studentMap.set(s.id, {
        studentId: s.id,
        studentName: s.name,
        className: s.className,
        birthday: s.birthday || "9999",
      });
    });

    attendance.forEach(a => {
      let entry = studentMap.get(a.studentId);
      if (!entry) {
        entry = { studentId: a.studentId, studentName: a.studentName, className: "", birthday: "9999" };
        studentMap.set(a.studentId, entry);
      }
      if (a.type === "checkin") {
        entry.checkin = { id: a.id, time: a.time, temperature: a.temperature, notes: a.notes };
      } else if (a.type === "checkout") {
        entry.checkout = { id: a.id, time: a.time, notes: (a as any).notes };
      } else if (a.type === "leave") {
        entry.leave = { id: a.id, leaveType: (a as any).leaveType, leaveReason: a.leaveReason, notes: a.notes };
      }
    });

    return Array.from(studentMap.values())
      .filter(r => r.checkin || r.checkout || r.leave)
      .sort((a, b) => {
        const classCompare = a.className.localeCompare(b.className);
        if (classCompare !== 0) return classCompare;
        return (a.birthday || "9999").localeCompare(b.birthday || "9999");
      });
  }, [students, attendance]);

  // 按班級分組
  const recordsByClass = useMemo(() => {
    const groups: Record<string, typeof mergedRecords> = {};
    mergedRecords.forEach(r => {
      const cls = r.className || "未分班";
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(r);
    });
    return groups;
  }, [mergedRecords]);

  const checkins = attendance.filter(a => a.type === "checkin");
  const checkouts = attendance.filter(a => a.type === "checkout");
  const leavesArr = attendance.filter(a => a.type === "leave");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">幼生出席打卡</h1>
          <p className="text-muted-foreground mt-1">管理每日上下課打卡記錄</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowMonthlyExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            匯出月報表
          </Button>
          <Button variant="outline" onClick={handleEndDay} className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <CheckCircle className="h-4 w-4 mr-2" />
            結束今日
          </Button>
        </div>
      </div>

      {/* Input Card - 類似老師請假的新增表單 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {mode === "checkin" && <><LogIn className="h-5 w-5 text-green-600" />上課打卡</>}
            {mode === "checkout" && <><LogOut className="h-5 w-5 text-blue-600" />下課打卡</>}
            {mode === "leave" && <><CalendarOff className="h-5 w-5 text-amber-600" />請假登記</>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 日期 */}
            <div className="space-y-2">
              <Label>日期</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                {selectedDate !== getToday() && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(getToday())} className="shrink-0 text-xs border-primary/30 text-primary hover:bg-primary/10">
                    今天
                  </Button>
                )}
              </div>
            </div>

            {/* 模式選擇 */}
            <div className="space-y-2">
              <Label>操作類型</Label>
              <Select value={mode} onValueChange={(v) => { setMode(v as Mode); resetForm(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkin">上課打卡</SelectItem>
                  <SelectItem value="checkout">下課打卡</SelectItem>
                  <SelectItem value="leave">請假登記</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 班級 */}
            <div className="space-y-2">
              <Label>班級</Label>
              <Select
                value={selectedClassForInput}
                onValueChange={(v) => { setSelectedClassForInput(v); setSelectedStudentId(null); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇班級..." />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 幼生姓名 */}
            <div className="space-y-2">
              <Label>幼生姓名</Label>
              <Select
                value={selectedStudentId ? String(selectedStudentId) : ""}
                onValueChange={(v) => setSelectedStudentId(Number(v))}
                disabled={!selectedClassForInput}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedClassForInput ? "選擇幼生..." : "請先選擇班級"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudentsForInput.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 體溫 (上課打卡) */}
            {mode === "checkin" && (
              <div className="space-y-2">
                <Label>
                  <Thermometer className="h-4 w-4 inline mr-1" />
                  體溫 (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="35"
                  max="42"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="例如：36.5"
                />
              </div>
            )}

            {/* 假別 (請假) */}
            {mode === "leave" && (
              <div className="space-y-2">
                <Label>假別</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇假別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="事假">事假</SelectItem>
                    <SelectItem value="病假">病假</SelectItem>
                    <SelectItem value="傳染性病假">傳染性病假</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 備註 (上課/下課) */}
            {(mode === "checkin" || mode === "checkout") && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>
                  <FileText className="h-4 w-4 inline mr-1" />
                  備註
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="選填，例如：由爸爸接送"
                />
              </div>
            )}

            {/* 請假事由 */}
            {mode === "leave" && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>請假事由</Label>
                <Input
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="請輸入請假事由..."
                />
              </div>
            )}

            {/* 備註 (請假) */}
            {mode === "leave" && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>
                  <FileText className="h-4 w-4 inline mr-1" />
                  備註
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="選填"
                />
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={checkinMut.isPending || checkoutMut.isPending || leaveMut.isPending || updateMut.isPending}>
            {mode === "checkin" && "確認上課打卡"}
            {mode === "checkout" && "確認下課打卡"}
            {mode === "leave" && "確認請假登記"}
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <LogIn className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">上課打卡</p>
            </div>
            <p className="text-lg font-semibold text-green-600">{checkins.length} 人</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <LogOut className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">下課打卡</p>
            </div>
            <p className="text-lg font-semibold text-blue-600">{checkouts.length} 人</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarOff className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">請假</p>
            </div>
            <p className="text-lg font-semibold text-amber-600">{leavesArr.length} 人</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {selectedDate === getToday() ? "今日" : selectedDate} 出席總覽
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mergedRecords.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(recordsByClass)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([className, records]) => (
                  <div key={className}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {className}班（{records.length} 人）
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">姓名</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">上課時間</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">體溫</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">下課時間</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">假別</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">請假事由</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">備註</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">狀態</th>
                            <th className="text-center py-2 px-3 font-medium text-muted-foreground">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r) => {
                            const temp = r.checkin?.temperature ? parseFloat(r.checkin.temperature) : null;
                            const isFever = temp !== null && temp >= 37.5;
                            const allNotes = [r.checkin?.notes, r.checkout?.notes, r.leave?.notes].filter(Boolean).join("；");
                            return (
                              <tr key={r.studentId} className={`border-b last:border-0 ${isFever ? "bg-red-50" : r.leave ? "bg-amber-50/50" : "hover:bg-muted/30"}`}>
                                <td className={`py-2 px-3 font-medium ${isFever ? "text-red-700" : ""}`}>
                                  {r.studentName}
                                  {isFever && <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline ml-1" />}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {r.checkin ? r.checkin.time : "-"}
                                </td>
                                <td className={`py-2 px-3 text-center font-medium ${isFever ? "text-red-600" : ""}`}>
                                  {r.checkin?.temperature ? `${r.checkin.temperature}°C` : "-"}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {r.checkout ? r.checkout.time : "-"}
                                </td>
                                <td className="py-2 px-3 text-center text-xs">
                                  {r.leave ? (
                                    <Badge variant="outline" className={`text-xs ${r.leave.leaveType === '傳染性病假' ? 'text-red-600 border-red-300' : 'text-amber-600 border-amber-300'}`}>{r.leave.leaveType || '請假'}</Badge>
                                  ) : "-"}
                                </td>
                                <td className="py-2 px-3 text-center text-xs text-muted-foreground max-w-[150px] truncate" title={r.leave?.leaveReason || ""}>
                                  {r.leave ? (
                                    <span className="text-amber-700">{r.leave.leaveReason || "-"}</span>
                                  ) : "-"}
                                </td>
                                <td className="py-2 px-3 text-center text-xs text-muted-foreground max-w-[120px] truncate" title={allNotes}>
                                  {allNotes || "-"}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {r.leave && (
                                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">請假</Badge>
                                    )}
                                    {isFever && (
                                      <Badge variant="destructive" className="text-xs">體溫異常</Badge>
                                    )}
                                    {r.checkin && r.checkout && !r.leave ? (
                                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">已下課</Badge>
                                    ) : r.checkin && !r.leave ? (
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">上課中</Badge>
                                    ) : null}
                                    {r.leave && r.checkin && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">有出席</Badge>
                                    )}
                                    {!r.leave && !r.checkin && !r.checkout && (
                                      <Badge variant="outline" className="text-xs">-</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {r.checkin && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="修改上課打卡" onClick={() => openEditRecord({ id: r.checkin!.id, studentName: r.studentName, time: r.checkin!.time, temperature: r.checkin!.temperature, type: "checkin", notes: r.checkin!.notes })}>
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                    )}
                                    {r.checkout && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="修改下課打卡" onClick={() => openEditRecord({ id: r.checkout!.id, studentName: r.studentName, time: r.checkout!.time, type: "checkout", notes: r.checkout!.notes })}>
                                        <Pencil className="h-3 w-3 text-blue-400" />
                                      </Button>
                                    )}
                    {r.leave && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="修改請假" onClick={() => openEditLeave({ id: r.leave!.id, studentName: r.studentName, leaveType: r.leave!.leaveType || '', leaveReason: r.leave!.leaveReason, notes: r.leave!.notes })}>
                                        <Pencil className="h-3 w-3 text-amber-500" />
                                      </Button>
                                    )}
                                    {r.checkin && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="刪除上課打卡" onClick={() => deleteMut.mutate({ id: r.checkin!.id })}>
                                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                    )}
                                    {r.checkout && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="刪除下課打卡" onClick={() => deleteMut.mutate({ id: r.checkout!.id })}>
                                        <Trash2 className="h-3 w-3 text-blue-400" />
                                      </Button>
                                    )}
                                    {r.leave && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="刪除請假" onClick={() => deleteMut.mutate({ id: r.leave!.id })}>
                                        <Trash2 className="h-3 w-3 text-amber-500" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {selectedDate === getToday() ? "今日尚無打卡記錄" : `${selectedDate} 尚無打卡記錄`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Export Dialog */}
      <Dialog open={showMonthlyExportDialog} onOpenChange={setShowMonthlyExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-600" />
              匯出出席月報表
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              選擇要匯出的月份，將產生包含「月出席統計」和「每日打卡明細」兩個工作表的 Excel 檔案。
            </p>
            <div className="space-y-2">
              <Label htmlFor="exportMonth">
                <Calendar className="h-4 w-4 inline mr-1" />
                選擇月份
              </Label>
              <Input
                id="exportMonth"
                type="month"
                value={exportYearMonth}
                onChange={(e) => setExportYearMonth(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>月出席統計</strong>：按班級、幼生列出出席天數、請假天數、缺席天數、出席率</p>
              <p><strong>每日打卡明細</strong>：每日上下課打卡時間、體溫、請假事由、備註等完整記錄</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMonthlyExportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleMonthlyExport} disabled={isExporting}>
              {isExporting ? "匯出中..." : "確認匯出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingRecord(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              修改打卡記錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium">{editingRecord?.studentName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {editingRecord?.type === "checkin" ? "上課打卡" : "下課打卡"} - 原始時間：{editingRecord?.time}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTime">
                  <Clock className="h-4 w-4 inline mr-1" />
                  打卡時間
                </Label>
                <Input
                  id="editTime"
                  type="time"
                  step="1"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
              {editingRecord?.type === "checkin" && (
                <div className="space-y-2">
                  <Label htmlFor="editTemp">
                    <Thermometer className="h-4 w-4 inline mr-1" />
                    體溫 (°C)
                  </Label>
                  <Input
                    id="editTemp"
                    type="number"
                    step="0.1"
                    min="35"
                    max="42"
                    value={editTemperature}
                    onChange={(e) => setEditTemperature(e.target.value)}
                    placeholder="例如：36.5"
                  />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editNotes">
                  <FileText className="h-4 w-4 inline mr-1" />
                  備註
                </Label>
                <Input
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="選填"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingRecord(null); }}>
              取消
            </Button>
            <Button onClick={handleEditSave} disabled={updateMut.isPending}>
              儲存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={showEditLeaveDialog} onOpenChange={(open) => { if (!open) { setShowEditLeaveDialog(false); setEditingLeave(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              修改請假記錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium">{editingLeave?.studentName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                原假別：{editingLeave?.leaveType || '未分類'} │ 原事由：{editingLeave?.leaveReason}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>假別</Label>
                <Select value={editLeaveType} onValueChange={setEditLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇假別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="事假">事假</SelectItem>
                    <SelectItem value="病假">病假</SelectItem>
                    <SelectItem value="傳染性病假">傳染性病假</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editLeaveReason">請假事由</Label>
                <Input
                  id="editLeaveReason"
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  placeholder="請輸入請假事由..."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editLeaveNotes">
                  <FileText className="h-4 w-4 inline mr-1" />
                  備註
                </Label>
                <Input
                  id="editLeaveNotes"
                  value={editLeaveNotes}
                  onChange={(e) => setEditLeaveNotes(e.target.value)}
                  placeholder="選填"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditLeaveDialog(false); setEditingLeave(null); }}>
              取消
            </Button>
            <Button onClick={handleEditLeaveSave} disabled={updateMut.isPending}>
              儲存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Attendance Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={(open) => { if (!open) { setShowDuplicateDialog(false); setDuplicateRecord(null); setPendingDuplicateAction(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              重複打卡提醒
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="font-semibold text-amber-800">
                {duplicateRecord?.studentName} 今日已有{duplicateRecord?.type === "checkin" ? "上課" : "下課"}打卡記錄
              </p>
              <div className="mt-2 text-sm text-amber-700 space-y-1">
                <p>打卡時間：{duplicateRecord?.time}</p>
                {duplicateRecord?.temperature && <p>體溫：{duplicateRecord.temperature}°C</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              請選擇要修改現有記錄，或新增一筆新的打卡記錄：
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setShowDuplicateDialog(false); setDuplicateRecord(null); setPendingDuplicateAction(null); }}>
              取消
            </Button>
            <Button variant="default" onClick={handleDuplicateUpdate} disabled={updateMut.isPending}>
              <Pencil className="h-4 w-4 mr-1" />
              修改現有記錄
            </Button>
            <Button variant="secondary" onClick={handleDuplicateAddNew}>
              新增一筆記錄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fever Warning Dialog */}
      <Dialog open={showFeverWarning} onOpenChange={(open) => { setShowFeverWarning(open); if (!open) setPendingFeverSubmit(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              體溫異常警告
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-red-50 rounded-lg p-4 flex items-center gap-3">
              <Thermometer className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-lg">
                  {selectedStudent?.name} 體溫 {temperature}°C
                </p>
                <p className="text-red-600 text-sm mt-1">
                  體溫超過 37.5°C，請特別注意該幼生的健康狀況！
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              是否仍要繼續完成打卡？建議通知家長並持續觀察。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFeverWarning(false); setPendingFeverSubmit(false); }}>
              取消打卡
            </Button>
            <Button variant="destructive" onClick={() => { setShowFeverWarning(false); setPendingFeverSubmit(true); setTimeout(() => { handleSubmit(); }, 0); }}>
              確認打卡（體溫異常）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Day Dialog */}
      <Dialog open={showEndDayDialog} onOpenChange={setShowEndDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              尚有幼生未完成下課打卡
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              以下幼生已上課打卡但尚未下課打卡，請確認是否已離園：
            </p>
            <div className="space-y-2">
              {endDayData?.missingCheckout.map((s) => (
                <div key={s.studentId} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">{s.studentName}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDayDialog(false)}>
              返回補打卡
            </Button>
            <Button onClick={() => { setShowEndDayDialog(false); toast.info("請先為所有幼生完成下課打卡"); }}>
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
