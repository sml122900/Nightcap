import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { applyVerdict } from '../db/queries';
import { enqueueWrite } from '../db/writeQueue';
import { RateModeLayer } from '../components/triage/RateModeLayer';
import { Capture } from '../types/capture';

interface LibraryDetailScreenProps {
  item: Capture & { stars: number };
  onBack: () => void;
}

/** 보관함 타일 탭 → 상세: 원본 이미지 + 별점/제목 수정 + 삭제(휴지통행). */
export function LibraryDetailScreen({ item, onBack }: LibraryDetailScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState(item.stars);
  const [title, setTitle] = useState(item.title);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isEditingStars, setIsEditingStars] = useState(false);

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

  const handleDelete = () => {
    enqueueWrite(item.id, () => applyVerdict(db, item.id, 'drop')).catch((err) =>
      console.warn('[libraryDetail] delete failed', err)
    );
    onBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>상세</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {item.kind !== 'drm' && item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            resizeMode="contain"
            style={aspectRatio ? [styles.image, { aspectRatio }] : styles.imageFallback}
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) setAspectRatio(width / height);
            }}
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageTitle} numberOfLines={4}>
              {title || '제목 없음'}
            </Text>
            {item.kind === 'drm' ? (
              <Text style={styles.drmNote}>화면 캡처 제한 콘텐츠 · 작품 정보로 저장됨</Text>
            ) : null}
          </View>
        )}

        <View style={styles.meta}>
          <TextInput
            style={styles.title}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="제목을 입력하세요"
            placeholderTextColor={tokens.text3}
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
            <Text style={styles.starValue}>★ {stars.toFixed(1)}</Text>
            <Text style={styles.starEdit}>별점 수정</Text>
          </Pressable>

          {item.sourceUrl ? (
            <Pressable
              onPress={() => Linking.openURL(item.sourceUrl!)}
              style={styles.openOriginalBtn}
              accessibilityRole="button"
              accessibilityLabel="원본 열기"
            >
              <Text style={styles.openOriginalText}>원본 열기</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  top: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostBtn: {
    color: tokens.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: tokens.text,
  },
  body: {
    paddingHorizontal: 24,
  },
  image: {
    width: '100%',
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
  },
  imageFallback: {
    width: '100%',
    height: 320,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
  },
  noImage: {
    minHeight: 220,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  noImageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: tokens.text,
    textAlign: 'center',
  },
  drmNote: {
    fontSize: 12,
    color: tokens.text3,
  },
  meta: {
    marginTop: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
    color: tokens.text,
    padding: 0,
  },
  src: {
    marginTop: 6,
    fontSize: 13,
    color: tokens.text3,
  },
  starRow: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starValue: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.brand,
    fontVariant: ['tabular-nums'],
  },
  starEdit: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text2,
  },
  openOriginalBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
  },
  openOriginalText: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text,
  },
  deleteBtn: {
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.dangerDim,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: tokens.danger,
  },
});
