// API tầng mobile.
//
// - Domain BE ĐÃ CÓ → gọi BE thật qua `./real`: đăng nhập, hồ sơ cá nhân,
//   khu vực công tác (xem `api-contracts.md` §0).
// - Domain BE CHƯA CÓ (tasks, đăng ký TNV, giờ đóng góp, vật tư, thông báo) → vẫn
//   mock trên AsyncStorage qua `../mocks/db`.
// - Khi BE không chạy (gateway chưa bật) các hàm real tự rơi về mock để app vẫn
//   demo được. CHỈ rơi khi lỗi mạng — sai mật khẩu (401) vẫn báo lỗi thật.
import { ApiError } from './client';
import {
  activeSeasonReal,
  applyForTaskReal,
  communitiesReal,
  contributionNeedsReal,
  currentUser,
  listAreasReal,
  loginReal,
  markAllNotificationsReadReal,
  markNotificationReadReal,
  myAttendanceReal,
  myContributionsReal,
  myRecognitionReal,
  myTasksReal,
  notificationsReal,
  offerLoanReal,
  openTasksReal,
  pledgeMaterialReal,
  pledgeMoneyReal,
  replaceAvailabilityReal,
  replaceSkillsReal,
  requestAttendanceCorrectionReal,
  skillsReal,
  submitTaskReviewReal,
  taskDetailReal,
  taskProgressReal,
  updateProfileReal,
} from './real';
import type {
  ActivityLog,
  AvailabilitySlot,
  CommunityOption,
  ContributionNeed,
  MyContribution,
  NotificationItem,
  Skill,
  Task,
  TaskAssignment,
  Timesheet,
  User,
  VolunteerReg,
  WorkArea,
} from '../types';
import { SKILLS, assignmentStatus, taskAssignmentList } from '../types';
import { loadDb, saveDb } from '../mocks/db';

export { ApiError, API_BASE } from './client';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/** BE không chạy → dùng seed sẵn trong app. */
const isOffline = (err: unknown): boolean => err instanceof ApiError && err.offline;

// Chế độ dữ liệu: `true` khi lần gọi gần nhất lấy được dữ liệu từ BE. Dùng để
// ẩn những hành động BE chưa hỗ trợ thay vì giả lập thành công.
let realApi = false;
export const isRealApiActive = () => realApi;

/**
 * Gọi BE thật; chỉ rơi về mock khi lỗi mạng (gateway tắt). Lỗi nghiệp vụ
 * (401/403/409/422…) vẫn ném ra cho UI hiển thị.
 */
async function withFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  try {
    const value = await real();
    realApi = true;
    return value;
  } catch (err) {
    if (!isOffline(err)) throw err;
    realApi = false;
    return mock();
  }
}

// Tài khoản demo — mật khẩu chung "grotto123" (khớp seed BE và app offline).
export const DEMO_PASSWORD = 'grotto123';
export const DEMO_EMAILS = ['volunteer@grottoworks.vn', 'volunteer2@grottoworks.vn'];

export type SessionUser = User;

/**
 * Trạng thái phân công để hiển thị/lọc. BE chưa trả assignment trong `TaskDto`
 * (`GET /users/me/tasks` chỉ trả task mà TNV đã có phân công) → khi dùng dữ
 * liệu thật, coi là ACCEPTED; ngoài ra dùng dữ liệu mock.
 */
export function myAssignmentStatus(
  task: Task,
  volunteerId: string,
): TaskAssignment['status'] | undefined {
  if (realApi) return 'ACCEPTED';
  return assignmentStatus(task, volunteerId);
}

/** Đăng nhập: BE `POST /api/v1/auth/login` + `GET /api/v1/users/me`. */
export async function login(email: string, password: string): Promise<SessionUser> {
  try {
    const user = await loginReal(email, password);
    realApi = true;
    return user;
  } catch (err) {
    if (!isOffline(err)) throw new Error('INVALID_CREDENTIALS');
    realApi = false;
    return mockLogin(email, password);
  }
}

async function mockLogin(email: string, password: string): Promise<SessionUser> {
  await delay(400);
  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password !== DEMO_PASSWORD) {
    throw new Error('INVALID_CREDENTIALS');
  }
  return user;
}

