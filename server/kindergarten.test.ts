import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  listStudents: vi.fn().mockResolvedValue([
    { id: 1, className: "小班", name: "王小明", birthday: "2023-04-13", enrollmentDate: "2024-09-01", fatherName: "王大明", fatherPhone: "0912345678", motherName: "林美美", motherPhone: "0923456789", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, className: "小班", name: "李小花", birthday: "2023-05-09", enrollmentDate: "2024-09-15", fatherName: "李大華", fatherPhone: "0934567890", motherName: "張小芳", motherPhone: "0945678901", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, className: "中班", name: "張大寶", birthday: "2023-11-08", enrollmentDate: "2025-02-01", fatherName: "張志明", fatherPhone: "0956789012", motherName: "陳美玖", motherPhone: "0967890123", createdAt: new Date(), updatedAt: new Date() },
  ]),
  addStudent: vi.fn().mockResolvedValue(undefined),
  bulkUpsertStudents: vi.fn().mockResolvedValue(undefined),
  deleteStudent: vi.fn().mockResolvedValue(undefined),
  updateStudent: vi.fn().mockResolvedValue(undefined),
  listTeachers: vi.fn().mockResolvedValue([
    { id: 1, name: "陳老師", title: "班導師", phone: "0911111111", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "林老師", title: "助教", phone: "0922222222", createdAt: new Date(), updatedAt: new Date() },
  ]),
  addTeacher: vi.fn().mockResolvedValue(undefined),
  bulkUpsertTeachers: vi.fn().mockResolvedValue(undefined),
  deleteTeacher: vi.fn().mockResolvedValue(undefined),
  updateTeacher: vi.fn().mockResolvedValue(undefined),
  getCurriculumByDate: vi.fn().mockResolvedValue(null),
  upsertCurriculum: vi.fn().mockResolvedValue(1),
  listCurriculumByMonth: vi.fn().mockResolvedValue([]),
  deleteCurriculum: vi.fn().mockResolvedValue(undefined),
  updateCurriculum: vi.fn().mockResolvedValue(undefined),
  getAttendanceByDate: vi.fn().mockResolvedValue([]),
  addAttendance: vi.fn().mockResolvedValue(undefined),
  deleteAttendance: vi.fn().mockResolvedValue(undefined),
  listTeacherLeaves: vi.fn().mockResolvedValue([]),
  addTeacherLeave: vi.fn().mockResolvedValue(undefined),
  deleteTeacherLeave: vi.fn().mockResolvedValue(undefined),
  listParentComm: vi.fn().mockResolvedValue([]),
  addParentComm: vi.fn().mockResolvedValue(undefined),
  deleteParentComm: vi.fn().mockResolvedValue(undefined),
  updateParentComm: vi.fn().mockResolvedValue(undefined),
  getWeeklyCommCheck: vi.fn().mockResolvedValue({
    allStudents: [
      { id: 1, name: "王小明", className: "小班", enrollmentDate: "2024-09-01", withdrawalDate: null },
      { id: 2, name: "李小花", className: "小班", enrollmentDate: "2024-09-15", withdrawalDate: null },
      { id: 3, name: "張大寶", className: "中班", enrollmentDate: "2025-02-01", withdrawalDate: null },
    ],
    studentsWithComm: [1],
  }),
  updateAttendance: vi.fn().mockResolvedValue(undefined),
  getMonthlyAttendance: vi.fn().mockResolvedValue([]),
  getMonthlyParentComm: vi.fn().mockResolvedValue([]),
  getDailyReportData: vi.fn().mockResolvedValue({ attendance: [], students: [] }),
  listIncidentReports: vi.fn().mockResolvedValue([]),
  addIncidentReport: vi.fn().mockResolvedValue(undefined),
  updateIncidentReport: vi.fn().mockResolvedValue(undefined),
  deleteIncidentReport: vi.fn().mockResolvedValue(undefined),
  getMonthlyIncidents: vi.fn().mockResolvedValue([]),
  getWeeklyParentComm: vi.fn().mockResolvedValue({ comms: [], students: [] }),
  getStudentProfile: vi.fn().mockResolvedValue({
    student: { id: 1, name: "王小明", className: "小班", birthday: "2023-04-13", enrollmentDate: "2024-09-01", fatherName: "王大明", fatherPhone: "0912345678", motherName: "林美美", motherPhone: "0923456789", notes: "" },
    attendance: [
      { id: 1, type: "checkin", date: "2026-02-26", time: "08:30", temperature: "36.5", leaveReason: "" },
      { id: 2, type: "checkout", date: "2026-02-26", time: "17:00", temperature: null, leaveReason: "" },
    ],
    incidents: [],
    communications: [],
  }),
  getTodayIncidentCount: vi.fn().mockResolvedValue(2),
  getMonthlyAttendanceDetail: vi.fn().mockResolvedValue({ attendance: [], students: [] }),
  getTodayTeacherLeavesByType: vi.fn().mockResolvedValue([]),
  listStatItems: vi.fn().mockResolvedValue([]),
  addStatItem: vi.fn().mockResolvedValue(1),
  updateStatItem: vi.fn().mockResolvedValue(undefined),
  deleteStatItem: vi.fn().mockResolvedValue(undefined),
  getStatRecordsByItem: vi.fn().mockResolvedValue([]),
  upsertStatRecord: vi.fn().mockResolvedValue(undefined),
  bulkUpsertStatRecords: vi.fn().mockResolvedValue(undefined),
  getStatSummary: vi.fn().mockResolvedValue([
    { id: 1, name: "3月午睡棉被費", statusLabel: "已繳交", checkedCount: 2, totalCount: 3, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getGrowthRecordsByMonth: vi.fn().mockResolvedValue([
    { id: 1, month: "2026-03", studentId: 1, studentName: "王小明", className: "小班", height: "85.5", weight: "12.3", headCircumference: "48.0", footLength: "15.5", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getGrowthRecordsByRange: vi.fn().mockResolvedValue([
    { id: 1, month: "2026-02", studentId: 1, studentName: "王小明", className: "小班", height: "84.0", weight: "12.0", headCircumference: "47.5", footLength: "15.0", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, month: "2026-03", studentId: 1, studentName: "王小明", className: "小班", height: "85.5", weight: "12.3", headCircumference: "48.0", footLength: "15.5", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getStudentPreviousGrowth: vi.fn().mockResolvedValue(null),
  upsertGrowthRecord: vi.fn().mockResolvedValue(undefined),
  getStudentGrowthRecords: vi.fn().mockResolvedValue([
    { id: 1, month: "2026-03", studentId: 1, studentName: "王小明", className: "小班", height: "85.5", weight: "12.3", headCircumference: "48.0", footLength: "15.5", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, month: "2026-02", studentId: 1, studentName: "王小明", className: "小班", height: "84.0", weight: "12.0", headCircumference: "47.5", footLength: "15.0", createdAt: new Date(), updatedAt: new Date() },
  ]),
  listMeetings: vi.fn().mockResolvedValue([]),
  getMeeting: vi.fn().mockResolvedValue(undefined),
  addMeeting: vi.fn().mockResolvedValue(1),
  updateMeeting: vi.fn().mockResolvedValue(undefined),
  deleteMeeting: vi.fn().mockResolvedValue(undefined),
  listMotionsByMeeting: vi.fn().mockResolvedValue([]),
  addMotion: vi.fn().mockResolvedValue(1),
  updateMotion: vi.fn().mockResolvedValue(undefined),
  deleteMotion: vi.fn().mockResolvedValue(undefined),
  aggregateMeetingReportData: vi.fn().mockResolvedValue(null),
  getGrowthProgress: vi.fn().mockResolvedValue({
    totalStudents: 3,
    filledStudents: 1,
    unfilledStudents: [
      { id: 2, name: "李小花", className: "小班" },
      { id: 3, name: "張大寶", className: "中班" },
    ],
  }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  listAllowedEmails: vi.fn().mockResolvedValue([
    { id: 1, email: "test@gmail.com", name: "測試帳號", isActive: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  addAllowedEmail: vi.fn().mockResolvedValue(undefined),
  updateAllowedEmail: vi.fn().mockResolvedValue(undefined),
  deleteAllowedEmail: vi.fn().mockResolvedValue(undefined),
  bulkAddAllowedEmails: vi.fn().mockResolvedValue(undefined),
  isEmailAllowed: vi.fn().mockResolvedValue(true),
  addLoginLog: vi.fn().mockResolvedValue(undefined),
  listLoginLogs: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, email: "test@gmail.com", name: "測試", loginMethod: "google", success: 1, failReason: "", ipAddress: "127.0.0.1", createdAt: new Date() },
    { id: 2, userId: null, email: "blocked@gmail.com", name: "被擋", loginMethod: "google", success: 0, failReason: "帳號不在白名單中", ipAddress: "192.168.1.1", createdAt: new Date() },
  ]),
}));

// Mock voice transcription
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({ text: "王小明", language: "zh" }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "voice/test.webm", url: "https://example.com/voice/test.webm" }),
}));

// Mock generateMeetingWordBuffer
vi.mock("./generateMeetingWord", () => ({
  generateMeetingWordBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-docx-content")),
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

describe("Student Management", () => {
  it("lists all students", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.list();
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("王小明");
    expect(result[0].className).toBe("小班");
  });

  it("adds a student with all fields", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.add({
      className: "大班",
      name: "新同學",
      birthday: "2024-01-15",
      fatherName: "新父親",
      fatherPhone: "0999999999",
      motherName: "新母親",
      motherPhone: "0988888888",
    });
    expect(result.success).toBe(true);
  });

  it("bulk uploads students with new fields", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.bulkUpload({
      students: [
        { className: "Z", name: "學生A", birthday: "2023-04-13", fatherName: "父A", fatherPhone: "0911", motherName: "母A", motherPhone: "0922" },
        { className: "C", name: "學生B", birthday: "2024-09-10", fatherName: "父B", fatherPhone: "0933", motherName: "母B", motherPhone: "0944" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("deletes a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("updates a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.update({
      id: 1,
      className: "大班",
      name: "王小明(已修改)",
      birthday: "2023-04-13",
      fatherName: "王大明",
      fatherPhone: "0912345678",
      motherName: "林美美",
      motherPhone: "0923456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects update with empty className", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.student.update({
        id: 1,
        className: "",
        name: "王小明",
      })
    ).rejects.toThrow();
  });

  it("rejects update with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.student.update({
        id: 1,
        className: "小班",
        name: "",
      })
    ).rejects.toThrow();
  });
});

describe("Teacher Management", () => {
  it("lists all teachers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teacher.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("陳老師");
  });

  it("adds a teacher", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.add({
      name: "新老師",
      title: "代課老師",
      phone: "0955555555",
    });
    expect(result.success).toBe(true);
  });

  it("adds a teacher with all new fields", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.add({
      name: "張老師",
      title: "託育人員",
      phone: "0966-123456",
      idNumber: "A123456789",
      birthday: "1990-05-15",
      hireDate: "2024-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("bulk uploads teachers", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.bulkUpload({
      teachers: [
        { name: "老師A", title: "班導", phone: "0911" },
        { name: "老師B", title: "助教", phone: "0922" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("bulk uploads teachers with new fields", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.bulkUpload({
      teachers: [
        { name: "老師C", title: "託育人員", phone: "0933", idNumber: "M222970406", birthday: "2000-11-11", hireDate: "2022-07-04" },
        { name: "老師D", title: "廚工", phone: "0944", idNumber: "N220330709", birthday: "1975-12-30", hireDate: "2017-08-01" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("updates a teacher", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.update({
      id: 1,
      name: "陳老師(已修改)",
      title: "主任",
      phone: "0933333333",
    });
    expect(result.success).toBe(true);
  });

  it("updates a teacher with new fields", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.update({
      id: 1,
      name: "陳老師",
      idNumber: "F224982301",
      birthday: "1981-08-09",
      hireDate: "2016-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("updates a teacher with minimal fields", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.update({
      id: 2,
      name: "林老師",
    });
    expect(result.success).toBe(true);
  });

  it("rejects update with empty name", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    await expect(
      caller.teacher.update({
        id: 1,
        name: "",
      })
    ).rejects.toThrow();
  });
});

describe("Daily Curriculum", () => {
  it("gets curriculum for a date (empty)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.curriculum.get({ date: "2026-02-25" });
    expect(result).toBeNull();
  });

  it("saves curriculum", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.curriculum.save({
      date: "2026-02-25",
      courseCategory: "人初千日與五感發展",
      courseDescription: "認識顏色",
      picturebook: "彩虹魚",
      song: "小星星",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });

  it("lists curriculum by month", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.curriculum.list({ yearMonth: "2026-02" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("updates curriculum", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.curriculum.update({
      id: 1,
      courseCategory: "身體動作與音樂律動",
      courseDescription: "音樂遊戲",
      picturebook: "小熊維尼",
      song: "兩隻老虎",
    });
    expect(result.success).toBe(true);
  });

  it("deletes curriculum", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.curriculum.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Student Attendance", () => {
  it("lists attendance by date (empty)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.listByDate({ date: "2026-02-25" });
    expect(result).toHaveLength(0);
  });

  it("checks in a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.checkin({
      date: "2026-02-25",
      studentId: 1,
      studentName: "王小明",
      time: "08:30:00",
      temperature: "36.5",
    });
    expect(result.success).toBe(true);
  });

  it("checks out a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.checkout({
      date: "2026-02-25",
      studentId: 1,
      studentName: "王小明",
      time: "16:00:00",
    });
    expect(result.success).toBe(true);
  });

  it("registers leave for a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.leave({
      date: "2026-02-25",
      studentId: 2,
      studentName: "李小花",
      leaveType: "病假",
      leaveReason: "感冒發燒",
    });
    expect(result.success).toBe(true);
  });

  it("end day check returns missing checkouts", async () => {
    const { getAttendanceByDate } = await import("./db");
    (getAttendanceByDate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 1, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", createdAt: new Date() },
      { id: 2, date: "2026-02-25", studentId: 2, studentName: "李小花", type: "checkin", time: "08:35:00", temperature: "36.3", leaveReason: "", createdAt: new Date() },
      { id: 3, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkout", time: "16:00:00", temperature: "", leaveReason: "", createdAt: new Date() },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.endDayCheck({ date: "2026-02-25" });
    expect(result.totalCheckedIn).toBe(2);
    expect(result.totalCheckedOut).toBe(1);
    expect(result.missingCheckout).toHaveLength(1);
    expect(result.missingCheckout[0].studentName).toBe("李小花");
  });

  it("end day check returns empty when all checked out", async () => {
    const { getAttendanceByDate } = await import("./db");
    (getAttendanceByDate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 1, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", createdAt: new Date() },
      { id: 2, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkout", time: "16:00:00", temperature: "", leaveReason: "", createdAt: new Date() },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.endDayCheck({ date: "2026-02-25" });
    expect(result.missingCheckout).toHaveLength(0);
  });

  it("end day check excludes students on leave", async () => {
    const { getAttendanceByDate } = await import("./db");
    (getAttendanceByDate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 1, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "checkin", time: "08:30:00", temperature: "36.5", leaveReason: "", createdAt: new Date() },
      { id: 2, date: "2026-02-25", studentId: 1, studentName: "王小明", type: "leave", time: "10:00:00", temperature: "", leaveReason: "身體不適", createdAt: new Date() },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.endDayCheck({ date: "2026-02-25" });
    expect(result.missingCheckout).toHaveLength(0);
  });
});

describe("Teacher Leave", () => {
  it("lists teacher leaves", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teacherLeave.list();
    expect(result).toHaveLength(0);
  });

  it("adds a teacher leave", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teacherLeave.add({
      date: "2026-02-25",
      teacherId: 1,
      teacherName: "陳老師",
      leaveType: "病假",
      reason: "感冒",
    });
    expect(result.success).toBe(true);
  });
});

describe("Parent Communication", () => {
  it("lists parent communications", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.list({ weekNumber: 9 });
    expect(result).toHaveLength(0);
  });

  it("adds a parent communication record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.add({
      weekNumber: 9,
      date: "2026-02-25",
      studentId: 1,
      studentName: "王小明",
      method: "phone",
      teacherShare: "王小明今天表現很好",
      parentFeedback: "謝謝老師的分享",
    });
    expect(result.success).toBe(true);
  });

  it("weekly check identifies missing communications", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.weeklyCheck({ weekNumber: 9 });
    expect(result.total).toBe(3);
    expect(result.completed).toBe(1);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((s: { name: string }) => s.name)).toContain("李小花");
    expect(result.missing.map((s: { name: string }) => s.name)).toContain("張大寶");
  });

  it("updates a parent communication record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.update({
      id: 1,
      date: "2026-02-26",
      method: "interview",
      teacherShare: "更新後的分享內容",
      parentFeedback: "更新後的回饋",
    });
    expect(result.success).toBe(true);
  });

  it("updates parent communication with partial fields", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.update({
      id: 1,
      teacherShare: "只更新老師分享",
    });
    expect(result.success).toBe(true);
  });

  it("deletes a parent communication record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Voice Transcription", () => {
  it("transcribes audio", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.voice.transcribe({
      audioUrl: "https://example.com/audio.webm",
      language: "zh",
      prompt: "辨識學生姓名",
    });
    expect(result.text).toBe("王小明");
  });

  it("uploads audio and returns URL", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.voice.uploadAudio({
      base64: "dGVzdA==", // "test" in base64
      mimeType: "audio/webm",
    });
    expect(result.url).toBe("https://example.com/voice/test.webm");
  });
});

