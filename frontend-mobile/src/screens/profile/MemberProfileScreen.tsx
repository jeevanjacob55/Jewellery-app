import { useEffect, useMemo, useState } from "react";
import { Alert, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { getJson } from "../../api/client";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { Company } from "../../types/api";
import {
  ActionListItem,
  BentoScroll,
  CredentialGrid,
  Divider,
  InfoRow,
  JoinPromptCard,
  LogoutActionCard,
  MetricGrid,
  ProfileIdentityCard,
  RecentActivityCard,
  SectionCard,
  SectionHeader,
  SettingsList,
  VisualAnchorCard,
  type ProfileActionItem,
} from "./ProfileComponents";

function getInitials(value: string) {
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "GU";
}

export function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const { guestSession, me, refreshCurrentUser, signOut, status } = useSession();
  const [companyDetail, setCompanyDetail] = useState<Company | null>(null);
  const { width } = useWindowDimensions();

  const isGuest = status === "guest";
  const isAuthenticated = status === "authenticated";
  const isBooting = status === "booting";
  const hasProfile = isGuest || Boolean(me);
  const isAdmin = Boolean(me?.user.is_admin);
  const isCompanyAdmin = Boolean(me?.user.has_company && me.company && me.user.can_manage_products && !isAdmin);
  const isWide = width >= 768;

  useEffect(() => {
    let active = true;

    async function loadCompanyDetail() {
      if (!me?.company?.id || !me.user.has_company) {
        setCompanyDetail(null);
        return;
      }

      try {
        const nextCompany = await getJson<Company>(`/directory/companies/${me.company.id}/`, true);
        if (active) {
          setCompanyDetail(nextCompany);
        }
      } catch {
        if (active) {
          setCompanyDetail(null);
        }
      }
    }

    void loadCompanyDetail();

    return () => {
      active = false;
    };
  }, [me?.company?.id, me?.user.has_company]);

  const displayName = isAuthenticated ? me?.user.name || "Member" : guestSession?.guest_profile.guest_name || "Guest User";
  const displayRole = isGuest
    ? "Guest"
    : isAdmin
      ? "Super Admin"
      : isCompanyAdmin
        ? "Company Admin"
        : me?.user.role_display_name || "Member";
  const displayEmail = isAuthenticated ? me?.user.email || "Email not added" : "Email not added";
  const displayPhone = isAuthenticated ? me?.user.phone || "Phone not added" : "Phone not added";
  const associationName = isAuthenticated
    ? me?.hierarchy.association || "Association not assigned"
    : guestSession?.guest_profile.association?.name || "Association not assigned";
  const stateName = isAuthenticated ? me?.hierarchy.state || "State not assigned" : guestSession?.guest_profile.state?.name || "State not assigned";
  const unreadNotificationsCount = me?.counts.unread_notifications_count ?? 0;
  const pendingApprovalsCount = me?.counts.pending_approvals_count ?? 0;

  const companyName = companyDetail?.name ?? me?.company?.name ?? "Linked company account";
  const planName = me?.company?.plan ?? companyDetail?.tier ?? "Not assigned";
  const productCount = companyDetail ? companyDetail.products.filter((product) => product.is_active !== false).length : 0;

  const verificationItems = useMemo(() => {
    if (!companyDetail?.verification) {
      return [];
    }

    return [
      companyDetail.verification.gst_registered ? { key: "gst", label: "GIA Corporate", value: "Ref: G-882-990" } : null,
      companyDetail.verification.bis_hallmarked ? { key: "hallmark", label: "Hallmark Elite", value: "Master Status" } : null,
      companyDetail.verification.export_licensed ? { key: "ethics", label: "Ethics Compliant", value: "Certified 2024" } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  }, [companyDetail]);

  const companyToolItems: ProfileActionItem[] = [
    {
      key: "products",
      label: "Manage Products",
      icon: "inventory-2",
      description: "Open the company product management entry point.",
      onPress: () => navigation.navigate("CompanyProducts"),
      tone: "dark",
    },
    {
      key: "plan",
      label: "View Plan",
      icon: "receipt-long",
      description: "See your current company plan and upgrade availability.",
      onPress: () => navigation.navigate("CompanyPlan"),
      tone: "accent",
    },
    {
      key: "upgrade",
      label: "Upgrade Plan",
      icon: "north-east",
      description: me?.company?.upgrade_url ? "Open the current upgrade flow for your company plan." : "Upgrade link is not available yet for this company.",
      onPress: () => navigation.navigate("CompanyPlan", { openUpgradeOnMount: true }),
    },
  ];

  const adminActions: ProfileActionItem[] = [
    {
      key: "pending",
      label: "Pending Approvals",
      icon: "how-to-reg",
      value: String(pendingApprovalsCount),
      description: "Review access requests, ad approvals, and publishing queues.",
      badge: pendingApprovalsCount || undefined,
      onPress: () => navigation.navigate("PendingApprovals"),
      tone: "dark",
    },
    {
      key: "insights",
      label: "Market Insights",
      icon: "monitor",
      value: "Live",
      description: "Open exposure, hero schedule, and fairness performance metrics.",
      onPress: () => navigation.navigate("MarketInsights"),
      tone: "accent",
    },
    {
      key: "users",
      label: "Manage Users",
      icon: "group",
      value: "1.2k",
      description: "Open mobile admin user-management tools.",
      onPress: () => navigation.navigate("ManageUsers"),
    },
    {
      key: "news",
      label: "Manage News",
      icon: "edit-note",
      value: "Daily",
      description: "Open the news publishing and approval workspace.",
      onPress: () => navigation.navigate("ManageNews"),
    },
  ];

  async function handleShareProfile() {
    try {
      const message = companyDetail
        ? `${companyDetail.name}\n${companyDetail.city}, ${companyDetail.state}\nPlan: ${planName}`
        : `${displayName}\n${displayRole}`;
      await Share.share({ message });
    } catch {
      Alert.alert("Share unavailable", "Unable to open the share sheet right now.");
    }
  }

  async function handleShareCredential() {
    try {
      await Share.share({ message: `${displayName}\n${displayRole}\nAssociation: ${associationName}` });
    } catch {
      Alert.alert("Share unavailable", "Unable to open the share sheet right now.");
    }
  }

  function showComingSoon(title: string, detail: string) {
    Alert.alert(title, detail);
  }

  function confirmLogout() {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  if (isBooting) {
    return <ScreenState title="Loading profile" detail="Preparing your profile workspace." loading />;
  }

  if (!hasProfile) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Could not load profile.</Text>
          <Text style={styles.errorBody}>Try refreshing your session details and opening the profile again.</Text>
          <SettingsList
            title="Recovery"
            eyebrow="Profile State"
            items={[
              {
                key: "retry",
                label: "Retry profile load",
                icon: "refresh",
                description: "Fetch the latest account details again.",
                onPress: () => void refreshCurrentUser(),
              },
            ]}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
      <BentoScroll>{renderVariant()}</BentoScroll>
    </AppScreen>
  );

  function renderVariant() {
    if (isGuest) {
      return (
        <>
          <ProfileIdentityCard
            initials={getInitials(displayName)}
            name={displayName}
            roleLabel={displayRole}
            description="You are currently browsing as a guest. Log in to access exclusive association benefits, certifications, and market insights."
            heroStyle="split"
          />

          <JoinPromptCard
            title="Join the Association"
            description="Access member-only reports and heritage collections."
            ctaLabel="Login / Sign Up"
            onPress={() => void signOut()}
          />

          <SectionCard>
            <SectionHeader eyebrow="Current Association" title="Association Preference" actionLabel="Change Preference" onActionPress={() => showComingSoon("Change Preference", "Guest preference editing will be added in a later phase.")} />
            <InfoRow label="Selected State" value={stateName} icon="location-on" />
            <Divider />
            <InfoRow label="Association" value={associationName} icon="account-balance" />
          </SectionCard>

          <SettingsList
            title="Platform Settings"
            items={[
              {
                key: "help",
                label: "Help & Support",
                icon: "help-center",
                description: "Get help with access, browsing, or membership onboarding.",
                onPress: () => navigation.navigate("HelpSupport"),
              },
              {
                key: "about",
                label: "About Platform",
                icon: "info",
                description: "Learn what the mobile platform offers members and companies.",
                onPress: () => showComingSoon("About Platform", "An About Platform screen has not been wired into the mobile app yet."),
              },
            ]}
          />

          <VisualAnchorCard />
        </>
      );
    }

    if (isAdmin) {
      return (
        <>
          <ProfileIdentityCard
            avatarUrl={me?.user.avatar}
            initials={getInitials(displayName)}
            name={displayName}
            roleLabel={displayRole}
            subtitle="Global Director of Strategic Acquisitions"
            description={`${displayEmail} • London, UK`}
            verified
            heroStyle="split"
            actions={[
              { key: "edit", label: "Edit Profile", onPress: () => navigation.navigate("EditProfile"), tone: "dark" },
              { key: "share", label: "Share Credential", onPress: () => void handleShareCredential(), tone: "accent" },
            ]}
          />

          <SectionCard>
            <SectionHeader eyebrow="Admin Control Center" title="Operational Shortcuts" />
            <View>
              {adminActions.map((item, index) => (
                <ActionListItem key={item.key} item={item} showDivider={index > 0} />
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader eyebrow="Membership Profile" title="Member Information" />
            <InfoRow label="Full Legal Name" value={displayName} />
            <Divider />
            <InfoRow label="Association ID" value={`SA-${me?.user.id ?? 0}-LON`} />
            <Divider />
            <InfoRow label="Specialization" value="High-Value Gemstones & Rare Metals" />
            <Divider />
            <InfoRow label="Member Since" value="March 2012" />
            <Divider />
            <InfoRow label="Certification Level" value="Level 5 Master Gemologist" />
            <Divider />
            <InfoRow label="Last Active Audit" value="September 14, 2023" />
          </SectionCard>

          <MetricGrid
            items={[
              {
                label: "Global Association Value",
                value: "$4.2B",
                caption: "Gold Reserve +12.4% • Active Contracts 2,481",
                tone: "dark",
              },
            ]}
          />

          <CredentialGrid
            title="Verified Authenticity"
            items={[
              { key: "diamond", label: "Diamond Expert", value: "Executive credential" },
              { key: "custody", label: "Safe Custody", value: "Operational access" },
              { key: "legal", label: "Legal Counsel", value: "Policy-backed authority" },
            ]}
          />

          <RecentActivityCard
            items={[
              { key: "a1", title: "Approved 'VVS-1' Membership", time: "2 hours ago", accent: true },
              { key: "a2", title: "Updated Gold Market Index", time: "5 hours ago" },
            ]}
          />

          <SettingsList
            title="Admin Settings"
            items={[
              {
                key: "notifications",
                label: "Notification Settings",
                icon: "notifications-active",
                description: "Tune how approvals, news, meetings, and alerts reach you.",
                onPress: () => navigation.navigate("NotificationSettings"),
              },
              {
                key: "help",
                label: "Help & Support",
                icon: "help",
                description: "Reach support for account or platform issues.",
                onPress: () => navigation.navigate("HelpSupport"),
              },
            ]}
          />

          <LogoutActionCard label="Logout from Account" onPress={confirmLogout} />
        </>
      );
    }

    if (isCompanyAdmin) {
      return (
        <>
          <ProfileIdentityCard
            avatarUrl={me?.user.avatar}
            initials={getInitials(displayName)}
            name={displayName}
            roleLabel={displayRole}
            subtitle={`Senior Director of Operations at ${companyName}`}
            description={`Member since Oct 2018${me?.user.id ? ` - ID: JA-${me.user.id}` : ""}`}
            verified
            heroStyle="split"
            actions={[
              { key: "edit", label: "Edit Profile", onPress: () => navigation.navigate("EditProfile"), tone: "dark" },
              { key: "share", label: "Share Profile", onPress: () => void handleShareProfile() },
            ]}
          />

          <SectionCard>
            <SectionHeader eyebrow="Organization Details" title={companyName} />
            <View style={styles.planChipRow}>
              <View style={styles.planChip}>
                <Text style={styles.planChipLabel}>Plan Type</Text>
                <Text style={styles.planChipValue}>{planName}</Text>
              </View>
              <MaterialIcons name="diamond" size={34} color="#775A19" />
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Marketplace Status</Text>
                <Text style={styles.summaryValue}>{companyDetail?.is_approved === false ? "Pending" : "Active"}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Inventory Assets</Text>
                <Text style={styles.summaryValue}>{productCount} Items</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Active Associates</Text>
                <Text style={styles.summaryValue}>12 Members</Text>
              </View>
            </View>

            <View style={styles.toolList}>
              {companyToolItems.map((item) => (
                <ActionListItem key={item.key} item={item} />
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader eyebrow="Personal Information" title="Account Contact" />
            <InfoRow label="Email Address" value={displayEmail} />
            <Divider />
            <InfoRow label="Phone Number" value={displayPhone} />
            <Divider />
            <InfoRow label="Location" value={companyDetail ? `${companyDetail.city}, ${companyDetail.state}` : stateName} />
            <Divider />
            <InfoRow label="Timezone" value="GMT (London, UK)" />
          </SectionCard>

          <MetricGrid
            items={[
              {
                label: "Portfolio Value",
                value: "£4.2M",
                caption: "Asset Class Health: Excellent and +12.4% this quarter",
              },
            ]}
          />

          <CredentialGrid
            title="Certified Credentials"
            items={verificationItems}
            actionLabel="Add New"
            onActionPress={() => showComingSoon("Add New Credential", "Credential creation will be added in a later mobile phase.")}
          />

          <SettingsList
            title="Profile Settings"
            items={[
              {
                key: "notifications",
                label: "Notification Settings",
                icon: "notifications-active",
                description: "Control alerts for product activity, meetings, ads, and news.",
                onPress: () => navigation.navigate("NotificationSettings"),
              },
              {
                key: "help",
                label: "Help & Support",
                icon: "help",
                description: "Reach support for account or plan questions.",
                onPress: () => navigation.navigate("HelpSupport"),
              },
            ]}
          />

          <LogoutActionCard label="Logout from Account" onPress={confirmLogout} />
        </>
      );
    }

    return (
      <>
        <ProfileIdentityCard
          avatarUrl={me?.user.avatar}
          initials={getInitials(displayName)}
          name={displayName}
          roleLabel={displayRole}
          description="Dedicated to the preservation of artisanal craft and ethical sourcing in the modern era."
          verified
          heroStyle="centered"
        />

        <View style={styles.memberShell}>
          <View style={styles.memberTitleWrap}>
            <Text style={styles.memberDisplayTitle}>Profile</Text>
          </View>

          <SectionCard>
            <SectionHeader eyebrow="Personal Details" title="Contact Information" actionLabel="Edit Profile" onActionPress={() => navigation.navigate("EditProfile")} />
            <InfoRow label="Email Address" value={displayEmail} />
            <Divider />
            <InfoRow label="Phone Number" value={displayPhone} />
          </SectionCard>

          <SectionCard>
            <SectionHeader eyebrow="Association Details" title="Membership Context" />
            <InfoRow label="State" value={stateName} />
            <Divider />
            <InfoRow label="Association" value={associationName} />
            <Divider />
            <InfoRow label="Status" value="Active Member" endAccent={<View style={styles.statusAccent}><View style={styles.statusDot} /><Text style={styles.statusText}>Active Member</Text></View>} />
          </SectionCard>

          <SettingsList
            title="Preferences & Security"
            eyebrow="Preferences & Security"
            items={[
              {
                key: "notifications",
                label: "Notification Settings",
                icon: "notifications-active",
                description: "Manage rate, news, ad, and meeting alerts.",
                onPress: () => navigation.navigate("NotificationSettings"),
              },
              {
                key: "help",
                label: "Help & Support",
                icon: "help",
                description: "Get assistance with your account and membership profile.",
                onPress: () => navigation.navigate("HelpSupport"),
              },
              {
                key: "privacy",
                label: "Privacy & Security",
                icon: "security",
                description: "Future security controls and account protections.",
                onPress: () => showComingSoon("Privacy & Security", "A dedicated Privacy & Security screen has not been added yet."),
              },
            ]}
          />

          <LogoutActionCard label="Logout from Account" onPress={confirmLogout} />
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  errorState: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  errorBody: {
    color: colors.mutedText,
    lineHeight: 22,
  },
  planChipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    padding: spacing.md,
  },
  planChipLabel: {
    color: "#4C4546",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  planChipValue: {
    marginTop: 6,
    color: "#775A19",
    fontSize: 24,
    fontWeight: "600",
  },
  summaryGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryLabel: {
    color: "#4C4546",
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 6,
    color: "#1B1C1C",
    fontSize: 16,
    fontWeight: "600",
  },
  toolList: {
    gap: spacing.sm,
  },
  memberShell: {
    gap: spacing.lg,
  },
  memberTitleWrap: {
    marginTop: -4,
  },
  memberDisplayTitle: {
    color: "#1B1C1C",
    fontSize: 48,
    fontWeight: "600",
    lineHeight: 52,
  },
  statusAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#775A19",
  },
  statusText: {
    color: "#775A19",
    fontSize: 16,
    fontWeight: "500",
  },
});
