import { Linking } from "react-native";

import { AdvertisementItem } from "../types/api";

const INTERNAL_SCREEN_WHITELIST = new Set([
  "Home",
  "Market",
  "Services",
  "News",
  "Profile",
  "MainTabs",
  "AssociationRates",
  "StateRates",
  "CompanyProfile",
  "ProductSearch",
  "ProductDetail",
  "MeetingDetail",
  "ReverseSearch",
]);

export async function executeAdvertisementAction(advertisement: AdvertisementItem, navigation: { navigate: (screen: string, params?: object) => void }) {
  const { action_type: actionType, action_payload: actionPayload } = advertisement;

  switch (actionType) {
    case "external_url":
      if (actionPayload.url) {
        await Linking.openURL(actionPayload.url);
      }
      return;
    case "internal_screen":
      if (actionPayload.screen && INTERNAL_SCREEN_WHITELIST.has(actionPayload.screen)) {
        navigation.navigate(actionPayload.screen, actionPayload.params);
      }
      return;
    case "company":
      if (actionPayload.company_id) {
        navigation.navigate("CompanyProfile", { companyId: actionPayload.company_id });
      }
      return;
    case "product":
      if (actionPayload.product_id) {
        navigation.navigate("ProductDetail", {
          productId: actionPayload.product_id,
          companyId: actionPayload.company_id,
        });
      }
      return;
    case "category":
      if (actionPayload.category) {
        navigation.navigate("ProductSearch", { categoryName: actionPayload.category });
      }
      return;
    default:
      if (__DEV__) {
        console.warn(`Unknown ad action type: ${actionType}`);
      }
  }
}
