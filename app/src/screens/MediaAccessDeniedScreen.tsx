import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';

/** Shown instead of the triage deck when MediaLibrary permission is denied (PROJECT.md W3-1 §1). */
export function MediaAccessDeniedScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.title}>사진 접근 권한이 필요해요</Text>
        <Text style={styles.desc}>
          스크린샷을 스택에 담아 정리하려면 사진 라이브러리 접근을 허용해야 해요.{'\n'}설정에서 권한을
          켜고 다시 돌아와 주세요.
        </Text>
        <Pressable
          onPress={() => Linking.openSettings()}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="설정 열기"
        >
          <Text style={styles.buttonText}>설정 열기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: tokens.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text2,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.brand,
  },
  buttonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0b0b0d',
  },
});
