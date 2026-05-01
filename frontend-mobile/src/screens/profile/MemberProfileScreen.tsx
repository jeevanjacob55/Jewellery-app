import { type ReactNode, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { AppScreen } from "../../components/AppScreen";
import { colors, radii, spacing } from "../../theme/tokens";
import { useSession } from "../../session/SessionProvider";
import { ProfileDrawer, type DrawerAction, type DrawerSection } from "./ProfileDrawer";

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
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isGuest = status === "guest";
  const isAuthenticated = status === "authenticated";
  const isBooting = status === "booting";
  const hasProfile = isGuest || Boolean(me);

  const displayName = isAuthenticated ? me?.user.name || "Member" : guestSession?.guest_profile.guest_name || "Guest User";
  const displayRole = isAuthenticated ? me?.user.role_display_name || "Member" : "Guest";
  const displayEmail = isAuthenticated ? me?.user.email || "Email not added" : "Email not added";
  const displayPhone = isAuthenticated ? me?.user.phone || "Phone not added" : "Phone not added";
  const associationName = isAuthenticated
    ? me?.hierarchy.association || "Association not assigned"
    : guestSession?.guest_profile.association?.name || "Association not assigned";
  const stateName = isAuthenticated
    ? me?.hierarchy.state || "State not assigned"
    : guestSession?.guest_profile.state?.name || "State not assigned";
  const unreadNotificationsCount = me?.counts.unread_notifications_count ?? 0;

  const drawerSections = useMemo<DrawerSection[]>(() => {
    const sections: DrawerSection[] = [];

    if (isAuthenticated && me?.user.has_company && me.company) {
      const companyItems: DrawerAction[] = [];
      if (me.user.can_manage_products) {
        companyItems.push({
          key: "manage-products",
          label: "Manage Products",
          icon: "inventory-2",
          onPress: () => {
            setDrawerVisible(false);
            navigation.navigate("CompanyProducts");
          },
        });
      }
      companyItems.push({
        key: "view-plan",
        label: "View Plan",
        icon: "receipt-long",
        onPress: () => {
          setDrawerVisible(false);
          navigation.navigate("CompanyPlan");
        },
      });
      if (me.user.can_manage_products && me.company.upgrade_url) {
        companyItems.push({
          key: "upgrade-plan",
          label: "Upgrade Plan",
          icon: "workspace-premium",
          highlight: true,
          external: true,
          onPress: async () => {
            setDrawerVisible(false);
            navigation.navigate("CompanyPlan", { openUpgradeOnMount: true });
          },
        });
      }
      sections.push({
        key: "company",
        title: "Company",
        items: companyItems,
      });
    }

    if (isAuthenticated && me?.user.is_admin) {
      sections.push({
        key: "admin-tools",
        title: "Admin Tools",
        items: [
          {
            key: "pending-approvals",
            label: "Pending Approvals",
            icon: "pending-actions",
            badge: me.counts.pending_approvals_count,
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("PendingApprovals");
            },
          },
          {
            key: "market-insights",
            label: "Market Insights",
            icon: "query-stats",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("MarketInsights");
            },
          },
          {
            key: "manage-users",
            label: "Manage Users",
            icon: "group",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("ManageUsers");
            },
          },
          {
            key: "manage-news",
            label: "Manage News",
            icon: "newspaper",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("ManageNews");
            },
          },
        ],
      });
    }

    if (isAuthenticated) {
      sections.push({
        key: "settings",
        title: "Settings",
        items: [
          {
            key: "notification-settings",
            label: "Notification Settings",
            icon: "notifications-active",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("NotificationSettings");
            },
          },
          {
            key: "edit-profile",
            label: "Edit Profile",
            icon: "manage-accounts",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("EditProfile");
            },
          },
          {
            key: "help-support",
            label: "Help & Support",
            icon: "contact-support",
            onPress: () => {
              setDrawerVisible(false);
              navigation.navigate("HelpSupport");
            },
          },
        ],
      });
      return sections;
    }

    sections.push({
      key: "settings",
      title: "Settings",
      items: [
        {
          key: "help-support",
          label: "Help & Support",
          icon: "contact-support",
          onPress: () => {
            setDrawerVisible(false);
            navigation.navigate("HelpSupport");
          },
        },
      ],
    });
    return sections;
  }, [isAuthenticated, me, navigation]);

  const footerAction = useMemo<DrawerAction | null>(() => {
    if (isAuthenticated) {
      return {
        key: "logout",
        label: "Logout",
        icon: "logout",
        onPress: () => {
          setDrawerVisible(false);
          Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: () => {
                void signOut();
              },
            },
          ]);
        },
      };
    }

    if (isGuest) {
      return {
        key: "login-signup",
        label: "Login / Sign Up",
        icon: "login",
        onPress: () => {
          setDrawerVisible(false);
          void signOut();
        },
      };
    }

    return null;
  }, [isAuthenticated, isGuest, signOut]);

  if (isBooting) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconButton} />
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <View style={styles.headerIconButton} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ProfileSkeleton />
        </ScrollView>
      </AppScreen>
    );
  }

  if (!hasProfile) {
    return (
      <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.headerIconButton} onPress={() => setDrawerVisible(true)}>
              <MaterialIcons name="menu" size={24} color="#111111" />
            </Pressable>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate("HelpSupport")}>
            <MaterialIcons name="notifications" size={24} color="#111111" />
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorStateTitle}>Could not load profile.</Text>
          <Pressable style={styles.retryPrimaryButton} onPress={() => void refreshCurrentUser()}>
            <Text style={styles.retryPrimaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor="#FBF9F9">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.headerIconButton} onPress={() => setDrawerVisible(true)}>
            <MaterialIcons name="menu" size={24} color="#111111" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => navigation.navigate(isAuthenticated ? "NotificationSettings" : "HelpSupport")}
        >
          <MaterialIcons name="notifications" size={24} color="#111111" />
          {unreadNotificationsCount > 0 ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identitySection}>
          <View style={styles.profileFrame}>
            <View style={styles.profileImageWrap}>
              {me?.user.avatar ? (
                <Image source={{ uri: me.user.avatar }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitials}>{getInitials(displayName)}</Text>
              )}
            </View>
          </View>
          <Text style={styles.identityName}>{displayName}</Text>
          <Text style={styles.identityRole}>{displayRole}</Text>
        </View>

        <InfoCard title="Personal Details" icon="person">
          <InfoRow label="Email Address" value={displayEmail} icon="mail" />
          <InfoDivider />
          <InfoRow label="Phone Number" value={displayPhone} icon="call" />
        </InfoCard>

        <InfoCard title="Association" icon="corporate-fare">
          <InfoRow label="Association" value={associationName} />
          <InfoDivider />
          <InfoRow label="State" value={stateName} icon="location-on" />
        </InfoCard>
      </ScrollView>

      <ProfileDrawer
        visible={drawerVisible}
        displayName={isGuest ? "Guest User" : displayName}
        displayRole={displayRole}
        initials={getInitials(displayName)}
        avatarUri={me?.user.avatar}
        sections={drawerSections}
        footerAction={footerAction}
        onHeaderPress={() => setDrawerVisible(false)}
        onClose={() => setDrawerVisible(false)}
        loading={isAuthenticated && !me}
        error={isAuthenticated && !me ? "profile-missing" : null}
        onRetry={() => void refreshCurrentUser()}
      />
    </AppScreen>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon} size={22} color="#775A19" />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {icon ? <MaterialIcons name={icon} size={18} color="#C2BCBC" /> : null}
      </View>
    </View>
  );
}

