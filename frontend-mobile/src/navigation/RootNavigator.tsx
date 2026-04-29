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
import { NewsDetailScreen } from "../screens/news/NewsDetailScreen";
import { ManageNewsScreen, ManageUsersScreen, PendingApprovalsScreen } from "../screens/profile/AdminToolsScreens";
import { CompanyPlanScreen } from "../screens/profile/CompanyPlanScreen";
import { CompanyProductsScreen } from "../screens/profile/CompanyProductsScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { HelpSupportScreen } from "../screens/profile/HelpSupportScreen";
import { MemberProfileScreen } from "../screens/profile/MemberProfileScreen";
import { NotificationSettingsScreen } from "../screens/profile/NotificationSettingsScreen";
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
          <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: "News" }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: "Notification Settings" }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: "Help & Support" }} />
          <Stack.Screen name="CompanyPlan" component={CompanyPlanScreen} options={{ title: "Company Plan" }} />
          <Stack.Screen name="CompanyProducts" component={CompanyProductsScreen} options={{ title: "Manage Products" }} />
          <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} options={{ title: "Pending Approvals" }} />
          <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: "Manage Users" }} />
          <Stack.Screen name="ManageNews" component={ManageNewsScreen} options={{ title: "Manage News" }} />
          <Stack.Screen name="ReverseSearch" component={ReverseSearchScreen} options={{ title: "Reverse Search" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
