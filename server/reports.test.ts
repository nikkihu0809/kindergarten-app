import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  listStudents: vi.fn().mockResolvedValue([
    { id: 1, className: "A", name: "王小明", birthday: "2023-04-13", fatherName: "王大明", fatherPhone: "0912345678", motherName: "林美美", motherPhone: "0923456789", notes: "", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, className: "A", name: "李小花", birthday: "2023-05-09", fatherName: "李大華", fatherPhone: "0934567890", motherName: "張小芳", motherPhone: "0945678901", notes: "", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, className: "B", name: "張大寶", birthday: "2023-11-08", fatherName: "張志明", fatherPhone: "0956789012", motherName: "陳美玲", motherPhone: "0967890123", notes: "", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getMonthlyAttendance: vi.fn().mockResolvedValue([
    { id: 1, date: "2026-02-02", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", createdAt: new Date() },
    { id: 2, date: "2026-02-02", studentId: 1, studentName: "王小明", type: "checkout", time: "16:00:00", temperature: "", leaveReason: "", createdAt: new Date() },
    { id: 3, date: "2026-02-03", studentId: 1, studentName: "王小明", type: "checkin", time: "08:25:00", temperature: "36.3", leaveReason: "", createdAt: new Date() },
    { id: 4, date: "2026-02-03", studentId: 1, studentName: "王小明", type: "checkout", time: "16:05:00", temperature: "", leaveReason: "", createdAt: new Date() },
    { id: 5, date: "2026-02-02", studentId: 2, studentName: "李小花", type: "leave", time: "09:00:00", temperature: "", leaveReason: "感冒", createdAt: new Date() },
    { id: 6, date: "2026-02-03", studentId: 2, studentName: "李小花", type: "checkin", time: "08:40:00", temperature: "36.8", leaveReason: "", createdAt: new Date() },
    { id: 7, date: "2026-02-03", studentId: 2, studentName: "李小花", type: "checkout", time: "16:10:00", temperature: "", leaveReason: "", createdAt: new Date() },
  ]),
  getMonthlyParentComm: vi.fn().mockResolvedValue([
    { id: 1, weekNumber: 5, date: "2026-02-02", studentId: 1, studentName: "王小明", method: "phone", teacherShare: "王小明今天表現很好", parentFeedback: "謝謝老師", createdBy: 1, createdAt: new Date() },
    { id: 2, weekNumber: 6, date: "2026-02-10", studentId: 1, studentName: "王小明", method: "interview", teacherShare: "進步很多", parentFeedback: "很開心", createdBy: 1, createdAt: new Date() },
    { id: 3, weekNumber: 5, date: "2026-02-03", studentId: 3, studentName: "張大寶", method: "phone", teacherShare: "需要多練習", parentFeedback: "會配合", createdBy: 1, createdAt: new Date() },
  ]),
  // Other mocks needed by the router
  addStudent: vi.fn(),
  bulkUpsertStudents: vi.fn(),
  deleteStudent: vi.fn(),
  updateStudent: vi.fn(),
  listTeachers: vi.fn().mockResolvedValue([]),
  addTeacher: vi.fn(),
  bulkUpsertTeachers: vi.fn(),
  deleteTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  getCurriculumByDate: vi.fn().mockResolvedValue(null),
  upsertCurriculum: vi.fn(),
  getAttendanceByDate: vi.fn().mockResolvedValue([]),
  addAttendance: vi.fn(),
  deleteAttendance: vi.fn(),
  listTeacherLeaves: vi.fn().mockResolvedValue([]),
  addTeacherLeave: vi.fn(),
  deleteTeacherLeave: vi.fn(),
  listParentComm: vi.fn().mockResolvedValue([]),
  addParentComm: vi.fn(),
  deleteParentComm: vi.fn(),
  getWeeklyCommCheck: vi.fn().mockResolvedValue({ allStudents: [], studentsWithComm: [] }),
  getDailyReportData: vi.fn().mockResolvedValue({
    attendance: [
      { id: 1, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", createdAt: new Date() },
      { id: 2, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkout", time: "16:00:00", temperature: "", leaveReason: "", createdAt: new Date() },
      { id: 3, date: "2026-02-25", studentId: 2, studentName: "李小花", type: "checkin", time: "08:40:00", temperature: "38.2", leaveReason: "", createdAt: new Date() },
      { id: 4, date: "2026-02-25", studentId: 3, studentName: "張大寶", type: "leave", time: "09:00:00", temperature: "", leaveReason: "感冒發燒", createdAt: new Date() },
    ],
    students: [
      { id: 1, className: "A", name: "王小明", birthday: "2023-04-13", fatherName: "王大明", fatherPhone: "0912345678", motherName: "林美美", motherPhone: "0923456789", notes: "", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, className: "A", name: "李小花", birthday: "2023-05-09", fatherName: "李大華", fatherPhone: "0934567890", motherName: "張小芳", motherPhone: "0945678901", notes: "", createdAt: new Date(), updatedAt: new Date() },
      { id: 3, className: "B", name: "張大寶", birthday: "2023-11-08", fatherName: "張志明", fatherPhone: "0956789012", motherName: "陳美玲", motherPhone: "0967890123", notes: "", createdAt: new Date(), updatedAt: new Date() },
    ],
  }),
  updateAttendance: vi.fn().mockResolvedValue(undefined),
  listIncidentReports: vi.fn().mockResolvedValue([
    { id: 1, date: "2026-02-10", className: "A", studentId: 1, studentName: "王小明", description: "跑步時跌倒擦傷膝蓋", woundType: "scrape", time: "10:30", location: "操場", parentResponse: "已知惉，謝謝老師", handler: "陳老師", photoUrls: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, date: "2026-02-15", className: "B", studentId: 3, studentName: "張大寶", description: "被積木砲到頭", woundType: "bump", time: "14:00", location: "教室", parentResponse: "", handler: "林老師", photoUrls: JSON.stringify(["https://example.com/photo1.jpg"]), createdAt: new Date(), updatedAt: new Date() },
  ]),
  addIncidentReport: vi.fn().mockResolvedValue(undefined),
  updateIncidentReport: vi.fn().mockResolvedValue(undefined),
  deleteIncidentReport: vi.fn().mockResolvedValue(undefined),
  getMonthlyIncidents: vi.fn().mockResolvedValue([
    { id: 1, date: "2026-02-10", className: "A", studentId: 1, studentName: "王小明", description: "跑步時跌倒擦傷膝蓋", woundType: "scrape", time: "10:30", location: "操場", parentResponse: "已知惉", handler: "陳老師", photoUrls: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, date: "2026-02-15", className: "B", studentId: 3, studentName: "張大寶", description: "被積木砲到頭", woundType: "bump", time: "14:00", location: "教室", parentResponse: "", handler: "林老師", photoUrls: JSON.stringify(["https://example.com/photo1.jpg"]), createdAt: new Date(), updatedAt: new Date() },
  ]),
  getWeeklyParentComm: vi.fn().mockResolvedValue({
    comms: [
      { id: 1, weekNumber: 9, date: "2026-02-23", studentId: 1, studentName: "王小明", method: "phone", teacherShare: "表現很好", parentFeedback: "謝謝", createdBy: 1, createdAt: new Date() },
      { id: 2, weekNumber: 9, date: "2026-02-24", studentId: 3, studentName: "張大寶", method: "interview", teacherShare: "進步中", parentFeedback: "會配合", createdBy: 1, createdAt: new Date() },
    ],
    students: [
      { id: 1, className: "A", name: "王小明", birthday: "2023-04-13" },
      { id: 2, className: "A", name: "李小花", birthday: "2023-05-09" },
      { id: 3, className: "B", name: "張大寶", birthday: "2023-11-08" },
    ],
  }),
  getStudentProfile: vi.fn().mockResolvedValue({
    student: { id: 1, name: "王小明", className: "A", birthday: "2023-04-13", fatherName: "王大明", fatherPhone: "0912345678", motherName: "林美美", motherPhone: "0923456789", notes: "" },
    attendance: [],
    incidents: [],
    communications: [],
  }),
  getTodayIncidentCount: vi.fn().mockResolvedValue(0),
  getMonthlyAttendanceDetail: vi.fn().mockResolvedValue({
    attendance: [
      { id: 1, date: "2026-02-02", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", notes: "由爸爸接送", createdAt: new Date() },
      { id: 2, date: "2026-02-02", studentId: 1, studentName: "王小明", type: "checkout", time: "16:00:00", temperature: "", leaveReason: "", notes: "", createdAt: new Date() },
      { id: 3, date: "2026-02-02", studentId: 2, studentName: "李小花", type: "leave", time: "09:00:00", temperature: "", leaveReason: "感冒", notes: "", createdAt: new Date() },
      { id: 4, date: "2026-02-03", studentId: 1, studentName: "王小明", type: "checkin", time: "08:25:00", temperature: "36.3", leaveReason: "", notes: "", createdAt: new Date() },
      { id: 5, date: "2026-02-03", studentId: 1, studentName: "王小明", type: "checkout", time: "16:05:00", temperature: "", leaveReason: "", notes: "", createdAt: new Date() },
    ],
    students: [
      { id: 1, className: "A", name: "王小明", birthday: "2023-04-13", enrollmentDate: "2024-09-01" },
      { id: 2, className: "A", name: "李小花", birthday: "2023-05-09", enrollmentDate: "2024-09-01" },
      { id: 3, className: "B", name: "張大寶", birthday: "2023-11-08", enrollmentDate: null },
    ],
  }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({ text: "", language: "zh" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test", url: "https://example.com/test" }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-teacher",
    email: "teacher@example.com",
    name: "Test Teacher",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Monthly Attendance Report", () => {
  it("returns correct attendance statistics for all students", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    expect(result.yearMonth).toBe("2026-02");
    expect(result.workingDays).toBe(20); // Feb 2026 has 20 working days
    expect(result.studentStats).toHaveLength(3);
  });

  it("correctly counts attendance days for a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    // 王小明: 2 checkin days
    const student1 = result.studentStats.find(s => s.studentName === "王小明");
    expect(student1).toBeDefined();
    expect(student1!.attendDays).toBe(2);
    expect(student1!.leaveDays).toBe(0);
    expect(student1!.absentDays).toBe(18); // 20 - 2
    expect(student1!.className).toBe("A");
  });

  it("correctly counts leave days for a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    // 李小花: 1 checkin day, 1 leave day
    const student2 = result.studentStats.find(s => s.studentName === "李小花");
    expect(student2).toBeDefined();
    expect(student2!.attendDays).toBe(1);
    expect(student2!.leaveDays).toBe(1);
    expect(student2!.absentDays).toBe(18); // 20 - 1 - 1
  });

  it("returns zero attendance for student with no records", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    // 張大寶: no records
    const student3 = result.studentStats.find(s => s.studentName === "張大寶");
    expect(student3).toBeDefined();
    expect(student3!.attendDays).toBe(0);
    expect(student3!.leaveDays).toBe(0);
    expect(student3!.absentDays).toBe(20);
  });

  it("collects temperature records", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    const student1 = result.studentStats.find(s => s.studentName === "王小明");
    expect(student1!.temperatures).toHaveLength(2);
    expect(student1!.temperatures[0].temperature).toBe("36.5");
    expect(student1!.temperatures[1].temperature).toBe("36.3");
  });

  it("returns working days list", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyAttendance({ yearMonth: "2026-02" });

    expect(result.allDates).toHaveLength(20);
    // First working day of Feb 2026 is Monday Feb 2
    expect(result.allDates[0]).toBe("2026-02-02");
  });

  it("rejects invalid yearMonth format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.report.monthlyAttendance({ yearMonth: "2026-2" })
    ).rejects.toThrow();
  });

  it("rejects non-date yearMonth format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.report.monthlyAttendance({ yearMonth: "abc" })
    ).rejects.toThrow();
  });
});

