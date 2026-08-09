import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import { useCinema } from '../../theme/ThemeProvider';
import { Capture } from '../../types/capture';
import { CoverImage } from '../common/CoverImage';

interface CardContentProps {
  item: Capture;
  /** DRM cards have no image — the user types the title in directly (PROJECT.md §3.4/§5). */
  onTitleChange?: (id: string, title: string) => void;
}

/** Static (non-animated) card body: thumb skeleton + meta. Shared by the live card and the exit-flight ghost. */
export function CardContent({ item, onTitleChange }: CardContentProps) {
  const styles = useStyles('cinema');
  const theme = useCinema();
  return (
    <>
      {item.kind === 'drm' ? (
        <View style={styles.drm}>
          <TextInput
            style={styles.drmInput}
            value={item.title}
            onChangeText={(text) => onTitleChange?.(item.id, text)}
            placeholder="작품 제목을 입력하세요"
            placeholderTextColor={theme.c.textTertiary}
            multiline
            numberOfLines={2}
            textAlign="center"
          />
          <Text style={styles.drmNote}>화면 캡처 제한 콘텐츠 · 작품 정보로 저장됨</Text>
        </View>
      ) : (
        <View style={styles.thumb}>
          {item.imageUri ? (
            <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} backgroundColor={theme.c.bg} />
          ) : null}
          <View style={styles.appChip}>
            <Text style={styles.appChipText}>{item.app}</Text>
          </View>
          {item.time ? (
            <View style={styles.timeChip}>
              <Text style={styles.timeChipText}>{item.time}</Text>
            </View>
          ) : null}
          {!item.imageUri && item.kind === 'video' ? (
            <>
              <View style={styles.avatar} />
              <View style={[styles.skLine, styles.w80]} />
              <View style={[styles.skLine, styles.w40, { marginTop: 8 }]} />
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: item.progress ?? '40%' }]} />
              </View>
            </>
          ) : null}
          {!item.imageUri && item.kind !== 'video' ? (
            <Text style={styles.textKindTitle} numberOfLines={4}>
              {item.title}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.ttl} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={styles.src} numberOfLines={1}>
          {item.app} · {item.src}
        </Text>
        {/* The clipboard merge is invisible otherwise — the user has to see when it fires to
            learn the rule "링크 복사해두고 스샷 찍으면 붙는다" (W3-3 C). */}
        {item.hasLink ? (
          <View style={styles.linkChip}>
            <Text style={styles.linkChipText}>🔗 링크 포함</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  thumb: {
    flex: 1,
    backgroundColor: t.c.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: t.c.border,
    justifyContent: 'flex-end',
    padding: 18,
    overflow: 'hidden',
  },
  drm: {
    flex: 1,
    backgroundColor: t.c.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: t.c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  drmInput: {
    width: '100%',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: t.c.textPrimary,
    padding: 0,
  },
  drmNote: {
    fontSize: 12,
    color: t.c.textTertiary,
  },
  appChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: t.c.imageScrim,
    borderWidth: 1,
    borderColor: t.c.control,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.chip,
  },
  appChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.c.textPrimary,
  },
  timeChip: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: t.c.imageScrimSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: t.radius.chip,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: t.c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: t.c.border,
    marginBottom: 10,
  },
  skLine: {
    height: 9,
    borderRadius: 5,
    backgroundColor: t.c.border,
  },
  w80: { width: '80%' },
  w40: { width: '40%' },
  textKindTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: t.c.control,
  },
  progressFill: {
    height: '100%',
    backgroundColor: t.c.onImage,
    borderRadius: 2,
  },
  meta: {
    padding: 18,
    paddingTop: t.space.lg,
  },
  ttl: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
    color: t.c.textPrimary,
  },
  src: {
    marginTop: 5,
    fontSize: 12.5,
    color: t.c.textTertiary,
    letterSpacing: -0.1,
  },
  linkChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.chip,
    backgroundColor: t.c.accentMuted,
  },
  linkChipText: {
    ...t.type.caption,
    fontWeight: '700',
    color: t.c.accent,
  },
}));
