import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CoverImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Top-crop cover" for portrait screenshots: RN's Image has no `objectPosition`, so
 * resizeMode="cover" center-crops. This anchors the crop to the top instead by measuring the
 * image's natural aspect ratio on load and absolutely positioning it flush with the top of a
 * fixed-height, overflow-hidden container. Before the first load, it falls back to a normal
 * centered cover fill so there's no blank flash.
 */
export function CoverImage({ uri, style }: CoverImageProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={aspectRatio ? [styles.topAnchored, { aspectRatio }] : styles.fill}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width && height) setAspectRatio(width / height);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  topAnchored: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
});
