import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BottomNavigationBar } from "./BottomNavigationBar";
import { useSession } from "../session/SessionProvider";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { AssociationRatesScreen } from "../screens/dashboard/AssociationRatesScreen";
import { HomeDashboardScreen } from "../screens/dashboard/HomeDashboardScreen";
import { RateDetailsScreen } from "../screens/dashboard/RateDetailsScreen";
import { StateRatesScreen } from "../screens/dashboard/StateRatesScreen";
import { CompanyDirectoryScreen } from "../screens/directory/CompanyDirectoryScreen";
import { CompanyProfileScreen } from "../screens/directory/CompanyProfileScreen";
import { MarketTiersScreen } from "../screens/directory/MarketTiersScreen";
import { ProductDetailScreen } from "../screens/directory/ProductDetailScreen";
import { ProductSearchScreen } from "../screens/directory/ProductSearchScreen";
import { MeetingDetailScreen } from "../screens/news/MeetingDetailScreen";
import { NewsAlertsScreen } from "../screens/news/NewsAlertsScreen";
import { NewsDetailScreen } from "../screens/news/NewsDetailScreen";
import { ManageNewsScreen, ManageUsersScreen, MarketInsightsScreen, PendingApprovalsScreen } from "../screens/profile/AdminToolsScreens";
import { CompanyPlanScreen } from "../screens/profile/CompanyPlanScreen";
import { CompanyNotificationManagementScreen } from "../screens/profile/CompanyNotificationManagementScreen";
import { CompanyProductsScreen } from "../screens/profile/CompanyProductsScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { HelpSupportScreen } from "../screens/profile/HelpSupportScreen";
import { MemberProfileScreen } from "../screens/profile/MemberProfileScreen";
import { NotificationsScreen } from "../screens/profile/NotificationsScreen";
import { NotificationSettingsScreen } from "../screens/profile/NotificationSettingsScreen";
import { UpgradePlanScreen } from "../screens/profile/UpgradePlanScreen";
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
          <Stack.Screen name="AssociationRates" component={AssociationRatesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StateRates" component={StateRatesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RateDetails" component={RateDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CompanyDirectory" component={CompanyDirectoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ title: "Company Profile" }} />
          <Stack.Screen name="ProductSearch" component={ProductSearchScreen} options={{ title: "Product Search" }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} options={{ title: "Meeting" }} />
          <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: "News" }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: "Notification Settings" }} />
          <Stack.Screen
            name="CompanyNotificationManagement"
            component={CompanyNotificationManagementScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: "Help & Support" }} />
          <Stack.Screen name="CompanyPlan" component={CompanyPlanScreen} options={{ title: "Company Plan" }} />
          <Stack.Screen name="UpgradePlan" component={UpgradePlanScreen} options={{ title: "Upgrade Plan" }} />
          <Stack.Screen name="CompanyProducts" component={CompanyProductsScreen} options={{ title: "Manage Products" }} />
          <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} options={{ title: "Pending Approvals" }} />
          <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: "Manage Users" }} />
          <Stack.Screen name="ManageNews" component={ManageNewsScreen} options={{ title: "Manage News" }} />
          <Stack.Screen name="MarketInsights" component={MarketInsightsScreen} options={{ title: "Market Insights" }} />
          <Stack.Screen name="ReverseSearch" component={ReverseSearchScreen} options={{ title: "Reverse Search" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
