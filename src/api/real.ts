// Lời gọi BE THẬT — chỉ những endpoint BE đã có (xem `api-contracts.md`):
//
//   POST  /api/v1/auth/login            GET  /api/v1/users/me
//   GET   /api/v1/users/me/tasks        GET  /api/v1/users/me/assignments
//   POST  /api/v1/task-assignments/{id}/accept|decline
//   POST  /api/v1/task-assignments/{id}/attendance/check-in-requests|check-out
//   PATCH /api/v1/users/me              GET  /api/v1/skills
//   GET   /api/v1/seasons               GET  /api/v1/seasons/{seasonId}/work-areas
//   GET   /api/v1/users/me/tasks        GET  /api/v1/tasks/{taskId}
//   GET   /api/v1/work-areas/{id}/tasks POST /api/v1/tasks/{taskId}/applications
//   GET   /api/v1/users/me/attendance            GET /api/v1/users/me/attendance-requests
//
// CHƯA nối được (BE thiếu dữ liệu/endpoint):
//   - liệt kê/huỷ đơn đăng ký của chính TNV: chưa có endpoint (cache cục bộ ở
//     `applicationsCache.ts`).
//   - mô hình 3D của khu vực: chưa có `design-scene` (scene mock ở màn TNV).
import type {
  AvailabilitySlot,
  CommunityOption,
  ContributionNeed,
  Material,
  MyContribution,
  NotificationItem,
  Role,
  Skill,
  Task,
  TaskAssignment,
  Timesheet,
  User,
  VolunteerReg,
  WorkArea,
} from '../types';
import { http, saveTokens, ApiError } from './client';
import type { TokenPair } from './client';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

// ── DTO khớp 1-1 với BE (Identity + ParishCoordination) ─────────────────────
export interface UserProfileDto {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  status: string;
  parishId?: string | null;
  role: string;
  communityId?: string | null;
  introduction?: string | null;
  skillIds: string[];
  availability: { availableFrom: string; availableTo: string; note?: string | null }[];
}

export interface SkillDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
}

export interface SeasonDto {
  id: string;
  parishId: string;
  name: string;
  seasonYear: number;
  startDate: string;
  endDate: string;
  status: string;
  estimatedBudget: number | null;
}

export interface WorkAreaDto {
  id: string;
  seasonId: string;
  communityId: string | null;
  leaderId: string | null;
  materialOfficerId: string | null;
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  status: string;
}

// ── Mapping DTO → domain type của mobile ────────────────────────────────────
// BE phát hành role code dạng ADMIN | PARISH | LEADER | MO | VOLUNTEER
// (Identity.Domain/RoleCodes). Mobile dùng tên riêng cho 2 role quản trị nên
// phải dịch: PARISH → COMMITTEE (ban hành giáo), MO → OFFICER (vật tư).
const ROLE_BY_CODE: Record<string, Role> = {
  ADMIN: 'ADMIN',
  PARISH: 'COMMITTEE',
  COMMITTEE: 'COMMITTEE',
  LEADER: 'LEADER',
  MO: 'OFFICER',
  MATERIAL_OFFICER: 'OFFICER',
  OFFICER: 'OFFICER',
  VOLUNTEER: 'VOLUNTEER',
};

const toRole = (raw: string): Role =>
  ROLE_BY_CODE[(raw ?? '').trim().toUpperCase()] ?? 'VOLUNTEER';

/** Hue avatar ổn định theo id để UI không đổi màu mỗi lần load. */
function hueFrom(seed: string): number {
  let hue = 0;
  for (let i = 0; i < seed.length; i += 1) hue = (hue * 31 + seed.charCodeAt(i)) % 360;
  return hue;
}

export function toUser(dto: UserProfileDto, skillNames: string[] = []): User {
  return {
    id: dto.id,
    name: dto.displayName || dto.email,
    email: dto.email,
    role: toRole(dto.role),
    ...(dto.communityId ? { communityId: dto.communityId } : {}),
    ...(dto.parishId ? { parishId: dto.parishId } : {}),
    // BE serialize enum SNAKE_CASE_UPPER → "LOCKED" (không phải "Locked").
    ...(dto.status?.toUpperCase() === 'LOCKED' ? { locked: true } : {}),
    ...(dto.phone ? { phone: dto.phone } : {}),
    ...(dto.introduction ? { introduction: dto.introduction } : {}),
    skills: skillNames,
    availability: (dto.availability ?? []).map((slot) => ({
      availableFrom: slot.availableFrom,
      availableTo: slot.availableTo,
      ...(slot.note ? { note: slot.note } : {}),
    })),
    // Điểm ghi nhận lấy từ Reporting (`GET /users/me/recognition`), không có ở Identity.
    points: 0,
    avatarHue: hueFrom(dto.id || dto.email),
  };
}