describe("Monthly Parent Communication Report", () => {
  it("returns correct communication statistics for all students", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyParentComm({ yearMonth: "2026-02" });

    expect(result.yearMonth).toBe("2026-02");
    expect(result.totalRecords).toBe(3);
    expect(result.studentComms).toHaveLength(3);
  });

  it("correctly counts communications per student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyParentComm({ yearMonth: "2026-02" });

    // 王小明: 2 communications
    const student1 = result.studentComms.find(s => s.studentName === "王小明");
    expect(student1).toBeDefined();
    expect(student1!.commCount).toBe(2);
    expect(student1!.communications).toHaveLength(2);
  });

  it("returns communication details correctly", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyParentComm({ yearMonth: "2026-02" });

    const student1 = result.studentComms.find(s => s.studentName === "王小明");
    expect(student1!.communications[0].method).toBe("phone");
    expect(student1!.communications[0].teacherShare).toBe("王小明今天表現很好");
    expect(student1!.communications[1].method).toBe("interview");
  });

  it("returns zero communications for student with no records", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyParentComm({ yearMonth: "2026-02" });

    // 李小花: no communications
    const student2 = result.studentComms.find(s => s.studentName === "李小花");
    expect(student2).toBeDefined();
    expect(student2!.commCount).toBe(0);
    expect(student2!.communications).toHaveLength(0);
  });

  it("rejects invalid yearMonth format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.report.monthlyParentComm({ yearMonth: "2026/02" })
    ).rejects.toThrow();
  });
});