describe("Student Profile", () => {
  it("gets student profile with attendance, incidents, and communications", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.studentProfile.get({ studentId: 1 });
    expect(result.student).toBeDefined();
    expect(result.student.name).toBe("王小明");
    expect(result.student.className).toBe("小班");
    expect(result.attendance).toHaveLength(2);
    expect(result.attendance[0].type).toBe("checkin");
    expect(result.attendance[0].temperature).toBe("36.5");
    expect(result.incidents).toHaveLength(0);
    expect(result.communications).toHaveLength(0);
  });
});

describe("Dashboard Stats", () => {
  it("gets today incident count", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.dashboard.todayIncidents({ date: "2026-02-26" });
    expect(result).toBe(2);
  });
});

describe("Incident Update", () => {
  it("updates an incident report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.update({
      id: 1,
      description: "更新後的描述",
      time: "10:30",
      location: "操場",
      parentResponse: "已知悉",
      handler: "陳老師",
    });
    expect(result.success).toBe(true);
  });

  it("updates incident tracking status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.update({
      id: 1,
      trackingStatus: "已處理",
    });
    expect(result.success).toBe(true);
  });

  it("updates incident tracking status to healed", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.update({
      id: 1,
      trackingStatus: "已痊癒",
    });
    expect(result.success).toBe(true);
  });

  it("adds incident with tracking status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.incident.add({
      date: "2026-03-05",
      className: "小班",
      studentId: 1,
      studentName: "王小明",
      description: "在操場跌倒",
      trackingStatus: "觀察中",
    });
    expect(result.success).toBe(true);
  });
});