const AREA_STATUS: Record<string, WorkArea['status']> = {
  PLANNED: 'ON_TRACK',
  IN_PROGRESS: 'ON_TRACK',
  READINESS_REVIEW: 'AT_RISK',
  NEEDS_CORRECTION: 'AT_RISK',
  READY: 'ON_TRACK',
  COMPLETED: 'ON_TRACK',
};

export function toWorkArea(dto: WorkAreaDto): WorkArea {
  const overdue =
    Boolean(dto.deadline) &&
    dto.status !== 'COMPLETED' &&
    new Date(dto.deadline as string).getTime() < Date.now();
  return {
    id: dto.id,
    name: dto.name || `Khu vực #${dto.id.slice(0, 8)}`,
    // ponytail: BE chưa trả type/level/tiến độ/số TNV/số việc (service Task +
    // Volunteer chưa gắn) → đặt mặc định để UI render được.
    type: 'GROTTO',
    level: dto.communityId ? 'COMMUNITY' : 'PARISH',
    ...(dto.communityId ? { communityId: dto.communityId } : {}),
    leaderId: dto.leaderId ?? '',
    officerId: dto.materialOfficerId ?? '',
    ...(dto.description ? { description: dto.description } : {}),
    ...(dto.startDate ? { startDate: dto.startDate } : {}),
    ...(dto.deadline ? { deadline: dto.deadline } : {}),
    progress: 0,
    volunteerCount: 0,
    taskCount: 0,
    status: overdue ? 'LATE' : (AREA_STATUS[dto.status] ?? 'ON_TRACK'),
  };
}

// ── Hàm gọi BE ──────────────────────────────────────────────────────────────

/** POST /api/v1/auth/login → lưu TokenPair → GET /api/v1/users/me. */
export async function loginReal(email: string, password: string): Promise<User> {
  const tokens = await http<TokenPair>('/auth/login', {
    method: 'POST',
    anonymous: true,
    body: { email: email.trim(), password },
  });
  await saveTokens(tokens);
  return currentUser();
}

/** Danh mục vật tư — `GET /api/v1/materials` (BE chỉ trả thông tin catalog). */
export interface MaterialDto {
  id: string;
  categoryId?: string | null;
  code?: string | null;
  name: string;
  unit: string;
  status: string;
}

/**
 * Danh mục vật tư dùng để hiển thị tên/đơn vị trong chi tiết nhiệm vụ.
 * Các trường số lượng của `Material` thuộc API "vật tư theo khu" (BE chưa trả ở
 * endpoint này) nên để 0 — màn TNV không dùng tới.
 */
export async function materialsReal(): Promise<Material[]> {
  const dtos = await http<MaterialDto[]>('/materials?size=200');
  return dtos.map((dto) => ({
    id: dto.id,
    areaId: '',
    name: dto.name,
    unit: dto.unit,
    required: 0,
    existing: 0,
    purchased: 0,
    donatedPledged: 0,
    donatedReceived: 0,
    received: 0,
    status: 'ENOUGH',
    estUnitPrice: 0,
  }));
}

/** GET /api/v1/users/me (+ GET /api/v1/skills để dịch skillId → tên kỹ năng). */
export async function currentUser(): Promise<User> {
  const [profile, skills] = await Promise.all([
    http<UserProfileDto>('/users/me'),
    http<SkillDto[]>('/skills').catch(() => [] as SkillDto[]),
  ]);
  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  const skillNames = profile.skillIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name));
  return toUser(profile, skillNames);
}

/**
 * PATCH /api/v1/users/me — BE nhận displayName/phone/introduction/communityId.
 * Kỹ năng và lịch rảnh có endpoint riêng (PUT bên dưới).
 */
export async function updateProfileReal(patch: Partial<User>): Promise<User> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.displayName = patch.name;
  if (patch.phone !== undefined) body.phone = patch.phone;
  // BE coi `introduction` là "thông tin chi tiết TNV" (bắt buộc có cộng đoàn)
  // → chỉ gửi khi thực sự có nội dung, tránh 422 khi người dùng để trống.
  if (patch.introduction !== undefined && patch.introduction.trim()) {
    body.introduction = patch.introduction.trim();
  }
  if (patch.communityId !== undefined) body.communityId = patch.communityId;

  const dto =
    Object.keys(body).length > 0
      ? await http<UserProfileDto>('/users/me', { method: 'PATCH', body })
      : await http<UserProfileDto>('/users/me');

  return toUser(dto, patch.skills ?? []);
}

/** PUT /api/v1/users/me/skills — thay toàn bộ danh sách kỹ năng đã khai báo. */
export async function replaceSkillsReal(skillIds: string[]): Promise<UserProfileDto> {
  return http<UserProfileDto>('/users/me/skills', { method: 'PUT', body: { skillIds } });
}

