import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";

export function PendingApprovalsScreen() {
  const { me } = useSession();

  if (!me?.user.is_admin) {
    return <ScreenState title="Access denied" detail="Pending approvals are only available to admin users." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>Pending Approvals</Text>
        <Text style={styles.body}>
          {me.counts.pending_approvals_count} approval item{me.counts.pending_approvals_count === 1 ? "" : "s"} currently need review across access requests, news, and ads.
        </Text>
      </SurfaceCard>
    </ScrollView>
  );
}

export function ManageUsersScreen() {
  return <AdminShellScreen title="Manage Users" detail="User-management tools will appear here as a dedicated mobile admin workflow." />;
}

export function ManageNewsScreen() {
  return <AdminShellScreen title="Manage News" detail="News-management and approval tools will appear here as a dedicated mobile admin workflow." />;
}

function AdminShellScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{detail}</Text>
        <View style={styles.noteBlock}>
          <Text style={styles.noteTitle}>Phase 1</Text>
          <Text style={styles.noteBody}>This route is wired into the new profile drawer so admin users have a complete navigation path on mobile.</Text>
        </View>
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
  noteBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteTitle: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noteBody: {
    color: colors.mutedText,
    lineHeight: 21,
  },
});
