/**
 * 會議記錄 Word 文件生成模組
 * 參考範本：260223園務會議紀錄.docx
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlign,
  HeightRule,
} from 'docx';

// ===== Constants =====
const FONT = '微軟正黑體';
const TOTAL_WIDTH = 9600;
const GRAY_SHADING = { fill: 'D9D9D9' };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorderObj = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorderObj, bottom: noBorderObj, left: noBorderObj, right: noBorderObj };

// ===== Helpers =====
function cell(text: string, opts: any = {}) {
  return new TableCell({
    borders: opts.noBorder ? noBorders : allBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    shading: opts.shading,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { before: opts.spacingBefore ?? 40, after: opts.spacingAfter ?? 40 },
      indent: opts.indent ? { left: opts.indent } : undefined,
      children: Array.isArray(opts.runs) ? opts.runs : [
        new TextRun({ text, bold: opts.bold, size: opts.size || 20, font: FONT }),
      ],
    })],
  });
}

function multiCell(paragraphs: any[], opts: any = {}) {
  return new TableCell({
    borders: opts.noBorder ? noBorders : allBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    verticalAlign: opts.vAlign || VerticalAlign.TOP,
    shading: opts.shading,
    children: paragraphs,
  });
}

function para(text: string, opts: any = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.spacingBefore ?? 20, after: opts.spacingAfter ?? 20 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size || 20, font: FONT })],
  });
}

// ===== Course categories mapping =====
const COURSE_HEADERS = [
  { line1: '人初千日', line2: '五感教學' },
  { line1: '身體動作', line2: '音樂律動' },
  { line1: '認知探索', line2: '創意遊戲' },
  { line1: '社會情緒', line2: '語言溝通' },
  { line1: '生活自理', line2: '身體清潔' },
  { line1: '發展篩檢', line2: '' },
];

const COURSE_CATEGORY_MAP: Record<string, number> = {
  '人初千日與五感發展': 0,
  '身體動作與音樂律動': 1,
  '認知探索與創意遊戲': 2,
  '社會情緒與語言溝通': 3,
  '生活自理與健康清潔': 4,
  '生活自理及健康清潔': 4,
  '認知探索及創意遊戲': 2,
  '發展檢測': 5,
};

// ===== Types =====
interface MeetingData {
  id: number;
  title: string;
  meetingDate: string;
  meetingTime: string;
  location: string;
  chairperson: string;
  absentees: string;
  reportData: string | null;
  thisWeekStart: string;
  thisWeekEnd: string;
}

interface MotionData {
  topic: string;
  resolution: string;
  assigneeName: string;
  dueDate: string;
}

interface TeacherData {
  id: number;
  name: string;
}

// ===== Main export =====
export async function generateMeetingWordBuffer(
  meeting: MeetingData,
  motions: MotionData[],
  attendees: TeacherData[],
): Promise<Buffer> {
  const reportData = meeting.reportData ? JSON.parse(meeting.reportData) : null;
  const attendeeNames = attendees.map(t => t.name).join('、') + `等共${attendees.length}人`;

  // Determine quarter label from meeting date
  const meetingMonth = parseInt(meeting.meetingDate.substring(5, 7));
  const rocYear = parseInt(meeting.meetingDate.substring(0, 4)) - 1911;
  const quarter = meetingMonth <= 3 ? '第一季' : meetingMonth <= 6 ? '第二季' : meetingMonth <= 9 ? '第三季' : '第四季';
  const quarterLabel = `${rocYear}年${quarter}`;

  // ===== Build main table rows =====
  const mainRows: any[] = [];

  // Row 1: Header (gray)
  mainRows.push(new TableRow({
    children: [
      cell('項目', { width: 1400, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
      cell('討 論 內 容 及 細 項', { colSpan: 6, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
    ],
  }));

  // Row 2: 會議主旨
  mainRows.push(new TableRow({
    children: [
      cell('會議主旨', { width: 1400, bold: true, align: AlignmentType.CENTER }),
      cell(meeting.title, { colSpan: 6 }),
    ],
  }));

  // Row 3: 時間/地點
  mainRows.push(new TableRow({
    children: [
      cell('時間/地點', { width: 1400, bold: true, align: AlignmentType.CENTER }),
      cell(`${meeting.meetingDate} ${meeting.meetingTime}/${meeting.location}`, { colSpan: 6 }),
    ],
  }));

  // Row 4: 應出席人員
  mainRows.push(new TableRow({
    children: [
      cell('應出席人員', { width: 1400, bold: true, align: AlignmentType.CENTER }),
      cell(attendeeNames, { colSpan: 6 }),
    ],
  }));

  // Row 5: 請假人員 | (name) | 主持人 | (name)
  mainRows.push(new TableRow({
    children: [
      cell('請假人員', { width: 1400, bold: true, align: AlignmentType.CENTER }),
      cell(meeting.absentees || '', { colSpan: 3 }),
      cell('主持人', { width: 1000, bold: true, align: AlignmentType.CENTER }),
      cell(meeting.chairperson || '', { colSpan: 2 }),
    ],
  }));

  // Row 6: 報告項目 | 報告事項 | 列管情況 (gray header)
  mainRows.push(new TableRow({
    children: [
      cell('報告項目', { width: 1400, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
      cell('報 告 事 項', { colSpan: 4, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
      cell('列管情況', { colSpan: 2, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
    ],
  }));

  // ===== 報告項目 Section 1: 行政組 =====
  const adminItems: { text: string; hasTracking: boolean }[] = [];

  if (reportData) {
    // (1) 本週幼生出席
    const totalStudents = reportData.studentAttendance?.length || 0;
    const withLeaves = reportData.studentAttendance?.filter((s: any) => s.leaves?.length > 0) || [];
    const avgCheckin = totalStudents > 0
      ? (reportData.studentAttendance.reduce((sum: number, s: any) => sum + s.checkinDays, 0) / totalStudents).toFixed(1)
      : '0';
    adminItems.push({
      text: `本週幼生出席：幼生總數 ${totalStudents} 人，平均出席 ${avgCheckin} 天，請假 ${withLeaves.length} 人`,
      hasTracking: true,
    });

    // (2) 本週老師請假
    const teacherLeaveCount = reportData.teacherLeaves?.length || 0;
    adminItems.push({
      text: teacherLeaveCount > 0 ? `本週老師請假 ${teacherLeaveCount} 人次` : '本週無老師請假',
      hasTracking: true,
    });

    // (3) 上週意外傷害
    const incidentCount = reportData.incidents?.length || 0;
    const observingCount = reportData.incidents?.filter((i: any) => i.trackingStatus === '觀察中').length || 0;
    adminItems.push({
      text: incidentCount > 0 ? `上週意外傷害 ${incidentCount} 件，觀察中 ${observingCount} 件` : '上週無意外傷害記錄',
      hasTracking: true,
    });

    // (4) 上週家長溝通
    const commCount = reportData.parentComm?.length || 0;
    adminItems.push({
      text: commCount > 0 ? `上週家長溝通 ${commCount} 筆` : '上週無家長溝通記錄',
      hasTracking: true,
    });

    // (5) 成長檔案進度
    const gp = reportData.growthProgress;
    const filled = gp?.filledStudents || 0;
    const total = gp?.totalStudents || 0;
    const unfilled = total - filled;
    adminItems.push({
      text: `成長檔案：總幼生 ${total} 人，已填寫 ${filled} 人，未填寫 ${unfilled} 人`,
      hasTracking: true,
    });

    // (6) 統計資料
    const statItems = reportData.statSummary || [];
    const statText = statItems.length > 0
      ? statItems.map((item: any) => `${item.name}：${item.checkedCount}/${item.totalCount}`).join('；')
      : '目前無統計項目';
    adminItems.push({
      text: `統計資料：${statText}`,
      hasTracking: true,
    });
  }

  // Build admin section paragraphs for left column
  const adminParas: any[] = [
    para('一、行政組', { bold: true }),
  ];
  adminItems.forEach((item, idx) => {
    adminParas.push(para(`(${idx + 1})${item.text}`, { indent: 200 }));
  });

  // Build tracking column paragraphs
  const trackingParas: any[] = [
    para('', {}), // spacer for header
  ];
  adminItems.forEach(() => {
    trackingParas.push(para('□完成(__/__)', { size: 18 }));
  });

  mainRows.push(new TableRow({
    children: [
      multiCell(adminParas, { colSpan: 5 }),
      multiCell(trackingParas, { colSpan: 2 }),
    ],
  }));

  // ===== 報告項目 Section 2: 早/晚值組/人事組/餐點組 =====
  const section2Paras: any[] = [
    para('二、早/晚值組/人事組/餐點組：', { bold: true }),
    para('(1)人事組：', { indent: 200 }),
    para('(2)其他組：', { indent: 200 }),
  ];

  mainRows.push(new TableRow({
    children: [
      multiCell(section2Paras, { colSpan: 5 }),
      cell('', { colSpan: 2 }),
    ],
  }));

  // ===== 報告項目 Section 3: 其他宣導事項 =====
  const section3Paras: any[] = [
    para('三、其他宣導事項：', { bold: true }),
    para('無', { indent: 200 }),
  ];

  mainRows.push(new TableRow({
    children: [
      multiCell(section3Paras, { colSpan: 5 }),
      cell('', { colSpan: 2 }),
    ],
  }));

  // ===== 托育活動 =====
  // Header row
  mainRows.push(new TableRow({
    children: [
      cell('托 育 活 動', { colSpan: 7, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
    ],
  }));

  // Course header row (2 lines per column)
  const courseColWidth = Math.floor((TOTAL_WIDTH - 1400) / 6); // ~1366
  mainRows.push(new TableRow({
    children: [
      cell('', { width: 1400 }), // empty first column
      ...COURSE_HEADERS.map((h, idx) => {
        const isLast = idx === COURSE_HEADERS.length - 1;
        const line2Text = isLast ? quarterLabel : h.line2;
        return multiCell([
          para(h.line1, { align: AlignmentType.CENTER, spacingBefore: 20, spacingAfter: 0 }),
          para(line2Text, { align: AlignmentType.CENTER, spacingBefore: 0, spacingAfter: 20 }),
        ], { width: courseColWidth, vAlign: VerticalAlign.CENTER });
      }),
    ],
  }));

  // 課程名稱 row (2 lines height)
  mainRows.push(new TableRow({
    height: { value: 600, rule: HeightRule.ATLEAST },
    children: [
      multiCell([
        para('課程', { align: AlignmentType.CENTER, spacingBefore: 20, spacingAfter: 0 }),
        para('名稱', { align: AlignmentType.CENTER, spacingBefore: 0, spacingAfter: 20 }),
      ], { width: 1400, vAlign: VerticalAlign.CENTER }),
      ...COURSE_HEADERS.map(() => cell('', { width: courseColWidth })),
    ],
  }));

  // 拍攝說明 row (2 lines height)
  mainRows.push(new TableRow({
    height: { value: 600, rule: HeightRule.ATLEAST },
    children: [
      multiCell([
        para('拍攝', { align: AlignmentType.CENTER, spacingBefore: 20, spacingAfter: 0 }),
        para('說明', { align: AlignmentType.CENTER, spacingBefore: 0, spacingAfter: 20 }),
      ], { width: 1400, vAlign: VerticalAlign.CENTER }),
      ...COURSE_HEADERS.map(() => cell('', { width: courseColWidth })),
    ],
  }));

  // 備註 row
  mainRows.push(new TableRow({
    height: { value: 500, rule: HeightRule.ATLEAST },
    children: [
      cell('備註', { width: 1400, align: AlignmentType.CENTER }),
      ...COURSE_HEADERS.map(() => cell('', { width: courseColWidth })),
    ],
  }));

  // ===== 臨時動議 =====
  mainRows.push(new TableRow({
    children: [
      cell('臨 時 動 議', { colSpan: 7, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
    ],
  }));

  // 討論事項 | 決議事項 sub-header
  mainRows.push(new TableRow({
    children: [
      cell('討 論 事 項', { colSpan: 4, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
      cell('決 議 事 項', { colSpan: 3, bold: true, align: AlignmentType.CENTER, shading: GRAY_SHADING }),
    ],
  }));

  // Motion items
  if (motions.length > 0) {
    motions.forEach((m, idx) => {
      const topicParas: any[] = [
        para(`${idx + 1}.  討論事項：${m.topic}`, { bold: true }),
      ];
      if (m.assigneeName || m.dueDate) {
        const parts: string[] = [];
        if (m.assigneeName) parts.push(`負責人：${m.assigneeName}`);
        if (m.dueDate) parts.push(`預計完成：${m.dueDate}`);
        topicParas.push(para(`    ${parts.join('，')}`, { size: 18 }));
      }

      const resParas: any[] = [
        para(m.resolution ? `→決議事項：${m.resolution}` : '→決議事項：', {}),
      ];

      mainRows.push(new TableRow({
        children: [
          multiCell(topicParas, { colSpan: 4 }),
          multiCell(resParas, { colSpan: 3 }),
        ],
      }));
    });
  } else {
    mainRows.push(new TableRow({
      children: [
        multiCell([
          para('1.  討論事項：', { bold: true }),
          para('→決議事項：', {}),
        ], { colSpan: 4 }),
        cell('', { colSpan: 3 }),
      ],
    }));
  }

  // ===== Build page content =====
  const pageChildren: any[] = [];

  // Header
  pageChildren.push(new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: '知愛家托嬰中心', bold: true, size: 28, font: FONT }),
      new TextRun({ text: '                              表單編號：________', size: 20, font: FONT }),
    ],
  }));

  // Main table
  pageChildren.push(new Table({
    rows: mainRows,
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
  }));

  // 簽核 / 各級主管
  pageChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: '簽核 / 各級主管', size: 20, font: FONT })],
  }));

  // ===== Signature table =====
  const sigRows: any[] = [];
  const classLabels = ['I', 'A', 'B', 'C', 'D', 'Z'];
  const sigColWidth = Math.floor(TOTAL_WIDTH / 9); // ~1066

  // Header row: 執行長 | 主任 | 全體老師(span 6) | 紀錄人
  sigRows.push(new TableRow({
    children: [
      cell('執行長', { width: sigColWidth, bold: true, align: AlignmentType.CENTER }),
      cell('主任', { width: sigColWidth, bold: true, align: AlignmentType.CENTER }),
      cell('全體老師', { colSpan: 6, bold: true, align: AlignmentType.CENTER }),
      cell('紀錄人', { width: sigColWidth, bold: true, align: AlignmentType.CENTER }),
    ],
  }));

  // Class labels row
  sigRows.push(new TableRow({
    children: [
      cell('', { width: sigColWidth }),
      cell('', { width: sigColWidth }),
      ...classLabels.map(cl => cell(cl, { width: sigColWidth, align: AlignmentType.CENTER })),
      cell('', { width: sigColWidth }),
    ],
  }));

  // Empty signature rows
  for (let i = 0; i < 2; i++) {
    sigRows.push(new TableRow({
      height: { value: 600, rule: HeightRule.ATLEAST },
      children: [
        cell('', { width: sigColWidth }),
        cell('', { width: sigColWidth }),
        ...classLabels.map(() => cell('', { width: sigColWidth })),
        cell('', { width: sigColWidth }),
      ],
    }));
  }

  pageChildren.push(new Table({
    rows: sigRows,
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
  }));

  // ===== Build document =====
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: pageChildren,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
