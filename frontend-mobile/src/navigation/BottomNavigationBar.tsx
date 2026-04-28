import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";

const ACTIVE_COLOR = "#D97706";
const INACTIVE_COLOR = "#9CA3AF";

export function BottomNavigationBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tintColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
            >
              <TabIcon routeName={route.name} focused={isFocused} color={tintColor} />
              <Text style={[styles.label, { color: tintColor }]}>{label.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ routeName, focused, color }: { routeName: string; focused: boolean; color: string }) {
  switch (routeName) {
    case "Home":
      return <HomeTabGlyph color={color} focused={focused} />;
    case "Market":
      return <MarketTabGlyph color={color} focused={focused} />;
    case "News":
      return <NewsTabGlyph color={color} focused={focused} />;
    case "Services":
      return <ServicesTabGlyph color={color} focused={focused} />;
    case "Profile":
      return <ProfileTabGlyph color={color} focused={focused} />;
    default:
      return <FallbackTabGlyph color={color} focused={focused} />;
  }
}

function HomeTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconFrame}>
      <View style={[styles.homeRoofLeft, { backgroundColor: color }]} />
      <View style={[styles.homeRoofRight, { backgroundColor: color }]} />
      <View style={[styles.homeBody, { borderColor: color, backgroundColor: focused ? `${color}1A` : "transparent" }]} />
    </View>
  );
}

function MarketTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconFrame}>
      <View style={styles.marketBars}>
        <View style={[styles.marketBarShort, { backgroundColor: color, opacity: focused ? 1 : 0.72 }]} />
        <View style={[styles.marketBarMid, { backgroundColor: color, opacity: focused ? 1 : 0.84 }]} />
        <View style={[styles.marketBarTall, { backgroundColor: color }]} />
      </View>
      <View style={[styles.marketTrend, { backgroundColor: color }]} />
    </View>
  );
}

function NewsTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconFrame}>
      <View style={[styles.newsSheet, { borderColor: color, backgroundColor: focused ? `${color}14` : "transparent" }]}>
        <View style={[styles.newsLineBold, { backgroundColor: color }]} />
        <View style={[styles.newsLine, { backgroundColor: color }]} />
        <View style={[styles.newsLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ServicesTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconFrame}>
      <View style={[styles.briefcaseBody, { borderColor: color, backgroundColor: focused ? `${color}14` : "transparent" }]}>
        <View style={[styles.briefcaseHandle, { borderColor: color }]} />
      </View>
    </View>
  );
}

function ProfileTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconFrame}>
      <View style={[styles.profileHead, { borderColor: color, backgroundColor: focused ? `${color}14` : "transparent" }]} />
      <View style={[styles.profileBody, { borderColor: color, backgroundColor: focused ? `${color}14` : "transparent" }]} />
    </View>
  );
}

function FallbackTabGlyph({ color, focused }: { color: string; focused: boolean }) {
  return <View style={[styles.fallbackDot, { borderColor: color, backgroundColor: focused ? color : "transparent" }]} />;
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
  },
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.54,
  },
  iconFrame: {
    width: 24,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoofLeft: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 10,
    height: 2,
    borderRadius: 999,
    transform: [{ rotate: "-38deg" }],
  },
  homeRoofRight: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 10,
    height: 2,
    borderRadius: 999,
    transform: [{ rotate: "38deg" }],
  },
  homeBody: {
    marginTop: 6,
    width: 13,
    height: 10,
    borderWidth: 1.8,
    borderRadius: 2,
  },
  marketBars: {
    width: 16,
    height: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  marketBarShort: {
    width: 3,
    height: 5,
    borderRadius: 999,
  },
  marketBarMid: {
    width: 3,
    height: 9,
    borderRadius: 999,
  },
  marketBarTall: {
    width: 3,
    height: 13,
    borderRadius: 999,
  },
  marketTrend: {
    position: "absolute",
    top: 5,
    right: 3,
    width: 9,
    height: 2,
    borderRadius: 999,
    transform: [{ rotate: "-33deg" }],
  },
  newsSheet: {
    width: 15,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingTop: 3,
  },
  newsLineBold: {
    height: 2,
    borderRadius: 999,
    marginBottom: 2,
  },
  newsLine: {
    height: 1.8,
    borderRadius: 999,
    marginBottom: 2,
  },
  briefcaseBody: {
    width: 16,
    height: 12,
    borderWidth: 1.6,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  briefcaseHandle: {
    position: "absolute",
    top: -4,
    width: 8,
    height: 5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  profileHead: {
    width: 8,
    height: 8,
    borderWidth: 1.6,
    borderRadius: 999,
    marginBottom: 1,
  },
  profileBody: {
    width: 14,
    height: 8,
    borderWidth: 1.6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  fallbackDot: {
    width: 12,
    height: 12,
    borderWidth: 1.6,
    borderRadius: 999,
  },
});
