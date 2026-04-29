import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, radii, spacing } from "../../theme/tokens";

const SUPPORT_EMAIL = "support@jewelleryassociation.app";

export function HelpSupportScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.body}>
          Reach out if you need help with account access, membership profile issues, plan questions, or navigation inside the mobile app.
        </Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{SUPPORT_EMAIL}</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.primaryButtonText}>Contact Support</Text>
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  infoBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    color: colors.text,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.surface,
    textAlign: "center",
    fontWeight: "700",
  },
});
