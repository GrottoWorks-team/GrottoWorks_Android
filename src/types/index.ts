// GrottoWorks domain types — đồng bộ với webapp (grottoworks/src/types/index.ts).
// Mobile (volunteer) thêm role VOLUNTEER và VolunteerReg (đăng ký của TNV).
export type Role = 'ADMIN' | 'COMMITTEE' | 'LEADER' | 'OFFICER' | 'VOLUNTEER';

export interface Parish { id: string; name: string }
export interface Community { id: string; name: string; parishId: string }

export interface User {
  id: string; name: string; email: string; role: Role; communityId?: string;
  locked?: boolean; skills: string[]; points: number; avatarHue: number;
  /** Lịch rảnh trong tuần (T2…CN). */
  availability?: Weekday[];
}

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Season {
  id: string; year: number; startDate: string; endDate: string;
  status: 'ACTIVE' | 'CLOSED' | 'PLANNED'; budget: number;
}

export type AreaType = 'GROTTO' | 'TREE' | 'LIGHTING' | 'YARD' | 'STAGE';

export interface WorkArea {
  id: string; name: string; type: AreaType; level: 'PARISH' | 'COMMUNITY'; communityId?: string;
  leaderId: string; officerId: string; progress: number; volunteerCount: number;
  taskCount: number; status: 'ON_TRACK' | 'AT_RISK' | 'LATE';
}

export interface Task {
  id: string; areaId: string; title: string; description: string; skills: string[];
  estimateHours: number; volunteersNeeded: number; assignees: string[]; materialIds: string[];
  status: 'DRAFT' | 'TODO' | 'DOING' | 'REVIEW' | 'DONE' | 'REVISE'; dueDate: string;
  submittedPhotos: number; submittedNotes?: string;
  /** URI ảnh minh chứng TNV gửi kèm khi nộp duyệt hoàn thành (bắt buộc ≥1). */
  submittedPhotoUris?: string[];
  completionCriteria?: string;
  materialNeeds?: Record<string, number>;
  assignments?: TaskAssignment[];
  /** Những TNV đang có đơn đăng ký (PENDING) — dùng để khóa nút "Đăng ký". */
  pendingRegVolunteerIds?: string[];
}

export interface TaskAssignment {
  volunteerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  note?: string;
}

// Đăng ký tình nguyện: TNV chủ động gửi lên, leader duyệt/từ chối.
export interface VolunteerReg {
  id: string; taskId: string; volunteerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** Ghi chú của TNV khi gửi đăng ký (mức độ sẵn sàng, kỹ năng liên quan…). */
  note?: string;
  /** Lý do leader từ chối — hiển thị cho TNV. */
  rejectReason?: string;
  /** ISO thời điểm gửi đăng ký. */
  at?: string;
}

export interface Material {
  id: string; areaId: string; name: string; unit: string;
  required: number; existing: number; purchased: number;
  donatedPledged: number; donatedReceived: number; received: number;
  buyerId?: string; status: 'SHORTAGE' | 'INCOMING' | 'ENOUGH';
  estUnitPrice: number;
}

export function shortage(m: Pick<Material, 'required' | 'received'>): number {
  return m.required - m.received;
}

export interface PurchaseRequest {
  id: string; materialIds: string[]; total: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'; createdBy: string; note?: string;
  rejectReason?: string;
  qtys?: Record<string, number>;
}

export interface PurchaseRecord {
  id: string; requestId: string; materialId: string; qty: number; cost: number;
  supplier: string; date: string; receiptPhoto?: string; confirmed: boolean; buyerId: string;
}

export interface Donation {
  id: string; materialId?: string; monetary?: number; donorName: string;
  status: 'PLEDGED' | 'RECEIVED_FULL' | 'RECEIVED_PARTIAL' | 'UNUSABLE' | 'CANCELED';
  promisedQty?: number; receivedQty?: number; note?: string;
}

export interface BorrowedItem {
  id: string; name: string; owner: string; expectedReturn: string;
  returnedCondition?: 'GOOD' | 'DAMAGED' | 'LOST'; areaId: string;
}

export interface Allocation {
  id: string; materialId: string; targetTaskId?: string; targetAreaId?: string;
  qty: number; date: string; byUserId: string;
}

export interface Timesheet {
  id: string; volunteerId: string; date: string; checkIn: string; checkOut?: string;
  hours: number; correctionRequest?: string; status: 'OPEN' | 'CLOSED' | 'PENDING_FIX';
}

export interface SupportRequest {
  id: string; areaId: string; kind: 'PEOPLE' | 'SKILL' | 'MATERIAL';
  detail: string; status: 'OPEN' | 'COORDINATED' | 'RESOLVED'; assigneeId?: string;
}

export interface ChecklistItem { id: string; areaId: string; label: string; done: boolean; note?: string }

export interface ActivityLog { id: string; at: string; actor: string; action: string; target: string }

export const SKILLS = ['Điện', 'Mộc', 'Hàn', 'Trang trí', 'Vận chuyển', 'Logistics', 'Sơn'] as const;

// ── Phân công trực tiếp: helper đồng bộ với webapp ──────────────────────────
// `assignees` (dữ liệu cũ) = ACCEPTED, overlay `assignments`.
export function taskAssignmentList(
  task: Pick<Task, 'assignees' | 'assignments'>,
): TaskAssignment[] {
  const byId = new Map<string, TaskAssignment>();
  for (const id of task.assignees) byId.set(id, { volunteerId: id, status: 'ACCEPTED' });
  for (const a of task.assignments ?? []) byId.set(a.volunteerId, a);
  return [...byId.values()];
}

export function assignmentStatus(
  task: Pick<Task, 'assignees' | 'assignments'>,
  volunteerId: string,
): TaskAssignment['status'] | undefined {
  return taskAssignmentList(task).find((a) => a.volunteerId === volunteerId)?.status;
}

// ── Đăng ký tình nguyện: task mở cho đăng ký ────────────────────────────────
// Task còn tuyển người khi: chưa xong/duyệt và số người đã nhận < số cần.
export function isOpenForRegistration(
  task: Pick<Task, 'status' | 'assignees' | 'volunteersNeeded'>,
): boolean {
  if (task.status === 'DONE' || task.status === 'REVIEW') return false;
  return task.assignees.length < task.volunteersNeeded;
}

/**
 * Điểm khớp kỹ năng giữa TNV và task (0..1) — dùng để gợi ý task phù hợp.
 * TNV chưa khai kỹ năng → 0 (không ưu tiên nhưng vẫn thấy task).
 */
export function skillMatchScore(
  task: Pick<Task, 'skills'>,
  volunteer: Pick<User, 'skills'>,
): number {
  if (task.skills.length === 0) return 0.5; // task không yêu cầu kỹ năng → trung tính
  const hit = task.skills.filter((s) => volunteer.skills.includes(s)).length;
  return hit / task.skills.length;
}
