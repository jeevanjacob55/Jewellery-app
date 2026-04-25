# Jewellery Association App: Technical Specifications & Architecture

This document provides a detailed breakdown of the selected screens, their features, and how they integrate into a professional B2B utility ecosystem for gold merchants and traders.

## 1. App Architecture & Flow
The application follows a hierarchical, modular structure designed for professional utility and fast data access.

*   **Entry Layer:** Splash Screen → Authentication (Login/Onboarding).
*   **Operational Layer:** Home Dashboard (Bullion Rates & Global Trends).
*   **Commerce Layer:** Market Tiers (Discovery) → Company Profile → Product Search → Reverse Search.
*   **Utility Layer:** Services (Compliance) → News & Alerts.
*   **Account & Admin Layer:** Member Profile → Advertiser Portal → Admin Dashboard.

---

## 2. Screen-by-Screen Specifications

### 2.1 Splash Screen {{DATA:SCREEN:SCREEN_29}}
*   **Core Purpose:** Brand authority and leadership recognition.
*   **Specifications:**
    *   **Visuals:** High-contrast logo placement at the top.
    *   **Leadership Segment:** Large, grayscale portraits of association leaders (President, Secretary) with gold-accented titles.
    *   **Logic:** Auto-dismissal after 3 seconds to the Login flow.

### 2.2 Login & Onboarding {{DATA:SCREEN:SCREEN_27}}
*   **Core Purpose:** Secure, tiered access for association members.
*   **Specifications:**
    *   **Auth Methods:** Corporate email/password login and Google SSO integration.
    *   **Regional Sync:** Three-tier selection (State → District → Local Chapter) to filter bullion rates and news dynamically.
    *   **Guest Access:** "Continue as Guest" for limited directory browsing.

### 2.3 Home Dashboard (Final) {{DATA:SCREEN:SCREEN_20}}
*   **Core Purpose:** The central command center for daily gold trade.
*   **Specifications:**
    *   **Navy Rate Card:** Dominant card showing 22K, 24K Gold and Silver rates with real-time trend indicators (↑/↓).
    *   **Rate Toggles:** Direct buttons for "Other Associations" and "Other States" to facilitate market comparison.
    *   **Global Trends:** Live tracking of USD/INR and Gold/Oz prices.
    *   **Interaction:** Quick action grid for direct navigation to core modules.

### 2.4 Market Tiers {{DATA:SCREEN:SCREEN_28}}
*   **Core Purpose:** B2B discovery and networking hierarchy.
*   **Specifications:**
    *   **Category Filter:** Horizontal chips (Manufacturer, Wholesaler, Trader, Supplier).
    *   **Tier 1 (Premium):** Large cards with "PREMIUM" badges and multiple product previews.
    *   **Tier 2 (Pro):** Horizontally scrollable medium-sized cards for balanced visibility.
    *   **Tier 3 (Normal):** Compact 2-column grid focusing on names and locations for high-density browsing.

### 2.5 Company Profile {{DATA:SCREEN:SCREEN_13}}
*   **Core Purpose:** Deep-dive verification and business exploration.
*   **Specifications:**
    *   **Verification Stack:** GST Registered, BIS Hallmarked, and Export License status with visual checkmarks.
    *   **About Section:** Professional narrative and operational capacity (Daily capacity, Specialization).
    *   **Visual Catalog:** A high-end vertical product preview gallery with "Enquire Now" CTA.

### 2.6 Product Search & Catalog {{DATA:SCREEN:SCREEN_32}}
*   **Core Purpose:** High-fidelity, unblurred B2B product browsing.
*   **Specifications:**
    *   **Filter System:** Bottom-sheet drawer for Weight (5g-50g+), Purity (22K/24K), and Category (Ring, Chain, etc.).
    *   **Product Cards:** High-resolution imagery, weight specs, and immediate "Enquire" buttons linked to supplier IDs.

### 2.7 Reverse Design Search {{DATA:SCREEN:SCREEN_16}}
*   **Core Purpose:** AI-driven supplier matching via visual inputs.
*   **Specifications:**
    *   **Upload Module:** Drag-and-drop/File picker for sketches or product photos.
    *   **Matching Engine:** "AI Matching Insights" showing percentage-based visual matches with specific guilds/suppliers.
    *   **IP Protection:** Explicit security guidelines regarding encrypted uploads and verified-member-only sharing.

### 2.8 Services & Compliance {{DATA:SCREEN:SCREEN_12}}
*   **Core Purpose:** Operational risk management and legal standards.
*   **Specifications:**
    *   **Compliance Overview:** Action-oriented cards for Calibration and License Renewals with "Due in X days" or "Action Required" status.
    *   **Service Grid:** Unified request system for Weighing Machine Calibration, Hallmarking, and Diamond Certification.
    *   **Transparency:** Average Turnaround Time (TAT) and Accuracy metrics displayed at the bottom.

### 2.9 News & Alerts {{DATA:SCREEN:SCREEN_15}}
*   **Core Purpose:** Industry communication and policy dissemination.
*   **Specifications:**
    *   **Urgent Alerts:** Dominant hero card for government policy updates (e.g., GST changes).
    *   **Event Module:** Dedicated "Meeting" cards with "Add to Calendar" functionality and location details.
    *   **Secondary Market Data:** Compact ticker for live gold/silver rates.

### 2.10 Member Profile {{DATA:SCREEN:SCREEN_31}}
*   **Core Purpose:** Personalization and account management.
*   **Specifications:**
    *   **User ID:** Platinum Member status and unique Jeweller ID verification.
    *   **Notification Controls:** Granular toggle switches for Rate Alerts, News, and Ads.
    *   **Settings Utility:** Quick access to security, support, and logout.

### 2.11 Advertiser Portal {{DATA:SCREEN:SCREEN_19}}
*   **Core Purpose:** B2B monetization flow.
*   **Specifications:**
    *   **Creative Intake:** Upload module for banner assets with size/type validation.
    *   **Targeting Logic:** Tiered reach selection (Global, State, or Local Trade Only).
    *   **Live Preview:** Real-time rendering of the ad banner as it will appear on the dashboard.

### 2.12 Admin Dashboard {{DATA:SCREEN:SCREEN_14}}
*   **Core Purpose:** Centralized oversight and data management.
*   **Specifications:**
    *   **Action Grid:** Shortcuts for Ad Approval, User Verification, and Manual Rate Updates.
    *   **Analytics Pulse:** Active member tracking vs. annual targets and revenue estimates.
    *   **System Logs:** Real-time event log for security and administrative transparency.

---

## 3. Global Interaction Rules
*   **Navigation:** Fixed 5-tab bottom navigation for primary modules.
*   **State Management:** Bullion rates and news items are filtered based on the region selected during onboarding.
*   **Feedback:** Active/Pressed states on all cards (0.95 scale) to ensure a high-quality "app" feel.