describe("Daily Attendance Report", () => {
  it("returns correct daily attendance summary", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    expect(result.date).toBe("2026-02-25");
    expect(result.totalCheckins).toBe(2);
    expect(result.totalCheckouts).toBe(1);
    expect(result.totalLeaves).toBe(1);
  });

  it("correctly identifies fever alerts", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    expect(result.feverCount).toBe(1);
    expect(result.feverAlerts).toHaveLength(1);
    expect(result.feverAlerts[0].studentName).toBe("李小花");
    expect(result.feverAlerts[0].temperature).toBe("38.2");
    expect(result.feverAlerts[0].isFever).toBe(true);
  });

  it("associates student birthday with checkin records", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    const student1 = result.checkins.find(c => c.studentName === "王小明");
    expect(student1).toBeDefined();
    expect(student1!.birthday).toBe("2023-04-13");
    expect(student1!.className).toBe("A");
    expect(student1!.time).toBe("08:30:00");
    expect(student1!.temperature).toBe("36.5");
    expect(student1!.isFever).toBe(false);
  });

  it("associates student birthday with fever checkin", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    const student2 = result.checkins.find(c => c.studentName === "李小花");
    expect(student2).toBeDefined();
    expect(student2!.birthday).toBe("2023-05-09");
    expect(student2!.className).toBe("A");
    expect(student2!.isFever).toBe(true);
  });

  it("returns checkout records with class info", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    expect(result.checkouts).toHaveLength(1);
    expect(result.checkouts[0].studentName).toBe("王小明");
    expect(result.checkouts[0].className).toBe("A");
    expect(result.checkouts[0].time).toBe("16:00:00");
  });

  it("returns leave records with class info and reason", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    expect(result.leaves).toHaveLength(1);
    expect(result.leaves[0].studentName).toBe("張大寶");
    expect(result.leaves[0].className).toBe("B");
    expect(result.leaves[0].leaveReason).toBe("感冒發燒");
  });

  it("rejects invalid date format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.report.dailyAttendance({ date: "2026/02/25" })
    ).rejects.toThrow();
  });

  it("rejects incomplete date format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.report.dailyAttendance({ date: "2026-02" })
    ).rejects.toThrow();
  });

  it("normal temperature is not flagged as fever", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.dailyAttendance({ date: "2026-02-25" });

    const normalStudent = result.checkins.find(c => c.studentName === "王小明");
    expect(normalStudent!.temperatureValue).toBe(36.5);
    expect(normalStudent!.isFever).toBe(false);
  });
});

