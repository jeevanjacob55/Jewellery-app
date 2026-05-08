import { PropsWithChildren } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { colors, radii, spacing } from "../../theme/tokens";
import {
  AssociationRateDetailGroup,
  AssociationRateDetailItem,
  AssociationRateDetailNotice,
  DashboardAssociationRateSummary,
  DashboardRateMetric,
  StateAssociationRates,
} from "../../types/api";

type PriceScreenHeaderProps = {
  title: string;
  onBack: () => void;
  onNotifications?: () => void;
};

type PriceSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

type StateTabsProps = {
  states: Array<{ id: number; name: string }>;
  selectedStateId: number | null;
  onSelect: (stateId: number) => void;
};

type AssociationCompactCardProps = {
  association: DashboardAssociationRateSummary;
  onPress: () => void;
};

type AssociationStateCardProps = {
  association: StateAssociationRates;
  onPress: () => void;
  badgeLabel?: string;
};

type RateDetailsHeroCardProps = {
  associationName: string;
  stateName: string;
  updatedAtLabel: string;
  badgeLabel: string;
};

type RateGroupCardProps = {
  group: AssociationRateDetailGroup;
};

export function PriceScreenHeader({ title, onBack, onNotifications }: PriceScreenHeaderProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Pressable style={styles.iconButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.topBarTitle}>{title}</Text>
      </View>
      <Pressable style={styles.iconButton} onPress={onNotifications}>
        <MaterialIcons name="notifications-none" size={22} color="#0F172A" />
      </Pressable>
    </View>
  );
}

export function PriceSearchBar({ value, onChangeText, placeholder }: PriceSearchBarProps) {
  return (
    <View style={styles.searchWrap}>
      <MaterialIcons name="search" size={20} color="#747878" style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#747878"
        style={styles.searchInput}
      />
    </View>
  );
}

