import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2, Save, Calendar, Download } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const COURSE_CATEGORIES = [
  "人初千日與五感發展",
  "身體動作與音樂律動",
  "社會情緒與語言溝通",
  "生活自理及健康清潔",
  "認知探索及創意遊戲",
  "發展檢測",
];

const CATEGORY_COLORS: Record<string, string> = {
  "人初千日與五感發展": "bg-emerald-100 text-emerald-700",
  "身體動作與音樂律動": "bg-pink-100 text-pink-700",
  "社會情緒與語言溝通": "bg-orange-100 text-orange-700",
  "生活自理及健康清潔": "bg-purple-100 text-purple-700",
  "認知探索及創意遊戲": "bg-yellow-100 text-yellow-700",
  "發展檢測": "bg-sky-100 text-sky-700",
};

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export default function CurriculumPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [formDate, setFormDate] = useState(getToday);
  const [courseCategory, setCourseCategory] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [picturebook, setPickturebook] = useState("");
  const [song, setSong] = useState("");

  const utils = trpc.useUtils();

  // Monthly data
  const { data: monthlyCurriculum = [], isLoading } = trpc.curriculum.list.useQuery({ yearMonth });

  const [mYear, mMonth] = yearMonth.split("-").map(Number);
  const monthLabel = `${mYear} 年 ${mMonth} 月`;

  // 課程項目統計
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    COURSE_CATEGORIES.forEach(cat => { stats[cat] = 0; });
    monthlyCurriculum.forEach(c => {
      if (c.courseCategory && stats[c.courseCategory] !== undefined) {
        stats[c.courseCategory]++;
      } else if (c.courseCategory) {
        stats[c.courseCategory] = (stats[c.courseCategory] || 0) + 1;
      }
    });
    return stats;
  }, [monthlyCurriculum]);

  const saveMut = trpc.curriculum.save.useMutation({
    onSuccess: () => {
      toast.success("課程記錄已新增");
      utils.curriculum.list.invalidate();
      resetForm();
      setShowAddDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.curriculum.update.useMutation({
    onSuccess: () => {
      toast.success("課程記錄已更新");
      utils.curriculum.list.invalidate();
      resetForm();
      setShowEditDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.curriculum.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除課程記錄");
      utils.curriculum.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormDate(getToday());
    setCourseCategory("");
    setCourseDescription("");
    setPickturebook("");
    setSong("");
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formDate) {
      toast.error("請選擇日期");
      return;
    }
    saveMut.mutate({
      date: formDate,
      courseCategory,
      courseDescription,
      picturebook,
      song,
    });
  };

  const handleEdit = () => {
    if (!editingId) return;
    updateMut.mutate({
      id: editingId,
      courseCategory,
      courseDescription,
      picturebook,
      song,
    });
  };

  const openEditDialog = (item: typeof monthlyCurriculum[0]) => {
    setEditingId(item.id);
    setFormDate(item.date);
    setCourseCategory(item.courseCategory || "");
    setCourseDescription(item.courseDescription || "");
    setPickturebook(item.picturebook || "");
    setSong(item.song || "");
    setShowEditDialog(true);
  };

  const handleExportMonthly = async () => {
    if (!monthlyCurriculum || monthlyCurriculum.length === 0) {
      toast.warning("本月無課程記錄");
      return;
    }
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("每日課程記錄");
      ws.columns = [
        { header: "日期", key: "date", width: 12 },
        { header: "繪本", key: "picturebook", width: 20 },
        { header: "歌謠", key: "song", width: 20 },
        { header: "課程項目", key: "courseCategory", width: 25 },
        { header: "課程說明", key: "courseDescription", width: 40 },
      ];
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      monthlyCurriculum.forEach(c => {
        ws.addRow({
          date: c.date,
          picturebook: c.picturebook || "-",
          song: c.song || "-",
          courseCategory: c.courseCategory || "-",
          courseDescription: c.courseDescription || "-",
        });
      });

      // Sheet 2: 課程項目統計
      const ws2 = workbook.addWorksheet("課程項目統計");
      ws2.columns = [
        { header: "課程項目", key: "category", width: 25 },
        { header: "次數", key: "count", width: 10 },
      ];
      const statsHeader = ws2.getRow(1);
      statsHeader.font = { bold: true };
      statsHeader.alignment = { vertical: "middle", horizontal: "center" };
      Object.entries(categoryStats).forEach(([cat, count]) => {
        ws2.addRow({ category: cat, count });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `每日課程報表_${yearMonth}.xlsx`);
      toast.success("課程報表已匯出");
    } catch {
      toast.error("匯出失敗，請重試");
    }
  };

  const formContent = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="formDate">
          <Calendar className="h-4 w-4 inline mr-1" />
          日期
        </Label>
        <Input id="formDate" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={isEdit} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="picturebook">繪本</Label>
          <Input
            id="picturebook"
            value={picturebook}
            onChange={(e) => setPickturebook(e.target.value)}
            placeholder="請輸入今日繪本名稱..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="song">歌謠</Label>
          <Input
            id="song"
            value={song}
            onChange={(e) => setSong(e.target.value)}
            placeholder="請輸入今日歌謠..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseCategory">課程項目</Label>
        <Select value={courseCategory} onValueChange={setCourseCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="請選擇課程項目..." />
          </SelectTrigger>
          <SelectContent>
            {COURSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseDescription">課程說明</Label>
        <textarea
          id="courseDescription"
          value={courseDescription}
          onChange={(e) => setCourseDescription(e.target.value)}
          placeholder="請輸入今日課程說明..."
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            每日課程記錄
          </h1>
          <p className="text-muted-foreground mt-1">記錄與管理每日課程內容</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMonthly} disabled={isLoading}>
            <Download className="h-4 w-4 mr-1" />
            匯出 Excel
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            新增課程
          </Button>
        </div>
      </div>

      {/* Month Selector */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">月份</p>
            <p className="text-lg font-semibold text-foreground">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">課程總數</p>
            <p className="text-lg font-semibold text-primary">{monthlyCurriculum.length} 堂</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">課程項目種類</p>
            <p className="text-lg font-semibold text-emerald-600">
              {Object.values(categoryStats).filter(v => v > 0).length} 類
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">已填繪本</p>
            <p className="text-lg font-semibold text-amber-600">
              {monthlyCurriculum.filter(c => c.picturebook).length} / {monthlyCurriculum.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Category Stats - 六格一排 */}
      <div className="grid grid-cols-6 gap-4">
        {COURSE_CATEGORIES.map((cat) => {
          const count = categoryStats[cat] || 0;
          const colorClass = CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700";
          const bgColor = colorClass.split(" ")[0];
          const textColor = colorClass.split(" ")[1];
          return (
            <Card key={cat} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} mb-2`}>{cat}</span>
                <p className={`text-lg font-semibold ${textColor}`}>{count} 堂</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Curriculum List */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">載入中...</CardContent>
        </Card>
      ) : monthlyCurriculum.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">本月尚無課程記錄</CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              課程列表（{monthlyCurriculum.length} 筆）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">日期</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">繪本</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">歌謠</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">課程項目</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">課程說明</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyCurriculum.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{item.date}</td>
                      <td className="py-2 px-3 text-xs">{item.picturebook || "-"}</td>
                      <td className="py-2 px-3 text-xs">{item.song || "-"}</td>
                      <td className="py-2 px-3 text-xs">
                        {item.courseCategory ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.courseCategory] || "bg-gray-100 text-gray-700"}`}>
                            {item.courseCategory}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-2 px-3 text-xs max-w-[250px] truncate">{item.courseDescription || "-"}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (confirm("確定要刪除此課程記錄嗎？")) deleteMut.mutate({ id: item.id });
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
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              新增課程記錄
            </DialogTitle>
          </DialogHeader>
          {formContent(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>取消</Button>
            <Button onClick={handleAdd} disabled={saveMut.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMut.isPending ? "儲存中..." : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowEditDialog(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              編輯課程記錄
            </DialogTitle>
          </DialogHeader>
          {formContent(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowEditDialog(false); }}>取消</Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMut.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