describe("Incident Reports", () => {
  it("lists incident reports", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.list({ startDate: "2026-02-01", endDate: "2026-02-28" });

    expect(result).toHaveLength(2);
    expect(result[0].studentName).toBe("王小明");
    expect(result[1].studentName).toBe("張大寶");
  });

  it("adds an incident report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.add({
      date: "2026-02-26",
      className: "A",
      studentId: 1,
      studentName: "王小明",
      description: "滑梯時跌倒",
      time: "11:00",
      location: "遊戲區",
      parentResponse: "",
      handler: "陳老師",
    });
    expect(result.success).toBe(true);
  });

  it("updates an incident report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.update({
      id: 1,
      description: "跑步時跌倒，左膝擦傷",
      parentResponse: "已知惉",
    });
    expect(result.success).toBe(true);
  });

  it("deletes an incident report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("uploads incident photo", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.uploadPhoto({
      base64: "dGVzdA==",
      mimeType: "image/jpeg",
      fileName: "test.jpg",
    });
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });
});

describe("Monthly Incident Report", () => {
  it("returns monthly incidents", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyIncidents({ yearMonth: "2026-02" });

    expect(result.yearMonth).toBe("2026-02");
    expect(result.incidents).toHaveLength(2);
    expect(result.incidents[0].className).toBe("A");
    expect(result.incidents[1].className).toBe("B");
  });

  it("includes incident details", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyIncidents({ yearMonth: "2026-02" });

    const inc1 = result.incidents.find(i => i.studentName === "王小明");
    expect(inc1).toBeDefined();
    expect(inc1!.description).toBe("跑步時跌倒擦傷膝蓋");
    expect(inc1!.location).toBe("操場");
    expect(inc1!.handler).toBe("陳老師");
  });
});

