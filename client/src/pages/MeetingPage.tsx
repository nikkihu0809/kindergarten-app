import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, FileText, Download, Trash2, Pencil, Eye, ChevronLeft, ClipboardList } from "lucide-react";

const LOCATIONS = ["閱讀區", "教具大廳", "辦公室", "戶外", "教室"];

const TRACKING_STATUSES = [
  { value: "待追蹤", label: "待追蹤", color: "bg-amber-100 text-amber-800" },
  { value: "追蹤中", label: "追蹤中", color: "bg-blue-100 text-blue-800" },
  { value: "已結案", label: "已結案", color: "bg-green-100 text-green-800" },
];

const MOTION_STATUSES = [
  { value: "待處理", label: "待處理", color: "bg-amber-100 text-amber-800" },
  { value: "處理中", label: "處理中", color: "bg-blue-100 text-blue-800" },
  { value: "已完成", label: "已完成", color: "bg-green-100 text-green-800" },
];

function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getRecentWeeks(count: number) {
  const weeks: Array<{ label: string; thisStart: string; thisEnd: string; lastStart: string; lastEnd: string }> = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const thisWeek = getWeekRange(d);
    const lastD = new Date(d);
    lastD.setDate(d.getDate() - 7);
    const lastWeek = getWeekRange(lastD);
    weeks.push({
      label: `${thisWeek.start} ~ ${thisWeek.end}`,
      thisStart: thisWeek.start,
      thisEnd: thisWeek.end,
      lastStart: lastWeek.start,
      lastEnd: lastWeek.end,
    });
  }
  return weeks;
}

function getStatusStyle(status: string) {
  return TRACKING_STATUSES.find(s => s.value === status)?.color || "bg-gray-100 text-gray-800";
}

function getMotionStatusStyle(status: string) {
  return MOTION_STATUSES.find(s => s.value === status)?.color || "bg-gray-100 text-gray-800";
}

export default function MeetingPage() {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);

  if (view === "create") {
    return <CreateMeetingView onBack={() => setView("list")} onCreated={(id) => { setSelectedMeetingId(id); setView("detail"); }} />;
  }
  if (view === "detail" && selectedMeetingId) {
    return <MeetingDetailView meetingId={selectedMeetingId} onBack={() => setView("list")} />;
  }
  return <MeetingListView onCreateNew={() => setView("create")} onSelect={(id) => { setSelectedMeetingId(id); setView("detail"); }} />;
}

// ==================== List View ====================
function MeetingListView({ onCreateNew, onSelect }: { onCreateNew: () => void; onSelect: (id: number) => void }) {
  const { data: meetings, isLoading } = trpc.meeting.list.useQuery();
  const deleteMutation = trpc.meeting.delete.useMutation();
  const utils = trpc.useUtils();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      utils.meeting.list.invalidate();
      toast.success("已刪除會議記錄");
      setDeleteId(null);
    } catch { toast.error("刪除失敗"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">會議記錄</h1>
          <p className="text-muted-foreground mt-1">管理園所會議記錄，自動彙整各項數據</p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" /> 新增會議
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : !meetings || meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">尚無會議記錄</p>
            <Button onClick={onCreateNew} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> 建立第一份會議記錄
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(m.id)}>
              <CardContent className="py-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{m.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {m.meetingDate} | {m.location} | 動議 {m.motionsCount} 項
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusStyle(m.trackingStatus)}>{m.trackingStatus}</Badge>
                    {m.wordFileUrl && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); window.open(m.wordFileUrl, '_blank'); }}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onSelect(m.id); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除</DialogTitle></DialogHeader>
          <p>確定要刪除此會議記錄嗎？此操作無法復原。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>確認刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Create View ====================
