import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, User, Calendar, Thermometer, AlertTriangle,
  MessageSquare, ShieldAlert, UserCheck, Phone, LogIn, LogOut, CalendarOff, Ruler,
} from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useMemo } from "react";

export default function StudentProfilePage() {
  const [, params] = useRoute("/student/:id");
  const [, setLocation] = useLocation();
  const studentId = params?.id ? Number(params.id) : 0;

  const { data, isLoading } = trpc.studentProfile.get.useQuery(
    { studentId },
    { enabled: studentId > 0 }
  );

  const { data: growthRecords = [] } = trpc.growth.studentRecords.useQuery(
    { studentId },
    { enabled: studentId > 0 }
  );

  const student = data?.student;
  const attendanceRecords = data?.attendance ?? [];
  const incidents = data?.incidents ?? [];
  const communications = data?.communications ?? [];

  // 計算統計
  const stats = useMemo(() => {
    const checkins = attendanceRecords.filter(a => a.type === "checkin");
    const checkouts = attendanceRecords.filter(a => a.type === "checkout");
    const leaves = attendanceRecords.filter(a => a.type === "leave");
    const feverRecords = checkins.filter(a => {
      const temp = a.temperature ? parseFloat(a.temperature) : null;
      return temp !== null && temp >= 37.5;
    });
    return {
      totalCheckins: checkins.length,
      totalCheckouts: checkouts.length,
      totalLeaves: leaves.length,
      feverCount: feverRecords.length,
      checkins,
      checkouts,
      leaves,
      feverRecords,
    };
  }, [attendanceRecords]);

  // 出席記錄按日期合併
  const mergedAttendance = useMemo(() => {
    const dateMap = new Map<string, {
      date: string;
      checkinTime: string;
      checkoutTime: string;
      temperature: string;
      isFever: boolean;
      isLeave: boolean;
      leaveReason: string;
    }>();

    attendanceRecords.forEach(a => {
      let entry = dateMap.get(a.date);
      if (!entry) {
        entry = { date: a.date, checkinTime: "", checkoutTime: "", temperature: "", isFever: false, isLeave: false, leaveReason: "" };
        dateMap.set(a.date, entry);
      }
      if (a.type === "checkin") {
        entry.checkinTime = a.time;
        entry.temperature = a.temperature ?? "";
        const temp = a.temperature ? parseFloat(a.temperature) : null;
        entry.isFever = temp !== null && temp >= 37.5;
      } else if (a.type === "checkout") {
        entry.checkoutTime = a.time;
      } else if (a.type === "leave") {
        entry.isLeave = true;
        entry.leaveReason = a.leaveReason;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回幼生名單
        </Button>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            找不到此幼生資料
          </CardContent>
        </Card>
      </div>
    );
  }

  const age = (() => {
    if (!student.birthday) return "";
    const birth = new Date(student.birthday);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    return `${years} 歲 ${months} 個月`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/students")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
          <p className="text-muted-foreground">{student.className}班・{age}</p>
        </div>
      </div>

      {/* Student Info Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">姓名</p>
                <p className="font-medium">{student.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">出生日期</p>
                <p className="font-medium">{student.birthday || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">父親</p>
                <p className="font-medium">{student.fatherName || "-"} {student.fatherPhone ? `(${student.fatherPhone})` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-pink-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">母親</p>
                <p className="font-medium">{student.motherName || "-"} {student.motherPhone ? `(${student.motherPhone})` : ""}</p>
              </div>
            </div>
          </div>
          {student.notes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">備註</p>
              <p className="text-sm">{student.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <LogIn className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">上課打卡</p>
            <p className="text-lg font-semibold text-green-600">{stats.totalCheckins} 次</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <CalendarOff className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">請假</p>
            <p className="text-lg font-semibold text-amber-600">{stats.totalLeaves} 次</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Thermometer className={`h-5 w-5 mx-auto mb-1 ${stats.feverCount > 0 ? "text-red-600" : "text-emerald-600"}`} />
            <p className="text-xs text-muted-foreground">體溫異常</p>
            <p className={`text-lg font-semibold ${stats.feverCount > 0 ? "text-red-600" : "text-emerald-600"}`}>{stats.feverCount} 次</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">家長溝通</p>
            <p className="text-lg font-semibold text-purple-600">{communications.length} 次</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">
            <UserCheck className="h-4 w-4 mr-1.5" />
            出席紀錄
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            溝通紀錄
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            意外傷害
          </TabsTrigger>
          <TabsTrigger value="growth">
            <Ruler className="h-4 w-4 mr-1.5" />
            成長檔案
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          {mergedAttendance.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">日期</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">上課時間</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">體溫</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">下課時間</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedAttendance.map(r => (
                        <tr key={r.date} className={`border-b last:border-0 ${r.isFever ? "bg-red-50" : r.isLeave ? "bg-amber-50/50" : "hover:bg-muted/30"}`}>
                          <td className="py-2 px-3 font-medium">{r.date}</td>
                          <td className="py-2 px-3 text-center">{r.checkinTime || "-"}</td>
                          <td className={`py-2 px-3 text-center font-medium ${r.isFever ? "text-red-600" : ""}`}>
                            {r.temperature ? `${r.temperature}°C` : "-"}
                            {r.isFever && <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />}
                          </td>
                          <td className="py-2 px-3 text-center">{r.checkoutTime || "-"}</td>
                          <td className="py-2 px-3 text-center">
                            {r.isLeave ? (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">請假</Badge>
                            ) : r.isFever ? (
                              <Badge variant="destructive" className="text-xs">體溫異常</Badge>
                            ) : r.checkinTime && r.checkoutTime ? (
                              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">已完成</Badge>
                            ) : r.checkinTime ? (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">上課中</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">-</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">尚無出席紀錄</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          {communications.length > 0 ? (
            <div className="space-y-3">
              {communications.sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                <Card key={c.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {c.method === "interview" ? "面談" : "電話"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{c.date}</span>
                      <span className="text-xs text-muted-foreground">第 {c.weekNumber} 週</span>
                    </div>
                    {c.teacherShare && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">老師分享</p>
                        <p className="text-sm bg-muted/50 rounded-lg p-2">{c.teacherShare}</p>
                      </div>
                    )}
                    {c.parentFeedback && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">家長回饋</p>
                        <p className="text-sm bg-blue-50 rounded-lg p-2">{c.parentFeedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">尚無溝通紀錄</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          {incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.sort((a, b) => b.date.localeCompare(a.date)).map(inc => (
                <Card key={inc.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm">{inc.date}</span>
                      {inc.time && <span className="text-xs text-muted-foreground">{inc.time}</span>}
                      {inc.location && <Badge variant="outline" className="text-xs">{inc.location}</Badge>}
                    </div>
                    {inc.description && <p className="text-sm mb-2">{inc.description}</p>}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {inc.handler && <span>處理人：{inc.handler}</span>}
                      {inc.parentResponse && <span>家長回覆：{inc.parentResponse}</span>}
                    </div>
                    {inc.photoUrls && (() => {
                      try {
                        const urls = JSON.parse(inc.photoUrls) as string[];
                        if (urls.length > 0) {
                          return (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {urls.map((url, i) => (
                                <img key={i} src={url} alt={`照片 ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border" />
                              ))}
                            </div>
                          );
                        }
                      } catch { /* ignore */ }
                      return null;
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">尚無意外傷害紀錄</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Growth Records Tab */}
        <TabsContent value="growth">
          {growthRecords.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">月份</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">身高 (cm)</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">體重 (kg)</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">頭圍 (cm)</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">腳長 (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growthRecords.map((r, idx) => {
                        const prev = idx < growthRecords.length - 1 ? growthRecords[idx + 1] : null;
                        const diffStr = (cur: string | null, prevVal: string | null) => {
                          if (!cur || !prevVal) return null;
                          const diff = parseFloat(cur) - parseFloat(prevVal);
                          if (isNaN(diff) || diff === 0) return null;
                          return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                        };
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 px-3 font-medium">{r.month}</td>
                            <td className="py-2 px-3 text-center">
                              {r.height || "-"}
                              {prev && diffStr(r.height, prev.height) && (
                                <span className={`ml-1 text-xs ${parseFloat(diffStr(r.height, prev.height)!) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  ({diffStr(r.height, prev.height)})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {r.weight || "-"}
                              {prev && diffStr(r.weight, prev.weight) && (
                                <span className={`ml-1 text-xs ${parseFloat(diffStr(r.weight, prev.weight)!) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  ({diffStr(r.weight, prev.weight)})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {r.headCircumference || "-"}
                              {prev && diffStr(r.headCircumference, prev.headCircumference) && (
                                <span className={`ml-1 text-xs ${parseFloat(diffStr(r.headCircumference, prev.headCircumference)!) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  ({diffStr(r.headCircumference, prev.headCircumference)})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {r.footLength || "-"}
                              {prev && diffStr(r.footLength, prev.footLength) && (
                                <span className={`ml-1 text-xs ${parseFloat(diffStr(r.footLength, prev.footLength)!) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  ({diffStr(r.footLength, prev.footLength)})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Ruler className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p>尚無成長檔案紀錄</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
