// Seed dữ liệu mẫu cho app mobile — trích và đồng bộ với webapp
// (grottoworks/src/mocks/seed/*). Đủ để volunteer app chạy offline: tài khoản
// TNV demo, khu vực, nhiệm vụ (được phân công + đang tuyển), chấm công,
// thông báo, và các đơn đăng ký tình nguyện. Toàn bộ deterministic (không random).
import type {
  ActivityLog, Community, Parish, Task, Timesheet, User, VolunteerReg, WorkArea,
} from '../types';

export const parish: Parish = { id: 'p1', name: 'Tân Định' };

export const communities: Community[] = [
  { id: 'c1', name: 'Giáo khu Thánh Tâm', parishId: 'p1' },
  { id: 'c2', name: 'Giáo khu Mẹ Thiên Chúa', parishId: 'p1' },
  { id: 'c3', name: 'Giáo khu Thánh Giuse', parishId: 'p1' },
];

const S = {
  dien: ['Điện'], moc: ['Mộc'], han: ['Hàn'], tri: ['Trang trí'],
  van: ['Vận chuyển'], log: ['Logistics'], son: ['Sơn'],
};

// Tài khoản demo TNV dùng để đăng nhập app mobile. Mật khẩu chung: grotto.
export const users: User[] = [
  { id: 'v1', name: 'Gioan Bùi Văn Hùng', email: 'volunteer@grottoworks.vn', role: 'VOLUNTEER', communityId: 'c3', skills: S.moc, points: 95, avatarHue: 30, availability: ['T6', 'T7'] },
  { id: 'v2', name: 'Agnês Trần Ngọc Anh', email: 'volunteer2@grottoworks.vn', role: 'VOLUNTEER', communityId: 'c1', skills: S.tri, points: 80, avatarHue: 330, availability: ['T3', 'T5', 'T7', 'CN'] },
  { id: 'u3', name: 'Đaminh Hoàng Văn Tùng', email: 'leader@grottoworks.vn', role: 'LEADER', communityId: 'c1', skills: S.moc, points: 85, avatarHue: 33 },
];

export const areas: WorkArea[] = [
  { id: 'a1', name: 'Hang đá Bê-lem', type: 'GROTTO', level: 'PARISH', leaderId: 'u3', officerId: 'v1', progress: 62, volunteerCount: 4, taskCount: 8, status: 'ON_TRACK' },
  { id: 'a2', name: 'Cây thông lớn', type: 'TREE', level: 'PARISH', leaderId: 'u3', officerId: 'v1', progress: 48, volunteerCount: 6, taskCount: 8, status: 'AT_RISK' },
];

// Nhiệm vụ minh hoạ:
//  - mt1, mt3: đã nhận (ACCEPTED)
//  - mt2: có lời mời (PENDING) — cũng đang mở tuyển người
//  - mt4: đã từ chối
//  - mt5, mt6: đang tuyển (chưa liên quan tới v1) → TNV tự đăng ký
export const tasks: Task[] = [
  {
    id: 'mt1', areaId: 'a1', title: 'Xây tường gạch hình thức núi',
    description: 'Gạch đỏ xếp lớp tạo dáng núi, trát mờ ngoài.',
    skills: ['Mộc'], estimateHours: 36, volunteersNeeded: 4, assignees: ['v1'], materialIds: ['m2'],
    status: 'DOING', dueDate: '2026-11-10', submittedPhotos: 2,
    completionCriteria: 'Tường phẳng, mạch gạch đều, không nứt; cao đúng thiết kế.',
    materialNeeds: { m2: 800 },
    assignments: [
      { volunteerId: 'v1', status: 'ACCEPTED' },
      { volunteerId: 'v2', status: 'ACCEPTED' },
    ],
  },
  {
    id: 'mt2', areaId: 'a1', title: 'Phủ rơm mái hang',
    description: 'Lợp rơm lên khung mái, uốn viền mái tự nhiên.',
    skills: ['Trang trí'], estimateHours: 12, volunteersNeeded: 3, assignees: [], materialIds: ['m3'],
    status: 'TODO', dueDate: '2026-11-22', submittedPhotos: 0,
    completionCriteria: 'Rơm phủ kín mái, viền gọn, không lộ khung.',
    assignments: [{ volunteerId: 'v1', status: 'PENDING' }],
  },
  {
    id: 'mt3', areaId: 'a2', title: 'Quấn đèn LED vàng quanh cây',
    description: 'Quấn dây đèn LED vàng theo vòng xoắn từ chân lên ngọn.',
    skills: ['Điện', 'Trang trí'], estimateHours: 14, volunteersNeeded: 4, assignees: ['v1'], materialIds: ['m7'],
    status: 'DOING', dueDate: '2026-11-25', submittedPhotos: 3,
    completionCriteria: 'Dây đèn sáng đều, vòng xoắn cách đều, không chồng chéo.',
    materialNeeds: { m7: 120 },
    assignments: [{ volunteerId: 'v1', status: 'ACCEPTED' }],
  },
  {
    id: 'mt4', areaId: 'a2', title: 'Lắp dựng và dựng cây thông',
    description: 'Đứng cây, chằng 3 hướng bằng dây thép.',
    skills: ['Hàn', 'Vận chuyển'], estimateHours: 12, volunteersNeeded: 6, assignees: [], materialIds: ['m10'],
    status: 'TODO', dueDate: '2026-11-08', submittedPhotos: 0,
    assignments: [{ volunteerId: 'v1', status: 'DECLINED', note: 'Bận việc gia đình tuần này.' }],
  },
  // ── Đang tuyển (TNV tự đăng ký) ──────────────────────────────────────────
  {
    id: 'mt5', areaId: 'a2', title: 'Trang trí ngôi sao trên đỉnh cây thông',
    description: 'Gắn ngôi sao phát sáng lên đỉnh cây, đấu dây điện an toàn.',
    skills: ['Điện', 'Trang trí'], estimateHours: 8, volunteersNeeded: 3,
    assignees: ['v2'], materialIds: ['m7'],
    status: 'TODO', dueDate: '2026-11-20', submittedPhotos: 0,
    completionCriteria: 'Sao cố định chắc chắn, sáng đều, dây gọn không lộ.',
    materialNeeds: { m7: 10 },
  },
  {
    id: 'mt6', areaId: 'a1', title: 'Sơn lại khung hang đá',
    description: 'Chà nhám và sơn lại khung gỗ quanh hang đá.',
    skills: ['Sơn', 'Mộc'], estimateHours: 16, volunteersNeeded: 2, assignees: [],
    materialIds: ['m2'],
    status: 'DOING', dueDate: '2026-11-28', submittedPhotos: 0,
    completionCriteria: 'Bề mặt mịn, sơn đều màu, không chảy.',
  },
];