describe("Attendance Update (Duplicate Check)", () => {
  it("updates an existing attendance record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.attendance.update({
      id: 1,
      time: "08:45",
      temperature: "36.8",
    });
    expect(result.success).toBe(true);
  });
});

describe("Student Enrollment Date", () => {
  it("student list includes enrollmentDate field", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.list();
    expect(result).toHaveLength(3);
    expect(result[0].enrollmentDate).toBe("2024-09-01");
    expect(result[1].enrollmentDate).toBe("2024-09-15");
    expect(result[2].enrollmentDate).toBe("2025-02-01");
  });

  it("adds a student with enrollmentDate", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.add({
      className: "大班",
      name: "測試幼生",
      birthday: "2022-01-01",
      enrollmentDate: "2025-03-01",
      fatherName: "",
      fatherPhone: "",
      motherName: "",
      motherPhone: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("updates a student with enrollmentDate", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.student.update({
      id: 1,
      className: "小班",
      name: "王小明",
      birthday: "2023-04-13",
      enrollmentDate: "2024-10-01",
      fatherName: "王大明",
      fatherPhone: "0912345678",
      motherName: "林美美",
      motherPhone: "0923456789",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("student profile includes enrollmentDate", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.studentProfile.get({ studentId: 1 });
    expect(result.student.enrollmentDate).toBe("2024-09-01");
  });
});

describe("Stat Items", () => {
  it("lists stat summary", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.summary();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("3月午睡棉被費");
    expect(result[0].statusLabel).toBe("已繳交");
    expect(result[0].checkedCount).toBe(2);
    expect(result[0].totalCount).toBe(3);
  });

  it("creates a stat item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.create({
      name: "春季校外教學報名",
      statusLabel: "已報名",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });

  it("updates a stat item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.update({
      id: 1,
      name: "更新後的項目名稱",
      statusLabel: "已完成",
    });
    expect(result.success).toBe(true);
  });

  it("deletes a stat item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("gets records for a stat item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.getRecords({ statItemId: 1 });
    expect(result).toHaveLength(0);
  });

  it("toggles a record for a student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.toggleRecord({
      statItemId: 1,
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      checked: 1,
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("updates a note for a student record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.updateNote({
      statItemId: 1,
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      notes: "已繳交100元",
    });
    expect(result.success).toBe(true);
  });

  it("initializes records for all students", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.initRecords({ statItemId: 1 });
    expect(result.success).toBe(true);
    expect(result.added).toBe(3); // 3 students, 0 existing records
  });

  it("lists stat items", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.stat.list();
    expect(result).toHaveLength(0);
  });
});

