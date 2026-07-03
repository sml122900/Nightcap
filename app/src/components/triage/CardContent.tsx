import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Capture } from '../../types/capture';

interface CardContentProps {
  item: Capture;
}

/** Static (non-animated) card body: thumb skeleton + meta. Shared by the live card and the exit-flight ghost. */
export function CardContent({ item }: CardContentProps) {
  return (
    <>
      {item.kind === 'drm' ? (
        <View style={styles.drm}>
          <Text style={styles.drmTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.drmNote}>화면 캡처 제한 콘텐츠 · 작품 정보로 저장됨</Text>
        </View>
      ) : (
        <View style={styles.thumb}>
          <View style={styles.appChip}>
            <Text style={styles.appChipText}>{item.app}</Text>
          </View>
          {item.time ? (
            <View style={styles.timeChip}>
              <Text style={styles.timeChipText}>{item.time}</Text>
            </View>
          ) : null}
          {item.kind === 'video' ? (
            <>
              <View style={styles.avatar} />
              <View style={[styles.skLine, styles.w80]} />
              <View style={[styles.skLine, styles.w40, { marginTop: 8 }]} />
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: item.progress ?? '40%' }]} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.skLine, styles.w80, { marginTop: 0 }]} />
              <View style={[styles.skLine, { marginTop: 8 }]} />
              <View style={[styles.skLine, styles.w60, { marginTop: 8 }]} />
              <View style={[styles.skLine, styles.w40, { marginTop: 8 }]} />
            </>
          )}
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.ttl} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={styles.src} numberOfLines={1}>
          {item.app} · {item.src}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    flex: 1,
    backgroundColor: tokens.surface2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    justifyContent: 'flex-end',
    padding: 18,
    overflow: 'hidden',
  },
  drm: {
    flex: 1,
    backgroundColor: tokens.surface2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  drmTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: tokens.text,
    textAlign: 'center',
  },
  drmNote: {
    fontSize: 12,
    color: tokens.text3,
  },
  appChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  appChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.text,
  },
  timeChip: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text2,
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tokens.surface3,
    marginBottom: 10,
  },
  skLine: {
    height: 9,
    borderRadius: 5,
    backgroundColor: tokens.surface3,
  },
  w80: { width: '80%' },
  w60: { width: '60%' },
  w40: { width: '40%' },
  progressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  meta: {
    padding: 18,
    paddingTop: 16,
  },
  ttl: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
    color: tokens.text,
  },
  src: {
    marginTop: 5,
    fontSize: 12.5,
    color: tokens.text3,
    letterSpacing: -0.1,
  },
});