function InfoDivider() {
  return <View style={styles.divider} />;
}

function ProfileSkeleton() {
  return (
    <>
      <View style={styles.identitySection}>
        <View style={[styles.profileFrame, styles.skeletonCircleFrame]}>
          <View style={[styles.profileImageWrap, styles.skeletonCircle]} />
        </View>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonRole} />
      </View>

      {[0, 1].map((card) => (
        <View key={card} style={styles.card}>
          <View style={styles.skeletonCardHeader}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonCardTitle} />
          </View>
          {[0, 1].map((row) => (
            <View key={row}>
              <View style={styles.skeletonInfoRow}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonValue} />
              </View>
              {row === 0 ? <InfoDivider /> : null}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECEC",
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 32,
    paddingBottom: 32,
    gap: spacing.lg,
  },
  identitySection: {
    alignItems: "center",
    marginBottom: 6,
  },
  profileFrame: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: "#775A19",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 64,
    backgroundColor: "#EAE4D8",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileInitials: {
    color: "#2E261B",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
  },
  identityName: {
    marginTop: spacing.md,
    color: "#1B1C1C",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  identityRole: {
    marginTop: 6,
    color: "#775A19",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: "#F5F3F3",
    borderRadius: 16,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: "#1B1C1C",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "500",
  },
  cardBody: {
    gap: spacing.md,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: "#4C4546",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoValue: {
    flex: 1,
    color: "#1B1C1C",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(207, 196, 197, 0.5)",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorStateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  retryPrimaryButton: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryPrimaryButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  skeletonCircleFrame: {
    borderColor: "#E5DECF",
  },
  skeletonCircle: {
    backgroundColor: "#ECE7E7",
  },
  skeletonName: {
    width: 168,
    height: 20,
    borderRadius: 999,
    marginTop: spacing.md,
    backgroundColor: "#ECE7E7",
  },
  skeletonRole: {
    width: 110,
    height: 12,
    borderRadius: 999,
    marginTop: 12,
    backgroundColor: "#ECE7E7",
  },
  skeletonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECE7E7",
  },
  skeletonCardTitle: {
    width: 148,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#ECE7E7",
  },
  skeletonInfoRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  skeletonLabel: {
    width: 84,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ECE7E7",
  },
  skeletonValue: {
    width: "74%",
    height: 16,
    borderRadius: 999,
    backgroundColor: "#ECE7E7",
  },
});