// ==================== Growth Records Tests ====================
describe("Growth Records", () => {
  it("lists growth records by month", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.list({ month: "2026-03" });
    expect(result).toHaveLength(1);
    expect(result[0].studentName).toBe("王小明");
    expect(result[0].height).toBe("85.5");
  });

  it("lists growth records by range", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.listRange({ startMonth: "2026-02", endMonth: "2026-03" });
    expect(result).toHaveLength(2);
  });

  it("gets previous growth record", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.getPrevious({ studentId: 1, currentMonth: "2026-03" });
    expect(result).toBeNull(); // mock returns null
  });

  it("saves growth record successfully", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.save({
      month: "2026-03",
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      field: "height",
      value: "86.0",
    });
    expect(result.success).toBe(true);
  });

  it("blocks saving when value is lower than previous record", async () => {
    // Override mock to return a previous record
    const { getStudentPreviousGrowth } = await import("./db");
    (getStudentPreviousGrowth as any).mockResolvedValueOnce({
      id: 1, month: "2026-02", studentId: 1, studentName: "王小明", className: "小班",
      height: "85.5", weight: "12.3", headCircumference: "48.0", footLength: "15.5",
    });

    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.growth.save({
      month: "2026-03",
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      field: "height",
      value: "84.0", // lower than previous 85.5
    })).rejects.toThrow("低於");
  });

  it("allows saving when value equals previous record", async () => {
    const { getStudentPreviousGrowth } = await import("./db");
    (getStudentPreviousGrowth as any).mockResolvedValueOnce({
      id: 1, month: "2026-02", studentId: 1, studentName: "王小明", className: "小班",
      height: "85.5", weight: "12.3", headCircumference: "48.0", footLength: "15.5",
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.save({
      month: "2026-03",
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      field: "height",
      value: "85.5", // equal to previous
    });
    expect(result.success).toBe(true);
  });

  it("allows saving empty value to clear a field", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.save({
      month: "2026-03",
      studentId: 1,
      studentName: "王小明",
      className: "小班",
      field: "weight",
      value: "",
    });
    expect(result.success).toBe(true);
  });
});

