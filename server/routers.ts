import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

import { publicProcedure, protectedProcedure, supervisorProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  listStudents, bulkUpsertStudents, deleteStudent, addStudent, updateStudent,
  listTeachers, bulkUpsertTeachers, deleteTeacher, addTeacher, updateTeacher,
  getCurriculumByDate, upsertCurriculum, listCurriculumByMonth, deleteCurriculum, updateCurriculum,
  getAttendanceByDate, addAttendance, updateAttendance, deleteAttendance,
  listTeacherLeaves, addTeacherLeave, updateTeacherLeave, deleteTeacherLeave,
  listParentComm, addParentComm, updateParentComm, deleteParentComm, getWeeklyCommCheck,
  getMonthlyAttendance, getMonthlyParentComm,
  getDailyReportData,
  listIncidentReports, addIncidentReport, updateIncidentReport, deleteIncidentReport, getMonthlyIncidents,
  getWeeklyParentComm,
  getStudentProfile, getTodayIncidentCount,
  getMonthlyAttendanceDetail,
  getTodayTeacherLeavesByType,
  listStatItems, addStatItem, updateStatItem, deleteStatItem,
  getStatRecordsByItem, upsertStatRecord, bulkUpsertStatRecords, getStatSummary,
  getGrowthRecordsByMonth, getGrowthRecordsByRange, getStudentPreviousGrowth, upsertGrowthRecord, getStudentGrowthRecords,
  getGrowthProgress,
  listMeetings, getMeeting, addMeeting, updateMeeting, deleteMeeting,
  listMotionsByMeeting, addMotion, updateMotion, deleteMotion,
  aggregateMeetingReportData,
  listAllowedEmails, addAllowedEmail, updateAllowedEmail, deleteAllowedEmail, bulkAddAllowedEmails,
  listLoginLogs,
} from "./db";

import { storagePut } from "./storage";
import { generateMeetingWordBuffer } from './generateMeetingWord';

