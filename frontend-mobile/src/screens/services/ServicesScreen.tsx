import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getJson } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { AppScreen } from "../../components/AppScreen";
import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { colors, spacing } from "../../theme/tokens";
import { ServicesData } from "../../types/api";

export function ServicesScreen() {
  const [servicesData, setServicesData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        const nextData = await getJson<ServicesData>("/services/");
        if (active) {
          setServicesData(nextData);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <ScreenState title="Loading services" detail="Reviewing compliance tasks and service options." loading />;
  }

  if (!servicesData) {
    return <ScreenState title="Services unavailable" detail="The compliance dashboard could not be loaded." />;
  }

  return (
    <AppScreen scrollable safeAreaEdges={["top"]} contentContainerStyle={styles.content}>
      <AppHeader title="Services & Compliance" subtitle="Track operational service health, requests, and compliance status." />
      <View style={styles.body}>
        {servicesData.overview.map((item) => (
          <SurfaceCard key={item.title}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </SurfaceCard>
        ))}

        <SurfaceCard>
          <Text style={styles.title}>Service grid</Text>
          <View style={styles.grid}>
            {servicesData.services.map((service) => (
              <View key={service} style={styles.tile}>
                <Text style={styles.tileText}>{service}</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.title}>Operational metrics</Text>
          <Text style={styles.meta}>Average turnaround: {servicesData.metrics.average_tat_days} days</Text>
          <Text style={styles.meta}>Accuracy: {servicesData.metrics.accuracy}</Text>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  status: { color: colors.accentGold, fontWeight: "700" },
  meta: { color: colors.mutedText, marginBottom: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "48%", backgroundColor: colors.surfaceAlt, padding: spacing.md },
  tileText: { color: colors.text, fontWeight: "700" },
});
