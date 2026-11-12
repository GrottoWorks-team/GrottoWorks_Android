// Tầng API của app TNV — CHỈ gọi BE thật.
//
// Lịch sử: trước 10/11/2026 app có "chế độ offline" fallback sang mock DB
// (AsyncStorage + seed users/areas/tasks/timesheets/materials). BE nay đã có API
// cho toàn bộ domain TNV dùng trên app, nên toàn bộ mock/seed đã bị loại bỏ —
// không còn `withFallback`, `loadDb`, `logActivity`.
//
// Phần BE **chưa có** được xử lý minh bạch (không giả lập thành công):
//   - Liệt kê/huỷ đơn đăng ký của chính TNV → cache cục bộ `applicationsCache`
//     (chỉ nhớ đơn đã gửi từ máy này) + huỷ đơn ném lỗi BE_UNSUPPORTED_*.
//   - Mô hình 3D của khu vực → scene mock riêng ở màn `TaskModelScreen`.
import { ApiError } from './client';
import type {
  PurchaseDto,
  PurchaseRequestDetailDto,
  PurchaseRequestItemDto,
  PurchaseTaskDto,
} from './real';
import {
  activeSeasonReal,
  applyForTaskReal,
  areaTasksReal,
  cancelAttendanceRequestReal,
  communitiesReal,
  contributionNeedsReal,
  currentUser,
  listAreasReal,
  loginReal,
  markAllNotificationsReadReal,
  markNotificationReadReal,
  materialsReal,
  myAttendanceReal,
  myAttendanceRequestsReal,
  myContributionsReal,
  myPurchaseTasksReal,
  purchaseRequestReal,
  recordPurchaseReal,
  myRecognitionReal,
  myTasksReal,
  notificationsReal,
  notificationPreferencesReal,
  offerLoanReal,
  openSessionReal,
  openTasksReal,
  pledgeMaterialReal,
  pledgeMoneyReal,
  replaceAvailabilityReal,
  replaceSkillsReal,
  requestAttendanceCorrectionReal,
  requestCheckInReal,
  requestCheckOutReal,
  respondAssignmentReal,
  skillsReal,
  submitTaskReviewReal,
  taskDetailReal,
  taskProgressReal,
  updateNotificationPreferencesReal,
  updateProfileReal,
} from './real';
import { listApplications, upsertApplication } from './applicationsCache';
import type {
  AttendanceRequestItem,
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
import { assignmentStatus } from '../types';

export { ApiError, API_BASE } from './client';

/**
 * App luôn chạy với BE thật (không còn chế độ offline). Giữ hàm để các màn
 * không phải đổi điều kiện hiển thị.
 */
export const isRealApiActive = () => true;

// Tài khoản seed của BE, gợi ý sẵn trên màn đăng nhập (`ACCOUNTS.md`).
// Đọc từ `.env` (EXPO_PUBLIC_*) — xem `.env.example`; fallback là seed mặc định.
export const DEMO_PASSWORD: string = process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '';
const DEMO_EMAIL_RAW: string =
  process.env.EXPO_PUBLIC_DEMO_EMAILS ??
  'tram.do@giaoxuthanhtam.org.vn,bao.huynh@giaoxuthanhtam.org.vn';
export const DEMO_EMAILS: string[] = DEMO_EMAIL_RAW.split(',')
  .map((email: string) => email.trim())
  .filter(Boolean);

export type SessionUser = User;

/**
 * Trạng thái phân công để hiển thị/lọc. Dữ liệu thật đã được overlay từ
 * `GET /users/me/assignments` trong `real.ts` nên dùng chung một logic.
 */
export function myAssignmentStatus(
  task: Task,
  volunteerId: string,
): TaskAssignment['status'] | undefined {
  return assignmentStatus(task, volunteerId);
}

/** Đăng nhập: `POST /api/v1/auth/login` + `GET /api/v1/users/me`. */
export async function login(email: string, password: string): Promise<SessionUser> {
  try {
    return await loginReal(email, password);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw new Error('INVALID_CREDENTIALS');
    throw err;
  }
}

/** Hồ sơ của chính mình: `GET /api/v1/users/me`. */
export async function getUser(_id: string): Promise<User> {
  return currentUser();
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
  const me = await currentUser();
  return me.parishId ? communitiesReal(me.parishId) : [];
}

/** Cập nhật hồ sơ: PATCH /users/me + PUT /users/me/skills + PUT /users/me/availability. */
export async function updateUser(_id: string, patch: ProfilePatch): Promise<User> {
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
}

/** Danh mục kỹ năng: `GET /skills`. */
export async function listSkills(): Promise<Skill[]> {
  return skillsReal();
}

/** Khu vực công tác của mùa đang chạy (BE không có endpoint `/areas` phẳng). */
export async function listAreas(): Promise<WorkArea[]> {
  return listAreasReal();
}

/** Nhiệm vụ của một khu vực — `GET /work-areas/{id}/tasks`. */
export async function areaTasks(workAreaId: string): Promise<Task[]> {
  return areaTasksReal(workAreaId);
}

/** Danh mục vật tư — `GET /materials`. */
export async function listMaterials() {
  return materialsReal();
}

/** Nhiệm vụ liên quan tới 1 TNV: `GET /api/v1/users/me/tasks`. */
export async function listMyTasks(_volunteerId: string): Promise<Task[]> {
  return myTasksReal();
}

/** Chi tiết nhiệm vụ: `GET /api/v1/tasks/{id}`. */
export async function getTask(id: string): Promise<Task> {
  return taskDetailReal(id);
}

// ── Đăng ký tình nguyện ─────────────────────────────────────────────────────
// Task đang tuyển: BE trả `OPEN` theo từng khu vực và đã loại các task TNV có
// phân công/đơn đăng ký (`GET /users/me/assignments`).
export async function listOpenTasks(_volunteerId: string): Promise<Task[]> {
  return openTasksReal();
}

/**
 * Đơn đã gửi từ MÁY NÀY. BE chưa có endpoint liệt kê đơn của TNV nên chỉ đọc
 * cache cục bộ (`applicationsCache`), không bịa dữ liệu.
 */
export async function listMyRegs(_volunteerId: string): Promise<VolunteerReg[]> {
  return listApplications();
}

/** Đơn của TNV cho 1 task — `null` khi chưa gửi (React Query không nhận undefined). */
export async function getMyReg(taskId: string, _volunteerId: string): Promise<VolunteerReg | null> {
  const rows = await listApplications();
  return rows.find((r) => r.taskId === taskId) ?? null;
}

/** Mã lỗi nghiệp vụ BE trả trong `{ code }` của ProblemDetails. */
function problemCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') return undefined;
  const code = (err.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Gửi đơn đăng ký: `POST /api/v1/tasks/{taskId}/applications`.
 * Lưu bản ghi BE trả về vào cache cục bộ để màn chi tiết hiện đúng trạng thái
 * (BE chưa có API đọc lại đơn của TNV).
 */
export async function registerForTask(
  taskId: string,
  volunteerId: string,
  note?: string,
): Promise<VolunteerReg> {
  try {
    const reg = await applyForTaskReal(taskId, note);
    await upsertApplication({ ...reg, volunteerId });
    return reg;
  } catch (err) {
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
}

/**
 * Huỷ đơn đăng ký: BE CHƯA có API cho TNV rút đơn
 * (`task-applications/{id}/reject` chỉ dành cho trưởng khu). Không giả lập
 * thành công — UI ẩn nút khi chạy với BE thật.
 */
export async function cancelRegistration(_regId: string): Promise<void> {
  throw new Error('BE_UNSUPPORTED_CANCEL_APPLICATION');
}

/**
 * TNV phản hồi phân công (accept/decline). BE cần `assignmentId` của chính TNV
 * → tra qua `GET /users/me/assignments` trong `real.ts`.
 */
export async function respondAssignment(
  taskId: string,
  _volunteerId: string,
  status: 'ACCEPTED' | 'DECLINED',
  note?: string,
): Promise<Task> {
  return respondAssignmentReal(taskId, status, note);
}

// TNV gửi duyệt hoàn thành kèm ≥1 ảnh minh chứng:
// upload ảnh → `POST /tasks/{id}/submit` (hoặc `/resubmit` khi trưởng khu yêu
// cầu sửa).
export async function submitReview(
  taskId: string,
  note: string,
  photoUris: string[],
): Promise<Task> {
  if (photoUris.length === 0) throw new Error('PHOTO_REQUIRED');
  const current = await taskDetailReal(taskId);
  return submitTaskReviewReal(taskId, {
    note,
    photoUris,
    resubmit: current.status === 'REVISE',
  });
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

/** Tiến độ / nghiệm thu của task — `GET /tasks/{taskId}/progress`. */
export async function listTaskProgress(taskId: string): Promise<TaskProgressEntry[]> {
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

// ── Giờ đóng góp ─────────────────────────────────────────────────────────────
/** Lịch sử giờ đóng góp: `GET /api/v1/users/me/attendance`. */
export async function listMyTimesheets(_volunteerId: string): Promise<Timesheet[]> {
  return myAttendanceReal();
}

/**
 * Đơn vào ca của chính TNV: `GET /api/v1/users/me/attendance-requests`
 * (mặc định PENDING).
 */
export async function listMyAttendanceRequests(
  status: AttendanceRequestItem['status'] = 'PENDING',
): Promise<AttendanceRequestItem[]> {
  const rows = await myAttendanceRequestsReal(status);
  return rows.map((row) => ({
    id: row.id,
    assignmentId: row.assignmentId,
    status: (row.status ?? 'PENDING').toUpperCase() as AttendanceRequestItem['status'],
    requestedAt: row.requestedAt ?? new Date().toISOString(),
    note: row.note ?? null,
    version: row.version,
  }));
}

/** Huỷ đơn vào ca đang chờ duyệt: `POST /api/v1/attendance-requests/{id}/cancel`. */
export async function cancelAttendanceRequest(requestId: string, version: number): Promise<void> {
  await cancelAttendanceRequestReal(requestId, version);
}

export interface CheckInResult {
  timesheet?: Timesheet;
  pendingApproval: boolean;
}

/**
 * Vào ca: `POST /task-assignments/{assignmentId}/attendance/check-in-requests`
 * (cần `taskId` để tra `assignmentId`). BE tạo đơn PENDING — phiên giờ công chỉ
 * có sau khi trưởng khu duyệt.
 */
export async function checkIn(
  _volunteerId: string,
  taskId?: string,
  note?: string,
): Promise<CheckInResult> {
  if (!taskId) throw new Error('TASK_REQUIRED');
  await requestCheckInReal(taskId, note);
  return { pendingApproval: true };
}

/**
 * Kết thúc ca: `POST /task-assignments/{assignmentId}/attendance/check-out`
 * (kèm `If-Match` version của phiên đang mở).
 */
export async function checkOut(volunteerId: string): Promise<CheckInResult> {
  const open = await openSessionReal();
  if (!open) throw new Error('NO_OPEN_SESSION');
  const dto = await requestCheckOutReal(open.assignmentId, open.version);
  const hhmm = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : undefined;
  return {
    timesheet: {
      id: dto.id,
      volunteerId,
      date: (dto.checkInAt ?? '').slice(0, 10),
      checkIn: hhmm(dto.checkInAt) ?? '--:--',
      ...(dto.checkOutAt ? { checkOut: hhmm(dto.checkOutAt) as string } : {}),
      hours: Math.round((dto.approvedMinutes / 60) * 10) / 10,
      status: dto.checkOutAt ? 'CLOSED' : 'OPEN',
      assignmentId: dto.assignmentId,
      version: dto.version,
    },
    pendingApproval: false,
  };
}

/**
 * Yêu cầu chỉnh giờ công: `POST /attendance/{id}/correction-requests`
 * (BE cần giờ vào/ra đầy đủ + version + lý do).
 */
export async function requestCorrection(ts: Timesheet, note: string): Promise<Timesheet> {
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

// ── Thông báo ────────────────────────────────────────────────────────────────
/** Thông báo in-app: `GET /notifications`. */
export async function listNotifications(): Promise<NotificationItem[]> {
  return notificationsReal();
}

export async function markNotificationRead(id: string): Promise<void> {
  await markNotificationReadReal(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await markAllNotificationsReadReal();
}

/** Tuỳ chọn nhận thông báo: `GET/PUT /api/v1/users/me/notification-preferences`. */
export interface NotificationPreferences {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return notificationPreferencesReal();
}

export async function updateNotificationPreferences(
  payload: NotificationPreferences,
): Promise<NotificationPreferences> {
  return updateNotificationPreferencesReal(payload);
}

// ── Điểm ghi nhận ────────────────────────────────────────────────────────────
export interface Recognition {
  totalPoints: number;
  contributions: number;
}

/** Điểm & số đóng góp được ghi nhận: `GET /users/me/recognition`. */
export async function getMyRecognition(): Promise<Recognition> {
  const summary = await myRecognitionReal();
  return { totalPoints: summary.totalPoints, contributions: summary.contributions };
}

// ── Đóng góp / quyên góp ─────────────────────────────────────────────────────
/** Các pledge của chính mình: `GET /users/me/contributions`. */
export async function listMyContributions(): Promise<MyContribution[]> {
  return myContributionsReal();
}

/** Vật tư còn thiếu của mùa đang chạy (gợi ý khi cam kết quyên góp). */
export async function listContributionNeeds(): Promise<ContributionNeed[]> {
  const season = await activeSeasonReal();
  return season ? contributionNeedsReal(season.id) : [];
}

export interface PledgeMaterialInput {
  materialId: string;
  pledgedQuantity: number;
  note?: string;
}

/** Cam kết quyên góp vật tư: `POST /donations/material-pledges`. */
export async function pledgeMaterial(
  workAreaId: string,
  items: PledgeMaterialInput[],
  note?: string,
): Promise<MyContribution> {
  return pledgeMaterialReal(workAreaId, items, note);
}

/** Cam kết quyên góp tiền: `POST /donations/monetary-pledges`. */
export async function pledgeMoney(
  amount: number,
  note?: string,
  workAreaId?: string,
): Promise<MyContribution> {
  const season = await activeSeasonReal();
  if (!season) throw new Error('NOT_FOUND');
  return pledgeMoneyReal(season.id, amount, workAreaId, note);
}

/** Đăng ký cho mượn dụng cụ: `POST /loan-offers`. */
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
  const season = await activeSeasonReal();
  if (!season) throw new Error('NOT_FOUND');
  await offerLoanReal({ ...input, seasonId: season.id });
}

// ── Mua hàng (việc đi mua của TNV — F-RES-09, BR-30) ───────────────────────
export type {
  PurchaseDto,
  PurchaseRequestDetailDto,
  PurchaseRequestItemDto,
  PurchaseTaskDto,
};

/** Việc đi mua còn hiệu lực của tôi: `GET /users/me/tasks?taskType=PURCHASE`. */
export async function listMyPurchaseTasks(): Promise<PurchaseTaskDto[]> {
  return myPurchaseTasksReal();
}

/** Đơn mua cần ghi nhận: `GET /purchase-requests/{requestId}`. */
export async function getPurchaseRequest(
  requestId: string,
): Promise<PurchaseRequestDetailDto> {
  return purchaseRequestReal(requestId);
}

export interface RecordPurchaseInput {
  requestId: string;
  supplierName?: string;
  purchaseDate?: string;
  items: { purchaseRequestItemId: string; purchasedQuantity: number; unitPrice: number }[];
}

/** Ghi nhận lần mua: `POST /purchase-requests/{requestId}/purchases` (kho CHƯA tăng). */
export async function recordPurchase(input: RecordPurchaseInput): Promise<PurchaseDto> {
  return recordPurchaseReal(input);
}
