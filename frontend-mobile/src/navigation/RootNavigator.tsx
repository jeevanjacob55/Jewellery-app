import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useSession } from "../session/SessionProvider";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { HomeDashboardScreen } from "../screens/dashboard/HomeDashboardScreen";
import { CompanyProfileScreen } from "../screens/directory/CompanyProfileScreen";
import { MarketTiersScreen } from "../screens/directory/MarketTiersScreen";
import { ProductSearchScreen } from "../screens/directory/ProductSearchScreen";
import { NewsAlertsScreen } from "../screens/news/NewsAlertsScreen";
import { MemberProfileScreen } from "../screens/profile/MemberProfileScreen";
import { ReverseSearchScreen } from "../screens/reverse-search/ReverseSearchScreen";
import { ServicesScreen } from "../screens/services/ServicesScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A1A1A",
        tabBarInactiveTintColor: "#7D7A79",
      }}
    >
      <Tabs.Screen name="Home" component={HomeDashboardScreen} />
      <Tabs.Screen name="Market" component={MarketTiersScreen} />
      <Tabs.Screen name="Services" component={ServicesScreen} />
      <Tabs.Screen name="News" component={NewsAlertsScreen} />
      <Tabs.Screen name="Profile" component={MemberProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useSession();

  if (status === "booting") {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator>
      {status === "signedOut" ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ title: "Company Profile" }} />
          <Stack.Screen name="ProductSearch" component={ProductSearchScreen} options={{ title: "Product Search" }} />
          <Stack.Screen name="ReverseSearch" component={ReverseSearchScreen} options={{ title: "Reverse Search" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
