// Màn "Mô hình 3D của khu vực" — TNV chỉ xem (các) LỚP THI CÔNG được gắn với
// nhiệm vụ mình đã nhận, không xem toàn bộ công trình. Nằm TRONG app (không mở
// trình duyệt), truy cập từ chi tiết nhiệm vụ.
//
// Dữ liệu: scene MOCK (`mockScene.ts`) vì BE chưa có `GET /work-areas/{id}/design-scene`.
// Renderer: WebView + canvas 2D phối cảnh (`sceneHtml.ts`) — kéo để xoay.
// Khi BE có mô hình thật, chỉ đổi nguồn dữ liệu/renderer, giữ nguyên màn này.
import { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { mockSceneFor, taskLayerIds } from './mockScene';
import type { MockScene } from './mockScene';
import { buildSceneHtml } from './sceneHtml';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type ModelRoute = RouteProp<TasksStackParamList, 'TaskModel'>;

/** Chỉ cần đúng phần API dùng tới — tránh phụ thuộc kiểu generic của WebView. */
type WebViewHandle = { injectJavaScript: (code: string) => void };

export function TaskModelScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<ModelRoute>();
  const webRef = useRef<WebViewHandle | null>(null);

  const setWebRef = useCallback((node: { injectJavaScript: (code: string) => void } | null) => {
    webRef.current = node
      ? { injectJavaScript: (code: string) => node.injectJavaScript(code) }
      : null;
  }, []);

  const scene = useMemo(
    () => mockSceneFor(params.areaId, { taskId: params.taskId }),
    [params.areaId, params.taskId],
  );

  // Lọc: chỉ giữ (các) lớp có `taskIds` chứa nhiệm vụ này.
  const myLayerIds = useMemo(() => taskLayerIds(scene, params.taskId), [scene, params.taskId]);
  const focusScene = useMemo<MockScene | null>(() => {
    if (myLayerIds.length === 0) return null;
    return {
      areaId: scene.areaId,
      layers: scene.layers.filter((l) => myLayerIds.includes(l.id)),
      items: scene.items.filter((i) => myLayerIds.includes(i.layerId)),
    };
  }, [scene, myLayerIds]);

  const html = useMemo(() => (focusScene ? buildSceneHtml(focusScene) : ''), [focusScene]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleBlock}>
          <AppText variant="h1">{params.taskTitle ?? t('tasks.model3dTitle')}</AppText>
          <AppText variant="sub">{params.areaName ?? t('tasks.area')}</AppText>
        </View>

        {!focusScene ? (
          <EmptyState text={t('tasks.modelNoLayer')} />
        ) : (
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
            <Button
              label={t('tasks.model3dReset')}
              variant="outline"
              size="sm"
              onPress={() => webRef.current?.injectJavaScript('window.__resetView(); true;')}
            />
          </Card>
        )}

        {focusScene && (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.modelLinkedLayersTitle')}</AppText>
            {focusScene.layers.map((layer) => {
              const count = focusScene.items.filter((i) => i.layerId === layer.id).length;
              return (
                <View key={layer.id} style={styles.layerRow}>
                  <AppText variant="body">{t(layer.nameKey)}</AppText>
                  <AppText variant="sub">{t('tasks.modelLayerItems', { n: count })}</AppText>
                </View>
              );
            })}
          </Card>
        )}

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
    height: 320,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldLight,
  },
  note: { marginTop: spacing.sm },
});
