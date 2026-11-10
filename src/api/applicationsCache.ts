// Cache CỤC BỘ các đơn đăng ký TNV đã gửi.
//
// Vì sao còn cần: BE mới có `POST /tasks/{id}/applications` +
// `POST /task-applications/{id}/approve|reject` (leader duyệt) nhưng CHƯA có
// endpoint liệt kê đơn của chính TNV, cũng chưa có API huỷ đơn. Trước đây app
// giữ cả một "mock DB" (seed users/tasks/timesheets…) chỉ để hiển thị trạng thái
// này — đã bỏ. Ở đây chỉ lưu ĐÚNG những đơn do chính máy này gửi lên BE, không
// bịa dữ liệu nghiệp vụ.
//
// Khi BE bổ sung `GET /users/me/applications` (hoặc trả `applications[]` trong
// `/users/me/tasks`), xoá file này và đọc thẳng từ API.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { VolunteerReg } from '../types';

const KEY = 'grotto-mobile-applications-v1';

let cache: VolunteerReg[] | null = null;

async function load(): Promise<VolunteerReg[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as VolunteerReg[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(rows: VolunteerReg[]): Promise<void> {
  cache = rows;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Không lưu được (bộ nhớ đầy) → vẫn giữ trong RAM cho phiên hiện tại.
  }
}

/** Đơn đã gửi từ máy này, mới nhất trước. */
export async function listApplications(): Promise<VolunteerReg[]> {
  const rows = await load();
  return [...rows].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? 1 : -1));
}

/** Ghi/đè đơn của cùng (taskId, volunteerId). */
export async function upsertApplication(reg: VolunteerReg): Promise<void> {
  const rows = await load();
  const next = [
    reg,
    ...rows.filter((r) => !(r.taskId === reg.taskId && r.volunteerId === reg.volunteerId)),
  ];
  await persist(next);
}

export async function removeApplication(regId: string): Promise<void> {
  const rows = await load();
  await persist(rows.filter((r) => r.id !== regId));
}
