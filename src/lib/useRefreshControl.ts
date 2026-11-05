// Kéo-để-làm-mới dùng chung cho các màn hình: gom nhiều `refetch()` của React
// Query vào một `RefreshControl`, trả về props sẵn để gắn vào ScrollView/FlatList.
//
//   const refresh = useRefreshControl([tasks.refetch, areas.refetch]);
//   <ScrollView refreshControl={<RefreshControl {...refresh} />}>
import { useCallback, useEffect, useRef, useState } from 'react';

export function useRefreshControl(refetchers: (() => unknown)[]) {
  // Giữ danh sách mới nhất trong ref để `onRefresh` không đổi identity mỗi render.
  const latest = useRef(refetchers);
  useEffect(() => {
    latest.current = refetchers;
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        latest.current.map((refetch) => Promise.resolve(refetch()).catch(() => undefined)),
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    refreshing,
    onRefresh,
    /** iOS: màu spinner theo brand. */
    tintColor: '#0F5132',
    /** Android: màu vòng xoay. */
    colors: ['#0F5132'],
  };
}
