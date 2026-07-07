import React, { useState } from 'react';
import { Image, ImageStyle, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CoverImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Edge-anchored cover" — RN's Image has no `objectPosition`, so plain resizeMode="cover" always
 * center-crops. Portrait screenshots in a short/wide tile need the crop anchored to the TOP (crop
 * the bottom) so the subject near the top of the screenshot survives; landscape thumbnails (link
 * shares' oEmbed/og:image, docs/decisions/url-metadata-fetch.md) in the same tile shape need the
 * opposite — filled by height and anchored to CENTER horizontally (crop the sides), or a 16:9
 * image ends up shorter than the tile and just floats at the top with dead space below it.
 * Decided by comparing the loaded image's aspect ratio against the *measured* container's, so one
 * component correctly handles both screenshot tiles and link thumbnails. Before the first
 * load/layout, falls back to a normal centered cover fill so there's no blank flash.
 */
export function CoverImage({ uri, style }: CoverImageProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [containerAspectRatio, setContainerAspectRatio] = useState<number | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setContainerAspectRatio(width / height);
  };

  let imageStyle: StyleProp<ImageStyle>;
  if (imageAspectRatio === null || containerAspectRatio === null) {
    imageStyle = styles.fill;
  } else if (imageAspectRatio > containerAspectRatio) {
    // Image is relatively wider than the tile — fill height, center-crop the sides.
    imageStyle = [styles.centerAnchored, { aspectRatio: imageAspectRatio }];
  } else {
    // Image is relatively taller than the tile — fill width, top-crop the bottom.
    imageStyle = [styles.topAnchored, { aspectRatio: imageAspectRatio }];
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={imageStyle}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width && height) setImageAspectRatio(width / height);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
  centerAnchored: {
    height: '100%',
  },
});
