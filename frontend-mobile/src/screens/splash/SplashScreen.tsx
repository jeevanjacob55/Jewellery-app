import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";

export function SplashScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>JA</Text>
      </View>
      <Text style={styles.title}>Jewellery Association</Text>
      <Text style={styles.subtitle}>Restoring your session and preparing the daily trade dashboard.</Text>
      <ActivityIndicator size="small" color={colors.text} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentGold,
    marginBottom: spacing.lg,
  },
  badgeText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  loader: {
    marginTop: spacing.lg,
  },
});
