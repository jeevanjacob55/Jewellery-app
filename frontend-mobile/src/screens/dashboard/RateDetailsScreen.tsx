import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { getAssociationRateDetail } from "../../api/rates";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { colors, spacing } from "../../theme/tokens";
import { AssociationRateDetailResponse } from "../../types/api";
import { LoadingSkeleton, NoticeCard, PriceScreenHeader, RateDetailsHeroCard, RateGroupCard } from "./PriceCards";

type RateDetailsRouteParams = {
  associationId: number;
  associationName?: string;
};

export function RateDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RateDetailsRouteParams;
  const [detail, setDetail] = useState<AssociationRateDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail(isRefresh = false) {
    if (!params.associationId) {
      setError("No association was selected.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextDetail = await getAssociationRateDetail(params.associationId);
      setDetail(nextDetail);
      setError(null);
    } catch {
      setError("We could not load the rate details right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [params.associationId]);

  return (
    <AppScreen safeAreaEdges={["top", "bottom"]} backgroundColor={colors.background}>
      <PriceScreenHeader
        title="Rate Details"
        onBack={() => navigation.goBack()}
        onNotifications={() => navigation.navigate("NotificationSettings")}
      />

      {loading && !detail ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <LoadingSkeleton variant="detail" />
        </ScrollView>
      ) : !detail ? (
        <ScreenState title={params.associationName ?? "Rate details unavailable"} detail={error ?? "Try again in a moment."} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDetail(true)} />}
        >
          <RateDetailsHeroCard
            associationName={detail.association.name}
            stateName={detail.association.state_name}
            updatedAtLabel={detail.updated_at_label}
            badgeLabel={detail.hero_badge_label}
          />

          {detail.rate_groups.map((group) => (
            <RateGroupCard key={group.key} group={group} />
          ))}

          <NoticeCard notice={detail.notice} />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
});