/** PUT /api/v1/users/me/availability — thay toàn bộ lịch rảnh (UTC range). */
export async function replaceAvailabilityReal(
  slots: AvailabilitySlot[],
): Promise<UserProfileDto> {
  return http<UserProfileDto>('/users/me/availability', {
    method: 'PUT',
    body: slots.map((slot) => ({
      availableFrom: slot.availableFrom,
      availableTo: slot.availableTo,
      note: slot.note ?? null,
    })),
  });
}

/** GET /api/v1/skills — danh mục kỹ năng (kèm id để gửi kèm khi cập nhật). */
export async function skillsReal(): Promise<Skill[]> {
  return http<Skill[]>('/skills?size=100');
}

/** GET /api/v1/parishes/{parishId}/communities — cộng đoàn trong giáo xứ. */
export async function communitiesReal(parishId: string): Promise<CommunityOption[]> {
  return http<CommunityOption[]>(`/parishes/${parishId}/communities`);
}

/**
 * Mùa đang chạy: dữ liệu demo có thể có nhiều mùa ACTIVE → ưu tiên mùa đang
 * diễn ra hôm nay, sau đó mùa ACTIVE mới nhất, cuối cùng là mùa đầu tiên.
 */
export async function activeSeasonReal(): Promise<SeasonDto | undefined> {
  const seasons = await http<SeasonDto[]>('/seasons?size=100');
  const now = Date.now();
  const active = seasons.filter((s) => s.status === 'ACTIVE');
  return (
    active.find(
      (s) => new Date(s.startDate).getTime() <= now && now <= new Date(s.endDate).getTime(),
    ) ??
    active[0] ??
    seasons[0]
  );
}

/** Khu vực công tác của mùa đang chạy (BE không có endpoint /areas phẳng). */
export async function listAreasReal(): Promise<WorkArea[]> {
  const season = await activeSeasonReal();
  if (!season) return [];
  const areas = await http<WorkAreaDto[]>(`/seasons/${season.id}/work-areas?size=100`);
  return areas.map(toWorkArea);
}

// ── Tasks (TaskExecution) ───────────────────────────────────────────────────
export interface TaskDto {
  id: string;
  workAreaId: string;
  name: string;
  description?: string | null;
  completionCriteria?: string | null;
  taskType: string;
  purchaseRequestId?: string | null;
  priority: string;
  estimatedMinutes: number;
  requiredVolunteers: number;
  startAt?: string | null;
  deadline: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt?: string | null;
  /** Yêu cầu kỹ năng/vật tư (BE trả kèm từ 05/11). */
  skills?: { skillId: string; requiredSkillLevel?: string | null; requiredVolunteerCount?: number | null }[];
  materials?: { materialId: string; requiredQuantity: number; note?: string | null }[];
}

export interface TaskApplicationDto {
  id: string;
  taskId: string;
  volunteerId: string;
  status: string;
  note?: string | null;
  version: number;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
}

export interface AttendanceDto {
  id: string;
  assignmentId: string;
  checkInAt: string;
  checkOutAt?: string | null;
  approvedMinutes: number;
  status: string;
  version: number;
}

/** `AssignmentDto` của TaskExecution (GET /users/me/assignments). */
export interface AssignmentDto {
  id: string;
  taskId: string;
  volunteerId: string;
  assignmentType?: string | null;
  status: string;
  note?: string | null;
  version: number;
  requestedAt?: string | null;
  assignedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  responseReason?: string | null;
}

const MOBILE_ASSIGNMENT_STATUS: Record<string, TaskAssignment['status']> = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'ACCEPTED',
  COMPLETED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'DECLINED',
};

/** AssignmentDto → overlay phân công của mobile (kèm `assignmentId` để phản hồi). */
export function toAssignment(dto: AssignmentDto): TaskAssignment {
  return {
    volunteerId: dto.volunteerId,
    status: MOBILE_ASSIGNMENT_STATUS[(dto.status ?? '').toUpperCase()] ?? 'PENDING',
    ...(dto.note ? { note: dto.note } : {}),
    assignmentId: dto.id,
  };
}

/** Gắn phân công của chính TNV vào task (BE không trả kèm trong `TaskDto`). */
function withMyAssignment(task: Task, assignment?: AssignmentDto): Task {
  if (!assignment) return task;
  const overlay = toAssignment(assignment);
  return {
    ...task,
    assignments: [
      ...(task.assignments ?? []).filter((row) => row.volunteerId !== overlay.volunteerId),
      overlay,
    ],
    assignees:
      overlay.status === 'ACCEPTED'
        ? [...new Set([...task.assignees, overlay.volunteerId])]
        : task.assignees.filter((id) => id !== overlay.volunteerId),
  };
}

