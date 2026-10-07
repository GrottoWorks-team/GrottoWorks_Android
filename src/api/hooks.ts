// React Query hooks cho mobile — đồng bộ pattern với webapp (queryKey + invalidate).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelRegistration,
  checkIn,
  checkOut,
  getMyReg,
  getTask,
  listActivity,
  listAreas,
  listMaterials,
  listMyRegs,
  listMyTasks,
  listMyTimesheets,
  listOpenTasks,
  registerForTask,
  requestCorrection,
  respondAssignment,
  submitReview,
  updateUser,
} from '../api';

export const keys = {
  tasks: (volunteerId: string) => ['tasks', volunteerId] as const,
  openTasks: (volunteerId: string) => ['openTasks', volunteerId] as const,
  task: (id: string) => ['task', id] as const,
  myRegs: (volunteerId: string) => ['myRegs', volunteerId] as const,
  myReg: (taskId: string, volunteerId: string) => ['myReg', taskId, volunteerId] as const,
  timesheets: (volunteerId: string) => ['timesheets', volunteerId] as const,
  activity: ['activity'] as const,
  areas: ['areas'] as const,
  materials: ['materials'] as const,
};

export const useAreas = () => useQuery({ queryKey: keys.areas, queryFn: listAreas });

export const useTaskMaterials = () =>
  useQuery({ queryKey: keys.materials, queryFn: listMaterials });

export const useMyTasks = (volunteerId: string) =>
  useQuery({
    queryKey: keys.tasks(volunteerId),
    queryFn: () => listMyTasks(volunteerId),
    enabled: Boolean(volunteerId),
  });

export const useOpenTasks = (volunteerId: string) =>
  useQuery({
    queryKey: keys.openTasks(volunteerId),
    queryFn: () => listOpenTasks(volunteerId),
    enabled: Boolean(volunteerId),
  });

export const useTask = (id: string) =>
  useQuery({ queryKey: keys.task(id), queryFn: () => getTask(id), enabled: Boolean(id) });

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

export const useMyTimesheets = (volunteerId: string) =>
  useQuery({
    queryKey: keys.timesheets(volunteerId),
    queryFn: () => listMyTimesheets(volunteerId),
    enabled: Boolean(volunteerId),
  });

export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: listActivity });

// Sau mọi mutation phân công/nộp duyệt: làm mới nhiệm vụ + thông báo.
function invalidateTaskData(qc: ReturnType<typeof useQueryClient>, volunteerId: string) {
  void qc.invalidateQueries({ queryKey: keys.tasks(volunteerId) });
  void qc.invalidateQueries({ queryKey: keys.openTasks(volunteerId) });
  void qc.invalidateQueries({ queryKey: keys.myRegs(volunteerId) });
  void qc.invalidateQueries({ queryKey: keys.activity });
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

export function useCheckIn(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => checkIn(volunteerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useCheckOut(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => checkOut(volunteerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useRequestCorrection(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => requestCorrection(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.timesheets(volunteerId) });
      void qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useUpdateProfile(volunteerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof updateUser>[1]) => updateUser(volunteerId, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.activity }),
  });
}