function CreateMeetingView({ onBack, onCreated }: { onBack: () => void; onCreated: (id: number) => void }) {
  const { data: teachers } = trpc.teacher.list.useQuery();
  const createMutation = trpc.meeting.create.useMutation();
  const generateWordMutation = trpc.meeting.generateWord.useMutation();
  const utils = trpc.useUtils();

  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState("0");
  const selectedWeek = recentWeeks[parseInt(selectedWeekIdx)];

  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState("");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [recorder, setRecorder] = useState("");
  const [chairperson, setChairperson] = useState("");
  const [absentees, setAbsentees] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);

  // Motions
  const [motions, setMotions] = useState<Array<{ topic: string; resolution: string; assigneeId?: number; assigneeName: string; dueDate: string }>>([]);

  // Aggregate data preview
  const { data: reportData, isLoading: loadingReport } = trpc.meeting.aggregateData.useQuery({
    thisWeekStart: selectedWeek.thisStart,
    thisWeekEnd: selectedWeek.thisEnd,
    lastWeekStart: selectedWeek.lastStart,
    lastWeekEnd: selectedWeek.lastEnd,
  });

  const toggleAttendee = (id: number) => {
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (!teachers) return;
    if (attendeeIds.length === teachers.length) {
      setAttendeeIds([]);
    } else {
      setAttendeeIds(teachers.map(t => t.id));
    }
  };

  const addMotion = () => {
    setMotions(prev => [...prev, { topic: "", resolution: "", assigneeName: "", dueDate: "" }]);
  };

  const removeMotion = (idx: number) => {
    setMotions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMotion = (idx: number, field: string, value: any) => {
    setMotions(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const finalLocation = location === "__custom" ? customLocation : location;

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("請輸入會議名稱"); return; }
    if (!meetingDate) { toast.error("請選擇會議日期"); return; }

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        meetingDate,
        meetingTime,
        location: finalLocation,
        attendeeIds: JSON.stringify(attendeeIds),
        chairperson,
        absentees,
        recorder,
        thisWeekStart: selectedWeek.thisStart,
        thisWeekEnd: selectedWeek.thisEnd,
        lastWeekStart: selectedWeek.lastStart,
        lastWeekEnd: selectedWeek.lastEnd,
        reportData: reportData ? JSON.stringify(reportData) : undefined,
        motions: motions.filter(m => m.topic.trim()),
      });

      // Generate Word
      try {
        await generateWordMutation.mutateAsync({ meetingId: result.id });
        toast.success("會議記錄已建立，Word 文件已生成");
      } catch {
        toast.success("會議記錄已建立，但 Word 文件生成失敗");
      }

      utils.meeting.list.invalidate();
      onCreated(result.id);
    } catch {
      toast.error("建立失敗");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">新增會議記錄</h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>會議基本資訊</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>會議名稱 *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：第 12 週園務會議" />
            </div>
            <div>
              <Label>會議日期 *</Label>
              <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>
            <div>
              <Label>會議時間</Label>
              <Input value={meetingTime} onChange={e => setMeetingTime(e.target.value)} placeholder="例：14:00-15:30" />
            </div>
            <div>
              <Label>會議地點</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue placeholder="選擇地點" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                  <SelectItem value="__custom">自訂地點...</SelectItem>
                </SelectContent>
              </Select>
              {location === "__custom" && (
                <Input className="mt-2" value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="請輸入自訂地點" />
              )}
            </div>
            <div>
              <Label>主持人</Label>
              <Input value={chairperson} onChange={e => setChairperson(e.target.value)} placeholder="主持人姓名" />
            </div>
            <div>
              <Label>紀錄人</Label>
              <Input value={recorder} onChange={e => setRecorder(e.target.value)} placeholder="紀錄人姓名" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>出席人員</CardTitle>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {teachers && attendeeIds.length === teachers.length ? "取消全選" : "全選"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teachers && teachers.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {attendeeIds.map(id => {
                  const t = teachers.find(t => t.id === id);
                  return t ? <Badge key={id} variant="secondary">{t.name}</Badge> : null;
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {teachers.map(t => (
                  <label key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox checked={attendeeIds.includes(t.id)} onCheckedChange={() => toggleAttendee(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">尚無老師名單</p>
          )}
        </CardContent>
      </Card>

      {/* Absentees */}
      <Card>
        <CardHeader><CardTitle>請假人員</CardTitle></CardHeader>
        <CardContent>
          <Input value={absentees} onChange={e => setAbsentees(e.target.value)} placeholder="請假人員姓名（以逗號分隔）" />
        </CardContent>
      </Card>

      {/* Week Selection */}
      <Card>
        <CardHeader><CardTitle>報告週次選擇</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>本週範圍（週一至週日）</Label>
            <Select value={selectedWeekIdx} onValueChange={setSelectedWeekIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {recentWeeks.map((w, i) => (
                  <SelectItem key={i} value={String(i)}>{w.label}{i === 0 ? " (本週)" : i === 1 ? " (上週)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>本週：{selectedWeek.thisStart} ~ {selectedWeek.thisEnd}</p>
            <p>上週：{selectedWeek.lastStart} ~ {selectedWeek.lastEnd}</p>
          </div>
        </CardContent>
      </Card>

      {/* Report Data Preview */}
      <Card>
        <CardHeader><CardTitle>自動彙整數據預覽</CardTitle></CardHeader>
        <CardContent>
          {loadingReport ? (
            <p className="text-muted-foreground">載入數據中...</p>
          ) : reportData ? (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">一、本週幼生出席情況</h4>
                <p>幼生總數：{reportData.studentAttendance?.length || 0} 人</p>
                {reportData.studentAttendance && (
                  <p>有請假記錄：{reportData.studentAttendance.filter((s: any) => s.leaves?.length > 0).length} 人</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-1">二、本週老師請假情況</h4>
                <p>{reportData.teacherLeaves?.length || 0} 筆請假記錄</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">三、上週意外傷害情況</h4>
                <p>{reportData.incidents?.length || 0} 筆傷害記錄</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">四、上週家長溝通情況</h4>
                <p>{reportData.parentComm?.length || 0} 筆溝通記錄</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">五、成長檔案測量進度</h4>
                {reportData.growthProgress && (
                  <p>已填寫 {reportData.growthProgress.filledStudents}/{reportData.growthProgress.totalStudents} 人</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-1">六、統計資料狀況</h4>
                <p>{reportData.statSummary?.length || 0} 個統計項目</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">無法載入數據</p>
          )}
        </CardContent>
      </Card>

      {/* Motions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>臨時動議</CardTitle>
            <Button variant="outline" size="sm" onClick={addMotion} className="gap-1">
              <Plus className="h-4 w-4" /> 新增議題
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {motions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">尚無臨時動議，點擊上方按鈕新增</p>
          ) : (
            <div className="space-y-4">
              {motions.map((m, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">議題 {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeMotion(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>議題內容</Label>
                    <Input value={m.topic} onChange={e => updateMotion(idx, "topic", e.target.value)} placeholder="議題內容" />
                  </div>
                  <div>
                    <Label>決議</Label>
                    <Textarea value={m.resolution} onChange={e => updateMotion(idx, "resolution", e.target.value)} placeholder="決議內容" rows={2} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>負責人</Label>
                      <Select value={m.assigneeId ? String(m.assigneeId) : ""} onValueChange={(v) => {
                        const t = teachers?.find(t => t.id === parseInt(v));
                        updateMotion(idx, "assigneeId", parseInt(v));
                        updateMotion(idx, "assigneeName", t?.name || "");
                      }}>
                        <SelectTrigger><SelectValue placeholder="選擇負責人" /></SelectTrigger>
                        <SelectContent>
                          {teachers?.map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>預計完成日期</Label>
                      <Input type="date" value={m.dueDate} onChange={e => updateMotion(idx, "dueDate", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>取消</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || generateWordMutation.isPending} className="gap-2">
          {createMutation.isPending || generateWordMutation.isPending ? "生成中..." : <><FileText className="h-4 w-4" /> 提交並生成 Word</>}
        </Button>
      </div>
    </div>
  );
}

// ==================== Detail View ====================
function MeetingDetailView({ meetingId, onBack }: { meetingId: number; onBack: () => void }) {
  const { data: meeting, isLoading } = trpc.meeting.get.useQuery({ id: meetingId });
  const { data: teachers } = trpc.teacher.list.useQuery();
  const updateMutation = trpc.meeting.update.useMutation();
  const updateMotionMutation = trpc.meeting.updateMotion.useMutation();
  const addMotionMutation = trpc.meeting.addMotion.useMutation();
  const deleteMotionMutation = trpc.meeting.deleteMotion.useMutation();
  const generateWordMutation = trpc.meeting.generateWord.useMutation();
  const utils = trpc.useUtils();

  const [editMotionId, setEditMotionId] = useState<number | null>(null);
  const [editMotionTopic, setEditMotionTopic] = useState("");
  const [editMotionResolution, setEditMotionResolution] = useState("");
  const [editMotionAssigneeId, setEditMotionAssigneeId] = useState<number | undefined>();
  const [editMotionAssigneeName, setEditMotionAssigneeName] = useState("");
  const [editMotionDueDate, setEditMotionDueDate] = useState("");
  const [editMotionStatus, setEditMotionStatus] = useState("");

  const [showAddMotion, setShowAddMotion] = useState(false);
  const [newMotionTopic, setNewMotionTopic] = useState("");
  const [newMotionResolution, setNewMotionResolution] = useState("");
  const [newMotionAssigneeId, setNewMotionAssigneeId] = useState<number | undefined>();
  const [newMotionAssigneeName, setNewMotionAssigneeName] = useState("");
  const [newMotionDueDate, setNewMotionDueDate] = useState("");

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">載入中...</div>;
  if (!meeting) return <div className="text-center py-12 text-muted-foreground">找不到會議記錄</div>;

  const attendeeIds: number[] = meeting.attendeeIds ? JSON.parse(meeting.attendeeIds) : [];
  const attendees = teachers?.filter(t => attendeeIds.includes(t.id)) || [];
  const reportData = meeting.reportData ? JSON.parse(meeting.reportData) : null;

  const handleStatusChange = async (status: string) => {
    try {
      await updateMutation.mutateAsync({ id: meetingId, trackingStatus: status });
      utils.meeting.get.invalidate({ id: meetingId });
      utils.meeting.list.invalidate();
      toast.success("追蹤狀態已更新");
    } catch { toast.error("更新失敗"); }
  };

  const handleMotionStatusChange = async (motionId: number, status: string) => {
    try {
      await updateMotionMutation.mutateAsync({ id: motionId, status });
      utils.meeting.get.invalidate({ id: meetingId });
      toast.success("動議狀態已更新");
    } catch { toast.error("更新失敗"); }
  };

  const openEditMotion = (m: any) => {
    setEditMotionId(m.id);
    setEditMotionTopic(m.topic);
    setEditMotionResolution(m.resolution || "");
    setEditMotionAssigneeId(m.assigneeId || undefined);
    setEditMotionAssigneeName(m.assigneeName || "");
    setEditMotionDueDate(m.dueDate || "");
    setEditMotionStatus(m.status || "待處理");
  };

  const handleEditMotion = async () => {
    if (!editMotionId) return;
    try {
      await updateMotionMutation.mutateAsync({
        id: editMotionId,
        topic: editMotionTopic,
        resolution: editMotionResolution,
        assigneeId: editMotionAssigneeId,
        assigneeName: editMotionAssigneeName,
        dueDate: editMotionDueDate,
        status: editMotionStatus,
      });
      utils.meeting.get.invalidate({ id: meetingId });
      setEditMotionId(null);
      toast.success("動議已更新");
    } catch { toast.error("更新失敗"); }
  };

  const handleAddMotion = async () => {
    if (!newMotionTopic.trim()) { toast.error("請輸入議題內容"); return; }
    try {
      await addMotionMutation.mutateAsync({
        meetingId,
        topic: newMotionTopic.trim(),
        resolution: newMotionResolution,
        assigneeId: newMotionAssigneeId,
        assigneeName: newMotionAssigneeName,
        dueDate: newMotionDueDate,
      });
      utils.meeting.get.invalidate({ id: meetingId });
      setShowAddMotion(false);
      setNewMotionTopic("");
      setNewMotionResolution("");
      setNewMotionAssigneeId(undefined);
      setNewMotionAssigneeName("");
      setNewMotionDueDate("");
      toast.success("動議已新增");
    } catch { toast.error("新增失敗"); }
  };

  const handleDeleteMotion = async (motionId: number) => {
    try {
      await deleteMotionMutation.mutateAsync({ id: motionId });
      utils.meeting.get.invalidate({ id: meetingId });
      toast.success("動議已刪除");
    } catch { toast.error("刪除失敗"); }
  };

  const handleRegenWord = async () => {
    try {
      await generateWordMutation.mutateAsync({ meetingId });
      utils.meeting.get.invalidate({ id: meetingId });
      toast.success("Word 文件已重新生成");
    } catch { toast.error("生成失敗"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="text-sm text-muted-foreground">{meeting.meetingDate} | {meeting.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={meeting.trackingStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRACKING_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {meeting.wordFileUrl ? (
            <Button variant="outline" className="gap-2" onClick={() => window.open(meeting.wordFileUrl, '_blank')}>
              <Download className="h-4 w-4" /> 下載 Word
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2" onClick={handleRegenWord} disabled={generateWordMutation.isPending}>
            <FileText className="h-4 w-4" /> {generateWordMutation.isPending ? "生成中..." : "重新生成 Word"}
          </Button>
        </div>
      </div>

      {/* Meeting Info */}
      <Card>
        <CardHeader><CardTitle>會議資訊</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">日期：</span>{meeting.meetingDate}</div>
            <div><span className="text-muted-foreground">時間：</span>{meeting.meetingTime || "-"}</div>
            <div><span className="text-muted-foreground">地點：</span>{meeting.location || "-"}</div>
            <div><span className="text-muted-foreground">主持人：</span>{meeting.chairperson || "-"}</div>
            <div><span className="text-muted-foreground">紀錄人：</span>{meeting.recorder || "-"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">出席人員：</span>{attendees.map(t => t.name).join("、") || "-"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">請假人員：</span>{meeting.absentees || "無"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Report Data */}
      {reportData && (
        <Card>
          <CardHeader><CardTitle>會議報告內容</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">一、本週幼生出席情況（{meeting.thisWeekStart} ~ {meeting.thisWeekEnd}）</h4>
              <p className="text-muted-foreground">幼生總數 {reportData.studentAttendance?.length || 0} 人，請假 {reportData.studentAttendance?.filter((s: any) => s.leaves?.length > 0).length || 0} 人</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">二、本週老師請假情況</h4>
              <p className="text-muted-foreground">{reportData.teacherLeaves?.length || 0} 筆請假記錄</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">三、上週意外傷害情況（{meeting.lastWeekStart} ~ {meeting.lastWeekEnd}）</h4>
              <p className="text-muted-foreground">{reportData.incidents?.length || 0} 筆傷害記錄</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">四、上週家長溝通情況</h4>
              <p className="text-muted-foreground">{reportData.parentComm?.length || 0} 筆溝通記錄</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">五、成長檔案測量進度</h4>
              <p className="text-muted-foreground">已填寫 {reportData.growthProgress?.filledStudents || 0}/{reportData.growthProgress?.totalStudents || 0} 人，未填寫 {(reportData.growthProgress?.totalStudents || 0) - (reportData.growthProgress?.filledStudents || 0)} 人</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">六、統計資料狀況</h4>
              <p className="text-muted-foreground">{reportData.statSummary?.length || 0} 個統計項目</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motions with tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>臨時動議與追蹤</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddMotion(true)} className="gap-1">
              <Plus className="h-4 w-4" /> 新增動議
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.motions.length === 0 && !showAddMotion ? (
            <p className="text-muted-foreground text-center py-4">無臨時動議</p>
          ) : (
            <div className="space-y-3">
              {meeting.motions.map((m: any) => (
                <div key={m.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{m.topic}</span>
                        <Badge className={getMotionStatusStyle(m.status)}>{m.status}</Badge>
                      </div>
                      {m.resolution && <p className="text-sm text-muted-foreground mb-1">決議：{m.resolution}</p>}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {m.assigneeName && <span>負責人：{m.assigneeName}</span>}
                        {m.dueDate && <span>預計完成：{m.dueDate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select value={m.status} onValueChange={(v) => handleMotionStatusChange(m.id, v)}>
                        <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOTION_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditMotion(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMotion(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Motion Dialog */}
      <Dialog open={showAddMotion} onOpenChange={setShowAddMotion}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增臨時動議</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>議題內容 *</Label><Input value={newMotionTopic} onChange={e => setNewMotionTopic(e.target.value)} /></div>
            <div><Label>決議</Label><Textarea value={newMotionResolution} onChange={e => setNewMotionResolution(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>負責人</Label>
                <Select value={newMotionAssigneeId ? String(newMotionAssigneeId) : ""} onValueChange={(v) => {
                  const t = teachers?.find(t => t.id === parseInt(v));
                  setNewMotionAssigneeId(parseInt(v));
                  setNewMotionAssigneeName(t?.name || "");
                }}>
                  <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                  <SelectContent>
                    {teachers?.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>預計完成日期</Label><Input type="date" value={newMotionDueDate} onChange={e => setNewMotionDueDate(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMotion(false)}>取消</Button>
            <Button onClick={handleAddMotion}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Motion Dialog */}
      <Dialog open={editMotionId !== null} onOpenChange={() => setEditMotionId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>編輯動議</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>議題內容</Label><Input value={editMotionTopic} onChange={e => setEditMotionTopic(e.target.value)} /></div>
            <div><Label>決議</Label><Textarea value={editMotionResolution} onChange={e => setEditMotionResolution(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>負責人</Label>
                <Select value={editMotionAssigneeId ? String(editMotionAssigneeId) : ""} onValueChange={(v) => {
                  const t = teachers?.find(t => t.id === parseInt(v));
                  setEditMotionAssigneeId(parseInt(v));
                  setEditMotionAssigneeName(t?.name || "");
                }}>
                  <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                  <SelectContent>
                    {teachers?.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>預計完成日期</Label><Input type="date" value={editMotionDueDate} onChange={e => setEditMotionDueDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>狀態</Label>
              <Select value={editMotionStatus} onValueChange={setEditMotionStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTION_STATUSES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMotionId(null)}>取消</Button>
            <Button onClick={handleEditMotion}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