const TASK_STATUS: Record<string, Task['status']> = {
  OPEN: 'TODO',
  NOT_STARTED: 'TODO',
  IN_PROGRESS: 'DOING',
  SUBMITTED: 'REVIEW',
  REVISION_REQUIRED: 'REVISE',
  COMPLETED: 'DONE',
  CANCELLED: 'DONE',
};

/**
 * TaskDto → Task của mobile. BE KHÔNG trả người được phân công / vật tư / kỹ
 * năng / ảnh minh chứng nên các trường đó để rỗng (UI tự ẩn khi rỗng).
 */
export function toTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    areaId: dto.workAreaId,
    title: dto.name,
    description: dto.description ?? '',
    skills: [],
    estimateHours: Math.round((dto.estimatedMinutes / 60) * 10) / 10,
    volunteersNeeded: dto.requiredVolunteers,
    assignees: [],
    materialIds: (dto.materials ?? []).map((material) => material.materialId),
    materialNeeds: Object.fromEntries(
      (dto.materials ?? []).map((material) => [material.materialId, material.requiredQuantity]),
    ),
    status: TASK_STATUS[(dto.status ?? '').toUpperCase()] ?? 'TODO',
    backendStatus: (dto.status ?? '').toUpperCase(),
    startAt: dto.startAt ?? null,
    dueDate: (dto.deadline ?? '').slice(0, 10),
    submittedPhotos: 0,
    ...(dto.completionCriteria ? { completionCriteria: dto.completionCriteria } : {}),
  };
}

const ATTENDANCE_STATUS: Record<string, Timesheet['status']> = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CORRECTED: 'PENDING_FIX',
};

const hhmm = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

export function toTimesheet(dto: AttendanceDto): Timesheet {
  return {
    id: dto.id,
    // BE không trả volunteerId; màn giờ đóng góp chỉ hiển thị phiên của chính mình.
    volunteerId: '',
    date: (dto.checkInAt ?? '').slice(0, 10),
    checkIn: hhmm(dto.checkInAt),
    ...(dto.checkOutAt ? { checkOut: hhmm(dto.checkOutAt) } : {}),
    hours: Math.round((dto.approvedMinutes / 60) * 10) / 10,
    status: ATTENDANCE_STATUS[(dto.status ?? '').toUpperCase()] ?? 'CLOSED',
    checkInAt: dto.checkInAt,
    ...(dto.checkOutAt ? { checkOutAt: dto.checkOutAt } : {}),
    assignmentId: dto.assignmentId,
    version: dto.version,
  };
}

/** GET /api/v1/users/me/assignments — phân công + đơn đăng ký của chính TNV. */
export async function myAssignmentsReal(): Promise<AssignmentDto[]> {
  return await http<AssignmentDto[]>('/users/me/assignments');
}

/** GET /api/v1/users/me/tasks — nhiệm vụ BE đã gắn cho TNV đang đăng nhập. */
export async function myTasksReal(): Promise<Task[]> {
  const [dtos, mine] = await Promise.all([
    http<TaskDto[]>('/users/me/tasks?size=100'),
    myAssignmentsReal().catch(() => [] as AssignmentDto[]),
  ]);
  const byTask = new Map(mine.map((row) => [row.taskId, row]));
  return dtos.map((dto) => withMyAssignment(toTask(dto), byTask.get(dto.id)));
}

/**
 * POST /api/v1/task-assignments/{assignmentId}/accept|decline.
 * BE yêu cầu `assignmentId` của chính TNV → tra từ `/users/me/assignments`.
 */
export async function respondAssignmentReal(
  taskId: string,
  status: 'ACCEPTED' | 'DECLINED',
  note?: string,
): Promise<Task> {
  const mine = await myAssignmentsReal();
  const assignment = mine.find(
    (row) =>
      row.taskId === taskId &&
      (row.status ?? '').toUpperCase() === 'PENDING' &&
      (row.assignmentType ?? 'DIRECT').toUpperCase() !== 'APPLICATION',
  );
  if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
  const reason = note?.trim();
  await http<AssignmentDto>(`/task-assignments/${assignment.id}/${status === 'ACCEPTED' ? 'accept' : 'decline'}`, {
    method: 'POST',
    body:
      status === 'ACCEPTED'
        ? { version: assignment.version }
        : { version: assignment.version, reason: reason || 'Không thể tham gia' },
  });
  return taskDetailReal(taskId);
}

/** GET /api/v1/tasks/{taskId}. */
export async function taskDetailReal(taskId: string): Promise<Task> {
  const [dto, mine] = await Promise.all([
    http<TaskDto>(`/tasks/${taskId}`),
    myAssignmentsReal().catch(() => [] as AssignmentDto[]),
  ]);
  return withMyAssignment(toTask(dto), mine.find((row) => row.taskId === taskId));
}

