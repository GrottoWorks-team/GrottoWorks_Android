// API tầng mock cho mobile — thay cho HTTP + MSW của webapp. Mọi hàm async,
// thêm delay nhỏ để giống mạng thật. Volunteer chỉ dùng dữ liệu của chính mình.
import type { ActivityLog, Task, Timesheet, User, VolunteerReg, WorkArea } from '../types';
import { taskAssignmentList } from '../types';
import { loadDb, saveDb } from '../mocks/db';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// Tài khoản demo — mật khẩu chung "grotto".
export const DEMO_PASSWORD = 'grotto';
export const DEMO_EMAILS = ['volunteer@grottoworks.vn', 'volunteer2@grottoworks.vn'];

export interface SessionUser extends User {}

// Đăng nhập: tìm user theo email; chấp nhận mọi mật khẩu = DEMO_PASSWORD.
export async function login(email: string, password: string): Promise<SessionUser> {
  await delay(400);
  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password !== DEMO_PASSWORD) {
    throw new Error('INVALID_CREDENTIALS');
  }
  return user;
}

export async function getUser(id: string): Promise<User> {
  await delay(150);
  const db = await loadDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new Error('NOT_FOUND');
  return user;
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  await delay(200);
  const db = await loadDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error('NOT_FOUND');
  db.users[idx] = { ...db.users[idx], ...patch };
  await saveDb(db);
  return db.users[idx];
}

export async function listAreas(): Promise<WorkArea[]> {
  await delay(150);
  const db = await loadDb();
  return db.areas;
}

export async function listMaterials() {
  await delay(150);
  const db = await loadDb();
  return db.materials;
}

// Nhiệm vụ liên quan tới 1 TNV: trong assignees HOẶC có bản ghi assignment.
export async function listMyTasks(volunteerId: string): Promise<Task[]> {
  await delay(200);
  const db = await loadDb();
  return db.tasks.filter(
    (t) =>
      t.assignees.includes(volunteerId) ||
      (t.assignments ?? []).some((a) => a.volunteerId === volunteerId),
  );
}

export async function getTask(id: string): Promise<Task> {
  await delay(150);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) throw new Error('NOT_FOUND');
  return task;
}

// ── Đăng ký tình nguyện ─────────────────────────────────────────────────────
// Task đang tuyển: chưa xong/duyệt, còn chỗ, và TNV chưa nằm trong assignees
// (đã được nhận) lẫn chưa có đơn đăng ký PENDING.
export async function listOpenTasks(volunteerId: string): Promise<Task[]> {
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

// Gửi đơn đăng ký: tạo VolunteerReg PENDING; chặn trùng (đã là assignee hoặc
// đã có đơn). Ghi log để màn thông báo có dữ liệu mới.
export async function registerForTask(
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

// TNV rút đơn đăng ký khi còn PENDING.
export async function cancelRegistration(regId: string): Promise<void> {
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

// TNV phản hồi phân công (accept/decline) — đồng bộ logic với webapp:
// ACCEPTED → vào assignees; DECLINED → ra khỏi assignees kèm lý do.
export async function respondAssignment(
  taskId: string,
  volunteerId: string,
  status: 'ACCEPTED' | 'DECLINED',
  note?: string,
): Promise<Task> {
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

// TNV gửi duyệt hoàn thành: BẮT BUỘC kèm ≥1 ảnh minh chứng khu vực đã làm để
// trưởng khu (leader) xác nhận hoàn thành hay chưa.
export async function submitReview(
  taskId: string,
  note: string,
  photoUris: string[],
): Promise<Task> {
  await delay(250);
  const db = await loadDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('NOT_FOUND');
  if (photoUris.length === 0) throw new Error('PHOTO_REQUIRED');
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

// ── Chấm công ────────────────────────────────────────────────────────────────
export async function listMyTimesheets(volunteerId: string): Promise<Timesheet[]> {
  await delay(200);
  const db = await loadDb();
  return db.timesheets
    .filter((t) => t.volunteerId === volunteerId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

const today = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

export async function checkIn(volunteerId: string): Promise<Timesheet> {
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
  await logActivity('Bạn', `chấm công vào lúc ${ts.checkIn}`, `Chấm công ${ts.date}`);
  return ts;
}

export async function checkOut(volunteerId: string): Promise<Timesheet> {
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
  await logActivity('Bạn', `chấm công ra lúc ${out} (${hours} giờ)`, `Chấm công ${open.date}`);
  return open;
}

export async function requestCorrection(id: string, note: string): Promise<Timesheet> {
  await delay(250);
  const db = await loadDb();
  const ts = db.timesheets.find((t) => t.id === id);
  if (!ts) throw new Error('NOT_FOUND');
  ts.status = 'PENDING_FIX';
  ts.correctionRequest = note;
  await saveDb(db);
  await logActivity('Bạn', `yêu cầu chỉnh giờ công "${note}"`, `Chấm công ${ts.date}`);
  return ts;
}

// ── Thông báo ────────────────────────────────────────────────────────────────
export async function listActivity(): Promise<ActivityLog[]> {
  await delay(150);
  const db = await loadDb();
  return [...db.activityLogs].sort((a, b) => (a.at < b.at ? 1 : -1));
}
