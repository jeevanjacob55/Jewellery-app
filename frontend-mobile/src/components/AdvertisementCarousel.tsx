import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { colors, spacing } from "../theme/tokens";
import { AdvertisementItem } from "../types/api";

type AdvertisementCarouselProps = {
  advertisements: AdvertisementItem[];
  onPress: (advertisement: AdvertisementItem) => void;
  onVisible: (advertisement: AdvertisementItem) => void;
};

const AUTO_ADVANCE_MS = 4000;

export function AdvertisementCarousel({ advertisements, onPress, onVisible }: AdvertisementCarouselProps) {
  const listRef = useRef<FlatList<AdvertisementItem> | null>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const cardWidth = useMemo(() => Math.max(width - 32, 280), [width]);

  useEffect(() => {
    setActiveIndex(0);
  }, [advertisements.length]);

  useEffect(() => {
    const activeAdvertisement = advertisements[activeIndex];
    if (activeAdvertisement) {
      onVisible(activeAdvertisement);
    }
  }, [activeIndex, advertisements, onVisible]);

  useEffect(() => {
    if (advertisements.length < 2 || isUserInteracting) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % advertisements.length;
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [advertisements.length, isUserInteracting]);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(Math.max(0, Math.min(nextIndex, advertisements.length - 1)));
    setIsUserInteracting(false);
  }

  if (!advertisements.length) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <FlatList
        ref={listRef}
        data={advertisements}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={cardWidth}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => setIsUserInteracting(true)}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, { width: cardWidth, backgroundColor: item.background_color || "#92400E" }]} onPress={() => onPress(item)}>
            {item.image_url ? (
              <ImageBackground source={{ uri: item.image_url }} style={styles.backgroundImage} imageStyle={styles.backgroundImageRadius}>
                <View style={styles.overlay}>
                  <Text style={styles.tag}>{item.label}</Text>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
              </ImageBackground>
            ) : (
              <>
                <View style={styles.glow} />
                <Text style={styles.tag}>{item.label}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </>
            )}
          </Pressable>
        )}
      />

      <View style={styles.dotRow}>
        {advertisements.map((advertisement, index) => (
          <View key={advertisement.id} style={[styles.dot, index === activeIndex && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingRight: 0,
  },
  card: {
    minHeight: 150,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  backgroundImage: {
    minHeight: 150,
    justifyContent: "flex-end",
  },
  backgroundImageRadius: {
    borderRadius: 14,
  },
  overlay: {
    minHeight: 150,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: "rgba(17, 24, 39, 0.38)",
  },
  glow: {
    position: "absolute",
    top: -12,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: "rgba(251,191,36,0.18)",
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#D97706",
    color: colors.surface,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  title: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
    lineHeight: 24,
  },
  description: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 250,
  },
  dotRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 12,
    paddingLeft: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(146,64,14,0.28)",
  },
  activeDot: {
    width: 16,
    backgroundColor: "#92400E",
  },
});