// ==================== Dashboard Growth Progress Tests ====================
describe("Dashboard Growth Progress", () => {
  it("returns growth progress for current month", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.dashboard.growthProgress({ yearMonth: "2026-03" });
    expect(result.totalStudents).toBe(3);
    expect(result.filledStudents).toBe(1);
    expect(result.unfilledStudents).toHaveLength(2);
    expect(result.unfilledStudents[0].name).toBe("李小花");
    expect(result.unfilledStudents[1].name).toBe("張大寶");
  });

  it("validates yearMonth format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.dashboard.growthProgress({ yearMonth: "invalid" })).rejects.toThrow();
  });
});

// ==================== Growth Student Records Tests ====================
describe("Growth Student Records", () => {
  it("returns growth records for a specific student", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.growth.studentRecords({ studentId: 1 });
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe("2026-03");
    expect(result[0].height).toBe("85.5");
    expect(result[1].month).toBe("2026-02");
    expect(result[1].height).toBe("84.0");
  });
});

// ==================== Meeting Tests ====================
describe("Meeting CRUD", () => {
  it("lists meetings", async () => {
    const { listMeetings } = await import("./db");
    (listMeetings as any).mockResolvedValueOnce([
      { id: 1, title: "第12週園務會議", meetingDate: "2026-03-14", meetingTime: "14:00-15:30", location: "教具大廳", trackingStatus: "待追蹤", wordFileUrl: null, createdAt: new Date() },
    ]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.list();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("第12週園務會議");
  });

  it("creates a meeting with motions", async () => {
    const { addMeeting, addMotion } = await import("./db");
    (addMeeting as any).mockResolvedValueOnce(1);
    (addMotion as any).mockResolvedValueOnce(1);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.create({
      title: "第12週園務會議",
      meetingDate: "2026-03-14",
      meetingTime: "14:00-15:30",
      location: "教具大廳",
      attendeeIds: "[1,2]",
      recorder: "陳老師",
      thisWeekStart: "2026-03-09",
      thisWeekEnd: "2026-03-15",
      lastWeekStart: "2026-03-02",
      lastWeekEnd: "2026-03-08",
      motions: [{ topic: "購買新教具", resolution: "同意購買", assigneeName: "陳老師", dueDate: "2026-03-20" }],
    });
    expect(result.id).toBe(1);
    expect(addMeeting).toHaveBeenCalled();
    expect(addMotion).toHaveBeenCalled();
  });

  it("gets a meeting with motions", async () => {
    const { getMeeting, listMotionsByMeeting } = await import("./db");
    (getMeeting as any).mockResolvedValueOnce({
      id: 1, title: "第12週園務會議", meetingDate: "2026-03-14", meetingTime: "14:00-15:30",
      location: "教具大廳", attendeeIds: "[1,2]", recorder: "陳老師", trackingStatus: "待追蹤",
      thisWeekStart: "2026-03-09", thisWeekEnd: "2026-03-15", lastWeekStart: "2026-03-02", lastWeekEnd: "2026-03-08",
      reportData: null, wordFileUrl: null, createdAt: new Date(),
    });
    (listMotionsByMeeting as any).mockResolvedValueOnce([
      { id: 1, meetingId: 1, topic: "購買新教具", resolution: "同意購買", assigneeName: "陳老師", dueDate: "2026-03-20", status: "待處理", createdAt: new Date() },
    ]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.get({ id: 1 });
    expect(result.title).toBe("第12週園務會議");
    expect(result.motions).toHaveLength(1);
    expect(result.motions[0].topic).toBe("購買新教具");
  });

  it("updates meeting tracking status", async () => {
    const { updateMeeting } = await import("./db");
    (updateMeeting as any).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await caller.meeting.update({ id: 1, trackingStatus: "追蹤中" });
    expect(updateMeeting).toHaveBeenCalledWith(1, expect.objectContaining({ trackingStatus: "追蹤中" }));
  });

  it("deletes a meeting", async () => {
    const { deleteMeeting } = await import("./db");
    (deleteMeeting as any).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await caller.meeting.delete({ id: 1 });
    expect(deleteMeeting).toHaveBeenCalledWith(1);
  });
});

describe("Meeting Motions", () => {
  it("adds a motion to a meeting", async () => {
    const { addMotion } = await import("./db");
    (addMotion as any).mockResolvedValueOnce(2);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.addMotion({
      meetingId: 1,
      topic: "新增議題",
      resolution: "待討論",
      assigneeName: "林老師",
      dueDate: "2026-03-25",
    });
    expect(result.id).toBe(2);
    expect(addMotion).toHaveBeenCalled();
  });

  it("updates a motion", async () => {
    const { updateMotion } = await import("./db");
    (updateMotion as any).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await caller.meeting.updateMotion({ id: 1, status: "處理中", topic: "更新議題" });
    expect(updateMotion).toHaveBeenCalledWith(1, expect.objectContaining({ status: "處理中", topic: "更新議題" }));
  });

  it("deletes a motion", async () => {
    const { deleteMotion } = await import("./db");
    (deleteMotion as any).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await caller.meeting.deleteMotion({ id: 1 });
    expect(deleteMotion).toHaveBeenCalledWith(1);
  });
});

describe("Meeting Aggregate Data", () => {
  it("aggregates report data for a meeting", async () => {
    const { aggregateMeetingReportData } = await import("./db");
    (aggregateMeetingReportData as any).mockResolvedValueOnce({
      studentAttendance: [{ name: "王小明", className: "小班", checkinDays: 5, leaves: [] }],
      teacherLeaves: [],
      incidents: [],
      parentComm: [],
      growthProgress: { totalStudents: 3, filledStudents: 1 },
      statSummary: [],
    });
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.aggregateData({
      thisWeekStart: "2026-03-09",
      thisWeekEnd: "2026-03-15",
      lastWeekStart: "2026-03-02",
      lastWeekEnd: "2026-03-08",
    });
    expect(result.studentAttendance).toHaveLength(1);
    expect(result.growthProgress.totalStudents).toBe(3);
  });
});

describe("Meeting Word Generation", () => {
  it("generates a Word document for a meeting", async () => {
    const { getMeeting, listMotionsByMeeting, listTeachers, updateMeeting } = await import("./db");
    const { storagePut } = await import("./storage");
    const { generateMeetingWordBuffer } = await import("./generateMeetingWord");

    (getMeeting as any).mockResolvedValueOnce({
      id: 1, title: "第12週園務會議", meetingDate: "2026-03-14", meetingTime: "14:00-15:30",
      location: "教具大廳", attendeeIds: "[1,2]", recorder: "陳老師", chairperson: "胡主任",
      absentees: "林老師", thisWeekStart: "2026-03-09", thisWeekEnd: "2026-03-15",
      lastWeekStart: "2026-03-02", lastWeekEnd: "2026-03-08",
      reportData: JSON.stringify({
        studentAttendance: [
          { name: "王小明", className: "小班", checkinDays: 5, leaves: [] },
          { name: "李小花", className: "小班", checkinDays: 3, leaves: [{ date: "2026-03-10", leaveType: "病假", reason: "感冒" }] },
        ],
        teacherLeaves: [{ teacherName: "林老師", date: "2026-03-11", leaveType: "事假" }],
        incidents: [{ studentName: "張大寶", description: "跌倒擦傷", trackingStatus: "觀察中" }],
        parentComm: [{ studentName: "王小明", method: "phone" }],
        growthProgress: { totalStudents: 3, filledStudents: 2 },
        statSummary: [{ name: "3月午睡棉被費", checkedCount: 2, totalCount: 3 }],
      }),
      wordFileUrl: "", trackingStatus: "待追蹤", createdAt: new Date(),
    });
    (listMotionsByMeeting as any).mockResolvedValueOnce([
      { id: 1, meetingId: 1, topic: "購買新教具", resolution: "同意購買", assigneeName: "陳老師", dueDate: "2026-03-20", status: "待處理" },
    ]);
    (listTeachers as any).mockResolvedValueOnce([
      { id: 1, name: "陳老師" },
      { id: 2, name: "林老師" },
    ]);
    (storagePut as any).mockResolvedValueOnce({ key: "meetings/1-123.docx", url: "https://example.com/meetings/1-123.docx" });
    (updateMeeting as any).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.generateWord({ meetingId: 1 });

    expect(result.success).toBe(true);
    expect(result.url).toBe("https://example.com/meetings/1-123.docx");
    expect(generateMeetingWordBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "第12週園務會議" }),
      expect.arrayContaining([expect.objectContaining({ topic: "購買新教具" })]),
      expect.arrayContaining([expect.objectContaining({ name: "陳老師" })]),
    );
    expect(storagePut).toHaveBeenCalled();
    expect(updateMeeting).toHaveBeenCalledWith(1, expect.objectContaining({ wordFileUrl: "https://example.com/meetings/1-123.docx" }));
  });

  it("throws NOT_FOUND when meeting does not exist", async () => {
    const { getMeeting } = await import("./db");
    (getMeeting as any).mockResolvedValueOnce(undefined);

    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.meeting.generateWord({ meetingId: 999 })).rejects.toThrow("會議記錄不存在");
  });
});

