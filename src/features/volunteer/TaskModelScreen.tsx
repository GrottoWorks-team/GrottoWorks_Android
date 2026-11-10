// Màn "Mô hình 3D của khu vực" — TNV xem mô hình công trình và THẤY LỚP THI CÔNG
// gắn với nhiệm vụ mình đã nhận. Nằm TRONG app (không mở trình duyệt), truy cập
// từ chi tiết nhiệm vụ.
//
// Dữ liệu: scene MOCK (`mockScene.ts`) vì BE chưa có `GET /work-areas/{id}/design-scene`.
// Renderer: WebView + canvas 2D phối cảnh (`sceneHtml.ts`) — xoay bằng kéo, tách
// lớp, tô sáng lớp của tôi. Khi BE có mô hình thật, chỉ đổi nguồn dữ liệu/renderer.
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { mockSceneFor, taskLayerIds } from './mockScene';
import { buildSceneHtml } from './sceneHtml';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type ModelRoute = RouteProp<TasksStackParamList, 'TaskModel'>;

/** Chỉ cần đúng phần API dùng tới — tránh phụ thuộc kiểu generic của WebView. */
type WebViewHandle = { injectJavaScript: (code: string) => void };

/** Bước tách lớp mỗi lần bấm (0..1). */
const EXPLODE_STEP = 0.2;

export function TaskModelScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<ModelRoute>();
  const webRef = useRef<WebViewHandle | null>(null);
  const [explode, setExplode] = useState(0);

  const setWebRef = useCallback((node: { injectJavaScript: (code: string) => void } | null) => {
    webRef.current = node
      ? { injectJavaScript: (code: string) => node.injectJavaScript(code) }
      : null;
  }, []);

  const scene = useMemo(
    () => mockSceneFor(params.areaId, { taskId: params.taskId }),
    [params.areaId, params.taskId],
  );
  const myLayerIds = useMemo(() => taskLayerIds(scene, params.taskId), [scene, params.taskId]);
  const html = useMemo(() => buildSceneHtml(scene, params.taskId), [scene, params.taskId]);

  const applyExplode = (next: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(next * 10) / 10));
    setExplode(clamped);
    webRef.current?.injectJavaScript(`window.__setExplode(${clamped}); true;`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleBlock}>
          <AppText variant="h1">{params.taskTitle ?? t('tasks.model3dTitle')}</AppText>
          <AppText variant="sub">{params.areaName ?? t('tasks.area')}</AppText>
        </View>

        <Card style={styles.card}>
          <View style={styles.canvasWrap}>
            <WebView
              ref={setWebRef}
              source={{ html }}
              originWhitelist={['*']}
              javaScriptEnabled
              scrollEnabled={false}
              style={styles.webview}
            />
          </View>
          <AppText variant="sub">{t('tasks.model3dRotateHint')}</AppText>

          <View style={styles.actions}>
            <Button
              label={t('tasks.model3dExplodeMinus')}
              variant="outline"
              size="sm"
              disabled={explode <= 0}
              onPress={() => applyExplode(explode - EXPLODE_STEP)}
              style={styles.flex1}
            />
            <AppText variant="label" style={styles.percent}>
              {t('tasks.model3dExplode', { percent: Math.round(explode * 100) })}
            </AppText>
            <Button
              label={t('tasks.model3dExplodePlus')}
              variant="outline"
              size="sm"
              disabled={explode >= 1}
              onPress={() => applyExplode(explode + EXPLODE_STEP)}
              style={styles.flex1}
            />
          </View>
          <Button
            label={t('tasks.model3dReset')}
            variant="ghost"
            size="sm"
            onPress={() => {
              setExplode(0);
              webRef.current?.injectJavaScript('window.__resetView(); true;');
            }}
          />
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('tasks.modelLayersTitle')}</AppText>
          {[...scene.layers]
            .sort((a, b) => a.order - b.order)
            .map((layer) => {
              const mine = myLayerIds.includes(layer.id);
              const count = scene.items.filter((i) => i.layerId === layer.id).length;
              return (
                <View
                  key={layer.id}
                  style={[styles.layerRow, mine && styles.layerRowMine]}
                >
                  <View style={styles.layerText}>
                    <AppText variant="body">{t(layer.nameKey)}</AppText>
                    <AppText variant="sub">{t('tasks.modelLayerItems', { n: count })}</AppText>
                  </View>
                  {mine && <AppText variant="label" style={styles.myBadge}>{t('tasks.modelMyLayer')}</AppText>}
                </View>
              );
            })}
        </Card>

        <AppText variant="sub" style={styles.note}>
          {t('tasks.model3dDemoNote')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  titleBlock: { gap: spacing.xs },
  card: { gap: spacing.sm },
  canvasWrap: {
    height: 340,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex1: { flex: 1 },
  percent: { minWidth: 64, textAlign: 'center' },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
  },
  layerRowMine: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  layerText: { flex: 1, gap: 2 },
  myBadge: { color: colors.pine, fontWeight: '800' },
  note: { marginTop: spacing.sm },
});
