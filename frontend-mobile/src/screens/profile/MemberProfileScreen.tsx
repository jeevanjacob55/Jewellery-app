import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { FilterChip } from "../../components/FilterChip";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Association, Company, DistrictOperationalUnit, NotificationPreferences, RegionState } from "../../types/api";

type QuickNavigationItem = {
  id: string;
  label: string;
  hint: string;
  onPress: () => void;
};

type ActivityCardProps = {
  title: string;
  countLabel: string;
  emptyMessage: string;
};

function getInitials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "JP"
  );
}

function titleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, signOut, status, updateCurrentUser, updateNotificationPreferences, user } = useSession();
  const [regions, setRegions] = useState<RegionState[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedAssociationId, setSelectedAssociationId] = useState<number | null>(null);
  const [selectedDistrictUnitId, setSelectedDistrictUnitId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
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
    setLoadingReferenceData(true);

    async function loadReferenceData() {
      try {
        const [nextRegions, nextCompanies] = await Promise.all([
          getJson<RegionState[]>("/regions/"),
          getJson<Company[]>("/directory/companies/"),
        ]);
        if (active) {
          setRegions(nextRegions);
          setCompanies(nextCompanies);
        }
      } catch {
        if (active) {
          setProfileMessage("Unable to refresh some profile reference data right now.");
        }
      } finally {
        if (active) {
          setLoadingReferenceData(false);
        }
      }
    }

    loadReferenceData();

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
    setSelectedStateId(user.member_profile?.state?.id ?? null);
    setSelectedAssociationId(user.member_profile?.association?.id ?? null);
    setSelectedDistrictUnitId(user.member_profile?.district_operational_unit?.id ?? null);
    setSelectedUnitId(user.member_profile?.unit?.id ?? null);
    setOnboardingCompleted(Boolean(user.onboarding_completed));
    setPreferences({
      rate_alerts: Boolean(user.notification_preferences?.rate_alerts),
      news_alerts: Boolean(user.notification_preferences?.news_alerts),
      ad_alerts: Boolean(user.notification_preferences?.ad_alerts),
      meeting_alerts: Boolean(user.notification_preferences?.meeting_alerts),
    });
  }, [user]);

  const selectedState = regions.find((region) => region.id === selectedStateId) ?? null;
  const selectedAssociation = selectedState?.associations.find((association) => association.id === selectedAssociationId) ?? null;
  const selectedDistrictUnit = selectedAssociation?.district_units.find((districtUnit) => districtUnit.id === selectedDistrictUnitId) ?? null;

  const matchedCompany = useMemo(() => {
    const normalizedCompanyName = companyName.trim().toLowerCase();
    if (!normalizedCompanyName) {
      return null;
    }
    return companies.find((company) => company.name.trim().toLowerCase() === normalizedCompanyName) ?? null;
  }, [companies, companyName]);

  const displayName =
    status === "authenticated"
      ? `${user?.first_name || user?.username || ""} ${user?.last_name || ""}`.trim() || user?.username || "Member"
      : guestSession?.guest_profile.guest_name || "Guest";
  const displayRole =
    status === "authenticated"
      ? user?.roles?.find((role) => role.role)?.role
        ? titleCase(user.roles[0].role)
        : titleCase(user?.role ?? "member")
      : "Guest Access";
  const membershipLine = status === "authenticated" ? user?.member_profile?.membership_tier ?? "Member" : "Read-only session";
  const isAuthenticated = status === "authenticated";

  const quickNavigationItems: QuickNavigationItem[] = [
    { id: "home", label: "Dashboard", hint: "Rates and overview", onPress: () => navigation.navigate("Home") },
    { id: "market", label: "Market", hint: "Browse companies", onPress: () => navigation.navigate("Market") },
    { id: "news", label: "News", hint: "Published updates", onPress: () => navigation.navigate("News") },
    { id: "services", label: "Services", hint: "Compliance tools", onPress: () => navigation.navigate("Services") },
  ];

  function handleStateSelect(nextState: RegionState) {
    setSelectedStateId(nextState.id);
    setSelectedAssociationId(null);
    setSelectedDistrictUnitId(null);
    setSelectedUnitId(null);
  }

  function handleAssociationSelect(nextAssociation: Association) {
    setSelectedAssociationId(nextAssociation.id);
    setSelectedDistrictUnitId(null);
    setSelectedUnitId(null);
  }

  function handleDistrictUnitSelect(nextDistrictUnit: DistrictOperationalUnit) {
    setSelectedDistrictUnitId(nextDistrictUnit.id);
    setSelectedUnitId(null);
  }

  async function handleProfileSave() {
    if (!selectedStateId || !selectedAssociationId || !selectedDistrictUnitId || !selectedUnitId) {
      setProfileMessage("Choose a full State, Association, District Unit, and Unit path before saving.");
      return;
    }

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
          state_id: selectedStateId,
          association_id: selectedAssociationId,
          district_operational_unit_id: selectedDistrictUnitId,
          unit_id: selectedUnitId,
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
    <AppScreen scrollable safeAreaEdges={["top"]} contentContainerStyle={styles.content}>
      <AppHeader
        title={isAuthenticated ? "Profile" : "Guest Profile"}
        subtitle={isAuthenticated ? "Identity, association context, and account settings." : "Review your browsing context and region access."}
      />
      <View style={styles.body}>
        <SurfaceCard>
          <View style={styles.heroCard}>
            <View style={styles.heroWatermark}>
              <Text style={styles.heroWatermarkText}>JA</Text>
            </View>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{displayName}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{displayRole}</Text>
                </View>
                <View style={styles.membershipBadge}>
                  <Text style={styles.membershipBadgeText}>{membershipLine}</Text>
                </View>
              </View>
              <Text style={styles.heroMeta}>{isAuthenticated ? user?.email || "No email on file" : "Guest browsing access"}</Text>
              <Text style={styles.heroMeta}>
                {isAuthenticated ? user?.member_profile?.phone_number || "Phone number not added yet" : guestSession?.guest_profile.state?.name || "Region not selected"}
              </Text>
              <Text style={styles.heroMeta}>Jeweller ID: {isAuthenticated ? user?.jeweller_id || "Pending assignment" : "Guest session"}</Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Association Context</Text>
          <Text style={styles.sectionTitle}>Your hierarchy</Text>
          <View style={styles.contextGrid}>
            <InfoTile label="State" value={user?.member_profile?.state?.name || guestSession?.guest_profile.state?.name || "Not selected"} />
            <InfoTile
              label="Association"
              value={user?.member_profile?.association?.name || guestSession?.guest_profile.association?.name || "Not selected"}
            />
            <InfoTile
              label="District"
              value={user?.member_profile?.district_operational_unit?.name || guestSession?.guest_profile.district_operational_unit?.name || "Not selected"}
            />
            <InfoTile label="Unit" value={user?.member_profile?.unit?.name || guestSession?.guest_profile.unit?.name || "Not selected"} />
          </View>
        </SurfaceCard>

        {isAuthenticated ? (
          <SurfaceCard>
            <Text style={styles.sectionEyebrow}>Quick Navigation</Text>
            <Text style={styles.sectionTitle}>Move around the platform</Text>
            <View style={styles.navigationGrid}>
              {quickNavigationItems.map((item) => (
                <Pressable key={item.id} style={styles.navigationCard} onPress={item.onPress}>
                  <Text style={styles.navigationLabel}>{item.label}</Text>
                  <Text style={styles.navigationHint}>{item.hint}</Text>
                </Pressable>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        {matchedCompany ? (
          <SurfaceCard>
            <Text style={styles.sectionEyebrow}>Company</Text>
            <Text style={styles.sectionTitle}>Linked business profile</Text>
            <View style={styles.companyHeader}>
              <View style={styles.companyLogo}>
                <Text style={styles.companyLogoText}>{getInitials(matchedCompany.name)}</Text>
              </View>
              <View style={styles.companyCopy}>
                <Text style={styles.companyName}>{matchedCompany.name}</Text>
                <Text style={styles.companyMeta}>
                  {matchedCompany.city}, {matchedCompany.state}
                </Text>
              </View>
            </View>
            <View style={styles.companyStats}>
              <InfoTile label="Plan" value={matchedCompany.tier} />
              <InfoTile label="Products" value={`${matchedCompany.products.length}`} />
              <InfoTile label="Max products" value={matchedCompany.max_products ? `${matchedCompany.max_products}` : "Plan based"} />
            </View>
            <View style={styles.inlineActions}>
              <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CompanyProfile", { companyId: matchedCompany.id })}>
                <Text style={styles.secondaryButtonText}>My Company Profile</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("ProductSearch", { companyId: matchedCompany.id })}>
                <Text style={styles.primaryButtonText}>Manage Products</Text>
              </Pressable>
            </View>
          </SurfaceCard>
        ) : companyName.trim() ? (
          <SurfaceCard>
            <Text style={styles.sectionEyebrow}>Company</Text>
            <Text style={styles.sectionTitle}>Linked business profile</Text>
            <Text style={styles.supportText}>{companyName.trim()}</Text>
            <Text style={styles.subtleText}>A public company profile has not been matched yet, so plan and product details will appear after the company listing is available.</Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Your Activity</Text>
          <Text style={styles.sectionTitle}>Saved items</Text>
          <View style={styles.activityGrid}>
            <ActivityCard title="Wishlist Products" countLabel="0 saved" emptyMessage="No saved products yet" />
            <ActivityCard title="Bookmarked News" countLabel="0 saved" emptyMessage="No bookmarked news" />
          </View>
          <Text style={styles.subtleText}>Wishlist and bookmarked news are not wired in this build yet, so these stay as placeholders until those modules are added.</Text>
        </SurfaceCard>

        {isAuthenticated ? (
          <>
            <SurfaceCard>
              <Pressable style={styles.expandHeader} onPress={() => setShowEditProfile((current) => !current)}>
                <View>
                  <Text style={styles.sectionEyebrow}>Edit Profile</Text>
                  <Text style={styles.sectionTitle}>Update member details</Text>
                </View>
                <Text style={styles.expandLabel}>{showEditProfile ? "Hide" : "Show"}</Text>
              </Pressable>

              {showEditProfile ? (
                <>
                  {loadingReferenceData ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}

                  <Text style={styles.label}>First name</Text>
                  <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" style={styles.input} />

                  <Text style={styles.label}>Last name</Text>
                  <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" style={styles.input} />

                  <Text style={styles.label}>Email</Text>
                  <TextInput value={email} onChangeText={setEmail} placeholder="member@example.com" autoCapitalize="none" style={styles.input} />

                  <Text style={styles.label}>Corporate email</Text>
                  <TextInput value={corporateEmail} onChangeText={setCorporateEmail} placeholder="company@example.com" autoCapitalize="none" style={styles.input} />

                  <Text style={styles.label}>Company name</Text>
                  <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Business name" style={styles.input} />

                  <Text style={styles.label}>Phone number</Text>
                  <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" style={styles.input} />

                  <Text style={styles.label}>State</Text>
                  {regions.length ? (
                    <View style={styles.chipWrap}>
                      {regions.map((region) => (
                        <FilterChip key={region.id} label={region.name} selected={region.id === selectedStateId} onPress={() => handleStateSelect(region)} />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.subtleText}>Region choices are unavailable right now.</Text>
                  )}

                  {selectedState?.associations.length ? (
                    <>
                      <Text style={styles.label}>Association</Text>
                      <View style={styles.chipWrap}>
                        {selectedState.associations.map((association) => (
                          <FilterChip
                            key={association.id}
                            label={association.name}
                            selected={association.id === selectedAssociationId}
                            onPress={() => handleAssociationSelect(association)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {selectedAssociation?.district_units.length ? (
                    <>
                      <Text style={styles.label}>District unit</Text>
                      <View style={styles.chipWrap}>
                        {selectedAssociation.district_units.map((districtUnit) => (
                          <FilterChip
                            key={districtUnit.id}
                            label={districtUnit.name}
                            selected={districtUnit.id === selectedDistrictUnitId}
                            onPress={() => handleDistrictUnitSelect(districtUnit)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {selectedDistrictUnit?.units.length ? (
                    <>
                      <Text style={styles.label}>Unit</Text>
                      <View style={styles.chipWrap}>
                        {selectedDistrictUnit.units.map((unit) => (
                          <FilterChip key={unit.id} label={unit.name} selected={unit.id === selectedUnitId} onPress={() => setSelectedUnitId(unit.id)} />
                        ))}
                      </View>
                    </>
                  ) : null}

                  <PreferenceRow label="Onboarding completed" value={onboardingCompleted} onValueChange={setOnboardingCompleted} />

                  {profileMessage ? <Text style={styles.statusMessage}>{profileMessage}</Text> : null}
                  <Pressable style={[styles.primaryButton, profileSubmitting && styles.disabledButton]} onPress={handleProfileSave} disabled={profileSubmitting}>
                    <Text style={styles.primaryButtonText}>{profileSubmitting ? "Saving..." : "Save profile details"}</Text>
                  </Pressable>
                </>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <Pressable style={styles.expandHeader} onPress={() => setShowNotificationSettings((current) => !current)}>
                <View>
                  <Text style={styles.sectionEyebrow}>Settings</Text>
                  <Text style={styles.sectionTitle}>Notification preferences</Text>
                </View>
                <Text style={styles.expandLabel}>{showNotificationSettings ? "Hide" : "Show"}</Text>
              </Pressable>

              {showNotificationSettings ? (
                <>
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
                    style={[styles.primaryButton, preferencesSubmitting && styles.disabledButton]}
                    onPress={handlePreferencesSave}
                    disabled={preferencesSubmitting}
                  >
                    <Text style={styles.primaryButtonText}>{preferencesSubmitting ? "Saving..." : "Save preferences"}</Text>
                  </Pressable>
                </>
              ) : null}
            </SurfaceCard>
          </>
        ) : null}

        <SurfaceCard>
          <Text style={styles.sectionEyebrow}>Support & Security</Text>
          <Text style={styles.sectionTitle}>{isAuthenticated ? "Account access" : "Guest session"}</Text>
          <Text style={styles.supportText}>
            {isAuthenticated
              ? "Your member account details stay editable here, while market, news, and company information remain available through the rest of the app."
              : "Guest browsing remains read-only. Sign in later if you need account-linked actions or profile controls."}
          </Text>
          <Pressable style={styles.primaryButton} onPress={signOut}>
            <Text style={styles.primaryButtonText}>{isAuthenticated ? "Log out" : "Exit guest session"}</Text>
          </Pressable>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PreferenceRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange?: (value: boolean) => void }) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceHint}>Control how this alert type reaches your account.</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.text }} />
    </View>
  );
}

function ActivityCard({ title, countLabel, emptyMessage }: ActivityCardProps) {
  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityCount}>{countLabel}</Text>
      <Text style={styles.activityEmpty}>{emptyMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: "#171411",
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: "hidden",
  },
  heroWatermark: {
    position: "absolute",
    right: -12,
    top: -8,
  },
  heroWatermarkText: {
    color: "rgba(255,255,255,0.08)",
    fontSize: 72,
    fontWeight: "800",
  },
  heroAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F4D58A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroAvatarText: {
    color: "#2D2418",
    fontSize: 24,
    fontWeight: "800",
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: "#FFF8EE",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: "#FFF4DA",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  membershipBadge: {
    borderRadius: 999,
    backgroundColor: "#F4D58A",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  membershipBadgeText: {
    color: "#3F321D",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  heroMeta: {
    color: "rgba(255,248,238,0.82)",
    fontSize: 14,
    lineHeight: 21,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: "#8A6400",
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  contextGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoTile: {
    width: "48%",
    backgroundColor: "#FBF8F2",
    borderWidth: 1,
    borderColor: "#EEE5D7",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  infoLabel: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  navigationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  navigationCard: {
    width: "48%",
    backgroundColor: "#FBF8F2",
    borderWidth: 1,
    borderColor: "#EEE5D7",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  navigationLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  navigationHint: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  companyLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F4D58A",
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: {
    color: "#2D2418",
    fontSize: 18,
    fontWeight: "800",
  },
  companyCopy: {
    flex: 1,
  },
  companyName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  companyMeta: {
    color: colors.mutedText,
  },
  companyStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inlineActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FBF8F2",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#E9DDC9",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  activityGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  activityCard: {
    flex: 1,
    backgroundColor: "#FBF8F2",
    borderWidth: 1,
    borderColor: "#EEE5D7",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  activityCount: {
    color: "#8A6400",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  activityEmpty: {
    color: colors.mutedText,
    lineHeight: 20,
  },
  subtleText: {
    color: colors.mutedText,
    lineHeight: 21,
  },
  expandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandLabel: {
    color: "#8A6400",
    fontWeight: "700",
  },
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
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  loader: {
    marginVertical: spacing.md,
  },
  statusMessage: {
    color: colors.mutedText,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  supportText: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
