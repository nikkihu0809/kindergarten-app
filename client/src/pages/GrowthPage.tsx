import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ruler, Weight, CircleDot, Footprints, Download, ChevronLeft, ChevronRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type FieldKey = "height" | "weight" | "headCircumference" | "footLength";

const FIELDS: { key: FieldKey; label: string; unit: string; icon: React.ReactNode }[] = [
  { key: "height", label: "身高", unit: "cm", icon: <Ruler className="h-4 w-4" /> },
  { key: "weight", label: "體重", unit: "kg", icon: <Weight className="h-4 w-4" /> },
  { key: "headCircumference", label: "頭圍", unit: "cm", icon: <CircleDot className="h-4 w-4" /> },
  { key: "footLength", label: "腳長", unit: "cm", icon: <Footprints className="h-4 w-4" /> },
];

export default function GrowthPage() {

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStart, setExportStart] = useState(selectedMonth);
  const [exportEnd, setExportEnd] = useState(selectedMonth);
  const [exporting, setExporting] = useState(false);

  // Refs for tracking pending saves
  const pendingRef = useRef<Map<string, string>>(new Map());

  const { data: allStudentsRaw = [] } = trpc.student.list.useQuery();
  // 排除離托幼生
  const students = useMemo(() => allStudentsRaw.filter(s => !(s as any).withdrawalDate), [allStudentsRaw]);
  const { data: records = [], refetch: refetchRecords } = trpc.growth.list.useQuery({ month: selectedMonth });
  const { data: rangeRecords = [], refetch: refetchRange } = trpc.growth.listRange.useQuery(
    { startMonth: exportStart, endMonth: exportEnd },
    { enabled: exportOpen }
  );

  const saveMutation = trpc.growth.save.useMutation({
    onError: (err) => {
      toast.error(`儲存失敗：${err.message}`);
    },
    onSuccess: () => {
      refetchRecords();
    },
  });

  // Build record map: studentId -> record
  const recordMap = useMemo(() => {
    const map = new Map<number, (typeof records)[0]>();
    for (const r of records) {
      map.set(r.studentId, r);
    }
    return map;
  }, [records]);

  // Group students by class
  const studentsByClass = useMemo(() => {
    const map = new Map<string, typeof students>();
    for (const s of students) {
      const list = map.get(s.className) || [];
      list.push(s);
      map.set(s.className, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  // Stats
  const stats = useMemo(() => {
    const total = students.length;
    let filled = 0;
    for (const s of students) {
      const r = recordMap.get(s.id);
      if (r && (r.height || r.weight || r.headCircumference || r.footLength)) {
        filled++;
      }
    }
    return { total, filled, unfilled: total - filled };
  }, [students, recordMap]);

  // Month navigation
  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Handle cell blur - auto save
  const handleCellBlur = useCallback(async (
    studentId: number,
    studentName: string,
    className: string,
    field: FieldKey,
    value: string
  ) => {
    const cellKey = `${studentId}-${field}`;
    const currentRecord = recordMap.get(studentId);
    const existingValue = currentRecord ? (currentRecord[field] || "") : "";

    // Only save if value changed
    if (value === existingValue) {
      pendingRef.current.delete(cellKey);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        month: selectedMonth,
        studentId,
        studentName,
        className,
        field,
        value,
      });
      pendingRef.current.delete(cellKey);
    } catch {
      // Error toast already shown by onError
      pendingRef.current.delete(cellKey);
    }
  }, [selectedMonth, recordMap, saveMutation]);

  // Export Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      await refetchRange();
      const wb = new ExcelJS.Workbook();

      // Parse months in range
      const months: string[] = [];
      const [sy, sm] = exportStart.split("-").map(Number);
      const [ey, em] = exportEnd.split("-").map(Number);
      let cy = sy, cm = sm;
      while (cy < ey || (cy === ey && cm <= em)) {
        months.push(`${cy}-${String(cm).padStart(2, "0")}`);
        cm++;
        if (cm > 12) { cm = 1; cy++; }
      }

      // Group range records
      const rangeMap = new Map<string, Map<number, (typeof rangeRecords)[0]>>();
      for (const r of rangeRecords) {
        if (!rangeMap.has(r.month)) rangeMap.set(r.month, new Map());
        rangeMap.get(r.month)!.set(r.studentId, r);
      }

      // Create worksheet per class
      for (const [className, classStudents] of studentsByClass) {
        const ws = wb.addWorksheet(className);

        // Header row
        const headerRow = ["姓名"];
        for (const m of months) {
          headerRow.push(`${m} 身高(cm)`, `${m} 體重(kg)`, `${m} 頭圍(cm)`, `${m} 腳長(cm)`);
        }
        const hRow = ws.addRow(headerRow);
        hRow.font = { bold: true };
        hRow.alignment = { horizontal: "center" };

        // Data rows
        for (const s of classStudents) {
          const row: (string | number)[] = [s.name];
          for (const m of months) {
            const monthMap = rangeMap.get(m);
            const r = monthMap?.get(s.id);
            row.push(r?.height || "", r?.weight || "", r?.headCircumference || "", r?.footLength || "");
          }
          ws.addRow(row);
        }

        // Auto width
        ws.columns.forEach((col) => {
          col.width = 14;
        });
        if (ws.columns[0]) ws.columns[0].width = 10;
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `成長檔案_${exportStart}_${exportEnd}.xlsx`);
      setExportOpen(false);
      toast.success("匯出成功");
    } catch (err: any) {
      toast.error(`匯出失敗：${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">成長檔案</h1>
          <p className="text-muted-foreground text-sm mt-1">每月記錄幼生身高、體重、頭圍、腳長</p>
        </div>
        <Button variant="outline" onClick={() => { setExportStart(selectedMonth); setExportEnd(selectedMonth); setExportOpen(true); }}>
          <Download className="h-4 w-4 mr-2" />
          匯出 Excel
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-44"
        />
        <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-sm text-muted-foreground">幼生總數</div>
            <div className="text-2xl font-bold text-primary">{stats.total} 人</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-sm text-muted-foreground">已填寫</div>
            <div className="text-2xl font-bold text-green-600">{stats.filled} 人</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-sm text-muted-foreground">未填寫</div>
            <div className="text-2xl font-bold text-orange-500">{stats.unfilled} 人</div>
          </CardContent>
        </Card>
      </div>

      {/* Class tables */}
      {studentsByClass.map(([className, classStudents]) => (
        <Card key={className}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{className}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium w-20">姓名</th>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="text-center py-2 px-2 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          {f.icon}
                          <span>{f.label}({f.unit})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s) => {
                    const record = recordMap.get(s.id);
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">{s.name}</td>
                        {FIELDS.map((f) => (
                          <td key={f.key} className="py-1 px-1">
                            <GrowthInput
                              defaultValue={record ? (record[f.key] || "") : ""}
                              onSave={(value) => handleCellBlur(s.id, s.name, s.className, f.key, value)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            尚無幼生名單，請先到「幼生名單」頁面新增幼生
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>匯出成長檔案 Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>起始月份</Label>
                <Input type="month" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
              </div>
              <div>
                <Label>結束月份</Label>
                <Input type="month" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              將匯出 {exportStart} 至 {exportEnd} 的所有幼生成長數據，按班級分工作表。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>取消</Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? "匯出中..." : "匯出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Controlled input component for each cell
function GrowthInput({ defaultValue, onSave }: { defaultValue: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  // Sync when defaultValue changes (e.g., month switch)
  const prevDefault = useRef(defaultValue);
  if (prevDefault.current !== defaultValue) {
    prevDefault.current = defaultValue;
    setValue(defaultValue);
  }

  const handleBlur = async () => {
    if (value !== defaultValue) {
      setSaving(true);
      await onSave(value);
      setSaving(false);
    }
  };

  return (
    <Input
      type="number"
      step="0.1"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className={`h-8 text-center text-sm ${saving ? "opacity-50" : ""} ${value ? "" : "bg-muted/30"}`}
      placeholder="-"
    />
  );
}
