import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

const GUIDELINES = [
  { icon: '☀️', text: '밝은 조명 아래에서 사용하세요' },
  { icon: '👓', text: '안경, 모자, 마스크를 벗어주세요' },
  { icon: '🙂', text: '카메라를 바라보며 정면을 유지하세요' },
  { icon: '📱', text: '머리를 바르게 세워 주세요' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>⚖️</Text>
          </View>
          <Text style={styles.appTitle}>Face Balance</Text>
          <Text style={styles.appSubtitle}>얼굴 좌우 균형을 간단히 확인하세요</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>측정 전 확인사항</Text>
          {GUIDELINES.map((g) => (
            <View key={g.text} style={styles.guideRow}>
              <Text style={styles.guideIcon}>{g.icon}</Text>
              <Text style={styles.guideText}>{g.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/camera')}
          activeOpacity={0.85}>
          <Text style={styles.startBtnText}>얼굴 균형 측정 시작</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ⚠️ 이 앱은 의료 진단용이 아닌 참고용입니다
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: AppColors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: AppColors.primaryBorder,
  },
  logoEmoji: {
    fontSize: 38,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.primarySurface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.primaryBorder,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
    marginBottom: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    gap: 10,
  },
  guideIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  guideText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  startBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