export const appRouter = router({

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== Students ====================
  student: router({
    list: protectedProcedure.query(async () => {
      return listStudents();
    }),
    add: protectedProcedure.input(z.object({
      className: z.string().min(1),
      name: z.string().min(1),
      birthday: z.string().optional().default(""),
      fatherName: z.string().optional().default(""),
      fatherPhone: z.string().optional().default(""),
      motherName: z.string().optional().default(""),
      motherPhone: z.string().optional().default(""),
      enrollmentDate: z.string().optional().default(""),
      withdrawalDate: z.string().optional().default(""),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await addStudent(input);
      return { success: true };
    }),
    bulkUpload: protectedProcedure.input(z.object({
      students: z.array(z.object({
        className: z.string().min(1),
        name: z.string().min(1),
        birthday: z.string().optional().default(""),
        fatherName: z.string().optional().default(""),
        fatherPhone: z.string().optional().default(""),
        motherName: z.string().optional().default(""),
        motherPhone: z.string().optional().default(""),
        enrollmentDate: z.string().optional().default(""),
        withdrawalDate: z.string().optional().default(""),
        notes: z.string().optional().default(""),
      })),
    })).mutation(async ({ input }) => {
      await bulkUpsertStudents(input.students);
      return { success: true, count: input.students.length };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      className: z.string().min(1),
      name: z.string().min(1),
      birthday: z.string().optional().default(""),
      fatherName: z.string().optional().default(""),
      fatherPhone: z.string().optional().default(""),
      motherName: z.string().optional().default(""),
      motherPhone: z.string().optional().default(""),
      enrollmentDate: z.string().optional().default(""),
      withdrawalDate: z.string().optional().default(""),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateStudent(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteStudent(input.id);
      return { success: true };
    }),
  }),

  // ==================== Teachers ====================
  teacher: router({
    list: protectedProcedure.query(async () => {
      return listTeachers();
    }),
    add: supervisorProcedure.input(z.object({
      name: z.string().min(1),
      title: z.string().optional().default(""),
      phone: z.string().optional().default(""),
      idNumber: z.string().optional().default(""),
      birthday: z.string().optional().default(""),
      hireDate: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await addTeacher(input);
      return { success: true };
    }),
    bulkUpload: supervisorProcedure.input(z.object({
      teachers: z.array(z.object({
        name: z.string().min(1),
        title: z.string().optional().default(""),
        phone: z.string().optional().default(""),
        idNumber: z.string().optional().default(""),
        birthday: z.string().optional().default(""),
        hireDate: z.string().optional().default(""),
      })),
    })).mutation(async ({ input }) => {
      await bulkUpsertTeachers(input.teachers);
      return { success: true, count: input.teachers.length };
    }),
    update: supervisorProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1),
      title: z.string().optional().default(""),
      phone: z.string().optional().default(""),
      idNumber: z.string().optional().default(""),
      birthday: z.string().optional().default(""),
      hireDate: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateTeacher(id, data);
      return { success: true };
    }),
    delete: supervisorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteTeacher(input.id);
      return { success: true };
    }),
  }),

  // ==================== Daily Curriculum ====================
  curriculum: router({
    get: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      return getCurriculumByDate(input.date);
    }),
    list: protectedProcedure.input(z.object({ yearMonth: z.string() })).query(async ({ input }) => {
      return listCurriculumByMonth(input.yearMonth);
    }),
    save: protectedProcedure.input(z.object({
      date: z.string(),
      courseContent: z.string().optional().default(""),
      courseCategory: z.string().optional().default(""),
      courseDescription: z.string().optional().default(""),
      picturebook: z.string().optional().default(""),
      song: z.string().optional().default(""),
    })).mutation(async ({ input, ctx }) => {
      const id = await upsertCurriculum({ ...input, createdBy: ctx.user.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      date: z.string().optional(),
      courseCategory: z.string().optional(),
      courseDescription: z.string().optional(),
      picturebook: z.string().optional(),
      song: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCurriculum(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteCurriculum(input.id);
      return { success: true };
    }),
  }),

  // ==================== Student Attendance ====================
  attendance: router({
    listByDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      return getAttendanceByDate(input.date);
    }),
    checkin: protectedProcedure.input(z.object({
      date: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      time: z.string(),
      temperature: z.string(),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await addAttendance({ ...input, type: "checkin", leaveReason: "", leaveType: "" });
      return { success: true };
    }),
    checkout: protectedProcedure.input(z.object({
      date: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      time: z.string(),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await addAttendance({ ...input, type: "checkout", temperature: "", leaveReason: "", leaveType: "" });
      return { success: true };
    }),
    leave: protectedProcedure.input(z.object({
      date: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      leaveType: z.string(),
      leaveReason: z.string(),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      await addAttendance({ ...input, type: "leave", time, temperature: "" });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      time: z.string().optional(),
      temperature: z.string().optional(),
      notes: z.string().optional(),
      leaveType: z.string().optional(),
      leaveReason: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      // Filter out undefined values
      const updateData: Record<string, any> = {};
      if (data.time !== undefined) updateData.time = data.time;
      if (data.temperature !== undefined) updateData.temperature = data.temperature;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.leaveType !== undefined) updateData.leaveType = data.leaveType;
      if (data.leaveReason !== undefined) updateData.leaveReason = data.leaveReason;
      await updateAttendance(id, updateData);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAttendance(input.id);
      return { success: true };
    }),
    monthlyDetail: protectedProcedure.input(z.object({ yearMonth: z.string() })).query(async ({ input }) => {
      return getMonthlyAttendanceDetail(input.yearMonth);
    }),
    endDayCheck: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      const records = await getAttendanceByDate(input.date);
      const checkedIn = records.filter(r => r.type === "checkin").map(r => r.studentId);
      const checkedOut = records.filter(r => r.type === "checkout").map(r => r.studentId);
      const onLeave = records.filter(r => r.type === "leave").map(r => r.studentId);
      const checkedInSet = new Set(checkedIn);
      const checkedOutSet = new Set(checkedOut);
      const onLeaveSet = new Set(onLeave);
      const missing: Array<{ studentId: number; studentName: string }> = [];
      records.filter(r => r.type === "checkin").forEach(r => {
        if (!checkedOutSet.has(r.studentId) && !onLeaveSet.has(r.studentId)) {
          if (!missing.find(m => m.studentId === r.studentId)) {
            missing.push({ studentId: r.studentId, studentName: r.studentName });
          }
        }
      });
      return {
        totalCheckedIn: checkedInSet.size,
        totalCheckedOut: checkedOutSet.size,
        totalOnLeave: onLeaveSet.size,
        missingCheckout: missing,
      };
    }),
  }),

  // ==================== Teacher Leave ====================
  teacherLeave: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      return listTeacherLeaves(input?.startDate, input?.endDate);
    }),
    add: protectedProcedure.input(z.object({
      date: z.string(),
      teacherId: z.number(),
      teacherName: z.string(),
      leaveType: z.string(),
      startTime: z.string().optional().default(""),
      endTime: z.string().optional().default(""),
      hours: z.string().optional().default(""),
      reason: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await addTeacherLeave(input);
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      date: z.string().optional(),
      leaveType: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      hours: z.string().optional(),
      reason: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateTeacherLeave(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteTeacherLeave(input.id);
      return { success: true };
    }),
  }),

  // ==================== Parent Communication ====================
  parentComm: router({
    list: protectedProcedure.input(z.object({
      weekNumber: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return listParentComm(input?.weekNumber);
    }),
    add: protectedProcedure.input(z.object({
      weekNumber: z.number(),
      date: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      method: z.enum(["interview", "phone"]),
      teacherShare: z.string().optional().default(""),
      parentFeedback: z.string().optional().default(""),
    })).mutation(async ({ input, ctx }) => {
      await addParentComm({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      date: z.string().optional(),
      method: z.enum(["interview", "phone"]).optional(),
      teacherShare: z.string().optional(),
      parentFeedback: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateParentComm(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteParentComm(input.id);
      return { success: true };
    }),
    weeklyCheck: protectedProcedure.input(z.object({
      weekNumber: z.number(),
      weekStartDate: z.string().optional(), // 本週起始日期 YYYY-MM-DD
    })).query(async ({ input }) => {
      const result = await getWeeklyCommCheck(input.weekNumber);
      // 排除離托幼生，並排除入托日期在本週之後的幼生
      const activeStudents = result.allStudents.filter(s => {
        // 排除離托幼生
        if ((s as any).withdrawalDate) return false;
        // 如果有提供本週起始日期，排除入托日期在本週之後的幼生
        if (input.weekStartDate && (s as any).enrollmentDate && (s as any).enrollmentDate > input.weekStartDate) return false;
        return true;
      });
      const missingStudents = activeStudents.filter(s => !result.studentsWithComm.includes(s.id));
      return {
        total: activeStudents.length,
        completed: result.studentsWithComm.length,
        missing: missingStudents,
      };
    }),
  }),

  // ==================== Monthly Reports ====================
  report: router({
    dailyAttendance: protectedProcedure.input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).query(async ({ input }) => {
      const { attendance, students: allStudents } = await getDailyReportData(input.date);

      // 建立幼生 ID 到資料的對應
      const studentMap = new Map(allStudents.map(s => [s.id, s]));

      // 上課打卡記錄（含體溫）
      const checkins = attendance.filter(r => r.type === 'checkin').map(r => {
        const student = studentMap.get(r.studentId);
        const temp = r.temperature ? parseFloat(r.temperature) : null;
        return {
          studentId: r.studentId,
          studentName: r.studentName,
          className: student?.className ?? '',
          birthday: student?.birthday ?? '',
          enrollmentDate: student?.enrollmentDate ?? '',
          time: r.time,
          temperature: r.temperature,
          temperatureValue: temp,
          isFever: temp !== null && temp >= 37.5,
        };
      });

      // 下課打卡記錄
      const checkouts = attendance.filter(r => r.type === 'checkout').map(r => {
        const student = studentMap.get(r.studentId);
        return {
          studentId: r.studentId,
          studentName: r.studentName,
          className: student?.className ?? '',
          enrollmentDate: student?.enrollmentDate ?? '',
          time: r.time,
        };
      });

      // 請假記錄
      const leaves = attendance.filter(r => r.type === 'leave').map(r => {
        const student = studentMap.get(r.studentId);
        return {
          studentId: r.studentId,
          studentName: r.studentName,
          className: student?.className ?? '',
          enrollmentDate: student?.enrollmentDate ?? '',
          leaveReason: r.leaveReason,
        };
      });

      // 體溫異常警示
      const feverAlerts = checkins.filter(c => c.isFever);

      return {
        date: input.date,
        totalCheckins: checkins.length,
        totalCheckouts: checkouts.length,
        totalLeaves: leaves.length,
        feverCount: feverAlerts.length,
        checkins,
        checkouts,
        leaves,
        feverAlerts,
      };
    }),

    monthlyAttendance: protectedProcedure.input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    })).query(async ({ input }) => {
      const allStudents = await listStudents();
      const records = await getMonthlyAttendance(input.yearMonth);

      // 計算該月份的工作日數（週一到週五）
      const [year, month] = input.yearMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const workingDays: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const day = date.getDay();
        if (day >= 1 && day <= 5) {
          workingDays.push(`${input.yearMonth}-${String(d).padStart(2, '0')}`);
        }
      }

      // 按幼生統計
      const studentStats = allStudents.map(student => {
        const studentRecords = records.filter(r => r.studentId === student.id);
        const checkinDates = new Set(studentRecords.filter(r => r.type === 'checkin').map(r => r.date));
        const leaveDates = new Set(studentRecords.filter(r => r.type === 'leave').map(r => r.date));
        const attendDays = checkinDates.size;
        const leaveDays = leaveDates.size;
        const absentDays = workingDays.length - attendDays - leaveDays;

        // 收集體溫記錄
        const temperatures = studentRecords
          .filter(r => r.type === 'checkin' && r.temperature)
          .map(r => ({ date: r.date, temperature: r.temperature, time: r.time }));

        return {
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          enrollmentDate: student.enrollmentDate ?? '',
          attendDays,
          leaveDays,
          absentDays: Math.max(0, absentDays),
          temperatures,
        };
      });

      return {
        yearMonth: input.yearMonth,
        workingDays: workingDays.length,
        allDates: workingDays,
        studentStats,
      };
    }),

    monthlyParentComm: protectedProcedure.input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    })).query(async ({ input }) => {
      const allStudents = await listStudents();
      const records = await getMonthlyParentComm(input.yearMonth);

      // 按幼生分組
      const studentComms = allStudents.map(student => {
        const comms = records.filter(r => r.studentId === student.id).map(r => ({
          date: r.date,
          method: r.method,
          teacherShare: r.teacherShare,
          parentFeedback: r.parentFeedback,
          weekNumber: r.weekNumber,
        }));
        return {
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          commCount: comms.length,
          communications: comms,
        };
      });

      return {
        yearMonth: input.yearMonth,
        totalRecords: records.length,
        studentComms,
      };
    }),

    monthlyIncidents: protectedProcedure.input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    })).query(async ({ input }) => {
      const records = await getMonthlyIncidents(input.yearMonth);
      return {
        yearMonth: input.yearMonth,
        totalRecords: records.length,
        incidents: records.map(r => ({
          id: r.id,
          date: r.date,
          className: r.className,
          studentName: r.studentName,
          description: r.description,
          woundType: (r as any).woundType ?? '',
          time: r.time,
          location: r.location,
          parentResponse: r.parentResponse,
          handler: r.handler,
          photoUrls: r.photoUrls,
        })),
      };
    }),

    weeklyParentComm: protectedProcedure.input(z.object({
      weekNumber: z.number(),
    })).query(async ({ input }) => {
      const { comms, students: allStudents } = await getWeeklyParentComm(input.weekNumber);

      // 按班級分組，幼生按生日排序（年紀大的在前，即 birthday 小的在前）
      const classGroups: Record<string, Array<{
        studentId: number;
        studentName: string;
        birthday: string;
        commCount: number;
        communications: Array<{
          id: number;
          date: string;
          method: string;
          teacherShare: string;
          parentFeedback: string;
        }>;
      }>> = {};

      allStudents.forEach(student => {
        if (!classGroups[student.className]) classGroups[student.className] = [];
        const studentComms = comms.filter(c => c.studentId === student.id).map(c => ({
          id: c.id,
          date: c.date,
          method: c.method,
          teacherShare: c.teacherShare,
          parentFeedback: c.parentFeedback,
        }));
        classGroups[student.className].push({
          studentId: student.id,
          studentName: student.name,
          birthday: student.birthday,
          commCount: studentComms.length,
          communications: studentComms,
        });
      });

      // 每個班級內按生日排序（年紀大的在前 = birthday 較早的在前）
      Object.values(classGroups).forEach(group => {
        group.sort((a, b) => a.birthday.localeCompare(b.birthday));
      });

      return {
        weekNumber: input.weekNumber,
        totalComms: comms.length,
        totalStudents: allStudents.length,
        completedStudents: new Set(comms.map(c => c.studentId)).size,
        classGroups,
      };
    }),
  }),

  // ==================== Student Profile ====================
  studentProfile: router({
    get: protectedProcedure.input(z.object({
      studentId: z.number(),
    })).query(async ({ input }) => {
      return getStudentProfile(input.studentId);
    }),
  }),

  // ==================== Dashboard Stats ====================
  dashboard: router({
    todayIncidents: protectedProcedure.input(z.object({
      date: z.string(),
    })).query(async ({ input }) => {
      return getTodayIncidentCount(input.date);
    }),
    monthlyIncidents: protectedProcedure.input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    })).query(async ({ input }) => {
      const records = await getMonthlyIncidents(input.yearMonth);
      return records.length;
    }),
    growthProgress: protectedProcedure.input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    })).query(async ({ input }) => {
      return getGrowthProgress(input.yearMonth);
    }),
    todayTeacherLeaves: protectedProcedure.input(z.object({
      date: z.string(),
    })).query(async ({ input }) => {
      const leaves = await getTodayTeacherLeavesByType(input.date);
      const byType: Record<string, number> = {};
      leaves.forEach((l) => {
        const t = l.leaveType || "未分類";
        byType[t] = (byType[t] || 0) + 1;
      });
      return { total: leaves.length, byType };
    }),
  }),

  // ==================== Incident Reports ====================
  incident: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      return listIncidentReports(input?.startDate, input?.endDate);
    }),
    add: protectedProcedure.input(z.object({
      date: z.string(),
      className: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      description: z.string().optional().default(""),
      woundType: z.string().optional().default(""),
      time: z.string().optional().default(""),
      location: z.string().optional().default(""),
      parentResponse: z.string().optional().default(""),
      handler: z.string().optional().default(""),
      trackingStatus: z.string().optional().default("觀察中"),
      photoUrls: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await addIncidentReport({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      description: z.string().optional(),
      woundType: z.string().optional(),
      time: z.string().optional(),
      location: z.string().optional(),
      parentResponse: z.string().optional(),
      handler: z.string().optional(),
      trackingStatus: z.string().optional(),
      photoUrls: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateIncidentReport(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteIncidentReport(input.id);
      return { success: true };
    }),
    uploadPhoto: protectedProcedure.input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      fileName: z.string().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      const ext = input.mimeType.includes('png') ? 'png' : input.mimeType.includes('gif') ? 'gif' : 'jpg';
      const key = `incidents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
    fetchPhotoBase64: protectedProcedure.input(z.object({
      url: z.string(),
    })).mutation(async ({ input }) => {
      try {
        const resp = await fetch(input.url);
        if (!resp.ok) return { base64: null, extension: null };
        const contentType = resp.headers.get('content-type') || '';
        const arrayBuffer = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const extension = contentType.includes('png') ? 'png' : 'jpeg';
        return { base64, extension };
      } catch {
        return { base64: null, extension: null };
      }
    }),
  }),

  // ==================== Stat Items ====================
  stat: router({
    list: protectedProcedure.query(async () => {
      return listStatItems();
    }),
    summary: protectedProcedure.query(async () => {
      return getStatSummary();
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      statusLabel: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const id = await addStatItem({ ...input, createdBy: ctx.user?.id });
      return { success: true, id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      statusLabel: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateStatItem(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteStatItem(input.id);
      return { success: true };
    }),
    getRecords: protectedProcedure.input(z.object({ statItemId: z.number() })).query(async ({ input }) => {
      return getStatRecordsByItem(input.statItemId);
    }),
    toggleRecord: protectedProcedure.input(z.object({
      statItemId: z.number(),
      studentId: z.number(),
      studentName: z.string(),
      className: z.string(),
      checked: z.number(),
      notes: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      await upsertStatRecord(input);
      return { success: true };
    }),
    updateNote: protectedProcedure.input(z.object({
      statItemId: z.number(),
      studentId: z.number(),
      studentName: z.string(),
      className: z.string(),
      notes: z.string(),
    })).mutation(async ({ input }) => {
      // Get existing record to preserve checked state
      const records = await getStatRecordsByItem(input.statItemId);
      const existing = records.find(r => r.studentId === input.studentId);
      await upsertStatRecord({
        statItemId: input.statItemId,
        studentId: input.studentId,
        studentName: input.studentName,
        className: input.className,
        checked: existing?.checked ?? 0,
        notes: input.notes,
      });
      return { success: true };
    }),
    initRecords: protectedProcedure.input(z.object({
      statItemId: z.number(),
    })).mutation(async ({ input }) => {
      // Initialize records for all students
      const allStudents = await listStudents();
      const existingRecords = await getStatRecordsByItem(input.statItemId);
      const existingStudentIds = new Set(existingRecords.map(r => r.studentId));
      const newRecords = allStudents
        .filter(s => !existingStudentIds.has(s.id))
        .map(s => ({
          studentId: s.id,
          studentName: s.name,
          className: s.className,
          checked: 0,
          notes: "",
        }));
      if (newRecords.length > 0) {
        await bulkUpsertStatRecords(input.statItemId, newRecords);
      }
      return { success: true, added: newRecords.length };
    }),
  }),

  // Voice transcription removed (requires external Whisper API)
  voice: router({
    uploadAudio: protectedProcedure.input(z.object({
      base64: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      const ext = input.mimeType.includes('webm') ? 'webm' : input.mimeType.includes('wav') ? 'wav' : 'mp3';
      const key = `voice/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
  }),

  // ==================== Growth Records (成長檔案) ====================
  growth: router({
    list: protectedProcedure.input(z.object({ month: z.string() })).query(async ({ input }) => {
      return getGrowthRecordsByMonth(input.month);
    }),
    listRange: protectedProcedure.input(z.object({ startMonth: z.string(), endMonth: z.string() })).query(async ({ input }) => {
      return getGrowthRecordsByRange(input.startMonth, input.endMonth);
    }),
    getPrevious: protectedProcedure.input(z.object({ studentId: z.number(), currentMonth: z.string() })).query(async ({ input }) => {
      return getStudentPreviousGrowth(input.studentId, input.currentMonth);
    }),
    studentRecords: protectedProcedure.input(z.object({ studentId: z.number() })).query(async ({ input }) => {
      return getStudentGrowthRecords(input.studentId);
    }),
    save: protectedProcedure.input(z.object({
      month: z.string(),
      studentId: z.number(),
      studentName: z.string(),
      className: z.string(),
      field: z.enum(["height", "weight", "headCircumference", "footLength"]),
      value: z.string(),
    })).mutation(async ({ input }) => {
      // Validate: value must not be less than previous month's value
      if (input.value !== "") {
        const prev = await getStudentPreviousGrowth(input.studentId, input.month);
        if (prev) {
          const prevVal = parseFloat(prev[input.field] || "0");
          const newVal = parseFloat(input.value);
          if (!isNaN(prevVal) && prevVal > 0 && !isNaN(newVal) && newVal < prevVal) {
            const fieldNames: Record<string, string> = {
              height: "身高",
              weight: "體重",
              headCircumference: "頭圍",
              footLength: "腳長",
            };
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${fieldNames[input.field]}數值 ${input.value} 低於 ${prev.month} 的記錄 ${prev[input.field]}，不允許儲存`,
            });
          }
        }
      }
      const data: any = {
        month: input.month,
        studentId: input.studentId,
        studentName: input.studentName,
        className: input.className,
      };
      data[input.field] = input.value;
      await upsertGrowthRecord(data);
      return { success: true };
    }),
  }),

  // ==================== Meeting Records (會議記錄) ====================
  meeting: router({
    list: protectedProcedure.query(async () => {
      const meetingList = await listMeetings();
      // For each meeting, also get motions count
      const result = await Promise.all(meetingList.map(async (m) => {
        const motions = await listMotionsByMeeting(m.id);
        return { ...m, motionsCount: motions.length };
      }));
      return result;
    }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const meeting = await getMeeting(input.id);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: '會議記錄不存在' });
      const motions = await listMotionsByMeeting(meeting.id);
      return { ...meeting, motions };
    }),

    aggregateData: protectedProcedure.input(z.object({
      thisWeekStart: z.string(),
      thisWeekEnd: z.string(),
      lastWeekStart: z.string(),
      lastWeekEnd: z.string(),
    })).query(async ({ input }) => {
      return aggregateMeetingReportData(input);
    }),

    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      meetingDate: z.string(),
      meetingTime: z.string().optional().default(""),
      location: z.string().optional().default(""),
      attendeeIds: z.string().optional(), // JSON array
      recorder: z.string().optional().default(""),
      chairperson: z.string().optional().default(""),
      absentees: z.string().optional().default(""),
      thisWeekStart: z.string(),
      thisWeekEnd: z.string(),
      lastWeekStart: z.string(),
      lastWeekEnd: z.string(),
      reportData: z.string().optional(), // JSON snapshot
      motions: z.array(z.object({
        topic: z.string(),
        resolution: z.string().optional().default(""),
        assigneeId: z.number().optional(),
        assigneeName: z.string().optional().default(""),
        dueDate: z.string().optional().default(""),
      })).optional().default([]),
    })).mutation(async ({ input, ctx }) => {
      const { motions, ...meetingData } = input;
      const meetingId = await addMeeting({ ...meetingData, createdBy: ctx.user.id });
      // Add motions
      for (const motion of motions) {
        await addMotion({ ...motion, meetingId });
      }
      return { success: true, id: meetingId };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      meetingDate: z.string().optional(),
      meetingTime: z.string().optional(),
      location: z.string().optional(),
      attendeeIds: z.string().optional(),
      recorder: z.string().optional(),
      chairperson: z.string().optional(),
      absentees: z.string().optional(),
      trackingStatus: z.string().optional(),
      wordFileUrl: z.string().optional(),
      reportData: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMeeting(id, data);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteMeeting(input.id);
      return { success: true };
    }),

    // Motion CRUD
    addMotion: protectedProcedure.input(z.object({
      meetingId: z.number(),
      topic: z.string(),
      resolution: z.string().optional().default(""),
      assigneeId: z.number().optional(),
      assigneeName: z.string().optional().default(""),
      dueDate: z.string().optional().default(""),
    })).mutation(async ({ input }) => {
      const id = await addMotion(input);
      return { success: true, id };
    }),

    updateMotion: protectedProcedure.input(z.object({
      id: z.number(),
      topic: z.string().optional(),
      resolution: z.string().optional(),
      assigneeId: z.number().optional(),
      assigneeName: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMotion(id, data);
      return { success: true };
    }),

    deleteMotion: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteMotion(input.id);
      return { success: true };
    }),

    // Generate Word document
    generateWord: protectedProcedure.input(z.object({
      meetingId: z.number(),
    })).mutation(async ({ input }) => {
      const meeting = await getMeeting(input.meetingId);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: '會議記錄不存在' });
      const motions = await listMotionsByMeeting(meeting.id);
      const attendeeIds: number[] = meeting.attendeeIds ? JSON.parse(meeting.attendeeIds) : [];
      const allTeachers = await listTeachers();
      const attendees = allTeachers.filter(t => attendeeIds.includes(t.id));

      const buffer = await generateMeetingWordBuffer(meeting, motions, attendees);
      const key = `meetings/${meeting.id}-${Date.now()}.docx`;
      const { url } = await storagePut(key, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      await updateMeeting(meeting.id, { wordFileUrl: url });
      return { success: true, url };
    }),
  }),

  // ==================== 帳號白名單管理 ====================
  allowedEmail: router({
    list: adminProcedure.query(async () => {
      return listAllowedEmails();
    }),
    add: adminProcedure.input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })).mutation(async ({ input }) => {
      await addAllowedEmail(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      email: z.string().email().optional(),
      name: z.string().optional(),
      isActive: z.number().min(0).max(1).optional(),
    })).mutation(async ({ input }) => {
      await updateAllowedEmail(input);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAllowedEmail(input.id);
      return { success: true };
    }),
    bulkAdd: adminProcedure.input(z.object({
      emails: z.array(z.object({ email: z.string().email(), name: z.string().optional() })),
    })).mutation(async ({ input }) => {
      await bulkAddAllowedEmails(input.emails);
      return { success: true };
    }),
  }),

  // ==================== 登入紀錄 ====================
  loginLog: router({
    list: adminProcedure.input(z.object({
      limit: z.number().min(1).max(500).optional(),
    }).optional()).query(async ({ input }) => {
      return listLoginLogs(input?.limit ?? 200);
    }),
  }),

});

export type AppRouter = typeof appRouter;

