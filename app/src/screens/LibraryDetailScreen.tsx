import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { HeaderButton, HeaderSpacer } from '../components/common/HeaderButton';
import { useTheme } from '../theme/ThemeProvider';
import { applyVerdict } from '../db/queries';
import { enqueueWrite } from '../db/writeQueue';
import { unlinkCapture } from '../services/clipboardLink';
import { StarRating } from '../components/common/StarRating';
import { RateModeLayer } from '../components/triage/RateModeLayer';
import { Capture } from '../types/capture';

interface LibraryDetailScreenProps {
  item: Capture & { stars: number };
  onBack: () => void;
}

/** 보관함 타일 탭 → 상세: 원본 이미지 + 별점/제목 수정 + 삭제(휴지통행). */
export function LibraryDetailScreen({ item, onBack }: LibraryDetailScreenProps) {
  const styles = useStyles();
  // The image block is a cinema surface even in light mode — a bright letterbox around a
  // screenshot fights the content (핸드오프 §1-1). Everything below it follows the theme.
  const media = useMediaStyles('cinema');
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState(item.stars);
  const [title, setTitle] = useState(item.title);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isEditingStars, setIsEditingStars] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl);

  const handleStarsCommit = (value: number) => {
    setStars(value);
    setIsEditingStars(false);
    enqueueWrite(item.id, async () => {
      await db.runAsync('UPDATE captures SET stars = ? WHERE id = ?', value, item.id);
    }).catch((err) => console.warn('[libraryDetail] stars update failed', err));
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    enqueueWrite(item.id, async () => {
      await db.runAsync('UPDATE captures SET title = ? WHERE id = ?', text, item.id);
    }).catch((err) => console.warn('[libraryDetail] title update failed', err));
  };

  const handleUnlink = () => {
    setSourceUrl(undefined);
    enqueueWrite(item.id, () => unlinkCapture(db, item.id)).catch((err) =>
      console.warn('[libraryDetail] unlink failed', err)
    );
  };

  const handleDelete = () => {
    enqueueWrite(item.id, () => applyVerdict(db, item.id, 'drop')).catch((err) =>
      console.warn('[libraryDetail] delete failed', err)
    );
    onBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.top}>
        <HeaderButton label="닫기" onPress={onBack} />
        <Text style={styles.headerTitle}>상세</Text>
        <HeaderSpacer />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {item.kind !== 'drm' && item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            resizeMode="contain"
            style={aspectRatio ? [media.image, { aspectRatio }] : media.imageFallback}
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) setAspectRatio(width / height);
            }}
          />
        ) : (
          <View style={media.noImage}>
            <Text style={media.noImageTitle} numberOfLines={4}>
              {title || '제목 없음'}
            </Text>
            {item.kind === 'drm' ? (
              <Text style={media.drmNote}>화면 캡처 제한 콘텐츠 · 작품 정보로 저장됨</Text>
            ) : null}
          </View>
        )}

        <View style={styles.meta}>
          <TextInput
            style={styles.title}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="제목을 입력하세요"
            placeholderTextColor={theme.c.textTertiary}
            multiline
          />
          <Text style={styles.src} numberOfLines={1}>
            {item.src ? `${item.app} · ${item.src}` : item.app}
          </Text>

          <Pressable
            onPress={() => setIsEditingStars(true)}
            style={styles.starRow}
            accessibilityRole="button"
            accessibilityLabel="별점 수정"
          >
            <StarRating value={stars} size="lg" surface="theme" />
            <Text style={styles.starEdit}>별점 수정</Text>
          </Pressable>

          {sourceUrl ? (
            <>
              <Pressable
                onPress={() => Linking.openURL(sourceUrl)}
                style={styles.openOriginalBtn}
                accessibilityRole="button"
                accessibilityLabel="원본 열기"
              >
                <Text style={styles.openOriginalText}>원본 열기</Text>
              </Pressable>
              {/* 클립보드 병합은 틀릴 수 있다 — 잘못 붙은 링크를 뗄 수 없으면 기능 자체가 불신됨(W3-3 C). */}
              <Pressable
                onPress={handleUnlink}
                style={styles.unlinkBtn}
                accessibilityRole="button"
                accessibilityLabel="링크 해제"
              >
                <Text style={styles.unlinkText}>링크 해제</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <Pressable onPress={handleDelete} style={styles.deleteBtn} accessibilityRole="button">
          <Text style={styles.deleteText}>삭제</Text>
        </Pressable>
      </ScrollView>

      {isEditingStars ? (
        <RateModeLayer
          item={{ ...item, title }}
          prefill={stars}
          onCommit={handleStarsCommit}
          onCancel={() => setIsEditingStars(false)}
          onBackgroundTap={() => setIsEditingStars(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  top: {
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    paddingBottom: t.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...t.type.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
  },
  body: {
    paddingHorizontal: t.space.xl,
  },
  meta: {
    marginTop: t.space.xl - 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
    color: t.c.textPrimary,
    padding: 0,
  },
  src: {
    marginTop: 6,
    ...t.type.meta,
    color: t.c.textTertiary,
  },
  starRow: {
    marginTop: t.space.xl - 4,
    paddingVertical: 14,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...t.shadow.card,
  },
  starEdit: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textSecondary,
  },
  openOriginalBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    ...t.shadow.card,
  },
  openOriginalText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.c.textPrimary,
  },
  unlinkBtn: {
    marginTop: t.space.sm,
    // Text-only control with no fill — without a floor it was a 12pt tap target (핸드오프 §5-6).
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlinkText: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textTertiary,
  },
  deleteBtn: {
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: t.radius.card,
    backgroundColor: t.c.dangerMuted,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: t.c.danger,
  },
}));

/** Cinema-pinned: the letterbox behind a screenshot stays near-black in both themes. */
const useMediaStyles = makeStyles((t) => ({
  image: {
    width: '100%',
    borderRadius: t.radius.card,
    backgroundColor: t.c.bg,
  },
  imageFallback: {
    width: '100%',
    height: 320,
    borderRadius: t.radius.card,
    backgroundColor: t.c.bg,
  },
  noImage: {
    minHeight: 220,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: t.space.xl,
  },
  noImageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  drmNote: {
    fontSize: 12,
    color: t.c.textTertiary,
  },
}));
