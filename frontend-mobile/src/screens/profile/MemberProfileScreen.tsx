import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { getJson } from "../../api/client";
import { FilterChip } from "../../components/FilterChip";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { NotificationPreferences, RegionState } from "../../types/api";

export function MemberProfileScreen() {
  const { guestSession, signOut, status, updateCurrentUser, updateNotificationPreferences, user } = useSession();
  const [regions, setRegions] = useState<RegionState[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    rate_alerts: false,
    news_alerts: false,
    ad_alerts: false,
    meeting_alerts: false,
  });

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let active = true;
    setLoadingRegions(true);

    async function loadRegions() {
      try {
        const nextRegions = await getJson<RegionState[]>("/regions/");
        if (active) {
          setRegions(nextRegions);
        }
      } catch {
        if (active) {
          setProfileMessage("Unable to refresh region choices right now.");
        }
      } finally {
        if (active) {
          setLoadingRegions(false);
        }
      }
    }

    loadRegions();

    return () => {
      active = false;
    };
  }, [status]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setEmail(user.email ?? "");
    setCorporateEmail(user.corporate_email ?? "");
    setCompanyName(user.member_profile?.company_name ?? "");
    setPhoneNumber(user.member_profile?.phone_number ?? "");
    setStateName(user.member_profile?.state_name ?? "");
    setDistrictName(user.member_profile?.district_name ?? "");
    setChapterName(user.member_profile?.local_chapter_name ?? "");
    setOnboardingCompleted(Boolean(user.onboarding_completed));
    setPreferences({
      rate_alerts: Boolean(user.notification_preferences?.rate_alerts),
      news_alerts: Boolean(user.notification_preferences?.news_alerts),
      ad_alerts: Boolean(user.notification_preferences?.ad_alerts),
      meeting_alerts: Boolean(user.notification_preferences?.meeting_alerts),
    });
  }, [user]);

  const selectedState = regions.find((region) => region.name === stateName) ?? null;
  const selectedDistrict = selectedState?.districts.find((district) => district.name === districtName) ?? null;

  function handleStateSelect(nextState: RegionState) {
    const nextDistrict = nextState.districts[0] ?? null;
    const nextChapter = nextDistrict?.chapters[0]?.name ?? "";
    setStateName(nextState.name);
    setDistrictName(nextDistrict?.name ?? "");
    setChapterName(nextChapter);
  }

  function handleDistrictSelect(nextDistrictName: string) {
    const nextDistrict = selectedState?.districts.find((district) => district.name === nextDistrictName) ?? null;
    const nextChapter = nextDistrict?.chapters[0]?.name ?? "";
    setDistrictName(nextDistrictName);
    setChapterName(nextChapter);
  }

  async function handleProfileSave() {
    setProfileSubmitting(true);
    setProfileMessage(null);
    try {
      await updateCurrentUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        corporate_email: corporateEmail.trim(),
        onboarding_completed: onboardingCompleted,
        member_profile: {
          phone_number: phoneNumber.trim(),
          company_name: companyName.trim(),
          state_name: stateName,
          district_name: districtName,
          local_chapter_name: chapterName,
        },
      });
      setProfileMessage("Profile details saved.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save profile details.");
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handlePreferencesSave() {
    setPreferencesSubmitting(true);
    setPreferencesMessage(null);
    try {
      await updateNotificationPreferences(preferences);
      setPreferencesMessage("Notification preferences saved.");
    } catch (error) {
      setPreferencesMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    } finally {
      setPreferencesSubmitting(false);
    }
  }

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
        <>
          <SurfaceCard>
            <Text style={styles.title}>Member details</Text>
            <Text style={styles.label}>First name</Text>
            <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" style={styles.input} />

            <Text style={styles.label}>Last name</Text>
            <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" style={styles.input} />

            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="member@example.com" autoCapitalize="none" style={styles.input} />

            <Text style={styles.label}>Corporate email</Text>
            <TextInput
              value={corporateEmail}
              onChangeText={setCorporateEmail}
              placeholder="company@example.com"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Company name</Text>
            <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Business name" style={styles.input} />

            <Text style={styles.label}>Phone number</Text>
            <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" style={styles.input} />

            <Text style={styles.label}>Jeweller ID</Text>
            <Text style={styles.readOnlyValue}>{user?.jeweller_id || "Not assigned"}</Text>

            <Text style={styles.label}>Membership tier</Text>
            <Text style={styles.readOnlyValue}>{user?.member_profile?.membership_tier ?? "Member"}</Text>

            <PreferenceRow label="Onboarding completed" value={onboardingCompleted} onValueChange={setOnboardingCompleted} />

            <Text style={styles.label}>State</Text>
            {loadingRegions ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}
            {regions.length ? (
              <View style={styles.chipWrap}>
                {regions.map((region) => (
                  <FilterChip
                    key={region.id}
                    label={region.name}
                    selected={region.name === stateName}
                    onPress={() => handleStateSelect(region)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>Region data is not seeded yet, so saved region fields stay as-is until choices are available.</Text>
            )}

            {selectedState?.districts.length ? (
              <>
                <Text style={styles.label}>District</Text>
                <View style={styles.chipWrap}>
                  {selectedState.districts.map((district) => (
                    <FilterChip
                      key={district.id}
                      label={district.name}
                      selected={district.name === districtName}
                      onPress={() => handleDistrictSelect(district.name)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {selectedDistrict?.chapters.length ? (
              <>
                <Text style={styles.label}>Local chapter</Text>
                <View style={styles.chipWrap}>
                  {selectedDistrict.chapters.map((chapter) => (
                    <FilterChip
                      key={chapter.id}
                      label={chapter.name}
                      selected={chapter.name === chapterName}
                      onPress={() => setChapterName(chapter.name)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {profileMessage ? <Text style={styles.statusMessage}>{profileMessage}</Text> : null}
            <Pressable style={[styles.button, profileSubmitting && styles.disabledButton]} onPress={handleProfileSave} disabled={profileSubmitting}>
              <Text style={styles.buttonText}>{profileSubmitting ? "Saving..." : "Save profile details"}</Text>
            </Pressable>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.title}>Notification preferences</Text>
            <PreferenceRow
              label="Rate alerts"
              value={preferences.rate_alerts}
              onValueChange={(value) => setPreferences((current) => ({ ...current, rate_alerts: value }))}
            />
            <PreferenceRow
              label="News alerts"
              value={preferences.news_alerts}
              onValueChange={(value) => setPreferences((current) => ({ ...current, news_alerts: value }))}
            />
            <PreferenceRow
              label="Ad alerts"
              value={preferences.ad_alerts}
              onValueChange={(value) => setPreferences((current) => ({ ...current, ad_alerts: value }))}
            />
            <PreferenceRow
              label="Meeting alerts"
              value={preferences.meeting_alerts}
              onValueChange={(value) => setPreferences((current) => ({ ...current, meeting_alerts: value }))}
            />
            {preferencesMessage ? <Text style={styles.statusMessage}>{preferencesMessage}</Text> : null}
            <Pressable
              style={[styles.button, preferencesSubmitting && styles.disabledButton]}
              onPress={handlePreferencesSave}
              disabled={preferencesSubmitting}
            >
              <Text style={styles.buttonText}>{preferencesSubmitting ? "Saving..." : "Save preferences"}</Text>
            </Pressable>
          </SurfaceCard>
        </>
      ) : null}

      <SurfaceCard>
        <Text style={styles.title}>Support & security</Text>
        <Text style={styles.meta}>
          {status === "authenticated"
            ? "Member account details and notification preferences now save back to the authenticated account."
            : "Guest browsing stays read-only and does not create a member account."}
        </Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>{status === "authenticated" ? "Log out" : "Exit guest session"}</Text>
        </Pressable>
      </SurfaceCard>
    </ScrollView>
  );
}

function PreferenceRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange?: (value: boolean) => void }) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.meta}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.text }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  label: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    ...typography.label,
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  readOnlyValue: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  meta: { color: colors.mutedText, marginBottom: spacing.xs, flex: 1 },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  hint: {
    color: colors.mutedText,
    marginTop: spacing.sm,
    ...typography.body,
  },
  statusMessage: {
    color: colors.mutedText,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: "700",
    textAlign: "center",
  },
});
