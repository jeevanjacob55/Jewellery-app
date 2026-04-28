import { PropsWithChildren } from "react";
import { ScrollView, ScrollViewProps, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  safeAreaEdges?: Edge[];
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  showsVerticalScrollIndicator?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
}>;

export function AppScreen({
  children,
  scrollable = false,
  safeAreaEdges = ["top"],
  backgroundColor = colors.background,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator = false,
  refreshControl,
}: AppScreenProps) {
  return (
    <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, { backgroundColor }]}>
      {scrollable ? (
        <ScrollView
          style={[styles.fill, style]}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
});
