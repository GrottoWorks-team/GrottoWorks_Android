// React Query hooks cho mobile — đồng bộ pattern với webapp (queryKey + invalidate).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelAttendanceRequest,
  cancelRegistration,
  areaTasks,
  checkIn,
  checkOut,
  getMyRecognition,
  getMyReg,
  getNotificationPreferences,
  getTask,
  listAreas,
  listCommunities,
  listContributionNeeds,
  listMaterials,
  listMyAttendanceRequests,
  listMyContributions,
  listMyRegs,
  listMyTasks,
  listMyTimesheets,
  listNotifications,
  listOpenTasks,
  listSkills,
  listTaskProgress,
  markAllNotificationsRead,
  markNotificationRead,
  getPurchaseRequest,
  listMyPurchaseTasks,
  offerLoanItem,
  pledgeMaterial,
  pledgeMoney,
  recordPurchase,
  registerForTask,
  requestCorrection,
  respondAssignment,
  submitReview,
  updateNotificationPreferences,
  updateUser,
} from '../api';
import type { PledgeMaterialInput, ProfilePatch, RecordPurchaseInput } from '../api';
import type { Timesheet } from '../types';

export const keys = {
  tasks: (volunteerId: string) => ['tasks', volunteerId] as const,
  openTasks: (volunteerId: string) => ['openTasks', volunteerId] as const,
  task: (id: string) => ['task', id] as const,
  myRegs: (volunteerId: string) => ['myRegs', volunteerId] as const,
  myReg: (taskId: string, volunteerId: string) => ['myReg', taskId, volunteerId] as const,
  timesheets: (volunteerId: string) => ['timesheets', volunteerId] as const,
  attendanceRequests: (volunteerId: string) => ['attendanceRequests', volunteerId] as const,
  areas: ['areas'] as const,
  areaTasks: (areaId: string) => ['areaTasks', areaId] as const,
  materials: ['materials'] as const,
  skills: ['skills'] as const,
  notifications: ['notifications'] as const,
  notificationPreferences: ['notification-preferences'] as const,
  recognition: (volunteerId: string) => ['recognition', volunteerId] as const,
  contributions: (volunteerId: string) => ['contributions', volunteerId] as const,
  contributionNeeds: ['contributionNeeds'] as const,
  communities: ['communities'] as const,
  purchaseTasks: ['purchase-tasks'] as const,
  purchaseRequest: (requestId: string) => ['purchase-request', requestId] as const,
};

export const useCommunities = () =>
  useQuery({ queryKey: keys.communities, queryFn: listCommunities });

export const useAreas = () => useQuery({ queryKey: keys.areas, queryFn: listAreas });

export const useAreaTasks = (areaId: string) =>
  useQuery({
    queryKey: keys.areaTasks(areaId),
    queryFn: () => areaTasks(areaId),
    enabled: Boolean(areaId),
  });

export const useTaskMaterials = () =>
  useQuery({ queryKey: keys.materials, queryFn: listMaterials });

/** Danh mục kỹ năng BE (kèm id) — dùng cho màn chỉnh sửa hồ sơ. */
export const useSkills = () => useQuery({ queryKey: keys.skills, queryFn: listSkills });

export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: listNotifications });

/** Tuỳ chọn nhận thông báo (in-app / push / email) — BE `users/me/notification-preferences`. */
export const useNotificationPreferences = () =>
  useQuery({
    queryKey: keys.notificationPreferences,
    queryFn: getNotificationPreferences,
    staleTime: 0,
  });

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (next) => {
      qc.setQueryData(keys.notificationPreferences, next);
    },
  });
}

export const useMyRecognition = (volunteerId: string) =>
  useQuery({
    queryKey: keys.recognition(volunteerId),
    queryFn: getMyRecognition,
    enabled: Boolean(volunteerId),
  });

