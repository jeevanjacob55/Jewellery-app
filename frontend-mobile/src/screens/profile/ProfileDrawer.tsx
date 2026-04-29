import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing } from "../../theme/tokens";

export type DrawerAction = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  badge?: number;
  highlight?: boolean;
  external?: boolean;
};

export type DrawerSection = {
  key: string;
  title: string;
  items: DrawerAction[];
};

type ProfileDrawerProps = {
  visible: boolean;
  loading?: boolean;
  error?: string | null;
  displayName: string;
  displayRole: string;
  initials: string;
  avatarUri?: string | null;
  sections: DrawerSection[];
  footerAction: DrawerAction | null;
  onClose: () => void;
  onHeaderPress: () => void;
  onRetry?: () => void;
};

const DRAWER_WIDTH = 320;

export function ProfileDrawer({
  visible,
  loading = false,
  error = null,
  displayName,
  displayRole,
  initials,
  avatarUri,
  sections,
  footerAction,
  onClose,
  onHeaderPress,
  onRetry,
}: ProfileDrawerProps) {
  const insets = useSafeAreaInsets();
  const animation = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(animation, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [animation, visible]);

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28],
  });
  const panelTranslateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const sectionContent = useMemo(() => {
    if (loading) {
      return <DrawerSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Could not load account options.</Text>
          {onRetry ? (
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return sections.map((section) => (
      <View key={section.key} style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionItems}>
          {section.items.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.itemRow, item.highlight && styles.itemRowHighlight]}
              onPress={item.onPress}
            >
              <View style={styles.itemLeft}>
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={item.highlight ? "#D97706" : "#636363"}
                />
                <Text style={[styles.itemLabel, item.highlight && styles.itemLabelHighlight]}>{item.label}</Text>
              </View>
              <View style={styles.itemRight}>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                {item.external ? <MaterialIcons name="open-in-new" size={17} color="#D97706" /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    ));
  }, [error, loading, onRetry, sections]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              paddingTop: Math.max(insets.top, spacing.lg),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              transform: [{ translateX: panelTranslateX }],
            },
          ]}
        >
          <Pressable style={styles.header} onPress={onHeaderPress}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerRole}>{displayRole}</Text>
            </View>
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sectionContent}
          </ScrollView>

          {footerAction ? (
            <View style={styles.footer}>
              <Pressable
                style={[
                  styles.footerButton,
                  footerAction.key === "logout" ? styles.footerButtonDanger : styles.footerButtonNeutral,
                ]}
                onPress={footerAction.onPress}
              >
                <MaterialIcons
                  name={footerAction.icon}
                  size={22}
                  color={footerAction.key === "logout" ? "#BA1A1A" : colors.text}
                />
                <Text
                  style={[
                    styles.footerButtonText,
                    footerAction.key === "logout" ? styles.footerButtonTextDanger : null,
                  ]}
                >
                  {footerAction.label}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((section) => (
        <View key={section} style={styles.skeletonSection}>
          <View style={styles.skeletonHeading} />
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonLine} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  panel: {
    width: DRAWER_WIDTH,
    maxWidth: "86%",
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: "#EEE7E7",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 18,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECEC",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ECE7E7",
    borderWidth: 1,
    borderColor: "#D8D0D1",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  headerCopy: {
    flex: 1,
  },
  headerName: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  headerRole: {
    color: "#8B6716",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 28,
  },
  sectionWrap: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.sm,
    color: "#838484",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionItems: {
    gap: 2,
  },
  itemRow: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemRowHighlight: {
    backgroundColor: "#FBF6EE",
    borderRightWidth: 3,
    borderRightColor: "#D97706",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  itemLabel: {
    color: "#5F5F5F",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  itemLabelHighlight: {
    color: "#D97706",
    fontWeight: "700",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    minWidth: 24,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: "center",
  },
  badgeText: {
    color: "#9A6700",
    fontSize: 10,
    fontWeight: "800",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#F1ECEC",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  footerButton: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footerButtonDanger: {
    backgroundColor: "rgba(255, 218, 214, 0.28)",
  },
  footerButtonNeutral: {
    backgroundColor: "#F5F5F5",
  },
  footerButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  footerButtonTextDanger: {
    color: "#BA1A1A",
  },
  skeletonWrap: {
    gap: 28,
  },
  skeletonSection: {
    gap: spacing.sm,
  },
  skeletonHeading: {
    width: 90,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ECE7E7",
    marginLeft: spacing.sm,
  },
  skeletonRow: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF8F8",
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECE7E7",
  },
  skeletonLine: {
    width: 160,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ECE7E7",
  },
  errorState: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "flex-start",
  },
  errorTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
