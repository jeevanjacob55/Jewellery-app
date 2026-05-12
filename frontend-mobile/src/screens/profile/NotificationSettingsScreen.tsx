import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing } from "../../theme/tokens";
import { NotificationPreferences } from "../../types/api";

export function NotificationSettingsScreen() {
  const { updateNotificationPreferences } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const nextPreferences = await getJson<NotificationPreferences>("/me/preferences/", true);
        if (active) {
          setPreferences(nextPreferences);
        }
      } catch {
        if (active) {
          setMessage("Could not load notification settings.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!preferences) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await updateNotificationPreferences(preferences);
      setMessage("Notification preferences saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ScreenState title="Loading settings" detail="Pulling your notification preferences." loading />;
  }

  if (!preferences) {
    return <ScreenState title="Settings unavailable" detail={message ?? "Could not load notification settings."} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>Control how important alerts reach your account.</Text>

        <PreferenceRow
          label="Rate alerts"
          hint="Bullion rate updates and pricing changes."
          value={preferences.rate_alerts}
          onValueChange={(value) => setPreferences((current) => (current ? { ...current, rate_alerts: value } : current))}
        />
        <PreferenceRow
          label="News alerts"
          hint="Association notices and published updates."
          value={preferences.news_alerts}
          onValueChange={(value) => setPreferences((current) => (current ? { ...current, news_alerts: value } : current))}
        />
        <PreferenceRow
          label="Ad alerts"
          hint="Promotional placements and advertiser messages."
          value={preferences.ad_alerts}
          onValueChange={(value) => setPreferences((current) => (current ? { ...current, ad_alerts: value } : current))}
        />
        <PreferenceRow
          label="Meeting alerts"
          hint="Meeting reminders and schedule updates."
          value={preferences.meeting_alerts}
          onValueChange={(value) => setPreferences((current) => (current ? { ...current, meeting_alerts: value } : current))}
        />
        <PreferenceRow
          label="Product alerts"
          hint="New product launches you are eligible to view."
          value={preferences.product_alerts}
          onValueChange={(value) => setPreferences((current) => (current ? { ...current, product_alerts: value } : current))}
        />

        {message ? <Text style={styles.statusMessage}>{message}</Text> : null}

        <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Save preferences</Text>}
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

function PreferenceRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.text }} />
    </View>
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.mutedText,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceLabel: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  preferenceHint: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  statusMessage: {
    color: colors.mutedText,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