export const useMyContributions = (volunteerId: string) =>
  useQuery({
    queryKey: keys.contributions(volunteerId),
    queryFn: listMyContributions,
    enabled: Boolean(volunteerId),
  });

export const useContributionNeeds = () =>
  useQuery({ queryKey: keys.contributionNeeds, queryFn: listContributionNeeds });

/**
 * Việc đi mua được giao cho TNV (F-RES-09, BR-30).
 * `staleTime: 0` vì trạng thái đơn đổi từ phía trưởng khu / trưởng ban vật tư.
 */
export const useMyPurchaseTasks = () =>
  useQuery({ queryKey: keys.purchaseTasks, queryFn: listMyPurchaseTasks, staleTime: 0 });

/** Dòng vật tư của đơn mua cần ghi nhận số lượng thật. */
export const usePurchaseRequest = (requestId?: string) =>
  useQuery({
    queryKey: keys.purchaseRequest(requestId ?? ''),
    queryFn: () => getPurchaseRequest(requestId ?? ''),
    enabled: Boolean(requestId),
    staleTime: 0,
  });

/** Ghi nhận lần mua → làm mới danh sách việc mua (đơn chuyển sang PURCHASED). */
export function useRecordPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPurchaseInput) => recordPurchase(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.purchaseTasks });
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export const useMyTasks = (volunteerId: string) =>
  useQuery({
    queryKey: keys.tasks(volunteerId),
    queryFn: () => listMyTasks(volunteerId),
    enabled: Boolean(volunteerId),
    // Trạng thái việc đổi từ phía leader (phát hành/duyệt check-in) → luôn làm mới
    // khi mở lại màn hình thay vì dùng cache 30s.
    staleTime: 0,
  });

export const useOpenTasks = (volunteerId: string) =>
  useQuery({
    queryKey: keys.openTasks(volunteerId),
    queryFn: () => listOpenTasks(volunteerId),
    enabled: Boolean(volunteerId),
    staleTime: 0,
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: keys.task(id),
    queryFn: () => getTask(id),
    enabled: Boolean(id),
    staleTime: 0,
  });

/** Lịch sử tiến độ/nghiệm thu của task (BE `GET /tasks/{id}/progress`). */
export const useTaskProgress = (id: string) =>
  useQuery({
    queryKey: [...keys.task(id), 'progress'] as const,
    queryFn: () => listTaskProgress(id),
    enabled: Boolean(id),
  });

export const useMyRegs = (volunteerId: string) =>
  useQuery({
    queryKey: keys.myRegs(volunteerId),
    queryFn: () => listMyRegs(volunteerId),
    enabled: Boolean(volunteerId),
  });

export const useMyReg = (taskId: string, volunteerId: string) =>
  useQuery({
    queryKey: keys.myReg(taskId, volunteerId),
    queryFn: () => getMyReg(taskId, volunteerId),
    enabled: Boolean(taskId) && Boolean(volunteerId),
  });

export const useMyTimesheets = (volunteerId: string) => useQuery({
    queryKey: keys.timesheets(volunteerId),
    queryFn: () => listMyTimesheets(volunteerId),
    enabled: Boolean(volunteerId),
    staleTime: 0,
  });

/**
 * Đơn vào ca đang chờ duyệt của chính TNV (`GET /users/me/attendance-requests`).
 * Dùng để nhiệm vụ hiển thị "chờ trưởng khu duyệt" thay vì mãi là "Chưa bắt đầu".
 */
export const useMyAttendanceRequests = (volunteerId: string) =>
  useQuery({
    queryKey: keys.attendanceRequests(volunteerId),
    queryFn: () => listMyAttendanceRequests('PENDING'),
    enabled: Boolean(volunteerId),
    staleTime: 0,
  });