/** GET /api/v1/work-areas/{workAreaId}/tasks. */
export async function areaTasksReal(workAreaId: string): Promise<Task[]> {
  const dtos = await http<TaskDto[]>(`/work-areas/${workAreaId}/tasks?size=100`);
  return dtos.map(toTask);
}

/**
 * Task đang tuyển = task ở trạng thái OPEN trên mọi khu vực. BE chỉ cho nộp đơn
 * khi task đang OPEN (`EnsurePlanningCanBeUpdated` → `TASK_INVALID_STATE`), nên
 * KHÔNG gộp task đang thực hiện (IN_PROGRESS)/chưa bắt đầu (NOT_STARTED).
 */
export async function openTasksReal(): Promise<Task[]> {
  const [areas, mine] = await Promise.all([
    listAreasReal(),
    myAssignmentsReal().catch(() => [] as AssignmentDto[]),
  ]);
  // Đã có phân công/đơn đăng ký (trừ khi đã từ chối/huỷ) → không còn trong "Đang tuyển".
  const activeTaskIds = new Set(
    mine
      .filter((row) => !['DECLINED', 'CANCELLED'].includes((row.status ?? '').toUpperCase()))
      .map((row) => row.taskId),
  );
  const perArea = await Promise.all(
    areas.map((area) => areaTaskDtos(area.id).catch(() => [] as TaskDto[])),
  );
  const open = perArea
    .flat()
    .filter(
      (dto) => (dto.status ?? '').toUpperCase() === 'OPEN' && !activeTaskIds.has(dto.id),
    )
    .map(toTask);
  return [...new Map(open.map((task) => [task.id, task])).values()];
}

/** DTO gốc của task theo khu vực (giữ nguyên `status` trước khi map). */
async function areaTaskDtos(workAreaId: string): Promise<TaskDto[]> {
  return http<TaskDto[]>(`/work-areas/${workAreaId}/tasks?size=100`);
}

/** POST /api/v1/tasks/{taskId}/applications — nộp đơn đăng ký tham gia. */
export async function applyForTaskReal(taskId: string, note?: string): Promise<VolunteerReg> {
  const dto = await http<TaskApplicationDto>(`/tasks/${taskId}/applications`, {
    method: 'POST',
    body: { note: note ?? null },
  });
  const status =
    dto.status === 'APPROVED' ? 'APPROVED' : dto.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
  return {
    id: dto.id,
    taskId: dto.taskId,
    volunteerId: dto.volunteerId,
    status,
    at: dto.requestedAt ?? new Date().toISOString(),
    ...(dto.note ? { note: dto.note } : {}),
    ...(dto.reason ? { rejectReason: dto.reason } : {}),
  };
}

