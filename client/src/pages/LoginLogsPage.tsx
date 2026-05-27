import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";

type FilterType = "all" | "success" | "failed";

export default function LoginLogsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data: logs = [], isLoading, refetch, isFetching } = trpc.loginLog.list.useQuery(
    { limit: 300 },
    { refetchOnWindowFocus: false }
  );

  const filteredLogs = useMemo(() => {
    if (filter === "all") return logs;
    if (filter === "success") return logs.filter((l) => l.success === 1);
    return logs.filter((l) => l.success !== 1);
  }, [logs, filter]);

  const successCount = logs.filter((l) => l.success === 1).length;
  const failedCount = logs.filter((l) => l.success !== 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">登入紀錄</h1>
            <p className="text-sm text-muted-foreground mt-1">
              查看系統登入歷史紀錄，包含成功與失敗的登入嘗試
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`border-0 shadow-sm cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary">{logs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">總紀錄數</p>
          </CardContent>
        </Card>
        <Card
          className={`border-0 shadow-sm cursor-pointer transition-all ${filter === "success" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setFilter("success")}
        >
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{successCount}</p>
            <p className="text-xs text-muted-foreground mt-1">登入成功</p>
          </CardContent>
        </Card>
        <Card
          className={`border-0 shadow-sm cursor-pointer transition-all ${filter === "failed" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setFilter("failed")}
        >
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-500">{failedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">登入失敗</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "all" ? "尚無登入紀錄" : filter === "success" ? "尚無成功登入紀錄" : "尚無失敗登入紀錄"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              {filter === "all" ? "所有紀錄" : filter === "success" ? "成功紀錄" : "失敗紀錄"} ({filteredLogs.length} 筆)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium w-10">狀態</th>
                    <th className="text-left py-2 px-2 font-medium">時間</th>
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">名稱</th>
                    <th className="text-left py-2 px-2 font-medium">登入方式</th>
                    <th className="text-left py-2 px-2 font-medium">IP 位址</th>
                    <th className="text-left py-2 px-2 font-medium">失敗原因</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className={`border-b last:border-0 hover:bg-muted/30 ${log.success !== 1 ? "bg-red-50/50" : ""}`}>
                      <td className="py-2 px-2">
                        {log.success === 1 ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("zh-TW", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-2 font-medium text-xs">{log.email}</td>
                      <td className="py-2 px-2 text-muted-foreground">{log.name || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">{log.loginMethod || "-"}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs font-mono">{log.ipAddress || "-"}</td>
                      <td className="py-2 px-2 text-xs">
                        {log.success !== 1 ? (
                          <span className="text-red-600">{log.failReason || "-"}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
