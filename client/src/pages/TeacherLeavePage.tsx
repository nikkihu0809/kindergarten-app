import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, Plus, Trash2, Download, Clock, Pencil, Calendar, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

const leaveTypes = ["事假", "病假", "特休", "公假", "婚假", "喪假", "產假", "其他"];

const leaveTypeColors: Record<string, string> = {
  "事假": "bg-amber-100 text-amber-700",
  "病假": "bg-red-100 text-red-700",
  "特休": "bg-blue-100 text-blue-700",
  "公假": "bg-emerald-100 text-emerald-700",
  "婚假": "bg-pink-100 text-pink-700",
  "喪假": "bg-gray-200 text-gray-700",
  "產假": "bg-purple-100 text-purple-700",
  "其他": "bg-slate-100 text-slate-700",
};

function getLeaveTypeStyle(type: string) {
  return leaveTypeColors[type] || "bg-gray-100 text-gray-700";
}

export default function TeacherLeavePage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Add form state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [date, setDate] = useState(getToday);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLeaveType, setEditLeaveType] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editReason, setEditReason] = useState("");

  const utils = trpc.useUtils();
  const { data: teachers = [] } = trpc.teacher.list.useQuery();

  // Monthly data
  const [mYear, mMonth] = yearMonth.split("-").map(Number);
  const monthStartDate = `${yearMonth}-01`;
  const monthLastDay = new Date(mYear, mMonth, 0).getDate();
  const monthEndDate = `${yearMonth}-${String(monthLastDay).padStart(2, "0")}`;
  const { data: monthlyLeaves = [], isLoading } = trpc.teacherLeave.list.useQuery(
    { startDate: monthStartDate, endDate: monthEndDate }
  );

  const monthLabel = `${mYear} 年 ${mMonth} 月`;

  // Group by teacher
  const monthlyByTeacher = useMemo(() => {
    const groups: Record<string, typeof monthlyLeaves> = {};
    monthlyLeaves.forEach((l) => {
      if (!groups[l.teacherName]) groups[l.teacherName] = [];
      groups[l.teacherName].push(l);
    });
    return groups;
  }, [monthlyLeaves]);

  // Stats
  const totalHours = useMemo(() => {
    return monthlyLeaves.reduce((sum, l) => {
      const h = parseFloat((l as any).hours || "0");
      return sum + (isNaN(h) ? 0 : h);
    }, 0);
  }, [monthlyLeaves]);

  const addMut = trpc.teacherLeave.add.useMutation({
    onSuccess: () => {
      toast.success("老師請假記錄已新增");
      utils.teacherLeave.list.invalidate();
      resetAddForm();
      setShowAddDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.teacherLeave.update.useMutation({
    onSuccess: () => {
      toast.success("請假記錄已更新");
      utils.teacherLeave.list.invalidate();
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.teacherLeave.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); utils.teacherLeave.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetAddForm = () => {
    setDate(getToday());
    setSelectedTeacherId(null);
    setLeaveType("");
    setHours("");
    setReason("");
  };

  const handleSubmit = () => {
    if (!selectedTeacherId) { toast.error("請選擇老師"); return; }
    if (!leaveType) { toast.error("請選擇假別"); return; }
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;
    addMut.mutate({
      date,
      teacherId: selectedTeacherId,
      teacherName: teacher.name,
      leaveType,
      startTime: "",
      endTime: "",
      hours,
      reason,
    });
  };

  const openEdit = (l: typeof monthlyLeaves[0]) => {
    setEditId(l.id);
    setEditDate(l.date);
    setEditLeaveType(l.leaveType);
    setEditHours((l as any).hours || "");
    setEditReason(l.reason || "");
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    if (!editLeaveType) { toast.error("請選擇假別"); return; }
    updateMut.mutate({
      id: editId,
      date: editDate,
      leaveType: editLeaveType,
      startTime: "",
      endTime: "",
      hours: editHours,
      reason: editReason,
    });
  };

  const handleExportMonthly = async () => {
    if (monthlyLeaves.length === 0) {
      toast.error("本月無請假記錄可匯出");
      return;
    }
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Sheet 1: 請假明細
    const detailData = [...monthlyLeaves]
      .sort((a, b) => a.date.localeCompare(b.date) || a.teacherName.localeCompare(b.teacherName))
      .map((l, i) => ({
        "序號": i + 1,
        "日期": l.date,
        "老師姓名": l.teacherName,
        "假別": l.leaveType,
        "請假時數": (l as any).hours || "",
        "事由": l.reason || "",
      }));
    const ws1 = XLSX.utils.json_to_sheet(detailData);
    ws1["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 10 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "請假明細");

    // Sheet 2: 老師請假統計
    const teacherStats: Record<string, { name: string; totalHours: number; counts: Record<string, number>; days: number }> = {};
    monthlyLeaves.forEach(l => {
      if (!teacherStats[l.teacherName]) {
        teacherStats[l.teacherName] = { name: l.teacherName, totalHours: 0, counts: {}, days: 0 };
      }
      const stat = teacherStats[l.teacherName];
      stat.days += 1;
      const h = parseFloat((l as any).hours || "0");
      if (!isNaN(h)) stat.totalHours += h;
      stat.counts[l.leaveType] = (stat.counts[l.leaveType] || 0) + 1;
    });

    const statsData = Object.values(teacherStats).map(s => {
      const row: Record<string, string | number> = {
        "老師姓名": s.name,
        "請假次數": s.days,
        "總時數": Math.round(s.totalHours),
      };
      leaveTypes.forEach(lt => {
        row[lt] = s.counts[lt] || 0;
      });
      return row;
    });
    const ws2 = XLSX.utils.json_to_sheet(statsData);
    ws2["!cols"] = [
      { wch: 10 }, { wch: 10 }, { wch: 10 },
      ...leaveTypes.map(() => ({ wch: 8 })),
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "請假統計");

    XLSX.writeFile(wb, `老師請假記錄_${yearMonth}.xlsx`);
    toast.success("已匯出 Excel");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-orange-500" />
            老師請假記錄
          </h1>
          <p className="text-muted-foreground mt-1">登記老師請假日期、假別、時數及事由</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMonthly} disabled={isLoading}>
            <Download className="h-4 w-4 mr-1" />
            匯出 Excel
          </Button>
          <Button onClick={() => { resetAddForm(); setShowAddDialog(true); }}>
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
            <p className="text-xs text-muted-foreground">請假總次數</p>
            <p className="text-lg font-semibold text-orange-600">{monthlyLeaves.length} 次</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">請假老師數</p>
            <p className="text-lg font-semibold text-primary">{Object.keys(monthlyByTeacher).length} 人</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">總請假時數</p>
            <p className="text-lg font-semibold text-emerald-600">{Math.round(totalHours)} 小時</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave List by Teacher */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">載入中...</CardContent>
        </Card>
      ) : monthlyLeaves.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">本月尚無請假記錄</CardContent>
        </Card>
      ) : (
        Object.entries(monthlyByTeacher)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([teacherName, teacherLeaves]) => {
            const teacherHours = teacherLeaves.reduce((sum, l) => {
              const h = parseFloat((l as any).hours || "0");
              return sum + (isNaN(h) ? 0 : h);
            }, 0);
            return (
              <Card key={teacherName} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    {teacherName}（{teacherLeaves.length} 次，共 {Math.round(teacherHours)} 小時）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">日期</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">假別</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">時數</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">事由</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherLeaves
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((l) => (
                          <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{l.date}</td>
                            <td className="py-2 px-3 text-xs whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeStyle(l.leaveType)}`}>
                                {l.leaveType}
                              </span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {(l as any).hours ? (
                                <span className="font-semibold text-primary">{(l as any).hours} 小時</span>
                              ) : "-"}
                            </td>
                            <td className="py-2 px-3 text-xs max-w-[300px] truncate text-muted-foreground">{l.reason || "-"}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  if (confirm("確定要刪除此請假記錄？")) deleteMut.mutate({ id: l.id });
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
            );
          })
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetAddForm(); setShowAddDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-orange-500" />
              新增請假記錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>請假日期</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>老師姓名</Label>
                <Select value={selectedTeacherId ? String(selectedTeacherId) : ""} onValueChange={(v) => setSelectedTeacherId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="選擇老師..." /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}（{t.title}）</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>假別</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger><SelectValue placeholder="選擇假別..." /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>請假時數</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={hours}
                    onChange={(e) => setHours(String(Math.round(Number(e.target.value) || 0)))}
                    placeholder="例如：4 或 8"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>事由<span className="text-muted-foreground font-normal">（如不足一日，請寫上請假開始及結束的時間）</span></Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="請輸入請假事由..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetAddForm(); setShowAddDialog(false); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={addMut.isPending}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              修改請假記錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>請假日期</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>假別</Label>
                <Select value={editLeaveType} onValueChange={setEditLeaveType}>
                  <SelectTrigger><SelectValue placeholder="選擇假別..." /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>請假時數</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={editHours}
                    onChange={(e) => setEditHours(String(Math.round(Number(e.target.value) || 0)))}
                    placeholder="例如：4 或 8"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>事由<span className="text-muted-foreground font-normal">（如不足一日，請寫上請假開始及結束的時間）</span></Label>
                <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="請輸入請假事由..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>儲存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