/** Hồ sơ của chính mình: BE `GET /api/v1/users/me` (bỏ qua `id` của phiên cũ). */
export async function getUser(id: string): Promise<User> {
  return withFallback(currentUser, async () => {
    await delay(150);
    const db = await loadDb();
    const user = db.users.find((u) => u.id === id) ?? db.users[0];
    if (!user) throw new Error('NOT_FOUND');
    return user;
  });
}

/** Trường hồ sơ TNV được sửa (khớp các endpoint Identity). */
export interface ProfilePatch {
  name?: string;
  phone?: string;
  introduction?: string;
  communityId?: string;
  /** Id kỹ năng trong danh mục BE (`GET /skills`). */
  skillIds?: string[];
  /** Tên kỹ năng để cập nhật state ngay, không gửi lên BE. */
  skills?: string[];
  availability?: AvailabilitySlot[];
}

/** Cộng đoàn thuộc giáo xứ của TNV (để khai báo hồ sơ). */
export async function listCommunities(): Promise<CommunityOption[]> {
  return withFallback(
    async () => {
      const me = await currentUser();
      return me.parishId ? communitiesReal(me.parishId) : [];
    },
    async () => {
      await delay(80);
      const db = await loadDb();
      return db.communities.map((c) => ({ id: c.id, name: c.name }));
    },
  );
}

/** Cập nhật hồ sơ: PATCH /users/me + PUT /users/me/skills + PUT /users/me/availability. */
export async function updateUser(id: string, patch: ProfilePatch): Promise<User> {
  return withFallback(
    async () => {
      const base = await updateProfileReal({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.introduction !== undefined ? { introduction: patch.introduction } : {}),
        ...(patch.communityId !== undefined ? { communityId: patch.communityId } : {}),
      });
      if (patch.skillIds) await replaceSkillsReal(patch.skillIds);
      if (patch.availability) await replaceAvailabilityReal(patch.availability);
      return {
        ...base,
        ...(patch.skills ? { skills: patch.skills } : {}),
        ...(patch.availability ? { availability: patch.availability } : {}),
      };
    },
    async () => {
      await delay(200);
      const db = await loadDb();
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx < 0) throw new Error('NOT_FOUND');
      const { skillIds: _skillIds, ...localPatch } = patch;
      db.users[idx] = { ...db.users[idx], ...localPatch };
      await saveDb(db);
      return db.users[idx];
    },
  );
}

/** Danh mục kỹ năng: BE `GET /skills`; offline dùng danh sách cứng của app. */
export async function listSkills(): Promise<Skill[]> {
  return withFallback(skillsReal, async () => {
    await delay(100);
    return SKILLS.map((name, index) => ({
      id: `mock-skill-${index}`,
      code: `SK${index}`,
      name,
    }));
  });
}

/** Khu vực công tác của mùa đang chạy (BE không có endpoint `/areas` phẳng). */
export async function listAreas(): Promise<WorkArea[]> {
  return withFallback(listAreasReal, async () => {
    await delay(150);
    const db = await loadDb();
    return db.areas;
  });
}

export async function listMaterials() {
  await delay(150);
  const db = await loadDb();
  return db.materials;
}

// Nhiệm vụ liên quan tới 1 TNV: BE `GET /api/v1/users/me/tasks`.
export async function listMyTasks(volunteerId: string): Promise<Task[]> {
  return withFallback(myTasksReal, async () => {
    await delay(200);
    const db = await loadDb();
    return db.tasks.filter(
      (t) =>
        t.assignees.includes(volunteerId) ||
        (t.assignments ?? []).some((a) => a.volunteerId === volunteerId),
    );
  });
}

/** Chi tiết nhiệm vụ: BE `GET /api/v1/tasks/{id}`. */
export async function getTask(id: string): Promise<Task> {
  return withFallback(
    () => taskDetailReal(id),
    async () => {
      await delay(150);
      const db = await loadDb();
      const task = db.tasks.find((t) => t.id === id);
      if (!task) throw new Error('NOT_FOUND');
      return task;
    },
  );
}