// Đơn đăng ký tình nguyện của v1:
//  - mt5: đang chờ duyệt (PENDING) → minh hoạ badge "Chờ duyệt"
//  - mt2 đã được mời trực tiếp (không có reg)
export const volunteerRegs: VolunteerReg[] = [
  { id: 'vr1', taskId: 'mt5', volunteerId: 'v1', status: 'PENDING', note: 'Em làm được buổi tối và cuối tuần.', at: '2026-11-06T18:30:00' },
  { id: 'vr2', taskId: 'mt5', volunteerId: 'v2', status: 'APPROVED', at: '2026-11-05T09:00:00' },
  { id: 'vr3', taskId: 'mt6', volunteerId: 'v2', status: 'REJECTED', rejectReason: 'Cần người biết sơn, em chưa có kinh nghiệm.', at: '2026-11-04T20:00:00' },
];

// Chấm công của v1 — 3 bản ghi gần đây.
export const timesheets: Timesheet[] = [
  { id: 'ts1', volunteerId: 'v1', date: '2026-11-03', checkIn: '08:00', checkOut: '12:00', hours: 4, status: 'CLOSED' },
  { id: 'ts2', volunteerId: 'v1', date: '2026-11-05', checkIn: '14:00', checkOut: '18:30', hours: 4.5, status: 'CLOSED' },
  { id: 'ts3', volunteerId: 'v1', date: '2026-11-06', checkIn: '07:30', checkOut: '11:00', hours: 3.5, status: 'CLOSED' },
];

// Thông báo/hoạt động liên quan tới TNV.
export const activityLogs: ActivityLog[] = [
  { id: 'lg1', at: '2026-11-06T09:12:00', actor: 'Đaminh Hoàng Văn Tùng', action: 'Mời bạn tham gia nhiệm vụ "Phủ rơm mái hang"', target: 'Phủ rơm mái hang' },
  { id: 'lg2', at: '2026-11-05T16:40:00', actor: 'Hệ thống', action: 'Ghi nhận 3.5 giờ công', target: 'Chấm công 06/11' },
  { id: 'lg3', at: '2026-11-04T08:05:00', actor: 'Đaminh Hoàng Văn Tùng', action: 'Xác nhận bạn nhận nhiệm vụ "Quấn đèn LED vàng quanh cây"', target: 'Quấn đèn LED vàng quanh cây' },
  { id: 'lg4', at: '2026-11-02T20:30:00', actor: 'Hệ thống', action: 'Bạn được cộng 5 điểm vinh danh', target: 'Điểm vinh danh' },
];

// Vật tư tối thiểu (chỉ id → name/unit phục vụ hiển thị chip nhiệm vụ).
export const materials = [
  { id: 'm2', name: 'Gạch đỏ', unit: 'viên' },
  { id: 'm3', name: 'Rơm khô', unit: 'bó' },
  { id: 'm7', name: 'Dây đèn LED vàng', unit: 'm' },
  { id: 'm10', name: 'Dây thép chằng', unit: 'm' },
];