/** GET /api/v1/users/me/attendance — lịch sử giờ đóng góp của chính TNV. */
export async function myAttendanceReal(): Promise<Timesheet[]> {
  const dtos = await http<AttendanceDto[]>('/users/me/attendance?size=100');
  return dtos
    .map(toTimesheet)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ── Vào ca / kết thúc ca (chấm công) ───────────────────────────────────────
// BE chỉ cho TNV xin vào ca; phiên làm việc + việc chuyển `IN_PROGRESS` chỉ xảy
// ra khi trưởng khu duyệt đơn (`POST /attendance-requests/{id}/approve`).

/** `AttendanceRequestDto` của TaskExecution (đơn xin vào ca). */
export interface AttendanceRequestDto {
  id: string;
  assignmentId: string;
  volunteerId?: string;
  status: string;
  note?: string | null;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  version: number;
}

/** UUID v4 đơn giản (BE bắt buộc header `Idempotency-Key` là UUID). */
function newIdempotencyKey(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** Phân công ACCEPTED của chính TNV cho một việc (cần `assignmentId` để vào ca). */
export async function myAcceptedAssignmentReal(taskId: string): Promise<AssignmentDto | undefined> {
  const mine = await myAssignmentsReal();
  return mine.find(
    (row) => row.taskId === taskId && (row.status ?? '').toUpperCase() === 'ACCEPTED',
  );
}

/**
 * POST /api/v1/task-assignments/{assignmentId}/attendance/check-in-requests
 * TNV xin vào ca → đơn PENDING, chờ trưởng khu duyệt rồi mới có giờ công.
 */
export async function requestCheckInReal(
  taskId: string,
  note?: string,
): Promise<AttendanceRequestDto> {
  const assignment = await myAcceptedAssignmentReal(taskId);
  if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
  return await http<AttendanceRequestDto>(
    `/task-assignments/${assignment.id}/attendance/check-in-requests`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': newIdempotencyKey() },
      body: { note: note?.trim() || null },
    },
  );
}

/** POST /task-assignments/{assignmentId}/attendance/check-out — kết thúc ca đang mở. */
export async function requestCheckOutReal(
  assignmentId: string,
  version: number,
): Promise<AttendanceDto> {
  return await http<AttendanceDto>(`/task-assignments/${assignmentId}/attendance/check-out`, {
    method: 'POST',
    headers: { 'Idempotency-Key': newIdempotencyKey(), 'If-Match': `"${version}"` },
    body: { version },
  });
}

/** Phiên đang mở của chính TNV (đã duyệt check-in, chưa check-out). */
export async function openSessionReal(): Promise<
  { assignmentId: string; version: number } | undefined
> {
  const rows = await http<AttendanceDto[]>('/users/me/attendance?size=100');
  const open = rows.find(
    (row) => (row.status ?? '').toUpperCase() === 'OPEN' && !row.checkOutAt,
  );
  return open ? { assignmentId: open.assignmentId, version: open.version } : undefined;
}

/**
 * POST /api/v1/attendance-requests/{requestId}/cancel — TNV huỷ đơn vào ca đang
 * chờ duyệt (để không bị kẹt khi đã gửi nhầm việc/giờ).
 */
export async function cancelAttendanceRequestReal(
  requestId: string,
  version: number,
): Promise<AttendanceRequestDto> {
  return await http<AttendanceRequestDto>(`/attendance-requests/${requestId}/cancel`, {
    method: 'POST',
    headers: { 'If-Match': `"${version}"` },
    body: { version },
  });
}

/**
 * GET /api/v1/users/me/attendance-requests — đơn vào ca của chính TNV (mặc định
 * PENDING). Nhờ vậy sau khi gửi đơn, app hiển thị "chờ trưởng khu duyệt" thay vì
 * để nhiệm vụ ở trạng thái "Chưa bắt đầu" mà không giải thích.
 */
export async function myAttendanceRequestsReal(
  status = 'PENDING',
): Promise<AttendanceRequestDto[]> {
  return await http<AttendanceRequestDto[]>(
    `/users/me/attendance-requests?status=${status}&size=50`,
  );
}

// ── Điểm ghi nhận (Reporting) ───────────────────────────────────────────────
export interface RecognitionSummaryDto {
  userId: string;
  seasonId?: string | null;
  totalPoints: number;
  contributions: number;
}

/** GET /api/v1/users/me/recognition — điểm + số đóng góp được ghi nhận. */
export async function myRecognitionReal(seasonId?: string): Promise<RecognitionSummaryDto> {
  const suffix = seasonId ? `?seasonId=${seasonId}` : '';
  return http<RecognitionSummaryDto>(`/users/me/recognition${suffix}`);
}

// ── Đóng góp (Resource) ─────────────────────────────────────────────────────
interface MoneyDto {
  amount: number;
  currency: string;
}

export interface DonationDto {
  id: string;
  donorId: string;
  donorName: string;
  seasonId: string;
  workAreaId?: string | null;
  type: string;
  status: string;
  pledgedAmount?: MoneyDto | null;
  receivedAmount?: MoneyDto | null;
  donationDate: string;
  items: {
    id: string;
    materialId: string;
    materialName: string;
    unit: string;
    pledgedQuantity?: number | null;
    receivedQuantity: number;
  }[];
  note?: string | null;
  cancelReason?: string | null;
}

export interface ContributionNeedDto {
  kind: string;
  workAreaId: string;
  workAreaName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  required: number;
  shortage: number;
  pledgedOutstanding: number;
  remainingNeed: number;
}

export function toMyContribution(dto: DonationDto): MyContribution {
  return {
    id: dto.id,
    type: (dto.type ?? '').toUpperCase() === 'MONEY' ? 'MONEY' : 'MATERIAL',
    status: (dto.status ?? 'PLEDGED').toUpperCase() as MyContribution['status'],
    ...(dto.pledgedAmount ? { pledgedAmount: dto.pledgedAmount.amount } : {}),
    ...(dto.receivedAmount ? { receivedAmount: dto.receivedAmount.amount } : {}),
    donationDate: (dto.donationDate ?? '').slice(0, 10),
    ...(dto.note ? { note: dto.note } : {}),
    items: dto.items.map((item) => ({
      id: item.id,
      materialName: item.materialName,
      unit: item.unit,
      ...(item.pledgedQuantity != null ? { pledgedQuantity: item.pledgedQuantity } : {}),
      receivedQuantity: item.receivedQuantity,
    })),
  };
}

/** GET /api/v1/users/me/contributions — các pledge/đóng góp của chính TNV. */
export async function myContributionsReal(): Promise<MyContribution[]> {
  const dtos = await http<DonationDto[]>('/users/me/contributions?size=50');
  return dtos.map(toMyContribution);
}

/** GET /api/v1/seasons/{seasonId}/contribution-needs — vật tư còn thiếu để gợi ý. */
export async function contributionNeedsReal(seasonId: string): Promise<ContributionNeed[]> {
  const dtos = await http<ContributionNeedDto[]>(
    `/seasons/${seasonId}/contribution-needs?size=100`,
  );
  return dtos
    .filter((need) => need.remainingNeed > 0)
    .map((need) => ({
      workAreaId: need.workAreaId,
      workAreaName: need.workAreaName,
      materialId: need.materialId,
      materialCode: need.materialCode,
      materialName: need.materialName,
      unit: need.unit,
      required: need.required,
      shortage: need.shortage,
      remainingNeed: need.remainingNeed,
    }));
}

/** POST /api/v1/donations/material-pledges — cam kết quyên góp vật tư cho 1 khu vực. */
export async function pledgeMaterialReal(
  workAreaId: string,
  items: { materialId: string; pledgedQuantity: number; note?: string }[],
  note?: string,
): Promise<MyContribution> {
  const dto = await http<DonationDto>('/donations/material-pledges', {
    method: 'POST',
    body: { workAreaId, items, note: note ?? null },
  });
  return toMyContribution(dto);
}

/** POST /api/v1/donations/monetary-pledges — cam kết quyên góp tiền. */
export async function pledgeMoneyReal(
  seasonId: string,
  amount: number,
  workAreaId?: string,
  note?: string,
): Promise<MyContribution> {
  const dto = await http<DonationDto>('/donations/monetary-pledges', {
    method: 'POST',
    body: { seasonId, workAreaId: workAreaId ?? null, amount, note: note ?? null },
  });
  return toMyContribution(dto);
}

/** POST /api/v1/loan-offers — đăng ký cho mượn dụng cụ/vật tư (kể cả hộ người khác). */
export async function offerLoanReal(input: {
  seasonId: string;
  workAreaId?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerNote?: string;
  itemName: string;
  quantity: number;
  description?: string;
  initialCondition?: string;
  expectedReturnDate: string;
}): Promise<void> {
  await http<unknown>('/loan-offers', { method: 'POST', body: input });
}

// ── Thông báo (NotificationAudit) ───────────────────────────────────────────
interface NotificationDto {
  id: string;
  eventType: string;
  title: string;
  body: string;
  referenceType?: string | null;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** GET /api/v1/notifications — thông báo in-app của chính người dùng. */
export async function notificationsReal(): Promise<NotificationItem[]> {
  const dtos = await http<NotificationDto[]>('/notifications?size=50');
  return dtos.map((dto) => ({
    id: dto.id,
    eventType: dto.eventType,
    title: dto.title,
    body: dto.body,
    ...(dto.referenceType ? { referenceType: dto.referenceType } : {}),
    ...(dto.referenceId ? { referenceId: dto.referenceId } : {}),
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  }));
}

/** POST /api/v1/notifications/{id}/read. */
export async function markNotificationReadReal(notificationId: string): Promise<void> {
  await http<unknown>(`/notifications/${notificationId}/read`, { method: 'POST' });
}

/** POST /api/v1/notifications/read-all. */
export async function markAllNotificationsReadReal(): Promise<void> {
  await http<unknown>('/notifications/read-all', { method: 'POST' });
}

/** Tuỳ chọn nhận thông báo của chính người dùng. */
export interface NotificationPreferenceDto {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

/** GET /api/v1/users/me/notification-preferences (mọi role). */
export async function notificationPreferencesReal(): Promise<NotificationPreferenceDto> {
  return http<NotificationPreferenceDto>('/users/me/notification-preferences');
}

/** PUT /api/v1/users/me/notification-preferences — gửi NGUYÊN trạng thái 3 cờ. */
export async function updateNotificationPreferencesReal(
  payload: NotificationPreferenceDto,
): Promise<NotificationPreferenceDto> {
  return http<NotificationPreferenceDto>('/users/me/notification-preferences', {
    method: 'PUT',
    body: payload,
  });
}

// ── Tiến độ + minh chứng (TaskExecution F-TSK-13/14 + file service) ─────────
export interface ProgressEvidenceDto {
  fileId: string;
  caption?: string | null;
}

export interface TaskProgressDto {
  id: string;
  taskId: string;
  submittedByUserId: string;
  percentComplete: number;
  note?: string | null;
  submittedAt: string;
  isSubmission: boolean;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  evidence: ProgressEvidenceDto[];
}

interface UploadIntentDto {
  fileId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

const extensionFor = (contentType: string): string => {
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/heic') return '.heic';
  if (contentType === 'image/webp') return '.webp';
  return '.jpg';
};

/** Tên tệp gửi BE: giữ tên gốc, thêm phần mở rộng khớp **content type thật**. */
const fileNameFor = (uri: string, contentType: string): string => {
  const raw = uri.split('/').pop() || 'evidence';
  const base = raw.includes('.') ? raw.slice(0, raw.lastIndexOf('.')) : raw;
  return `${base || 'evidence'}${extensionFor(contentType)}`;
};

/**
 * Upload ảnh minh chứng lên NotificationAudit (MinIO presigned, 3 bước giống web):
 * `POST /files/upload-requests` → `PUT <uploadUrl>` → `POST /files/{id}/complete`.
 * Trả về `fileId` để gắn vào tiến độ/nghiệm thu.
 *
 * Content type lấy từ **file thật** (không đoán theo đuôi URI): URI web là
 * `blob:http://…/<uuid>` không có đuôi, đoán theo đuôi sẽ khai `image/jpeg` cho
 * ảnh PNG → BE chặn `FILE_CONTENT_TYPE_MISMATCH`.
 */
export async function uploadEvidenceFile(uri: string): Promise<string> {
  const { body, sizeBytes, contentType } = await evidenceBody(uri);
  if (!sizeBytes) throw new Error('EVIDENCE_UPLOAD_SIZE_UNKNOWN');
  const name = fileNameFor(uri, contentType);

  const intent = await http<UploadIntentDto>('/files/upload-requests', {
    method: 'POST',
    body: {
      fileName: name,
      contentType,
      sizeBytes,
      purpose: 'ProgressEvidence',
      checksum: null,
    },
  });

  // Presigned URL nằm trên MinIO (không qua gateway) → gửi body nhị phân trực
  // tiếp. Native dùng `File` của expo-file-system + `expo/fetch`; web dùng
  // `Blob` + `fetch` của trình duyệt (expo-file-system không chạy trên web).
  let res: { ok: boolean; status: number };
  try {
    res =
      Platform.OS === 'web'
        ? await fetch(intent.uploadUrl, {
            method: (intent.method || 'PUT') as 'PUT',
            headers: intent.headers ?? {},
            body,
          })
        : await expoFetch(intent.uploadUrl, {
            method: (intent.method || 'PUT') as 'PUT',
            headers: intent.headers ?? {},
            body: body as File,
          });
  } catch {
    throw new ApiError(0, 'EVIDENCE_UPLOAD_FAILED');
  }
  if (!res.ok) {
    throw new ApiError(res.status, `EVIDENCE_UPLOAD_FAILED (${res.status})`);
  }

  await http<unknown>(`/files/${intent.fileId}/complete`, {
    method: 'POST',
    body: { checksum: null },
  });
  return intent.fileId;
}

/** Thân file để PUT lên MinIO + kích thước & content type **thật** của tệp. */
async function evidenceBody(
  uri: string,
): Promise<{ body: Blob | File; sizeBytes: number; contentType: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return { body: blob, sizeBytes: blob.size, contentType: blob.type || 'image/jpeg' };
  }
  const file = new File(uri);
  return {
    body: file,
    sizeBytes: file.size ?? 0,
    contentType: file.type || 'image/jpeg',
  };
}

/** GET /api/v1/tasks/{taskId}/progress — lịch sử tiến độ/nghiệm thu. */
export async function taskProgressReal(taskId: string): Promise<TaskProgressDto[]> {
  const dtos = await http<TaskProgressDto[]>(`/tasks/${taskId}/progress?size=50`);
  return dtos;
}

/**
 * Nộp hoàn thành: `POST /tasks/{taskId}/submit` (lần đầu) hoặc `/resubmit`
 * (khi leader yêu cầu sửa). Ảnh minh chứng phải upload trước để lấy `fileId`.
 */
export async function submitTaskReviewReal(
  taskId: string,
  input: { note: string; photoUris: string[]; resubmit: boolean },
): Promise<Task> {
  const evidence: ProgressEvidenceDto[] = [];
  for (const uri of input.photoUris) {
    evidence.push({ fileId: await uploadEvidenceFile(uri), caption: null });
  }
  const path = input.resubmit ? 'resubmit' : 'submit';
  const dto = await http<TaskDto>(`/tasks/${taskId}/${path}`, {
    method: 'POST',
    body: { note: input.note, evidence, version: null },
  });
  return toTask(dto);
}

/** POST /api/v1/attendance/{attendanceId}/correction-requests — xin sửa giờ công. */
export async function requestAttendanceCorrectionReal(input: {
  attendanceId: string;
  checkInAt: string;
  checkOutAt: string;
  reason: string;
  version: number;
}): Promise<void> {
  await http<unknown>(`/attendance/${input.attendanceId}/correction-requests`, {
    method: 'POST',
    body: {
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      reason: input.reason,
      version: input.version,
    },
  });
}
