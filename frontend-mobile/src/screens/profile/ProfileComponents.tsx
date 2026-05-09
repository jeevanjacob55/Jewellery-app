import { type PropsWithChildren, type ReactNode } from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { colors, spacing } from "../../theme/tokens";

export type ProfileActionItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  description?: string;
  badge?: number;
  tone?: "default" | "accent" | "danger" | "dark";
  value?: string;
};

type ProfileTopAppBarProps = {
  title: string;
  brandLabel?: string;
  notificationCount?: number;
  guestMode?: boolean;
  onMenuPress?: () => void;
  onNotificationPress: () => void;
};

type ProfileIdentityCardProps = {
  avatarUrl?: string | null;
  initials: string;
  name: string;
  roleLabel: string;
  subtitle?: string;
  description?: string;
  verified?: boolean;
  heroStyle?: "centered" | "split" | "compact";
  actions?: Array<{
    key: string;
    label: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    tone?: "default" | "accent" | "dark";
  }>;
};

export function ProfileTopAppBar({
  title,
  brandLabel,
  notificationCount = 0,
  guestMode = false,
  onMenuPress,
  onNotificationPress,
}: ProfileTopAppBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Pressable style={styles.topIconWrap} onPress={onMenuPress}>
          <MaterialIcons name={guestMode ? "menu" : "diamond"} size={22} color={colors.text} />
        </Pressable>
        {guestMode ? (
          <Text style={styles.topTitle}>{title}</Text>
        ) : (
          <View>
            <Text style={styles.topBrand}>{brandLabel ?? "Jewellery Association"}</Text>
            {title ? <Text style={styles.topSubtitle}>{title}</Text> : null}
          </View>
        )}
      </View>
      <Pressable style={styles.topIconWrap} onPress={onNotificationPress}>
        <MaterialIcons name="notifications" size={22} color={colors.text} />
        {notificationCount > 0 ? <View style={styles.notificationDot} /> : null}
      </Pressable>
    </View>
  );
}

