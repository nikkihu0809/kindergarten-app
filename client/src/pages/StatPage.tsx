import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart3, Plus, Pencil, Trash2, Users, ChevronRight, ChevronDown, CheckCircle2, Circle, FileText, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function StatPage() {
  const utils = trpc.useUtils();
  const { data: statSummary = [], isLoading: summaryLoading } = trpc.stat.summary.useQuery();
  const { data: allStudentsRaw = [] } = trpc.student.list.useQuery();
  // 排除離托幼生
  const students = useMemo(() => allStudentsRaw.filter(s => !(s as any).withdrawalDate), [allStudentsRaw]);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStatusLabel, setNewStatusLabel] = useState("已繳交");
  const [editingItem, setEditingItem] = useState<{ id: number; name: string; statusLabel: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatusLabel, setEditStatusLabel] = useState("");

  // Detail view
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const selectedItem = statSummary.find(i => i.id === selectedItemId);

  const { data: records = [], isLoading: recordsLoading } = trpc.stat.getRecords.useQuery(
    { statItemId: selectedItemId! },
    { enabled: selectedItemId !== null }
  );

  // Mutations
  const createMut = trpc.stat.create.useMutation({
    onSuccess: () => {
      utils.stat.summary.invalidate();
      utils.stat.list.invalidate();
      setShowCreateDialog(false);
      setNewName("");
      setNewStatusLabel("已繳交");
      toast.success("統計項目已建立");
    },
  });

  const updateMut = trpc.stat.update.useMutation({
    onSuccess: () => {
      utils.stat.summary.invalidate();
      utils.stat.list.invalidate();
      setShowEditDialog(false);
      setEditingItem(null);
      toast.success("統計項目已更新");
    },
  });

  const deleteMut = trpc.stat.delete.useMutation({
    onSuccess: () => {
      utils.stat.summary.invalidate();
      utils.stat.list.invalidate();
      if (selectedItemId) setSelectedItemId(null);
      toast.success("統計項目已刪除");
    },
  });

  const initMut = trpc.stat.initRecords.useMutation({
    onSuccess: () => {
      utils.stat.getRecords.invalidate({ statItemId: selectedItemId! });
      utils.stat.summary.invalidate();
    },
  });

  const toggleMut = trpc.stat.toggleRecord.useMutation({
    onSuccess: () => {
      utils.stat.getRecords.invalidate({ statItemId: selectedItemId! });
      utils.stat.summary.invalidate();
    },
  });

  const noteMut = trpc.stat.updateNote.useMutation({
    onSuccess: () => {
      utils.stat.getRecords.invalidate({ statItemId: selectedItemId! });
    },
  });

  // Group records by class
  const recordsByClass = useMemo(() => {
    const map: Record<string, typeof records> = {};
    // Merge students with records
    const recordMap = new Map(records.map(r => [r.studentId, r]));
    const allEntries = students.map(s => {
      const existing = recordMap.get(s.id);
      return existing || {
        id: 0,
        statItemId: selectedItemId || 0,
        studentId: s.id,
        studentName: s.name,
        className: s.className,
        checked: 0,
        notes: "",
        updatedAt: new Date(),
      };
    });
    // Also include records for students not in current student list
    records.forEach(r => {
      if (!students.find(s => s.id === r.studentId)) {
        allEntries.push(r);
      }
    });
    allEntries.forEach(r => {
      if (!map[r.className]) map[r.className] = [];
      map[r.className].push(r as typeof records[0]);
    });
    return map;
  }, [records, students, selectedItemId]);

  const toggleClass = (className: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(className)) next.delete(className);
      else next.add(className);
      return next;
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) { toast.error("請輸入項目名稱"); return; }
    if (!newStatusLabel.trim()) { toast.error("請輸入勾選狀態名稱"); return; }
    createMut.mutate({ name: newName.trim(), statusLabel: newStatusLabel.trim() });
  };

  const openEdit = (item: { id: number; name: string; statusLabel: string }) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditStatusLabel(item.statusLabel);
    setShowEditDialog(true);
  };

  const handleEdit = () => {
    if (!editingItem) return;
    if (!editName.trim()) { toast.error("請輸入項目名稱"); return; }
    if (!editStatusLabel.trim()) { toast.error("請輸入勾選狀態名稱"); return; }
    updateMut.mutate({ id: editingItem.id, name: editName.trim(), statusLabel: editStatusLabel.trim() });
  };

  const handleDelete = (id: number) => {
    if (!confirm("確定要刪除此統計項目？所有相關記錄也會一併刪除。")) return;
    deleteMut.mutate({ id });
  };

  const handleToggle = (record: typeof records[0], checked: boolean) => {
    if (!selectedItemId) return;
    toggleMut.mutate({
      statItemId: selectedItemId,
      studentId: record.studentId,
      studentName: record.studentName,
      className: record.className,
      checked: checked ? 1 : 0,
      notes: record.notes || "",
    });
  };

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteValue, setNoteValue] = useState("");

  const startEditNote = (studentId: number, currentNote: string) => {
    setEditingNoteId(studentId);
    setNoteValue(currentNote || "");
  };

  const saveNote = (record: typeof records[0]) => {
    if (!selectedItemId) return;
    noteMut.mutate({
      statItemId: selectedItemId,
      studentId: record.studentId,
      studentName: record.studentName,
      className: record.className,
      notes: noteValue,
    });
    setEditingNoteId(null);
  };

  const openDetail = (itemId: number) => {
    setSelectedItemId(itemId);
    // Expand all classes by default
    const classes = new Set(students.map(s => s.className));
    setExpandedClasses(classes);
  };

  // Detail view
  if (selectedItemId && selectedItem) {
    const classNames = Object.keys(recordsByClass).sort();
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedItemId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedItem.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                勾選狀態：「{selectedItem.statusLabel}」 ｜ 完成 {selectedItem.checkedCount}/{selectedItem.totalCount} 人
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">完成進度</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedItem.totalCount > 0 ? Math.round((selectedItem.checkedCount / selectedItem.totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${selectedItem.totalCount > 0 ? (selectedItem.checkedCount / selectedItem.totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">{selectedItem.checkedCount}</p>
                <p className="text-xs text-muted-foreground">/ {selectedItem.totalCount} 人</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records by class */}
        {recordsLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-8 text-center text-muted-foreground">載入中...</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {classNames.map(className => {
              const classRecords = recordsByClass[className] || [];
              const checkedInClass = classRecords.filter(r => r.checked === 1).length;
              const isExpanded = expandedClasses.has(className);
              return (
                <Card key={className} className="border-0 shadow-sm">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors py-3"
                    onClick={() => toggleClass(className)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <Users className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">{className}班</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${checkedInClass === classRecords.length && classRecords.length > 0 ? "text-emerald-600 border-emerald-300" : "text-muted-foreground"}`}>
                          {checkedInClass}/{classRecords.length} 人
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground w-10">{selectedItem.statusLabel}</th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">姓名</th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">備註</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classRecords.map(r => (
                              <tr key={r.studentId} className={`border-b last:border-0 ${r.checked === 1 ? "bg-emerald-50/50" : "hover:bg-muted/30"}`}>
                                <td className="py-2 px-3">
                                  <Checkbox
                                    checked={r.checked === 1}
                                    onCheckedChange={(checked) => handleToggle(r, !!checked)}
                                    disabled={toggleMut.isPending}
                                  />
                                </td>
                                <td className="py-2 px-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    {r.checked === 1 ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                                    )}
                                    <span className={r.checked === 1 ? "text-emerald-700" : ""}>{r.studentName}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  {editingNoteId === r.studentId ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={noteValue}
                                        onChange={(e) => setNoteValue(e.target.value)}
                                        className="h-7 text-xs"
                                        placeholder="輸入備註..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") saveNote(r);
                                          if (e.key === "Escape") setEditingNoteId(null);
                                        }}
                                      />
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => saveNote(r)}>
                                        儲存
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingNoteId(null)}>
                                        取消
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-h-[28px]"
                                      onClick={() => startEditNote(r.studentId, r.notes || "")}
                                    >
                                      <span className="text-xs text-muted-foreground">{r.notes || ""}</span>
                                      <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">統計功能</h1>
          <p className="text-sm text-muted-foreground mt-1">建立統計項目，追蹤幼生繳交或出席狀況</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          新增項目
        </Button>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">載入中...</CardContent>
        </Card>
      ) : statSummary.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">尚無統計項目</p>
            <p className="text-xs text-muted-foreground mt-1">點擊右上角「新增項目」開始建立</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statSummary.map(item => {
            const pct = item.totalCount > 0 ? Math.round((item.checkedCount / item.totalCount) * 100) : 0;
            return (
              <Card
                key={item.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(item.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        狀態：{item.statusLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">完成進度</span>
                      <span className={`font-semibold ${pct === 100 ? "text-emerald-600" : pct > 50 ? "text-blue-600" : "text-amber-600"}`}>
                        {item.checkedCount}/{item.totalCount} 人
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              新增統計項目
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statName">項目名稱</Label>
              <Input
                id="statName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：3月份午睡棉被費"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statLabel">勾選狀態名稱</Label>
              <Input
                id="statLabel"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                placeholder="例如：已繳交、已報名、已完成"
              />
              <p className="text-xs text-muted-foreground">此名稱會顯示在勾選欄位的標題上</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "建立中..." : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingItem(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              修改統計項目
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editStatName">項目名稱</Label>
              <Input
                id="editStatName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="例如：3月份午睡棉被費"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatLabel">勾選狀態名稱</Label>
              <Input
                id="editStatLabel"
                value={editStatusLabel}
                onChange={(e) => setEditStatusLabel(e.target.value)}
                placeholder="例如：已繳交、已報名、已完成"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingItem(null); }}>取消</Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? "儲存中..." : "儲存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