// ── Đăng ký tình nguyện ─────────────────────────────────────────────────────
// Task đang tuyển: gộp task của mọi khu vực đang mở (BE không có endpoint
// "task đang mở" nên gọi theo từng khu vực). TNV đã đăng ký vẫn thấy task —
// BE sẽ trả 409 khi nộp trùng.
export async function listOpenTasks(volunteerId: string): Promise<Task[]> {
  return withFallback(openTasksReal, async () => {
    await delay(200);
    const db = await loadDb();
    const myRegTaskIds = new Set(
      db.volunteerRegs.filter((r) => r.volunteerId === volunteerId).map((r) => r.taskId),
    );
    return db.tasks.filter((t) => {
      if (t.status === 'DONE' || t.status === 'REVIEW') return false;
      if (t.assignees.length >= t.volunteersNeeded) return false;
      if (t.assignees.includes(volunteerId)) return false;
      if (myRegTaskIds.has(t.id)) return false;
      return true;
    });
  });
}

export async function listMyRegs(volunteerId: string): Promise<VolunteerReg[]> {
  await delay(150);
  const db = await loadDb();
  return db.volunteerRegs
    .filter((r) => r.volunteerId === volunteerId)
    .sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? 1 : -1));
}

// Đơn đăng ký của TNV cho 1 task — trả về `null` (không phải undefined) khi
// chưa có, vì React Query yêu cầu queryFn không được trả về undefined.
export async function getMyReg(
  taskId: string,
  volunteerId: string,
): Promise<VolunteerReg | null> {
  await delay(100);
  const db = await loadDb();
  return db.volunteerRegs.find((r) => r.taskId === taskId && r.volunteerId === volunteerId) ?? null;
}