// Sau mọi mutation phân công/nộp duyệt: làm mới nhiệm vụ + thông báo.
function invalidateTaskData(qc: ReturnType<typeof useQueryClient>, volunteerId: string) {
  void qc.invalidateQueries({ queryKey: keys.tasks(volunteerId) });
  void qc.invalidateQueries({ queryKey: keys.openTasks(volunteerId) });
  void qc.invalidateQueries({ queryKey: keys.myRegs(volunteerId) });
}

export interface RespondArgs {
  taskId: string;
  status: 'ACCEPTED' | 'DECLINED';
  note?: string;
}

export function useRespondAssignment(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status, note }: RespondArgs) =>
      respondAssignment(taskId, volunteerId, status, note),
    onSuccess: (_data, vars) => {
      invalidateTaskData(qc, volunteerId);
      void qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
    },
  });
}

// ── Đăng ký tình nguyện ─────────────────────────────────────────────────────
export interface RegisterArgs {
  taskId: string;
  note?: string;
}

export function useRegisterForTask(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }: RegisterArgs) => registerForTask(taskId, volunteerId, note),
    onSuccess: (_data, vars) => {
      invalidateTaskData(qc, volunteerId);
      void qc.invalidateQueries({ queryKey: keys.myReg(vars.taskId, volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
    },
  });
}

export function useCancelRegistration(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (regId: string) => cancelRegistration(regId),
    onSuccess: () => invalidateTaskData(qc, volunteerId),
  });
}

export interface SubmitReviewArgs {
  note: string;
  photoUris: string[];
}

export function useSubmitReview(volunteerId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ note, photoUris }: SubmitReviewArgs) => submitReview(taskId, note, photoUris),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.task(taskId) });
      invalidateTaskData(qc, volunteerId);
    },
  });
}

export interface CheckInArgs {
  /** Việc muốn vào ca — BE cần để tra `assignmentId` (`GET /users/me/assignments`). */
  taskId?: string;
  note?: string;
}

export function useCancelAttendanceRequest(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, version }: { requestId: string; version: number }) =>
      cancelAttendanceRequest(requestId, version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.attendanceRequests(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      invalidateTaskData(qc, volunteerId);
    },
  });
}

export function useCheckIn(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }: CheckInArgs = {}) => checkIn(volunteerId, taskId, note),
    onSuccess: (_result, vars) => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.attendanceRequests(volunteerId) });
      // Việc có thể chuyển IN_PROGRESS sau khi trưởng khu duyệt → làm mới danh sách.
      invalidateTaskData(qc, volunteerId);
      if (vars?.taskId) void qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
    },
  });
}

export function useCheckOut(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => checkOut(volunteerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.attendanceRequests(volunteerId) });
      invalidateTaskData(qc, volunteerId);
    },
  });
}

export function useRequestCorrection(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheet, note }: { timesheet: Timesheet; note: string }) =>
      requestCorrection(timesheet, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
    },
  });
}

export function useUpdateProfile(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateUser(volunteerId, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.skills });
      void qc.invalidateQueries({ queryKey: keys.recognition(volunteerId) });
    },
  });
}

// ── Thông báo ───────────────────────────────────────────────────────────────
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

// ── Quyên góp / cho mượn ────────────────────────────────────────────────────
export interface PledgeMaterialArgs {
  workAreaId: string;
  items: PledgeMaterialInput[];
  note?: string;
}

export function usePledgeMaterial(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workAreaId, items, note }: PledgeMaterialArgs) =>
      pledgeMaterial(workAreaId, items, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.contributions(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.contributionNeeds });
      void qc.invalidateQueries({ queryKey: keys.recognition(volunteerId) });
    },
  });
}

export interface PledgeMoneyArgs {
  amount: number;
  note?: string;
  workAreaId?: string;
}

export function usePledgeMoney(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, note, workAreaId }: PledgeMoneyArgs) =>
      pledgeMoney(amount, note, workAreaId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.contributions(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.recognition(volunteerId) });
    },
  });
}

export function useOfferLoan() {
  return useMutation({ mutationFn: offerLoanItem });
}
