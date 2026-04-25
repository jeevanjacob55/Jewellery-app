import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from "react-native";

import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";

export function MemberProfileScreen() {
  const { guestSession, signOut, status, user } = useSession();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeading>{status === "authenticated" ? "Member Profile" : "Guest Profile"}</SectionHeading>

      <SurfaceCard>
        <Text style={styles.title}>
          {status === "authenticated"
            ? `${user?.first_name || user?.username} ${user?.last_name || ""}`.trim()
            : guestSession?.guest_profile.guest_name || "Guest"}
        </Text>
        <Text style={styles.meta}>
          {status === "authenticated" ? user?.member_profile?.membership_tier ?? "Member" : "Guest browsing access"}
        </Text>
        <Text style={styles.meta}>Jeweller ID: {user?.jeweller_id ?? "Guest session"}</Text>
        <Text style={styles.meta}>
          Region: {user?.member_profile?.state_name || guestSession?.guest_profile.state || "Not selected"}
        </Text>
        <Text style={styles.meta}>
          Chapter: {user?.member_profile?.local_chapter_name || guestSession?.guest_profile.district || "Not selected"}
        </Text>
      </SurfaceCard>

      {status === "authenticated" ? (
        <SurfaceCard>
          <Text style={styles.title}>Notification preferences</Text>
          <PreferenceRow label="Rate alerts" value={Boolean(user?.notification_preferences?.rate_alerts)} />
          <PreferenceRow label="News alerts" value={Boolean(user?.notification_preferences?.news_alerts)} />
          <PreferenceRow label="Ad alerts" value={Boolean(user?.notification_preferences?.ad_alerts)} />
          <PreferenceRow label="Meeting alerts" value={Boolean(user?.notification_preferences?.meeting_alerts)} />
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.title}>Support & security</Text>
        <Text style={styles.meta}>Profile update endpoints are not wired yet on the backend, so this screen is read-only for now.</Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>{status === "authenticated" ? "Log out" : "Exit guest session"}</Text>
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

function PreferenceRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.meta}>{label}</Text>
      <Switch value={value} trackColor={{ true: colors.text }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  meta: { color: colors.mutedText, marginBottom: spacing.xs, flex: 1 },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  button: {
    backgroundColor: colors.text,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "700",
    textAlign: "center",
  },
});