/** Mã lỗi nghiệp vụ BE trả trong `{ code }` của ProblemDetails. */
function problemCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') return undefined;
  const code = (err.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

// Gửi đơn đăng ký: BE `POST /api/v1/tasks/{taskId}/applications`. BE chưa có
// endpoint liệt kê đơn của TNV nên lưu bản sao cục bộ để màn chi tiết hiện
// đúng trạng thái "chờ duyệt" trên thiết bị này.
export async function registerForTask(
  taskId: string,
  volunteerId: string,
  note?: string,
): Promise<VolunteerReg> {
  try {
    const reg = await applyForTaskReal(taskId, note);
    realApi = true;
    const db = await loadDb();
    db.volunteerRegs = [
      reg,
      ...db.volunteerRegs.filter(
        (r) => !(r.taskId === taskId && r.volunteerId === volunteerId),
      ),
    ];
    await saveDb(db);
    return reg;
  } catch (err) {
    if (!isOffline(err)) {
      // Dịch mã lỗi BE sang thông báo nghiệp vụ cho TNV.
      switch (problemCode(err)) {
        case 'TASK_CAPACITY_EXCEEDED':
          throw new Error('TASK_FULL');
        case 'TASK_SKILL_MISMATCH':
          throw new Error('SKILL_MISMATCH');
        case 'TASK_INVALID_STATE':
          throw new Error('TASK_NOT_OPEN');
        default:
          break;
      }
      if (err instanceof ApiError && err.status === 409) throw new Error('ALREADY_REGISTERED');
      throw err;
    }
    realApi = false;
    return registerForTaskMock(taskId, volunteerId, note);
  }
}

async function registerForTaskMock(
  taskId: string,
  volunteerId: string,
  note?: string,
): Promise<VolunteerReg> {
  await delay(280);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('NOT_FOUND');
  if (task.assignees.includes(volunteerId)) throw new Error('ALREADY_ASSIGNED');
  const existing = db.volunteerRegs.find(
    (r) => r.taskId === taskId && r.volunteerId === volunteerId && r.status !== 'REJECTED',
  );
  if (existing) throw new Error('ALREADY_REGISTERED');

  const reg: VolunteerReg = {
    id: `vr-${Date.now()}`,
    taskId,
    volunteerId,
    status: 'PENDING',
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
  };
  db.volunteerRegs = [reg, ...db.volunteerRegs];
  // Đánh dấu đang chờ duyệt trên task để khóa nút đăng ký (nếu vẫn còn chỗ).
  if (task.assignees.length < task.volunteersNeeded) {
    task.pendingRegVolunteerIds = [...new Set([...(task.pendingRegVolunteerIds ?? []), volunteerId])];
  }
  await saveDb(db);
  await logActivity('Bạn', `đăng ký tham gia nhiệm vụ "${task.title}"`, task.title);
  return reg;
}

// TNV rút đơn đăng ký khi còn PENDING. BE chưa có endpoint huỷ đơn → chỉ hỗ
// trợ ở chế độ offline.
export async function cancelRegistration(regId: string): Promise<void> {
  if (realApi) throw new Error('BE_UNSUPPORTED_CANCEL_APPLICATION');
  await delay(200);
  const db = await loadDb();
  const reg = db.volunteerRegs.find((r) => r.id === regId);
  if (!reg) throw new Error('NOT_FOUND');
  if (reg.status !== 'PENDING') throw new Error('NOT_PENDING');
  db.volunteerRegs = db.volunteerRegs.filter((r) => r.id !== regId);
  await saveDb(db);
}

// ── Ghi log/hoạt động ───────────────────────────────────────────────────────
async function logActivity(actor: string, action: string, target: string): Promise<void> {
  const db = await loadDb();
  const log: ActivityLog = {
    id: `lg-${Date.now()}`,
    at: new Date().toISOString(),
    actor,
    action,
    target,
  };
  db.activityLogs = [log, ...db.activityLogs];
  await saveDb(db);
}

// TNV phản hồi phân công (accept/decline). BE yêu cầu `assignmentId` nhưng
// TaskDto không trả về cho TNV → chỉ hỗ trợ ở chế độ offline (demo).
export async function respondAssignment(
  taskId: string,
  volunteerId: string,
  status: 'ACCEPTED' | 'DECLINED',
  note?: string,
): Promise<Task> {
  if (realApi) throw new Error('BE_UNSUPPORTED_ASSIGNMENT_RESPONSE');
  await delay(250);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('NOT_FOUND');
  const list = taskAssignmentList(task).filter((a) => a.volunteerId !== volunteerId);
  list.push(note ? { volunteerId, status, note } : { volunteerId, status });
  task.assignments = list;
  task.assignees =
    status === 'ACCEPTED'
      ? [...new Set([...task.assignees, volunteerId])]
      : task.assignees.filter((v) => v !== volunteerId);
  await saveDb(db);
  const verb = status === 'ACCEPTED' ? 'nhận' : 'từ chối';
  await logActivity('Bạn', `${verb} nhiệm vụ "${task.title}"`, task.title);
  return task;
}

// TNV gửi duyệt hoàn thành kèm ≥1 ảnh minh chứng.
// Online: upload ảnh → `POST /tasks/{id}/submit` (hoặc `/resubmit` khi leader
// đã yêu cầu sửa). Offline: ghi vào mock DB.
export async function submitReview(
  taskId: string,
  note: string,
  photoUris: string[],
): Promise<Task> {
  if (photoUris.length === 0) throw new Error('PHOTO_REQUIRED');
  if (realApi) {
    const current = await taskDetailReal(taskId);
    return submitTaskReviewReal(taskId, {
      note,
      photoUris,
      resubmit: current.status === 'REVISE',
    });
  }
  await delay(250);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('NOT_FOUND');
  task.status = 'REVIEW';
  task.submittedNotes = note;
  task.submittedPhotoUris = photoUris;
  task.submittedPhotos = photoUris.length;
  await saveDb(db);
  await logActivity(
    'Bạn',
    `gửi duyệt hoàn thành "${task.title}" (${photoUris.length} ảnh)`,
    task.title,
  );
  return task;
}

export interface TaskProgressEntry {
  id: string;
  percent: number;
  note?: string;
  submittedAt: string;
  isSubmission: boolean;
  evidenceCount: number;
  approvedAt?: string;
}

/**
 * Tiến độ / nghiệm thu của task — BE `GET /tasks/{taskId}/progress`.
 * Offline lấy từ bản ghi mock của chính TNV.
 */
export async function listTaskProgress(taskId: string): Promise<TaskProgressEntry[]> {
  if (realApi) {
    const rows = await taskProgressReal(taskId);
    return rows
      .map((row) => ({
        id: row.id,
        percent: row.percentComplete,
        ...(row.note ? { note: row.note } : {}),
        submittedAt: row.submittedAt,
        isSubmission: row.isSubmission,
        evidenceCount: row.evidence?.length ?? 0,
        ...(row.approvedAt ? { approvedAt: row.approvedAt } : {}),
      }))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }
  await delay(120);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task?.submittedNotes && !task?.submittedPhotoUris?.length) return [];
  return [
    {
      id: `${taskId}-mock`,
      percent: 100,
      ...(task.submittedNotes ? { note: task.submittedNotes } : {}),
      submittedAt: new Date().toISOString(),
      isSubmission: true,
      evidenceCount: task.submittedPhotoUris?.length ?? 0,
    },
  ];
}

