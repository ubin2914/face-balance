import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { useHistory } from '@/hooks/use-history';
import { AnalysisResult, formatDate, getCategoryColor } from '@/utils/analysis';

export default function HistoryScreen() {
  const { records, loading, reload, clear } = useHistory();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>측정 기록</Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={clear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>아직 측정 기록이 없습니다</Text>
          <Text style={styles.emptySubtitle}>홈에서 측정을 시작해 보세요</Text>
          <TouchableOpacity
            style={styles.goHomeBtn}
            onPress={() => router.push('/(tabs)')}>
            <Text style={styles.goHomeBtnText}>지금 측정하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <RecordCard record={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function RecordCard({ record }: { record: AnalysisResult }) {
  const color = getCategoryColor(record.category);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(record.date)}</Text>
        <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
          <Text style={[styles.badgeText, { color }]}>{record.category}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.scoreText, { color }]}>{record.score}점</Text>
        <View style={styles.details}>
          <Text style={styles.detailItem}>
            👁 눈 높이 차이 {record.eyeDiff.value}mm
          </Text>
          <Text style={styles.detailItem}>
            👄 입꼬리 차이 {record.lipDiff.value}mm
          </Text>
          <Text style={styles.detailItem}>
            📏 중심선 편차 {record.centerDiff.value}mm
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: AppColors.textPrimary },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 13, color: AppColors.danger },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  goHomeBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  goHomeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardDate: { fontSize: 12, color: AppColors.textSecondary },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreText: { fontSize: 34, fontWeight: '800', minWidth: 72 },
  details: { flex: 1, gap: 3 },
  detailItem: { fontSize: 12, color: AppColors.textSecondary, lineHeight: 18 },
});
