import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getJson, postJson } from "../../api/client";
import { AppScreen } from "../../components/AppScreen";
import { FilterChip } from "../../components/FilterChip";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  Association,
  Company,
  DistrictOperationalUnit,
  GoogleLoginBlockedResponse,
  MemberAccessRequestPayload,
  MemberAccessRequestResponse,
  RegionState,
  Unit,
} from "../../types/api";

type AuthMode = "member" | "guest";
type RequestSelectorMode = "company" | "state" | "association" | "district" | "unit" | null;

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const { continueAsGuest, sessionInfo, signInMember, signInWithGoogle } = useSession();
  const insets = useSafeAreaInsets();
  const googleClientId =
    (Platform.OS === "android" ? GOOGLE_ANDROID_CLIENT_ID : GOOGLE_IOS_CLIENT_ID) || GOOGLE_WEB_CLIENT_ID;
  const googleRedirectUri = AuthSession.makeRedirectUri({
    scheme: "jewelleryassociation",
    path: "oauthredirect",
  });
  const [authMode, setAuthMode] = useState<AuthMode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [states, setStates] = useState<RegionState[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedState, setSelectedState] = useState<RegionState | null>(null);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [selectedDistrictUnit, setSelectedDistrictUnit] = useState<DistrictOperationalUnit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestFullName, setRequestFullName] = useState("");
  const [requestPhoneNumber, setRequestPhoneNumber] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestBusinessName, setRequestBusinessName] = useState("");
  const [requestCompanyId, setRequestCompanyId] = useState<number | null>(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [requestState, setRequestState] = useState<RegionState | null>(null);
  const [requestAssociation, setRequestAssociation] = useState<Association | null>(null);
  const [requestDistrictUnit, setRequestDistrictUnit] = useState<DistrictOperationalUnit | null>(null);
  const [requestUnit, setRequestUnit] = useState<Unit | null>(null);
  const [requestSelectorMode, setRequestSelectorMode] = useState<RequestSelectorMode>(null);
  const [requestSelectorQuery, setRequestSelectorQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRequestContext() {
      try {
        const [nextStates, nextCompanies] = await Promise.all([
          getJson<RegionState[]>("/regions/"),
          getJson<Company[]>("/directory/companies/"),
        ]);
        if (!active) {
          return;
        }
        setStates(nextStates);
        setCompanies(nextCompanies);
        setSelectedState(nextStates[0] ?? null);
        setSelectedAssociation(null);
        setSelectedDistrictUnit(null);
        setSelectedUnit(null);
      } catch {
        if (active) {
          setError("Unable to load the region hierarchy right now.");
        }
      } finally {
        if (active) {
          setLoadingRegions(false);
          setLoadingCompanies(false);
        }
      }
    }

    void loadRequestContext();

    return () => {
      active = false;
    };
  }, []);

  function handleStateSelect(state: RegionState) {
    setSelectedState(state);
    setSelectedAssociation(null);
    setSelectedDistrictUnit(null);
    setSelectedUnit(null);
  }

  function handleAssociationSelect(association: Association) {
    setSelectedAssociation(association);
    setSelectedDistrictUnit(null);
    setSelectedUnit(null);
  }

  function handleDistrictUnitSelect(districtUnit: DistrictOperationalUnit) {
    setSelectedDistrictUnit(districtUnit);
    setSelectedUnit(null);
  }

  async function handleMemberLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Enter both username and password to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signInMember({ username: username.trim(), password });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuestAccess() {
    if (!guestName.trim() || !selectedState) {
      setError("Enter a guest name and choose a state to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await continueAsGuest({
        guest_name: guestName.trim(),
        state_id: selectedState.id,
        association_id: selectedAssociation?.id,
        district_operational_unit_id: selectedDistrictUnit?.id,
        unit_id: selectedUnit?.id,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Guest access failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function openRequestAccess(prefillEmail?: string) {
    setRequestError(null);
    if (prefillEmail) {
      setRequestEmail(prefillEmail);
    }
    setRequestModalVisible(true);
  }

  function buildGoogleAuthUrl() {
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", googleClientId);
    authUrl.searchParams.set("redirect_uri", googleRedirectUri);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account");
    return authUrl.toString();
  }

  function extractIdTokenFromRedirect(url: string) {
    const [baseUrl, fragment = ""] = url.split("#");
    const fragmentParams = new URLSearchParams(fragment);
    const tokenFromFragment = fragmentParams.get("id_token");
    if (tokenFromFragment) {
      return tokenFromFragment;
    }

    const queryString = baseUrl.includes("?") ? baseUrl.split("?")[1] : "";
    const queryParams = new URLSearchParams(queryString);
    return queryParams.get("id_token");
  }

  function handleGoogleBlockedResponse(response: GoogleLoginBlockedResponse) {
    if (response.status === "access_required") {
      setRequestEmail(response.email ?? "");
      setRequestModalVisible(true);
      Alert.alert("Access request required", response.message);
      return;
    }
    if (response.status === "pending_approval") {
      Alert.alert("Pending approval", response.message);
      return;
    }
    if (response.status === "rejected") {
      Alert.alert("Access rejected", response.message);
      return;
    }
    if (response.status === "inactive") {
      Alert.alert("Account inactive", response.message);
      return;
    }
    Alert.alert("Unable to sign in", response.message);
  }

  async function handleGoogleLogin() {
    if (!sessionInfo?.supports_google_sso) {
      Alert.alert("Unavailable", "Google sign-in is not configured for this environment yet.");
      return;
    }
    if (!googleClientId) {
      Alert.alert("Missing configuration", "Google client IDs are missing for this mobile build.");
      return;
    }

    setGoogleSubmitting(true);
    setError(null);

    try {
      const result = await WebBrowser.openAuthSessionAsync(buildGoogleAuthUrl(), googleRedirectUri);
      if (result.type !== "success") {
        return;
      }

      const idToken = extractIdTokenFromRedirect(result.url);
      if (typeof idToken !== "string" || !idToken) {
        throw new Error("Google sign-in did not return an ID token.");
      }

      const blockedResponse = await signInWithGoogle(idToken);
      if (blockedResponse) {
        handleGoogleBlockedResponse(blockedResponse);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Google sign-in failed.";
      setError(message);
      Alert.alert("Google sign-in failed", message);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert("Coming soon", "Forgot password support will be connected after the recovery flow is added.");
  }

  function closeRequestAccess() {
    if (requestSubmitting) {
      return;
    }
    closeRequestSelector();
    setRequestModalVisible(false);
  }

  const selectedRequestCompany = useMemo(
    () => companies.find((company) => company.id === requestCompanyId) ?? null,
    [companies, requestCompanyId],
  );
  const isCompanyLinkedRequest = Boolean(selectedRequestCompany);
  const isAssociationLocked = Boolean(selectedRequestCompany?.association_ref?.id);
  const isStateLocked = isCompanyLinkedRequest;

  const requestSelectorOptions = useMemo(() => {
    const normalizedQuery = requestSelectorQuery.trim().toLowerCase();

    if (requestSelectorMode === "company") {
      return [
        {
          key: "company-independent",
          label: "Independent member / company not listed",
          subtitle: "Use this if you do not belong to a listed company. You will choose the association manually.",
          onPress: () => {
            setRequestCompanyId(null);
            setRequestBusinessName("");
            setRequestState(null);
            setRequestAssociation(null);
            setRequestDistrictUnit(null);
            setRequestUnit(null);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        },
        ...companies
        .filter((company) => {
          if (!normalizedQuery) {
            return true;
          }
          return [company.name, company.city, company.state]
            .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
        })
        .map((company) => ({
          key: `company-${company.id}`,
          label: company.name,
          subtitle: [company.city, company.state].filter(Boolean).join(", ") || "Location unavailable",
          onPress: () => {
            setRequestCompanyId(company.id);
            setRequestBusinessName(company.name);
            const matchingState = company.state_ref?.id
              ? states.find((state) => state.id === company.state_ref?.id) ?? null
              : states.find((state) => state.name.toLowerCase() === company.state.toLowerCase()) ?? null;
            setRequestState(matchingState);
            const matchingAssociation =
              matchingState && company.association_ref?.id
                ? matchingState.associations.find((association) => association.id === company.association_ref?.id) ?? null
                : null;
            setRequestAssociation(matchingAssociation);
            setRequestDistrictUnit(null);
            setRequestUnit(null);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        })),
      ].filter((option) => {
        if (!normalizedQuery) {
          return true;
        }
        return [option.label, option.subtitle].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedQuery));
      });
    }

    if (requestSelectorMode === "state") {
      return states
        .filter((state) => !normalizedQuery || state.name.toLowerCase().includes(normalizedQuery))
        .map((state) => ({
          key: `state-${state.id}`,
          label: state.name,
          subtitle: `${state.associations.length} association${state.associations.length === 1 ? "" : "s"}`,
          onPress: () => {
            setRequestState(state);
            setRequestAssociation(null);
            setRequestDistrictUnit(null);
            setRequestUnit(null);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        }));
    }

    if (requestSelectorMode === "association") {
      return (requestState?.associations ?? [])
        .filter((association) => !normalizedQuery || association.name.toLowerCase().includes(normalizedQuery))
        .map((association) => ({
          key: `association-${association.id}`,
          label: association.name,
          subtitle: `${association.district_units.length} district unit${association.district_units.length === 1 ? "" : "s"}`,
          onPress: () => {
            setRequestAssociation(association);
            setRequestDistrictUnit(null);
            setRequestUnit(null);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        }));
    }

    if (requestSelectorMode === "district") {
      return (requestAssociation?.district_units ?? [])
        .filter((districtUnit) => !normalizedQuery || districtUnit.name.toLowerCase().includes(normalizedQuery))
        .map((districtUnit) => ({
          key: `district-${districtUnit.id}`,
          label: districtUnit.name,
          subtitle: `${districtUnit.units.length} local unit${districtUnit.units.length === 1 ? "" : "s"}`,
          onPress: () => {
            setRequestDistrictUnit(districtUnit);
            setRequestUnit(null);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        }));
    }

    if (requestSelectorMode === "unit") {
      return (requestDistrictUnit?.units ?? [])
        .filter((unit) => !normalizedQuery || unit.name.toLowerCase().includes(normalizedQuery))
        .map((unit) => ({
          key: `unit-${unit.id}`,
          label: unit.name,
          subtitle: requestDistrictUnit?.name ?? "Local unit",
          onPress: () => {
            setRequestUnit(unit);
            setRequestSelectorMode(null);
            setRequestSelectorQuery("");
          },
        }));
    }

    return [];
  }, [companies, requestAssociation, requestDistrictUnit, requestSelectorMode, requestSelectorQuery, requestState, states]);

  function openRequestSelector(mode: Exclude<RequestSelectorMode, null>) {
    if (mode === "association" && !requestState) {
      setRequestError("Choose a state before selecting an association.");
      return;
    }
    if (mode === "district" && !requestAssociation) {
      setRequestError("Choose an association before selecting a district unit.");
      return;
    }
    if (mode === "unit" && !requestDistrictUnit) {
      setRequestError("Choose a district unit before selecting a local unit.");
      return;
    }

    setRequestError(null);
    setRequestSelectorQuery("");
    setRequestSelectorMode(mode);
  }

  function closeRequestSelector() {
    setRequestSelectorMode(null);
    setRequestSelectorQuery("");
  }

  async function handleMemberAccessRequestSubmit() {
    if (
      !requestFullName.trim() ||
      !requestPhoneNumber.trim() ||
      !requestEmail.trim() ||
      !requestBusinessName.trim() ||
      !requestState ||
      !requestAssociation ||
      !requestDistrictUnit ||
      !requestUnit
    ) {
      setRequestError("Complete all required fields and select the full hierarchy path to submit your request.");
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);

    try {
      const payload: MemberAccessRequestPayload = {
        full_name: requestFullName.trim(),
        phone_number: requestPhoneNumber.trim(),
        email: requestEmail.trim(),
        business_name: requestBusinessName.trim(),
        state_id: requestState.id,
        association_id: requestAssociation.id,
        district_operational_unit_id: requestDistrictUnit.id,
        unit_id: requestUnit.id,
        notes: requestNotes.trim(),
      };
      const response = await postJson<MemberAccessRequestResponse>("/auth/member-access-request/", payload);

      setRequestModalVisible(false);
      setRequestFullName("");
      setRequestPhoneNumber("");
      setRequestEmail("");
      setRequestBusinessName("");
      setRequestCompanyId(null);
      setRequestNotes("");
      setRequestState(null);
      setRequestAssociation(null);
      setRequestDistrictUnit(null);
      setRequestUnit(null);
      setRequestSelectorMode(null);
      setRequestSelectorQuery("");
      Alert.alert(
        "Request submitted",
        `${response.request.association.name} will review your member access request shortly.`,
      );
    } catch (nextError) {
      setRequestError(nextError instanceof Error ? nextError.message : "Unable to submit the member access request.");
    } finally {
      setRequestSubmitting(false);
    }
  }

  return (
    <>
      <AppScreen scrollable safeAreaEdges={["top", "bottom"]} contentContainerStyle={styles.content}>
        <View style={styles.authContainer}>
          <View style={styles.tabRow}>
            <Pressable style={styles.tabButton} onPress={() => setAuthMode("member")}>
              <Text style={[styles.tabLabel, authMode === "member" && styles.activeTabLabel]}>Member Login</Text>
              {authMode === "member" ? <View style={styles.activeTabLine} /> : null}
            </Pressable>
            <Pressable style={styles.tabButton} onPress={() => setAuthMode("guest")}>
              <Text style={[styles.tabLabel, authMode === "guest" && styles.activeTabLabel]}>Guest Browse</Text>
              {authMode === "guest" ? <View style={styles.activeTabLine} /> : null}
            </Pressable>
          </View>

          <View style={styles.brandBlock}>
            <View style={styles.logoTile}>
              <Text style={styles.logoGlyph}>◇</Text>
              <Text style={styles.logoCaption}>JA</Text>
            </View>
            <Text style={styles.heroTitle}>Jewellery{"\n"}Association</Text>
            <Text style={styles.heroSubtitle}>Regional trade and member portal</Text>
            <Text style={styles.heroDescription}>
              Welcome back. Sign in as a verified member, browse as a guest, or request member access.
            </Text>
          </View>

          <View style={styles.formCard}>
            {authMode === "member" ? (
              <>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Trade ID or Email"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor="#6B7280"
                />

                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="........"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    placeholderTextColor="#6B7280"
                  />
                  <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((current) => !current)}>
                    <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color="#4B5563" />
                  </Pressable>
                </View>

                <View style={styles.utilityRow}>
                  <Pressable style={styles.rememberRow} onPress={() => setRememberMe((current) => !current)}>
                    <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                      {rememberMe ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable onPress={handleForgotPassword}>
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Guest Name</Text>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Trade visitor name"
                  style={styles.input}
                  placeholderTextColor="#6B7280"
                />

                <Text style={styles.inputLabel}>State</Text>
                {loadingRegions ? (
                  <ActivityIndicator color={colors.text} style={styles.loader} />
                ) : (
                  <View style={styles.chipWrap}>
                    {states.map((state) => (
                      <FilterChip
                        key={state.id}
                        label={state.name}
                        selected={selectedState?.id === state.id}
                        onPress={() => handleStateSelect(state)}
                      />
                    ))}
                  </View>
                )}

                {selectedState?.associations.length ? (
                  <>
                    <Text style={styles.inputLabel}>Association</Text>
                    <View style={styles.chipWrap}>
                      {selectedState.associations.map((association) => (
                        <FilterChip
                          key={association.id}
                          label={association.name}
                          selected={selectedAssociation?.id === association.id}
                          onPress={() => handleAssociationSelect(association)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {selectedAssociation?.district_units.length ? (
                  <>
                    <Text style={styles.inputLabel}>District Unit</Text>
                    <View style={styles.chipWrap}>
                      {selectedAssociation.district_units.map((districtUnit) => (
                        <FilterChip
                          key={districtUnit.id}
                          label={districtUnit.name}
                          selected={selectedDistrictUnit?.id === districtUnit.id}
                          onPress={() => handleDistrictUnitSelect(districtUnit)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {selectedDistrictUnit?.units.length ? (
                  <>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <View style={styles.chipWrap}>
                      {selectedDistrictUnit.units.map((unit) => (
                        <FilterChip
                          key={unit.id}
                          label={unit.name}
                          selected={selectedUnit?.id === unit.id}
                          onPress={() => setSelectedUnit(unit)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                <Text style={styles.guestHint}>Guests can browse public association information and selected market views.</Text>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, submitting && styles.disabledButton]}
              onPress={authMode === "member" ? handleMemberLogin : handleGuestAccess}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Please wait..." : authMode === "member" ? "Continue" : "Enter as Guest"}
              </Text>
            </Pressable>

            {authMode === "member" ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerLabel}>Social Login</Text>
                  <View style={styles.divider} />
                </View>

                <Pressable
                  style={[
                    styles.googleButton,
                    (!sessionInfo?.supports_google_sso || !googleClientId || googleSubmitting) && styles.googleButtonDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={!sessionInfo?.supports_google_sso || !googleClientId || googleSubmitting}
                >
                  <View style={styles.googleIconTile}>
                    <Text style={styles.googleGlyph}>G</Text>
                  </View>
                  <Text style={styles.googleText}>{googleSubmitting ? "Verifying..." : "Continue with Google"}</Text>
                  {!sessionInfo?.supports_google_sso || !googleClientId ? (
                    <View style={styles.googleBadge}>
                      <Text style={styles.googleBadgeText}>Unavailable</Text>
                    </View>
                  ) : null}
                </Pressable>
              </>
            ) : null}
          </View>

          <Pressable style={styles.requestButton} onPress={() => openRequestAccess()}>
            <Text style={styles.requestButtonText}>Request Member Access</Text>
          </Pressable>
        </View>
      </AppScreen>

      <Modal
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : "fullScreen"}
        transparent
        statusBarTranslucent
        visible={requestModalVisible}
        onRequestClose={closeRequestAccess}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Request Member Access</Text>
                <Text style={styles.modalSubtitle}>Submit your business and association details for admin review.</Text>
              </View>
              <Pressable onPress={closeRequestAccess} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: spacing.xl + insets.bottom }]}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput value={requestFullName} onChangeText={setRequestFullName} style={styles.input} placeholder="Applicant name" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput value={requestPhoneNumber} onChangeText={setRequestPhoneNumber} style={styles.input} placeholder="Contact number" placeholderTextColor="#6B7280" keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput value={requestEmail} onChangeText={setRequestEmail} style={styles.input} placeholder="name@example.com" placeholderTextColor="#6B7280" autoCapitalize="none" keyboardType="email-address" />

              <Text style={styles.inputLabel}>Business Name</Text>
              <SelectorField
                value={requestBusinessName}
                placeholder={loadingCompanies ? "Loading companies..." : "Select your company or choose independent"}
                onPress={() => openRequestSelector("company")}
                disabled={loadingCompanies || companies.length === 0}
              />
              {selectedRequestCompany ? (
                <Text style={styles.selectorHint}>
                  {[selectedRequestCompany.city, selectedRequestCompany.state].filter(Boolean).join(", ") || "Company selected"}
                </Text>
              ) : null}
              {!selectedRequestCompany ? (
                <>
                  <Text style={styles.selectorHint}>Independent members can continue without a listed company, but a business name is still required.</Text>
                  <TextInput
                    value={requestBusinessName}
                    onChangeText={setRequestBusinessName}
                    style={styles.input}
                    placeholder="Enter your business name"
                    placeholderTextColor="#6B7280"
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>State</Text>
              <SelectorField
                value={requestState?.name ?? ""}
                placeholder={loadingRegions ? "Loading states..." : "Select state"}
                onPress={() => openRequestSelector("state")}
                disabled={loadingRegions || states.length === 0 || isStateLocked}
              />
              {isStateLocked ? <Text style={styles.selectorHint}>State is locked to the selected company.</Text> : null}

              <Text style={styles.inputLabel}>Association</Text>
              <SelectorField
                value={requestAssociation?.name ?? ""}
                placeholder={
                  isAssociationLocked
                    ? "Association auto-selected from company"
                    : !requestState
                      ? "Select state first"
                      : "Select association"
                }
                onPress={() => openRequestSelector("association")}
                disabled={isAssociationLocked || !requestState || requestState.associations.length === 0}
              />
              {isAssociationLocked ? (
                <Text style={styles.selectorHint}>Association is locked because this company already belongs to that association.</Text>
              ) : (
                <Text style={styles.selectorHint}>Association selection is only needed for independent members without a linked company.</Text>
              )}

              <Text style={styles.inputLabel}>District Unit</Text>
              <SelectorField
                value={requestDistrictUnit?.name ?? ""}
                placeholder={!requestAssociation ? "Select association first" : "Select district unit"}
                onPress={() => openRequestSelector("district")}
                disabled={!requestAssociation || requestAssociation.district_units.length === 0}
              />

              <Text style={styles.inputLabel}>Unit</Text>
              <SelectorField
                value={requestUnit?.name ?? ""}
                placeholder={!requestDistrictUnit ? "Select district unit first" : "Select local unit"}
                onPress={() => openRequestSelector("unit")}
                disabled={!requestDistrictUnit || requestDistrictUnit.units.length === 0}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                value={requestNotes}
                onChangeText={setRequestNotes}
                style={[styles.input, styles.notesInput]}
                placeholder="Optional membership or business details"
                placeholderTextColor="#6B7280"
                multiline
                textAlignVertical="top"
              />

              {requestError ? <Text style={styles.error}>{requestError}</Text> : null}

              <Pressable style={[styles.primaryButton, requestSubmitting && styles.disabledButton]} onPress={handleMemberAccessRequestSubmit} disabled={requestSubmitting}>
                <Text style={styles.primaryButtonText}>{requestSubmitting ? "Submitting..." : "Submit Request"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        visible={requestSelectorMode !== null}
        onRequestClose={closeRequestSelector}
      >
        <View style={styles.selectorScreen}>
          <View style={styles.selectorHeader}>
            <View>
              <Text style={styles.modalTitle}>{getSelectorTitle(requestSelectorMode)}</Text>
              <Text style={styles.modalSubtitle}>{getSelectorSubtitle(requestSelectorMode)}</Text>
            </View>
            <Pressable onPress={closeRequestSelector} hitSlop={12}>
              <Text style={styles.modalClose}>×</Text>
            </Pressable>
          </View>

          <View style={styles.selectorSearchWrap}>
            <MaterialIcons name="search" size={20} color="#4C4546" style={styles.selectorSearchIcon} />
            <TextInput
              value={requestSelectorQuery}
              onChangeText={setRequestSelectorQuery}
              placeholder={requestSelectorMode === "company" ? "Search companies or locations" : "Search options"}
              placeholderTextColor="#7E7576"
              style={styles.selectorSearchInput}
            />
          </View>

          <ScrollView contentContainerStyle={[styles.selectorList, { paddingBottom: spacing.xl + insets.bottom }]}>
            {requestSelectorOptions.length ? (
              requestSelectorOptions.map((option) => (
                <Pressable key={option.key} style={styles.selectorItem} onPress={option.onPress}>
                  <View style={styles.selectorItemCopy}>
                    <Text style={styles.selectorItemTitle}>{option.label}</Text>
                    {option.subtitle ? <Text style={styles.selectorItemSubtitle}>{option.subtitle}</Text> : null}
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={16} color="#7E7576" />
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptyDetail}>Try a different search or go back and choose a broader parent option first.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function SelectorField({
  value,
  placeholder,
  onPress,
  disabled = false,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.selectorField, disabled && styles.selectorFieldDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={value ? styles.selectorFieldValue : styles.selectorFieldPlaceholder}>
        {value || placeholder}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={22} color="#4C4546" />
    </Pressable>
  );
}

function getSelectorTitle(mode: RequestSelectorMode) {
  switch (mode) {
    case "company":
      return "Select Company";
    case "state":
      return "Select State";
    case "association":
      return "Select Association";
    case "district":
      return "Select District Unit";
    case "unit":
      return "Select Local Unit";
    default:
      return "Select";
  }
}

function getSelectorSubtitle(mode: RequestSelectorMode) {
  switch (mode) {
    case "company":
      return "Pick the business name already listed in the company directory.";
    case "state":
      return "Choose the state connected to your membership request.";
    case "association":
      return "Choose the trade association that will review your request.";
    case "district":
      return "Choose the district operational unit for your association.";
    case "unit":
      return "Choose the local unit that matches your membership branch.";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  authContainer: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 440,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#DDD7D5",
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingBottom: spacing.md,
    position: "relative",
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 16,
    fontWeight: "700",
  },
  activeTabLabel: {
    color: "#D97706",
  },
  activeTabLine: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D97706",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  logoTile: {
    width: 76,
    height: 76,
    backgroundColor: "#1F1A1A",
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoGlyph: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  logoCaption: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: -0.9,
  },
  heroSubtitle: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.md,
  },
  heroDescription: {
    color: "#444748",
    fontSize: 16,
    lineHeight: 28,
    textAlign: "center",
    marginTop: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputLabel: {
    color: "#444748",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2D0",
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  selectorField: {
    minHeight: 52,
    borderRadius: radii.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2D0",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  selectorFieldDisabled: {
    opacity: 0.6,
  },
  selectorFieldValue: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  selectorFieldPlaceholder: {
    flex: 1,
    color: "#6B7280",
    fontSize: 16,
  },
  selectorHint: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  passwordWrap: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 56,
  },
  passwordToggle: {
    position: "absolute",
    right: spacing.md,
    top: 14,
  },
  passwordToggleIcon: {
    color: colors.mutedText,
    fontSize: 20,
  },
  utilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#D8D2D0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkboxMark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16,
  },
  rememberText: {
    color: colors.mutedText,
    fontSize: 15,
  },
  forgotText: {
    color: "#D97706",
    fontSize: 15,
    fontWeight: "500",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  guestHint: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.negative,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.sm,
    height: 52,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD7D5",
  },
  dividerLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  googleButton: {
    height: 52,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#E5E2E1",
    backgroundColor: "#F6F3F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconTile: {
    width: 22,
    height: 22,
    backgroundColor: "#C9C4C3",
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  googleGlyph: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  googleText: {
    color: "#8B8A8A",
    fontSize: 16,
    fontWeight: "700",
  },
  googleBadge: {
    backgroundColor: "#E7E1DF",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  googleBadgeText: {
    color: "#6B6867",
    fontSize: 10,
    fontWeight: "700",
  },
  requestButton: {
    alignSelf: "center",
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  requestButtonText: {
    color: "#D97706",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: "#E7E1DF",
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDetail: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 26, 0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "92%",
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E1DF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  selectorScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectorHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E1DF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  selectorSearchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D8D2D0",
    borderRadius: radii.md,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
  },
  selectorSearchIcon: {
    marginRight: spacing.sm,
  },
  selectorSearchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  },
  selectorList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  selectorItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: "#E7E1DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  selectorItemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  selectorItemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  selectorItemSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  notesInput: {
    minHeight: 112,
    paddingTop: spacing.md,
  },
});
