import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BottomNavigationBar } from "./BottomNavigationBar";
import { useSession } from "../session/SessionProvider";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { AssociationRatesScreen } from "../screens/dashboard/AssociationRatesScreen";
import { HomeDashboardScreen } from "../screens/dashboard/HomeDashboardScreen";
import { StateRatesScreen } from "../screens/dashboard/StateRatesScreen";
import { CompanyProfileScreen } from "../screens/directory/CompanyProfileScreen";
import { MarketTiersScreen } from "../screens/directory/MarketTiersScreen";
import { ProductSearchScreen } from "../screens/directory/ProductSearchScreen";
import { MeetingDetailScreen } from "../screens/news/MeetingDetailScreen";
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
      tabBar={(props) => <BottomNavigationBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="Home" component={HomeDashboardScreen} options={{ tabBarLabel: "HOME" }} />
      <Tabs.Screen name="Market" component={MarketTiersScreen} options={{ tabBarLabel: "MARKET" }} />
      <Tabs.Screen name="Services" component={ServicesScreen} options={{ tabBarLabel: "SERVICES" }} />
      <Tabs.Screen name="News" component={NewsAlertsScreen} options={{ tabBarLabel: "NEWS" }} />
      <Tabs.Screen name="Profile" component={MemberProfileScreen} options={{ tabBarLabel: "PROFILE" }} />
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
          <Stack.Screen name="AssociationRates" component={AssociationRatesScreen} options={{ title: "Other Associations" }} />
          <Stack.Screen name="StateRates" component={StateRatesScreen} options={{ title: "Other States" }} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ title: "Company Profile" }} />
          <Stack.Screen name="ProductSearch" component={ProductSearchScreen} options={{ title: "Product Search" }} />
          <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} options={{ title: "Meeting" }} />
          <Stack.Screen name="ReverseSearch" component={ReverseSearchScreen} options={{ title: "Reverse Search" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
