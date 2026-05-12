import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { DashboardWelcomeFilmstripData } from "../../types/api";

type DashboardWelcomeFilmstripProps = {
  payload: DashboardWelcomeFilmstripData;
  onDismiss: () => void;
};

function resolvePixelsPerSecond(scrollSpeed: string) {
  if (scrollSpeed === "slow") {
    return 24;
  }
  if (scrollSpeed === "fast") {
    return 52;
  }
  return 36;
}

export function DashboardWelcomeFilmstrip({ payload, onDismiss }: DashboardWelcomeFilmstripProps) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const items = useMemo(() => payload.items.filter((item) => item.image_url), [payload.items]);
  const cardWidth = Math.max(Math.min(width * 0.42, 220), 150);

  useEffect(() => {
    setDismissed(false);
  }, [payload.association_id]);

  useEffect(() => {
    if (!payload.enabled || !items.length || !trackWidth || dismissed) {
      translateX.stopAnimation();
      translateX.setValue(0);
      animationRef.current?.stop();
      animationRef.current = null;
      return;
    }

    const duration = Math.max((trackWidth / resolvePixelsPerSecond(payload.scroll_speed)) * 1000, 6000);
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -trackWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animationRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
      animationRef.current = null;
      translateX.stopAnimation();
      translateX.setValue(0);
    };
  }, [dismissed, items, payload.enabled, payload.scroll_speed, trackWidth, translateX]);

  useEffect(() => {
    if (!payload.enabled || dismissed) {
      return;
    }
    const timeout = setTimeout(() => {
      setDismissed(true);
      onDismiss();
    }, Math.max(payload.duration_seconds, 1) * 1000);
    return () => clearTimeout(timeout);
  }, [dismissed, onDismiss, payload.duration_seconds, payload.enabled]);

  if (!payload.enabled || !items.length || dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Association Spotlight</Text>
          <Text style={styles.title}>Welcome to your jewellery circle</Text>
        </View>
        <Pressable
          accessibilityLabel="Dismiss spotlight"
          hitSlop={10}
          onPress={() => {
            setDismissed(true);
            onDismiss();
          }}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.viewport}>
        <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
          <View
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            style={styles.sequence}
          >
            {items.map((item) => (
              <View key={item.id} style={[styles.card, { width: cardWidth }]}>
                <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
                <View style={styles.overlay}>
                  {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
                  {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.sequence}>
            {items.map((item, index) => (
              <View key={`${item.id}-${index}-duplicate`} style={[styles.card, { width: cardWidth }]}>
                <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
                <View style={styles.overlay}>
                  {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
                  {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: "#FFF9EE",
    borderWidth: 1,
    borderColor: "rgba(168, 116, 32, 0.18)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    fontSize: 11,
    color: "#A07017",
    marginBottom: 2,
  },
  title: {
    ...typography.label,
    color: "#3C2A16",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(160, 112, 23, 0.12)",
  },
  closeButtonText: {
    fontSize: 20,
    lineHeight: 22,
    color: "#7A5212",
  },
  viewport: {
    overflow: "hidden",
    marginHorizontal: -spacing.xs,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  sequence: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
  },
  card: {
    height: 132,
    marginHorizontal: spacing.xs,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "rgba(27, 20, 11, 0.42)",
  },
  cardTitle: {
    ...typography.label,
    color: "#FFF9F1",
  },
  cardSubtitle: {
    ...typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255, 249, 241, 0.88)",
    marginTop: 2,
  },
});