export function StateTabs({ states, selectedStateId, onSelect }: StateTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
      {states.map((state) => {
        const isActive = state.id === selectedStateId;
        return (
          <Pressable key={state.id} style={styles.tabButton} onPress={() => onSelect(state.id)}>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{state.name}</Text>
            <View style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function AssociationCompactCard({ association, onPress }: AssociationCompactCardProps) {
  return (
    <Pressable style={styles.compactCard} onPress={onPress}>
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderCopy}>
          <Text style={styles.compactTitle}>{association.name}</Text>
          <View style={styles.compactMetaRow}>
            <Text style={styles.compactMetaCaps}>{association.state_name}</Text>
            <View style={styles.dot} />
            <Text style={styles.compactMetaText}>Updated {association.updated_at_label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricTable}>
        <View style={[styles.metricRow, styles.metricRowHeader]}>
          <Text style={styles.metricHead}>METRIC</Text>
          <Text style={[styles.metricHead, styles.alignRight]}>PRICE (Rs.)</Text>
          <Text style={[styles.metricHead, styles.alignRight]}>TREND</Text>
        </View>
        <MetricTableRow label="Gold 24K (1g)" metric={association.headline_rates.gold_24k} />
        <MetricTableRow label="Gold 22K (1g)" metric={association.headline_rates.gold_22k} />
        <MetricTableRow label="Silver (1g)" metric={association.headline_rates.silver} />
      </View>

      <View style={styles.compactFooter}>
        <Text style={styles.footerCta}>View Details</Text>
        <MaterialIcons name="arrow-forward" size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

export function AssociationStateCard({ association, onPress, badgeLabel = "Live Rates" }: AssociationStateCardProps) {
  return (
    <Pressable style={styles.stateCard} onPress={onPress}>
      <View>
        <View style={styles.stateCardHeader}>
          <Text style={styles.stateCardTitle}>{association.name}</Text>
          <View style={styles.stateBadgePill}>
            <Text style={styles.stateBadge}>{badgeLabel}</Text>
          </View>
        </View>
        <View style={styles.stateMetricsRow}>
          <StateMetricBlock label="GOLD 22K" metric={association.headline_rates.gold_22k} />
          <StateMetricBlock label="GOLD 24K" metric={association.headline_rates.gold_24k} />
          <StateMetricBlock label="SILVER" metric={association.headline_rates.silver} />
        </View>
      </View>
      <View style={styles.stateCardFooter}>
        <Text style={styles.stateUpdated}>Updated {association.updated_at_label}</Text>
        <View style={styles.stateCtaRow}>
          <Text style={styles.footerCta}>View Details</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.text} />
        </View>
      </View>
    </Pressable>
  );
}

export function RateDetailsHeroCard({ associationName, stateName, updatedAtLabel, badgeLabel }: RateDetailsHeroCardProps) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Premium Member</Text>
          <Text style={styles.heroTitle}>{associationName}</Text>
          <View style={styles.heroLocationRow}>
            <MaterialIcons name="location-on" size={16} color="#5F6161" />
            <Text style={styles.heroLocation}>{stateName}, India</Text>
          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>{badgeLabel.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.heroDivider} />
      <View style={styles.heroFooter}>
        <MaterialIcons name="schedule" size={18} color="#5F6161" />
        <Text style={styles.heroUpdated}>
          Last updated: <Text style={styles.heroUpdatedStrong}>{updatedAtLabel}</Text>
        </Text>
      </View>
    </View>
  );
}

export function RateGroupCard({ group }: RateGroupCardProps) {
  return (
    <View style={styles.rateGroupCard}>
      <View style={styles.rateGroupHeader}>
        <View style={[styles.rateGroupIconWrap, group.key === "gold" ? styles.goldIconWrap : styles.silverIconWrap]}>
          <MaterialIcons
            name={group.key === "gold" ? "workspace-premium" : "layers"}
            size={18}
            color={group.key === "gold" ? colors.accentGold : "#64748B"}
          />
        </View>
        <Text style={styles.rateGroupTitle}>{group.title}</Text>
      </View>
      {group.items.map((item, index) => (
        <RateRow key={item.key} item={item} isLast={index === group.items.length - 1} />
      ))}
    </View>
  );
}

export function RateRow({ item, isLast = false }: { item: AssociationRateDetailItem; isLast?: boolean }) {
  return (
    <View style={[styles.rateDetailRow, !isLast && styles.rateDetailRowBorder]}>
      <View style={styles.rateDetailLabelWrap}>
        <Text style={styles.rateDetailEyebrow}>{item.label}</Text>
        <Text style={styles.rateDetailUnit}>{item.unit_label}</Text>
      </View>
      <View style={styles.rateDetailValueWrap}>
        <TrendIndicator metric={{ ...item }} variant="detail" />
        <Text style={styles.rateDetailValue}>{formatLargeCurrency(item.value)}</Text>
      </View>
    </View>
  );
}

export function TrendIndicator({
  metric,
  variant = "list",
}: {
  metric: DashboardRateMetric | AssociationRateDetailItem;
  variant?: "list" | "detail";
}) {
  const trend = metric.trend;
  const iconName = trend === "up" ? "arrow-drop-up" : trend === "down" ? "arrow-drop-down" : "remove";
  const color = trend === "up" ? colors.positive : trend === "down" ? colors.negative : "#747878";
  const label = variant === "detail" ? metric.change_label : metric.change_percent_label;

  return (
    <View style={[styles.trendWrap, variant === "detail" && styles.trendWrapDetail]}>
      <MaterialIcons name={iconName} size={variant === "detail" ? 16 : 18} color={color} />
      <Text style={[styles.trendText, { color }, variant === "detail" && styles.trendTextDetail]}>{label}</Text>
    </View>
  );
}

export function NoticeCard({ notice }: { notice: AssociationRateDetailNotice }) {
  return (
    <View style={styles.noticeCard}>
      <MaterialIcons name="info-outline" size={20} color="#5D5F5F" />
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeEyebrow}>{notice.eyebrow}</Text>
        <Text style={styles.noticeBody}>{notice.body}</Text>
      </View>
    </View>
  );
}

export function LoadingSkeleton({ variant }: { variant: "association-list" | "state-list" | "detail" }) {
  if (variant === "detail") {
    return (
      <View style={styles.skeletonStack}>
        <SkeletonBlock style={styles.skeletonHero} />
        <SkeletonBlock style={styles.skeletonDetailCard} />
        <SkeletonBlock style={styles.skeletonDetailCard} />
        <SkeletonBlock style={styles.skeletonNotice} />
      </View>
    );
  }

  return (
    <View style={styles.skeletonStack}>
      <SkeletonBlock style={styles.skeletonSearch} />
      <SkeletonBlock style={variant === "association-list" ? styles.skeletonCompactCard : styles.skeletonStateCard} />
      <SkeletonBlock style={variant === "association-list" ? styles.skeletonCompactCard : styles.skeletonStateCard} />
      <SkeletonBlock style={variant === "association-list" ? styles.skeletonPromo : styles.skeletonStateCard} />
    </View>
  );
}

export function PromoBanner() {
  return (
    <ImageBackground
      source={{
        uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZxzkdmOncpo2xHgb-NN9Z2sJckS3FRzOcBUZDEsRp9Sb97H5RoMNBvukPWs8fIrQiqJGWpWYG2BLUHMRxGoZYE6o2FGdiy0lTV_l_sxbGZKSyKdZMgi_xe0H6fTaHaP2_NAyDQU1lXOWmCT9lnK_p9kTJlz52X5B3WQDpJIoOwL8DitUNlWAOrJ74iU_vJ0SNJ5_hJjVOEeuf6ncB9qCfSesANOBmOO6qxO5KFUjDscwX1HSkSIV_XqXd4TxaH9vLVe8GBPeB37E",
      }}
      imageStyle={styles.promoImage}
      style={styles.promoCard}
    >
      <View style={styles.promoOverlay} />
      <View style={styles.promoContent}>
        <Text style={styles.promoBadge}>ASSOCIATION BENEFIT</Text>
        <Text style={styles.promoTitle}>Join the Premium Trade Network</Text>
        <Text style={styles.promoBody}>Get verified status and real-time alerts across the bullion network.</Text>
      </View>
    </ImageBackground>
  );
}

function MetricTableRow({ label, metric }: { label: string; metric: DashboardRateMetric }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{formatCompactCurrency(metric.value)}</Text>
      <View style={styles.metricTrendCell}>
        <TrendIndicator metric={metric} />
      </View>
    </View>
  );
}

function StateMetricBlock({ label, metric }: { label: string; metric: DashboardRateMetric }) {
  return (
    <View style={styles.stateMetricBlock}>
      <Text style={styles.stateMetricLabel}>{label}</Text>
      <View style={styles.stateMetricValueRow}>
        <Text style={styles.stateMetricValue}>{`Rs. ${formatCompactCurrency(metric.value)}`}</Text>
        <MaterialIcons
          name={metric.trend === "up" ? "arrow-drop-up" : metric.trend === "down" ? "arrow-drop-down" : "remove"}
          size={18}
          color={metric.trend === "up" ? colors.positive : metric.trend === "down" ? colors.negative : "#747878"}
        />
      </View>
    </View>
  );
}

function SkeletonBlock({ style }: { style?: object }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

function formatCompactCurrency(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function formatLargeCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const styles = StyleSheet.create({
  topBar: {
    height: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  topBarTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "600",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: radii.md,
    paddingLeft: 48,
    paddingRight: 16,
    color: colors.text,
    fontSize: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabsContent: {
    paddingBottom: spacing.sm,
    paddingRight: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabButton: {
    alignItems: "center",
  },
  tabLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#D97706",
  },
  tabUnderline: {
    marginTop: 12,
    height: 2,
    width: "100%",
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: "#D97706",
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(229, 226, 225, 0.4)",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.md,
  },
  compactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compactHeaderCopy: {
    flex: 1,
  },
  compactTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
  },
  compactMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
    flexWrap: "wrap",
  },
  compactMetaCaps: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  compactMetaText: {
    color: "#747878",
    fontSize: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C4C7C8",
  },
  metricTable: {
    gap: spacing.xs,
  },
  metricRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  metricRowHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
    marginBottom: 2,
  },
  metricHead: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  metricLabel: {
    flex: 1.2,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  metricValue: {
    flex: 0.9,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  metricTrendCell: {
    flex: 0.9,
    alignItems: "flex-end",
  },
  alignRight: {
    textAlign: "right",
  },
  compactFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerCta: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.9)",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.lg,
  },
  stateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stateCardTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
  },
  stateBadgePill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stateBadge: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stateMetricsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stateMetricBlock: {
    flex: 1,
  },
  stateMetricLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  stateMetricValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  stateMetricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "600",
  },
  stateCardFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  stateUpdated: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 13,
  },
  stateCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentGold,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: "#5D5F5F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "600",
    marginTop: 4,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  heroLocation: {
    color: colors.mutedText,
    fontSize: 14,
  },
  liveBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveBadgeText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroUpdated: {
    color: colors.mutedText,
    fontSize: 13,
    fontStyle: "italic",
  },
  heroUpdatedStrong: {
    color: colors.text,
    fontWeight: "600",
    fontStyle: "normal",
  },
  rateGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rateGroupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goldIconWrap: {
    backgroundColor: "#FEF3C7",
  },
  silverIconWrap: {
    backgroundColor: "#E2E8F0",
  },
  rateGroupTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  rateDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rateDetailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rateDetailLabelWrap: {
    flex: 1,
  },
  rateDetailEyebrow: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rateDetailUnit: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rateDetailValueWrap: {
    alignItems: "flex-end",
    minWidth: 128,
  },
  rateDetailValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  trendWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  trendWrapDetail: {
    marginBottom: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trendTextDetail: {
    fontSize: 11,
  },
  noticeCard: {
    backgroundColor: "#E2E8F0",
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  noticeCopy: {
    flex: 1,
  },
  noticeEyebrow: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  noticeBody: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },
  skeletonStack: {
    gap: spacing.md,
  },
  skeletonBlock: {
    backgroundColor: "#ECE8E7",
    borderRadius: 12,
  },
  skeletonSearch: {
    height: 48,
  },
  skeletonCompactCard: {
    height: 260,
  },
  skeletonStateCard: {
    height: 190,
  },
  skeletonPromo: {
    height: 250,
  },
  skeletonHero: {
    height: 170,
  },
  skeletonDetailCard: {
    height: 220,
  },
  skeletonNotice: {
    height: 96,
  },
  promoCard: {
    minHeight: 250,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "#111827",
  },
  promoImage: {
    borderRadius: 12,
  },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  promoContent: {
    position: "relative",
    zIndex: 1,
    padding: spacing.lg,
  },
  promoBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentGold,
    color: "#111827",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  promoTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "700",
  },
  promoBody: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
