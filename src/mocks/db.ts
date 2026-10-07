// Mock DB cho mobile: seed trong bộ nhớ + persist thay đổi vào AsyncStorage.
// Thay thế MSW + localStorage của webapp. Mọi mutation load → sửa → save.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityLog, Task, Timesheet, User, VolunteerReg, WorkArea } from '../types';

import { activityLogs, areas, materials, tasks, timesheets, users, volunteerRegs } from './seed';

const KEY = 'grotto-mobile-db-v2';

export interface Db {
  users: User[];
  areas: WorkArea[];
  tasks: Task[];
  timesheets: Timesheet[];
  activityLogs: ActivityLog[];
  volunteerRegs: VolunteerReg[];
  materials: typeof materials;
}

const freshDb = (): Db => ({
  users: structuredClone(users),
  areas: structuredClone(areas),
  tasks: structuredClone(tasks),
  timesheets: structuredClone(timesheets),
  activityLogs: structuredClone(activityLogs),
  volunteerRegs: structuredClone(volunteerRegs),
  materials: structuredClone(materials),
});

let cache: Db | null = null;

export async function loadDb(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Db) : freshDb();
  } catch {
    cache = freshDb();
  }
  return cache;
}

export async function saveDb(db: Db): Promise<void> {
  cache = db;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // bỏ qua lỗi lưu — vẫn giữ cache trong bộ nhớ
  }
}

export async function resetDb(): Promise<void> {
  cache = freshDb();
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}