describe("Weekly Parent Communication Report", () => {
  it("returns weekly communication data grouped by class", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.weeklyParentComm({ weekNumber: 9 });

    expect(result.totalComms).toBe(2);
    expect(result.totalStudents).toBe(3);
    expect(result.completedStudents).toBe(2);
    expect(result.classGroups).toBeDefined();
  });

  it("groups students by class", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.weeklyParentComm({ weekNumber: 9 });

    expect(result.classGroups["A"]).toBeDefined();
    expect(result.classGroups["B"]).toBeDefined();
    expect(result.classGroups["A"]).toHaveLength(2);
    expect(result.classGroups["B"]).toHaveLength(1);
  });

  it("sorts students by age (oldest first, birthday ascending)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.weeklyParentComm({ weekNumber: 9 });

    const classA = result.classGroups["A"];
    // 王小明 birthday 2023-04-13 should be before 李小花 birthday 2023-05-09
    expect(classA[0].studentName).toBe("王小明");
    expect(classA[1].studentName).toBe("李小花");
  });

  it("includes communication details for each student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.weeklyParentComm({ weekNumber: 9 });

    const classA = result.classGroups["A"];
    const student1 = classA.find(s => s.studentName === "王小明");
    expect(student1!.commCount).toBe(1);
    expect(student1!.communications).toHaveLength(1);
    expect(student1!.communications[0].method).toBe("phone");
    expect(student1!.communications[0].teacherShare).toBe("表現很好");
  });

  it("shows zero communications for students without records", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.weeklyParentComm({ weekNumber: 9 });

    const classA = result.classGroups["A"];
    const student2 = classA.find(s => s.studentName === "李小花");
    expect(student2!.commCount).toBe(0);
    expect(student2!.communications).toHaveLength(0);
  });
});

describe("Incident Reports - Wound Type", () => {
  it("adds incident with woundType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.add({
      date: "2026-02-26",
      className: "A",
      studentId: 1,
      studentName: "王小明",
      description: "被同學咬到手臂",
      woundType: "bite",
      time: "10:30",
      location: "教室",
      parentResponse: "",
      handler: "陳老師",
    });
    expect(result.success).toBe(true);
  });

  it("adds incident with other woundType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.add({
      date: "2026-02-26",
      className: "B",
      studentId: 3,
      studentName: "張大寶",
      description: "被門夾到手指",
      woundType: "夾傷",
      time: "14:00",
      location: "走廊",
      parentResponse: "",
      handler: "林老師",
    });
    expect(result.success).toBe(true);
  });

  it("updates incident woundType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.update({
      id: 1,
      woundType: "bump",
      description: "跑步時撞到桌角",
    });
    expect(result.success).toBe(true);
  });

  it("monthly incidents include woundType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.report.monthlyIncidents({ yearMonth: "2026-02" });

    expect(result.incidents[0].woundType).toBe("scrape");
    expect(result.incidents[1].woundType).toBe("bump");
  });
});

describe("Dashboard - Monthly Incident Count", () => {
  it("returns monthly incident count", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.dashboard.monthlyIncidents({ yearMonth: "2026-02" });

    expect(typeof result).toBe("number");
    expect(result).toBe(2);
  });
});

describe("Monthly Attendance Detail (for Excel export)", () => {
  it("returns monthly attendance detail data", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.monthlyDetail({ yearMonth: "2026-02" });

    expect(result).toBeDefined();
    expect(result.attendance).toBeDefined();
    expect(result.students).toBeDefined();
  });

  it("returns attendance records for the month", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.monthlyDetail({ yearMonth: "2026-02" });

    expect(result.attendance.length).toBeGreaterThan(0);
  });

  it("returns all students", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.monthlyDetail({ yearMonth: "2026-02" });

    expect(result.students.length).toBeGreaterThan(0);
  });
});
