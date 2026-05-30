import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { saveRecord } from '@/hooks/use-history';
import {
  AnalysisResult,
  calculateFromFaceData,
  generateMockAnalysis,
  getCategoryColor,
  sideName,
} from '@/utils/analysis';

export default function AnalysisScreen() {
  const { faceData } = useLocalSearchParams<{ faceData?: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const dots = useRef(
    [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        220,
        dots.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 380, useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();

    const timer = setTimeout(async () => {
      loop.stop();
      const analysisResult = faceData
        ? calculateFromFaceData(faceData)
        : generateMockAnalysis();
      setResult(analysisResult);
      try {
        await saveRecord(analysisResult);
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {result ? (
        <ResultView result={result} saved={saved} />
      ) : (
        <LoadingView dots={dots} />
      )}
    </SafeAreaView>
  );
}

function LoadingView({ dots }: { dots: Animated.Value[] }) {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>얼굴 데이터 분석 중</Text>
      <View style={styles.dotsRow}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
        ))}
      </View>
      <Text style={styles.loadingSubtitle}>좌우 균형을 계산하고 있습니다...</Text>
    </View>
  );
}

function ResultView({ result, saved }: { result: AnalysisResult; saved: boolean }) {
  const color = getCategoryColor(result.category);

  return (
    <ScrollView
      contentContainerStyle={styles.resultScroll}
      showsVerticalScrollIndicator={false}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>분석 결과</Text>
        {saved && <Text style={styles.savedBadge}>✓ 기록 저장됨</Text>}
      </View>

      <View style={styles.scoreSection}>
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreNumber, { color }]}>{result.score}</Text>
          <Text style={[styles.scoreUnit, { color }]}>점</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.categoryText, { color }]}>{result.category}</Text>
        </View>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>세부 측정 결과</Text>
        <DetailRow
          icon="👁"
          label="눈 높이 차이"
          value={result.eyeDiff.value}
          side={result.eyeDiff.side}
          suffix="이 높음"
        />
        <DetailRow
          icon="👄"
          label="입꼬리 차이"
          value={result.lipDiff.value}
          side={result.lipDiff.side}
          suffix="이 높음"
        />
        <DetailRow
          icon="📏"
          label="중심선 편차"
          value={result.centerDiff.value}
          side={result.centerDiff.side}
          suffix="으로 치우침"
        />
      </View>

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          ⚠️ 이 결과는 참고용 수치입니다. 정확한 의료 진단을 대체하지 않으며,
          얼굴 데이터는 기기 밖으로 저장되지 않습니다.
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => router.replace('/camera')}>
          <Text style={styles.outlineBtnText}>다시 측정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/history')}>
          <Text style={styles.primaryBtnText}>기록 보기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.homeLink}
        onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.homeLinkText}>홈으로 돌아가기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({
  icon, label, value, side, suffix,
}: {
  icon: string; label: string; value: number;
  side: 'left' | 'right'; suffix: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={styles.detailInfo}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>
          {value}mm — {sideName(side)}{suffix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 18, fontWeight: '600', color: AppColors.textPrimary,
    marginBottom: 28, textAlign: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  dot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: AppColors.primary },
  loadingSubtitle: { fontSize: 13, color: AppColors.textSecondary },

  resultScroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 28,
  },
  resultTitle: { fontSize: 24, fontWeight: '700', color: AppColors.textPrimary },
  savedBadge: { fontSize: 12, color: AppColors.success, fontWeight: '600' },

  scoreSection: { alignItems: 'center', marginBottom: 28 },
  scoreCircle: {
    width: 148, height: 148, borderRadius: 74, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    alignSelf: 'center', marginBottom: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  scoreNumber: { fontSize: 56, fontWeight: '800' },
  scoreUnit: { fontSize: 16, fontWeight: '600', marginBottom: 6, marginLeft: 2, alignSelf: 'flex-end' },
  categoryBadge: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  categoryText: { fontSize: 15, fontWeight: '700' },

  detailCard: {
    backgroundColor: AppColors.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: AppColors.border, marginBottom: 16,
  },
  detailCardTitle: {
    fontSize: 12, fontWeight: '700', color: AppColors.textSecondary,
    marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13, gap: 12 },
  detailIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 13, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 2 },
  detailValue: { fontSize: 13, color: AppColors.textSecondary },

  disclaimerCard: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 28,
  },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  outlineBtn: {
    flex: 1, height: 52, borderRadius: 12, borderWidth: 2,
    borderColor: AppColors.primary, alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { color: AppColors.primary, fontWeight: '700', fontSize: 15 },
  primaryBtn: {
    flex: 1, height: 52, borderRadius: 12, backgroundColor: AppColors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  homeLink: { alignItems: 'center', paddingVertical: 10 },
  homeLinkText: { fontSize: 13, color: AppColors.textSecondary },
});