export function ProfileIdentityCard({
  avatarUrl,
  initials,
  name,
  roleLabel,
  subtitle,
  description,
  verified = false,
  heroStyle = "centered",
  actions = [],
}: ProfileIdentityCardProps) {
  const split = heroStyle === "split";
  const compact = heroStyle === "compact";

  return (
    <SectionCard padded style={split ? styles.heroCardSplit : compact ? styles.heroCardCompact : styles.heroCardCentered}>
      <View style={split ? styles.heroRow : styles.heroCentered}>
        <View style={styles.heroDecoration}>
          <MaterialIcons name="diamond" size={104} color="rgba(119, 90, 25, 0.08)" />
        </View>
        <View style={compact ? styles.avatarWrapCompact : styles.avatarWrap}>
          <View style={[styles.avatarFrame, compact ? styles.avatarFrameCompact : null]}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Text style={compact ? styles.avatarInitialsCompact : styles.avatarInitials}>{initials}</Text>}
          </View>
          {verified ? (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={16} color={colors.surface} />
            </View>
          ) : null}
        </View>
        <View style={[styles.heroCopy, split ? styles.heroCopySplit : null]}>
          <View style={[styles.heroNameRow, split ? styles.heroNameRowSplit : null]}>
            <Text style={compact ? styles.heroNameCompact : styles.heroName}>{name}</Text>
            <RoleBadge label={roleLabel} />
          </View>
          {subtitle ? <Text style={compact ? styles.heroSubtitleCompact : styles.heroSubtitle}>{subtitle}</Text> : null}
          {description ? <Text style={[styles.heroDescription, split ? styles.heroDescriptionSplit : null]}>{description}</Text> : null}
        </View>
      </View>
      {actions.length ? (
        <View style={[styles.heroActions, split ? styles.heroActionsSplit : null]}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              style={[
                styles.heroButton,
                action.tone === "accent" ? styles.heroButtonAccent : null,
                action.tone === "dark" ? styles.heroButtonDark : null,
              ]}
              onPress={action.onPress}
            >
              {action.icon ? <MaterialIcons name={action.icon} size={18} color={action.tone === "dark" ? colors.surface : action.tone === "accent" ? "#775A19" : colors.text} /> : null}
              <Text
                style={[
                  styles.heroButtonText,
                  action.tone === "accent" ? styles.heroButtonTextAccent : null,
                  action.tone === "dark" ? styles.heroButtonTextDark : null,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

export function RoleBadge({ label }: { label: string }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function SectionCard({
  children,
  padded = true,
  dark = false,
  style,
}: PropsWithChildren<{ padded?: boolean; dark?: boolean; style?: object }>) {
  return <View style={[styles.sectionCard, padded ? styles.sectionCardPadded : null, dark ? styles.sectionCardDark : null, style]}>{children}</View>;
}

export function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onActionPress,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function InfoRow({
  label,
  value,
  icon,
  endAccent,
}: {
  label: string;
  value: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  endAccent?: ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {endAccent ? endAccent : icon ? <MaterialIcons name={icon} size={18} color="#B0A7A8" /> : null}
      </View>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function ActionListItem({ item, showDivider = false }: { item: ProfileActionItem; showDivider?: boolean }) {
  return (
    <View>
      {showDivider ? <Divider /> : null}
      <Pressable style={styles.actionRow} onPress={item.onPress}>
        <View style={styles.actionRowLeft}>
          <View
            style={[
              styles.actionIconWrap,
              item.tone === "accent" ? styles.actionIconWrapAccent : null,
              item.tone === "danger" ? styles.actionIconWrapDanger : null,
              item.tone === "dark" ? styles.actionIconWrapDark : null,
            ]}
          >
            <MaterialIcons
              name={item.icon}
              size={20}
              color={item.tone === "accent" ? "#775A19" : item.tone === "danger" ? "#BA1A1A" : item.tone === "dark" ? colors.surface : colors.text}
            />
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionLabel, item.tone === "danger" ? styles.actionLabelDanger : null]}>{item.label}</Text>
            {item.description ? <Text style={styles.actionDescription}>{item.description}</Text> : null}
          </View>
        </View>
        <View style={styles.actionRowRight}>
          {item.value ? <Text style={styles.actionValue}>{item.value}</Text> : null}
          {typeof item.badge === "number" && item.badge > 0 ? (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{item.badge}</Text>
            </View>
          ) : null}
          <MaterialIcons name="chevron-right" size={20} color="#857C7D" />
        </View>
      </Pressable>
    </View>
  );
}

export function SettingsList({ title, eyebrow = "Platform Settings", items }: { title: string; eyebrow?: string; items: ProfileActionItem[] }) {
  return (
    <SectionCard padded={false}>
      <View style={styles.settingsInner}>
        <SectionHeader eyebrow={eyebrow} title={title} />
        <View>
          {items.map((item, index) => (
            <ActionListItem key={item.key} item={item} showDivider={index > 0} />
          ))}
        </View>
      </View>
    </SectionCard>
  );
}

export function MetricGrid({ items }: { items: Array<{ label: string; value: string; caption?: string; tone?: "light" | "dark" }> }) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => (
        <View key={item.label} style={[styles.metricCard, item.tone === "dark" ? styles.metricCardDark : null]}>
          <Text style={[styles.metricLabel, item.tone === "dark" ? styles.metricLabelDark : null]}>{item.label}</Text>
          <Text style={[styles.metricValue, item.tone === "dark" ? styles.metricValueDark : null]}>{item.value}</Text>
          {item.caption ? <Text style={[styles.metricCaption, item.tone === "dark" ? styles.metricCaptionDark : null]}>{item.caption}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function CredentialGrid({
  title,
  items,
  actionLabel,
  onActionPress,
}: {
  title: string;
  items: Array<{ key: string; label: string; value: string }>;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Certified Credentials" title={title} actionLabel={actionLabel} onActionPress={onActionPress} />
      {items.length ? (
        <View style={styles.credentialGrid}>
          {items.map((item) => (
            <View key={item.key} style={styles.credentialCard}>
              <MaterialIcons name="verified-user" size={28} color="#775A19" />
              <View style={styles.credentialCopy}>
                <Text style={styles.credentialLabel}>{item.label}</Text>
                <Text style={styles.credentialValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyState}>No published credentials yet.</Text>
      )}
    </SectionCard>
  );
}

export function JoinPromptCard({
  title,
  description,
  ctaLabel,
  onPress,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  return (
    <SectionCard dark style={styles.joinCard}>
      <Text style={styles.joinTitle}>{title}</Text>
      <Text style={styles.joinDescription}>{description}</Text>
      <Pressable style={styles.joinButton} onPress={onPress}>
        <Text style={styles.joinButtonText}>{ctaLabel}</Text>
      </Pressable>
    </SectionCard>
  );
}

export function VisualAnchorCard() {
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=80",
      }}
      imageStyle={styles.visualAnchorImage}
      style={styles.visualAnchor}
    >
      <View style={styles.visualOverlay}>
        <Text style={styles.visualEyebrow}>Craftsmanship Since 1924</Text>
        <Text style={styles.visualTitle}>The Gold Standard in Professional Integrity.</Text>
      </View>
    </ImageBackground>
  );
}

export function LogoutActionCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.logoutWrap}>
      <Pressable style={styles.logoutButton} onPress={onPress}>
        <MaterialIcons name="logout" size={20} color="#BA1A1A" />
        <Text style={styles.logoutText}>{label}</Text>
      </Pressable>
    </View>
  );
}

export function RecentActivityCard({ items }: { items: Array<{ key: string; title: string; time: string; accent?: boolean }> }) {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Recent Actions" title="Activity" />
      <View style={styles.activityList}>
        {items.map((item) => (
          <View key={item.key} style={styles.activityRow}>
            <View style={[styles.activityRail, item.accent ? styles.activityRailAccent : null]} />
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

export function BentoScroll({ children }: PropsWithChildren) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 68,
    backgroundColor: "#FBF9F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CFC4C5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  topIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "600",
  },
  topBrand: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "600",
  },
  topSubtitle: {
    color: "#4C4546",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#775A19",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionCardPadded: {
    padding: spacing.lg,
    backgroundColor: "#F5F3F3",
  },
  sectionCardDark: {
    backgroundColor: "#000000",
  },
  heroCardCentered: {
    position: "relative",
  },
  heroCardSplit: {
    position: "relative",
    gap: spacing.lg,
  },
  heroCardCompact: {
    position: "relative",
  },
  heroRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  heroCentered: {
    alignItems: "center",
  },
  heroDecoration: {
    position: "absolute",
    top: -10,
    right: -10,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatarWrapCompact: {
    position: "relative",
  },
  avatarFrame: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFrameCompact: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#F0ECE7",
    borderColor: "#D8CCCC",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  avatarInitialsCompact: {
    color: "#1B1C1C",
    fontSize: 28,
    fontWeight: "700",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#775A19",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    alignItems: "center",
  },
  heroCopySplit: {
    flex: 1,
    alignItems: "flex-start",
  },
  heroNameRow: {
    alignItems: "center",
    gap: spacing.sm,
  },
  heroNameRowSplit: {
    alignItems: "flex-start",
  },
  heroName: {
    color: "#1B1C1C",
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
  },
  heroNameCompact: {
    color: "#1B1C1C",
    fontSize: 24,
    fontWeight: "600",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FED488",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  roleBadgeText: {
    color: "#785A1A",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  heroSubtitle: {
    marginTop: spacing.md,
    color: "#4C4546",
    fontSize: 18,
    textAlign: "center",
  },
  heroSubtitleCompact: {
    marginTop: 4,
    color: "#4C4546",
    fontSize: 16,
  },
  heroDescription: {
    marginTop: spacing.sm,
    color: "#4C4546",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 420,
  },
  heroDescriptionSplit: {
    textAlign: "left",
  },
  heroActions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  heroActionsSplit: {
    justifyContent: "flex-start",
  },
  heroButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7E7576",
    backgroundColor: "#FBF9F9",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroButtonAccent: {
    borderColor: "#775A19",
    backgroundColor: "#FED488",
  },
  heroButtonDark: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  heroButtonText: {
    color: "#1B1C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  heroButtonTextAccent: {
    color: "#775A19",
  },
  heroButtonTextDark: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionEyebrow: {
    color: "#7E7576",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#1B1C1C",
    fontSize: 24,
    fontWeight: "500",
  },
  sectionAction: {
    color: "#775A19",
    fontSize: 13,
    fontWeight: "600",
  },
  infoRow: {
    gap: 6,
  },
  infoLabel: {
    color: "#7E7576",
    fontSize: 13,
    fontWeight: "500",
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  infoValue: {
    flex: 1,
    color: "#1B1C1C",
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#CFC4C5",
    marginVertical: spacing.md,
  },
  settingsInner: {
    padding: spacing.lg,
  },
  actionRow: {
    minHeight: 68,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrapAccent: {
    backgroundColor: "#FFF3DA",
  },
  actionIconWrapDanger: {
    backgroundColor: "#FFDAD6",
  },
  actionIconWrapDark: {
    backgroundColor: "#1B1B1B",
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    color: "#1B1C1C",
    fontSize: 16,
    fontWeight: "500",
  },
  actionLabelDanger: {
    color: "#BA1A1A",
  },
  actionDescription: {
    marginTop: 2,
    color: "#4C4546",
    fontSize: 13,
    lineHeight: 18,
  },
  actionRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionValue: {
    color: "#1B1C1C",
    fontSize: 16,
    fontWeight: "600",
  },
  actionBadge: {
    minWidth: 28,
    borderRadius: 999,
    backgroundColor: "#FED488",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionBadgeText: {
    color: "#775A19",
    fontSize: 11,
    fontWeight: "700",
  },
  metricGrid: {
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: spacing.md,
  },
  metricCardDark: {
    backgroundColor: "#000000",
  },
  metricLabel: {
    color: "#7E7576",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricLabelDark: {
    color: "rgba(255,255,255,0.6)",
  },
  metricValue: {
    marginTop: spacing.sm,
    color: "#1B1C1C",
    fontSize: 32,
    fontWeight: "600",
  },
  metricValueDark: {
    color: "#FFFFFF",
  },
  metricCaption: {
    marginTop: spacing.sm,
    color: "#4C4546",
    fontSize: 13,
    lineHeight: 18,
  },
  metricCaptionDark: {
    color: "rgba(255,255,255,0.7)",
  },
  credentialGrid: {
    gap: spacing.md,
  },
  credentialCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFC4C5",
  },
  credentialCopy: {
    flex: 1,
  },
  credentialLabel: {
    color: "#1B1C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  credentialValue: {
    marginTop: 2,
    color: "#4C4546",
    fontSize: 11,
  },
  emptyState: {
    color: "#4C4546",
    fontSize: 14,
    lineHeight: 21,
  },
  joinCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 230,
    padding: spacing.xl,
  },
  joinTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "500",
    textAlign: "center",
  },
  joinDescription: {
    marginTop: spacing.md,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  joinButton: {
    marginTop: spacing.lg,
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  visualAnchor: {
    minHeight: 280,
    justifyContent: "flex-end",
  },
  visualAnchorImage: {
    borderRadius: 16,
  },
  visualOverlay: {
    borderRadius: 16,
    padding: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  visualEyebrow: {
    color: "#FFDEA5",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  visualTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "600",
    maxWidth: 420,
  },
  logoutWrap: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#CFC4C5",
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BA1A1A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoutText: {
    color: "#BA1A1A",
    fontSize: 16,
    fontWeight: "500",
  },
  activityList: {
    gap: spacing.md,
  },
  activityRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  activityRail: {
    width: 4,
    borderRadius: 999,
    backgroundColor: "#CFC4C5",
  },
  activityRailAccent: {
    backgroundColor: "#775A19",
  },
  activityCopy: {
    flex: 1,
  },
  activityTitle: {
    color: "#1B1C1C",
    fontSize: 13,
    fontWeight: "500",
  },
  activityTime: {
    marginTop: 4,
    color: "#7E7576",
    fontSize: 10,
    textTransform: "uppercase",
  },
  bottomSpacer: {
    height: 72,
  },
});
