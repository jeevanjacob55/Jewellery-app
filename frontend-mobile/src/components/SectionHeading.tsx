import { Text, StyleSheet } from "react-native";

import { colors, spacing, typography } from "../theme/tokens";

export function SectionHeading({ children }: { children: string }) {
  return <Text style={styles.heading}>{children}</Text>;
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    ...typography.sectionTitle,
    marginBottom: spacing.md,
  },
});
