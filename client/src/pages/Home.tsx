import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, UserCheck, CalendarOff, MessageSquare, Users, GraduationCap, ShieldAlert, Ruler } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getISOWeek(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export default function Home() {
  const [, setLocation] = useLocation();
  const today = useMemo(() => getToday(), []);
  const currentWeek = useMemo(() => getISOWeek(new Date()), []);
  const currentYearMonth = useMemo(() => getCurrentYearMonth(), []);

  const { data: students } = trpc.student.list.useQuery();
  const { data: teachers } = trpc.teacher.list.useQuery();
  const { data: curriculum } = trpc.curriculum.get.useQuery({ date: today });
  const { data: attendance } = trpc.attendance.listByDate.useQuery({ date: today });
  const { data: weeklyCheck } = trpc.parentComm.weeklyCheck.useQuery({ weekNumber: currentWeek });
  const { data: monthlyIncidentCount } = trpc.dashboard.monthlyIncidents.useQuery({ yearMonth: currentYearMonth });
  const { data: todayTeacherLeaves } = trpc.dashboard.todayTeacherLeaves.useQuery({ date: today });
  const { data: growthProgress } = trpc.dashboard.growthProgress.useQuery({ yearMonth: currentYearMonth });

  const checkedInCount = attendance?.filter((a) => a.type === "checkin").length ?? 0;
  const checkedOutCount = attendance?.filter((a) => a.type === "checkout").length ?? 0;
  const leaves = attendance?.filter((a) => a.type === "leave") ?? [];
  const leaveCount = leaves.length;
  const leaveByType = useMemo(() => {
    const counts: Record<string, number> = {};
    leaves.forEach((a) => {
      const t = (a as any).leaveType || "未分類";
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [leaves]);

  const growthUnfilled = growthProgress ? growthProgress.totalStudents - growthProgress.filledStudents : 0;

  const quickCards = [
    {
      title: "今日課程",
      icon: BookOpen,
      value: curriculum ? "已填寫" : "尚未填寫",
      color: curriculum ? "text-emerald-600" : "text-amber-500",
      bg: "bg-emerald-50",
      path: "/curriculum",
    },
    {
      title: "上課打卡",
      icon: UserCheck,
      value: `${checkedInCount} 人`,
      color: "text-primary",
      bg: "bg-green-50",
      path: "/attendance",
    },
    {
      title: "下課打卡",
      icon: UserCheck,
      value: `${checkedOutCount} 人`,
      color: "text-teal-600",
      bg: "bg-teal-50",
      path: "/attendance",
    },
    {
      title: "今日請假",
      icon: CalendarOff,
      value: `${leaveCount} 人`,
      color: "text-amber-600",
      bg: "bg-amber-50",
      path: "/attendance",
      leaveDetail: leaveByType,
    },
    {
      title: "幼生人數",
      icon: GraduationCap,
      value: `${students?.length ?? 0} 人`,
      color: "text-lime-700",
      bg: "bg-lime-50",
      path: "/students",
    },
    {
      title: "老師人數",
      icon: Users,
      value: `${teachers?.length ?? 0} 人`,
      color: "text-cyan-700",
      bg: "bg-cyan-50",
      path: "/teachers",
      teacherLeaveDetail: todayTeacherLeaves?.byType,
    },
    {
      title: "本月意外傷害",
      icon: ShieldAlert,
      value: `${monthlyIncidentCount ?? 0} 件`,
      color: (monthlyIncidentCount ?? 0) > 0 ? "text-red-600" : "text-emerald-600",
      bg: (monthlyIncidentCount ?? 0) > 0 ? "bg-red-50" : "bg-emerald-50",
      path: "/incidents",
    },
    {
      title: "本週未溝通",
      icon: MessageSquare,
      value: `${weeklyCheck?.missing?.length ?? 0} 人`,
      color: (weeklyCheck?.missing?.length ?? 0) > 0 ? "text-orange-600" : "text-emerald-600",
      bg: (weeklyCheck?.missing?.length ?? 0) > 0 ? "bg-orange-50" : "bg-emerald-50",
      path: "/parent-comm",
    },
    {
      title: "成長檔案未填",
      icon: Ruler,
      value: `${growthUnfilled} 人`,
      color: growthUnfilled > 0 ? "text-violet-600" : "text-emerald-600",
      bg: growthUnfilled > 0 ? "bg-violet-50" : "bg-emerald-50",
      path: "/growth",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">儀表板</h1>
        <p className="text-muted-foreground mt-1">
          今天是 {today}，歡迎使用知愛家教育機構幼生管理平台
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
            onClick={() => setLocation(card.path)}
          >
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{card.title}</p>
              <p className={`text-lg font-semibold mt-0.5 ${card.color}`}>{card.value}</p>
              {card.leaveDetail && Object.keys(card.leaveDetail).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {Object.entries(card.leaveDetail).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className={`${type === '傳染性病假' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{type}</span>
                      <span className={`font-medium ${type === '傳染性病假' ? 'text-red-600' : 'text-amber-600'}`}>{count} 人</span>
                    </div>
                  ))}
                </div>
              )}
              {card.teacherLeaveDetail && Object.keys(card.teacherLeaveDetail).length > 0 && (
                <div className="mt-2 pt-2 border-t border-cyan-100 space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium mb-1">今日請假</p>
                  {Object.entries(card.teacherLeaveDetail).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{type}</span>
                      <span className="font-medium text-amber-600">{count} 人</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>


      {/* Today's Curriculum Summary */}
      {curriculum && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              今日課程摘要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(curriculum as any).courseCategory && (
              <div>
                <span className="text-xs text-muted-foreground">課程項目</span>
                <p className="text-sm">{(curriculum as any).courseCategory}</p>
              </div>
            )}
            {(curriculum as any).courseDescription && (
              <div>
                <span className="text-xs text-muted-foreground">課程說明</span>
                <p className="text-sm">{(curriculum as any).courseDescription}</p>
              </div>
            )}
            {curriculum.picturebook && (
              <div>
                <span className="text-xs text-muted-foreground">繪本</span>
                <p className="text-sm">{curriculum.picturebook}</p>
              </div>
            )}
            {curriculum.song && (
              <div>
                <span className="text-xs text-muted-foreground">歌謠</span>
                <p className="text-sm">{curriculum.song}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
