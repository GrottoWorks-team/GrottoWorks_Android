// Scene MOCK cho màn "Mô hình 3D của khu vực" trong app TNV.
//
// Vì sao mock: BE chưa có API mô hình 3D (`GET /work-areas/{id}/design-scene`)
// và scene thật đang nằm ở localStorage của trình duyệt mà trưởng khu dựng — xem
// `GrottoWorks_BE/docs/BE-TODO-demo-2026-11-10.md`. Khi API có, chỉ cần thay hàm
// `mockSceneFor(...)` bằng lời gọi API; phần render không đổi.
//
// Đơn vị: mét. `position` = TÂM MẶT ĐÁY của khối (y = cao độ đáy).
export interface SceneLayer {
  id: string;
  /** i18n key — dịch ở UI. */
  nameKey: string;
  order: number;
  /** Nhiệm vụ (TaskExecution) thuộc lớp này — chỉ là tham chiếu. */
  taskIds: string[];
}

export interface SceneBox {
  id: string;
  layerId: string;
  /** [rộng, cao, sâu] */
  size: [number, number, number];
  position: [number, number, number];
  color: string;
}

export interface MockScene {
  areaId: string;
  layers: SceneLayer[];
  items: SceneBox[];
}

export interface MockSceneOptions {
  /** Nhiệm vụ đã nhận — gắn vào lớp "Kết cấu" để TNV thấy lớp của mình. */
  taskId?: string;
}

export function mockSceneFor(areaId: string, options: MockSceneOptions = {}): MockScene {
  const { taskId } = options
  const structure: SceneLayer = {
    id: 'layer-structure',
    nameKey: 'tasks.modelLayer.structure',
    order: 0,
    taskIds: taskId ? [taskId] : [],
  }
  const cover: SceneLayer = {
    id: 'layer-cover',
    nameKey: 'tasks.modelLayer.cover',
    order: 1,
    taskIds: [],
  }
  const decor: SceneLayer = {
    id: 'layer-decor',
    nameKey: 'tasks.modelLayer.decor',
    order: 2,
    taskIds: [],
  }

  const box = (
    id: string,
    layerId: string,
    size: [number, number, number],
    position: [number, number, number],
    color: string,
  ): SceneBox => ({ id, layerId, size, position, color })

  const items: SceneBox[] = [
    // Nền đá
    box('base', cover.id, [5.2, 0.3, 5.2], [0, 0, 0], '#8d99ae'),
    // 4 cột (kết cấu)
    box('pillar-1', structure.id, [0.6, 3, 0.6], [-2.1, 0.3, -2.1], '#b08968'),
    box('pillar-2', structure.id, [0.6, 3, 0.6], [2.1, 0.3, -2.1], '#b08968'),
    box('pillar-3', structure.id, [0.6, 3, 0.6], [-2.1, 0.3, 2.1], '#b08968'),
    box('pillar-4', structure.id, [0.6, 3, 0.6], [2.1, 0.3, 2.1], '#b08968'),
    // Dầm ngang (kết cấu)
    box('beam-1', structure.id, [5, 0.35, 0.4], [0, 3.3, -2.1], '#6c757d'),
    box('beam-2', structure.id, [5, 0.35, 0.4], [0, 3.3, 2.1], '#6c757d'),
    // Mái hang đá
    box('roof-1', cover.id, [4.6, 0.5, 4.6], [0, 3.65, 0], '#c1121f'),
    box('roof-2', cover.id, [2.8, 0.6, 2.8], [0, 4.15, 0], '#a4161a'),
    // Đèn hang đá
    box('lamp-1', decor.id, [0.45, 0.45, 0.45], [0, 1.7, 0], '#ffd166'),
    box('lamp-2', decor.id, [0.4, 0.4, 0.4], [-2.1, 2.7, -2.1], '#ffd166'),
    box('lamp-3', decor.id, [0.4, 0.4, 0.4], [2.1, 2.7, -2.1], '#ffd166'),
  ]

  return { areaId, layers: [structure, cover, decor], items }
}

/** Các lớp chứa nhiệm vụ của TNV (dùng để tô sáng). */
export function taskLayerIds(scene: MockScene, taskId?: string): string[] {
  if (!taskId) return []
  return scene.layers.filter((l) => l.taskIds.includes(taskId)).map((l) => l.id)
}
