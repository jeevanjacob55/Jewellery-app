# Mobile Safe Area Pattern

This app uses `react-native-safe-area-context` so headers and top content do not slide under the status bar, notch, or front camera on iOS and Android.

## Current setup

- `frontend-mobile/App.tsx` already wraps the app with `SafeAreaProvider`.
- Shared layout now lives in:
  - `frontend-mobile/src/components/AppScreen.tsx`
  - `frontend-mobile/src/components/AppHeader.tsx`

## When to use each component

### `AppScreen`

Use `AppScreen` as the top-level wrapper for every new screen we build.

- Custom header, tab, login, splash, and headerless screens:
  - Use `safeAreaEdges={["top"]}`
- Full-screen auth or splash screens that should also respect the home indicator:
  - Use `safeAreaEdges={["top", "bottom"]}`
- Stack screens that keep the native React Navigation header:
  - React Navigation already handles the top inset for the header.
  - Only add extra safe-area edges if the screen disables the native header or needs bottom inset handling.

### `AppHeader`

Use `AppHeader` for custom in-screen headers instead of hardcoding top padding.

- Keeps top spacing consistent across devices.
- Supports centered headers with left/right actions.
- Matches the cleaner WhatsApp/Gmail style spacing pattern.

## Modal and bottom sheet rule

For modals, sheets, or fixed bottom actions, use `useSafeAreaInsets()` and add the device inset to the bottom padding.

Example:

```tsx
const insets = useSafeAreaInsets();

<ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]} />
```

## Minimal screen example

```tsx
import { RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { AppScreen } from "../components/AppScreen";
import { spacing } from "../theme/tokens";

export function ExampleScreen() {
  const insets = useSafeAreaInsets();

  return (
    <AppScreen
      scrollable
      safeAreaEdges={["top"]}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => undefined} />}
    >
      <AppHeader
        title="Dashboard"
        subtitle="Safe on Android and iPhone notch devices"
      />

      <View style={{ paddingHorizontal: 24 }}>
        <Text>Screen content starts below the status bar and notch.</Text>
        <Text>Bottom sheets should add {`insets.bottom`} to their padding.</Text>
      </View>
    </AppScreen>
  );
}
```

## Screens already updated

- `LoginScreen`
- `HomeDashboardScreen`
- `MarketTiersScreen`
- `NewsAlertsScreen`
- `ServicesScreen`
- `MemberProfileScreen`
- `SplashScreen`

## Rule for future screens

Do not add magic numbers like `paddingTop: 40` to avoid the notch.

Instead:

1. Start with `AppScreen`.
2. Add `AppHeader` if the screen has a custom top bar.
3. Use `useSafeAreaInsets()` only for modals, sheets, or fixed bottom actions.
4. Keep screen-specific spacing inside the body content, not in notch workarounds.