// ── Giờ đóng góp ─────────────────────────────────────────────────────────────
/** Lịch sử giờ đóng góp: BE `GET /api/v1/users/me/attendance`. */
export async function listMyTimesheets(volunteerId: string): Promise<Timesheet[]> {
  return withFallback(myAttendanceReal, async () => {
    await delay(200);
    const db = await loadDb();
    return db.timesheets
      .filter((t) => t.volunteerId === volunteerId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });
}

const today = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

// Vào ca: BE yêu cầu `assignmentId` (POST /task-assignments/{id}/attendance/
// check-in-requests) mà TNV không lấy được → chỉ hỗ trợ ở chế độ offline.
export async function checkIn(volunteerId: string): Promise<Timesheet> {
  if (realApi) throw new Error('BE_UNSUPPORTED_CHECK_IN');
  await delay(250);
  const db = await loadDb();
  const existing = db.timesheets.find(
    (t) => t.volunteerId === volunteerId && t.date === today() && t.status === 'OPEN',
  );
  if (existing) return existing;
  const ts: Timesheet = {
    id: `ts-${Date.now()}`,
    volunteerId,
    date: today(),
    checkIn: nowHHMM(),
    hours: 0,
    status: 'OPEN',
  };
  db.timesheets.push(ts);
  await saveDb(db);
  await logActivity('Bạn', `bắt đầu đóng góp lúc ${ts.checkIn}`, `Giờ đóng góp ${ts.date}`);
  return ts;
}

export async function checkOut(volunteerId: string): Promise<Timesheet> {
  if (realApi) throw new Error('BE_UNSUPPORTED_CHECK_IN');
  await delay(250);
  const db = await loadDb();
  const open = db.timesheets.find(
    (t) => t.volunteerId === volunteerId && t.date === today() && t.status === 'OPEN',
  );
  if (!open) throw new Error('NO_OPEN_SESSION');
  const [h, m] = open.checkIn.split(':').map(Number);
  const out = nowHHMM();
  const [oh, om] = out.split(':').map(Number);
  const hours = Math.max(0, Math.round(((oh * 60 + om - (h * 60 + m)) / 60) * 10) / 10);
  open.checkOut = out;
  open.hours = hours;
  open.status = 'CLOSED';
  await saveDb(db);
  await logActivity('Bạn', `kết thúc đóng góp lúc ${out} (${hours} giờ)`, `Giờ đóng góp ${open.date}`);
  return open;
}

// Yêu cầu chỉnh giờ công. Online: `POST /attendance/{id}/correction-requests`
// (BE cần giờ vào/ra đầy đủ + version + lý do). Offline: đánh dấu PENDING_FIX.
export async function requestCorrection(ts: Timesheet, note: string): Promise<Timesheet> {
  if (realApi) {
    if (!ts.checkInAt || !ts.checkOutAt || ts.version == null) {
      throw new Error('CORRECTION_DETAILS_MISSING');
    }
    await requestAttendanceCorrectionReal({
      attendanceId: ts.id,
      checkInAt: ts.checkInAt,
      checkOutAt: ts.checkOutAt,
      reason: note,
      version: ts.version,
    });
    return { ...ts, status: 'PENDING_FIX', correctionRequest: note };
  }
  await delay(250);
  const db = await loadDb();
  const stored = db.timesheets.find((t) => t.id === ts.id);
  if (!stored) throw new Error('NOT_FOUND');
  stored.status = 'PENDING_FIX';
  stored.correctionRequest = note;
  await saveDb(db);
  await logActivity('Bạn', `yêu cầu chỉnh giờ đóng góp "${note}"`, `Giờ đóng góp ${stored.date}`);
  return stored;
}

// ── Thông báo ────────────────────────────────────────────────────────────────
export async function listActivity(): Promise<ActivityLog[]> {
  await delay(150);
  const db = await loadDb();
  return [...db.activityLogs].sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Thông báo in-app: BE `GET /notifications`; offline lấy từ log cục bộ. */
export async function listNotifications(): Promise<NotificationItem[]> {
  return withFallback(notificationsReal, async () => {
    const logs = await listActivity();
    return logs.map((log) => ({
      id: log.id,
      eventType: 'activity',
      title: log.action,
      body: log.target,
      isRead: true,
      createdAt: log.at,
    }));
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!realApi) return;
  await markNotificationReadReal(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!realApi) return;
  await markAllNotificationsReadReal();
}

// ── Điểm ghi nhận ────────────────────────────────────────────────────────────
export interface Recognition {
  totalPoints: number;
  contributions: number;
}

/** Điểm & số đóng góp được ghi nhận: BE `GET /users/me/recognition`. */
export async function getMyRecognition(): Promise<Recognition> {
  return withFallback(
    async () => {
      const summary = await myRecognitionReal();
      return { totalPoints: summary.totalPoints, contributions: summary.contributions };
    },
    async () => {
      await delay(100);
      const db = await loadDb();
      return { totalPoints: db.users[0]?.points ?? 0, contributions: 0 };
    },
  );
}

// ── Đóng góp / quyên góp ─────────────────────────────────────────────────────
/** Các pledge của chính mình: BE `GET /users/me/contributions`. */
export async function listMyContributions(): Promise<MyContribution[]> {
  return withFallback(myContributionsReal, async () => {
    await delay(120);
    return [] as MyContribution[];
  });
}

/** Vật tư còn thiếu của mùa đang chạy (gợi ý khi cam kết quyên góp). */
export async function listContributionNeeds(): Promise<ContributionNeed[]> {
  return withFallback(
    async () => {
      const season = await activeSeasonReal();
      return season ? contributionNeedsReal(season.id) : [];
    },
    async () => {
      await delay(120);
      return [] as ContributionNeed[];
    },
  );
}

export interface PledgeMaterialInput {
  materialId: string;
  pledgedQuantity: number;
  note?: string;
}

/** Cam kết quyên góp vật tư: BE `POST /donations/material-pledges` (chỉ khi online). */
export async function pledgeMaterial(
  workAreaId: string,
  items: PledgeMaterialInput[],
  note?: string,
): Promise<MyContribution> {
  if (!realApi) throw new Error('OFFLINE');
  return pledgeMaterialReal(workAreaId, items, note);
}

/** Cam kết quyên góp tiền: BE `POST /donations/monetary-pledges` (chỉ khi online). */
export async function pledgeMoney(
  amount: number,
  note?: string,
  workAreaId?: string,
): Promise<MyContribution> {
  if (!realApi) throw new Error('OFFLINE');
  const season = await activeSeasonReal();
  if (!season) throw new Error('NOT_FOUND');
  return pledgeMoneyReal(season.id, amount, workAreaId, note);
}

/** Đăng ký cho mượn dụng cụ: BE `POST /loan-offers` (chỉ khi online). */
export async function offerLoanItem(input: {
  ownerName: string;
  ownerPhone?: string;
  ownerAddress?: string;
  itemName: string;
  quantity: number;
  expectedReturnDate: string;
  description?: string;
  initialCondition?: string;
  workAreaId?: string;
}): Promise<void> {
  if (!realApi) throw new Error('OFFLINE');
  const season = await activeSeasonReal();
  if (!season) throw new Error('NOT_FOUND');
  await offerLoanReal({ ...input, seasonId: season.id });
}
