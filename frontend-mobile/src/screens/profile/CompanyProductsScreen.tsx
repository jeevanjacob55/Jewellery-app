import { ScrollView, StyleSheet, Text } from "react-native";

import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";

export function CompanyProductsScreen() {
  const { me } = useSession();

  if (!me?.company) {
    return <ScreenState title="Products unavailable" detail="No linked company is available for this account." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>Manage Products</Text>
        <Text style={styles.body}>
          Product-management tools are being separated from public browsing. This screen is the mobile entry point for {me.company.name}.
        </Text>
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
});
