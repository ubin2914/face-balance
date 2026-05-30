import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const OVAL_W = W * 0.70;
const OVAL_H = H * 0.50;
const TOP_H = H * 0.14;
const SIDE_W = (W - OVAL_W) / 2;
const BOTTOM_H = H - TOP_H - OVAL_H;
const OVERLAY = 'rgba(0,0,0,0.52)';

export function GuideFrame() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.block, { width: W, height: TOP_H }]} />
      <View style={{ flexDirection: 'row', height: OVAL_H }}>
        <View style={[styles.block, { width: SIDE_W }]} />
        <View style={styles.oval} />
        <View style={[styles.block, { width: SIDE_W }]} />
      </View>
      <View style={[styles.block, { width: W, height: BOTTOM_H, justifyContent: 'flex-start', paddingTop: 18 }]}>
        <Text style={styles.guideText}>얼굴을 타원 안에 맞춰주세요</Text>
        <Text style={styles.subText}>정면을 바라보며 자연스럽게 유지해 주세요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: OVERLAY,
  },
  oval: {
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(167,139,250,0.95)',
  },
  guideText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  subText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
    marginTop: 4,
  },
});
