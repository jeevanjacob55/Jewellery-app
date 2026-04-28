import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { colors, spacing } from "../theme/tokens";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

export function AppHeader({ title, subtitle, left, right, centered = false, style, titleStyle, subtitleStyle }: AppHeaderProps) {
  if (centered) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.sideSlot}>{left}</View>
        <View style={[styles.copy, styles.copyCentered]}>
          <Text style={[styles.title, styles.textCentered, titleStyle]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, styles.textCentered, subtitleStyle]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.sideSlot}>{right}</View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {left ? <View style={styles.inlineSlot}>{left}</View> : null}
      <View style={styles.copy}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.inlineSlot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sideSlot: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  copyCentered: {
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  textCentered: {
    textAlign: "center",
  },
});
