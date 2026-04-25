import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../theme/tokens";

type ScreenStateProps = {
  title: string;
  detail?: string;
  loading?: boolean;
};

export function ScreenState({ title, detail, loading = false }: ScreenStateProps) {
  return (
    <View style={styles.wrapper}>
      {loading ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  loader: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  detail: {
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