// ==================== 離托幼生篩選 & 入托前幼生篩選 ====================
describe("weeklyCheck with withdrawal and enrollment filtering", () => {
  it("excludes withdrawn students from weekly check", async () => {
    const { getWeeklyCommCheck } = await import("./db");
    (getWeeklyCommCheck as any).mockResolvedValueOnce({
      allStudents: [
        { id: 1, name: "王小明", className: "小班", enrollmentDate: "2024-09-01", withdrawalDate: null },
        { id: 2, name: "李小花", className: "小班", enrollmentDate: "2024-09-15", withdrawalDate: "2025-12-31" },
        { id: 3, name: "張大寶", className: "中班", enrollmentDate: "2025-02-01", withdrawalDate: null },
      ],
      studentsWithComm: [],
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.weeklyCheck({ weekNumber: 9 });
    // 李小花已離托，應被排除
    expect(result.total).toBe(2);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((s: { name: string }) => s.name)).not.toContain("李小花");
  });

  it("excludes students enrolled after weekStartDate from missing list", async () => {
    const { getWeeklyCommCheck } = await import("./db");
    (getWeeklyCommCheck as any).mockResolvedValueOnce({
      allStudents: [
        { id: 1, name: "王小明", className: "小班", enrollmentDate: "2024-09-01", withdrawalDate: null },
        { id: 2, name: "李小花", className: "小班", enrollmentDate: "2024-09-15", withdrawalDate: null },
        { id: 3, name: "張大寶", className: "中班", enrollmentDate: "2026-04-10", withdrawalDate: null },
      ],
      studentsWithComm: [],
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.weeklyCheck({ weekNumber: 9, weekStartDate: "2026-04-06" });
    // 張大寶入托日期 2026-04-10 在本週起始日 2026-04-06 之後，應被排除
    expect(result.total).toBe(2);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((s: { name: string }) => s.name)).not.toContain("張大寶");
  });

  it("includes students enrolled before or on weekStartDate", async () => {
    const { getWeeklyCommCheck } = await import("./db");
    (getWeeklyCommCheck as any).mockResolvedValueOnce({
      allStudents: [
        { id: 1, name: "王小明", className: "小班", enrollmentDate: "2026-04-01", withdrawalDate: null },
        { id: 2, name: "李小花", className: "小班", enrollmentDate: "2026-04-06", withdrawalDate: null },
      ],
      studentsWithComm: [1],
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.parentComm.weeklyCheck({ weekNumber: 9, weekStartDate: "2026-04-06" });
    // 兩位都在入托日期之前或當天，都應被包含
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].name).toBe("李小花");
  });
});

// ==================== 老師請假時數整數 ====================
describe("teacher leave hours as integer", () => {
  it("accepts string hours for teacher leave", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teacherLeave.add({
      teacherId: 1,
      teacherName: "陳老師",
      date: "2026-04-04",
      leaveType: "事假",
      hours: "8",
    });
    expect(result.success).toBe(true);
  });

  it("stores hours as integer string without decimals", async () => {
    const { addTeacherLeave } = await import("./db");
    const caller = appRouter.createCaller(createAuthContext());
    await caller.teacherLeave.add({
      teacherId: 1,
      teacherName: "陳老師",
      date: "2026-04-04",
      leaveType: "病假",
      hours: "4",
    });
    expect(addTeacherLeave).toHaveBeenCalledWith(
      expect.objectContaining({ hours: "4" })
    );
  });
});

// Helper: create admin context for admin-only routes
function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Allowed Email Management", () => {
  it("admin can list allowed emails", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.allowedEmail.list();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("test@gmail.com");
  });

  it("admin can add an allowed email", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.allowedEmail.add({ email: "new@gmail.com", name: "新帳號" });
    expect(result.success).toBe(true);
  });

  it("admin can update an allowed email", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.allowedEmail.update({ id: 1, name: "更新名稱", isActive: 0 });
    expect(result.success).toBe(true);
  });

  it("admin can delete an allowed email", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.allowedEmail.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("admin can bulk add allowed emails", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.allowedEmail.bulkAdd({
      emails: [
        { email: "a@gmail.com", name: "A" },
        { email: "b@gmail.com", name: "B" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot list allowed emails", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.allowedEmail.list()).rejects.toThrow();
  });

  it("non-admin cannot add allowed emails", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.allowedEmail.add({ email: "x@gmail.com" })).rejects.toThrow();
  });

  it("non-admin cannot delete allowed emails", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.allowedEmail.delete({ id: 1 })).rejects.toThrow();
  });
});

function createSupervisorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "test-supervisor",
    email: "supervisor@example.com",
    name: "Test Supervisor",
    loginMethod: "local",
    role: "supervisor",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Supervisor Role - Teacher Management", () => {
  it("supervisor can add teacher", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.add({ name: "新老師" });
    expect(result.success).toBe(true);
  });

  it("supervisor can update teacher", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.update({ id: 1, name: "更新老師" });
    expect(result.success).toBe(true);
  });

  it("supervisor can delete teacher", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("supervisor can bulk upload teachers", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    const result = await caller.teacher.bulkUpload({ teachers: [{ name: "老師A" }, { name: "老師B" }] });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("regular user cannot add teacher", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.teacher.add({ name: "新老師" })).rejects.toThrow();
  });

  it("regular user cannot update teacher", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.teacher.update({ id: 1, name: "更新老師" })).rejects.toThrow();
  });

  it("regular user cannot delete teacher", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.teacher.delete({ id: 1 })).rejects.toThrow();
  });

  it("regular user can still list teachers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.teacher.list();
    expect(result.length).toBeGreaterThan(0);
  });

  it("admin can also manage teachers", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.teacher.add({ name: "Admin新增老師" });
    expect(result.success).toBe(true);
  });
});

describe("Login Logs", () => {
  it("admin can list login logs", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.loginLog.list({ limit: 100 });
    expect(result.length).toBe(2);
    expect(result[0].email).toBe("test@gmail.com");
    expect(result[1].success).toBe(0);
  });

  it("admin can list login logs without params", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.loginLog.list();
    expect(result.length).toBe(2);
  });

  it("non-admin cannot list login logs", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.loginLog.list()).rejects.toThrow();
  });

  it("supervisor cannot list login logs", async () => {
    const caller = appRouter.createCaller(createSupervisorContext());
    await expect(caller.loginLog.list()).rejects.toThrow();
  });
});

