import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getJson, postJson } from "../../api/client";
import { AppScreen } from "../../components/AppScreen";
import { FilterChip } from "../../components/FilterChip";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { Association, DistrictOperationalUnit, MemberAccessRequestPayload, MemberAccessRequestResponse, RegionState, Unit } from "../../types/api";

type AuthMode = "member" | "guest";

export function LoginScreen() {
  const { continueAsGuest, signInMember } = useSession();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [states, setStates] = useState<RegionState[]>([]);
  const [selectedState, setSelectedState] = useState<RegionState | null>(null);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [selectedDistrictUnit, setSelectedDistrictUnit] = useState<DistrictOperationalUnit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
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
  const [requestNotes, setRequestNotes] = useState("");
  const [requestState, setRequestState] = useState<RegionState | null>(null);
  const [requestAssociation, setRequestAssociation] = useState<Association | null>(null);
  const [requestDistrictUnit, setRequestDistrictUnit] = useState<DistrictOperationalUnit | null>(null);
  const [requestUnit, setRequestUnit] = useState<Unit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRegions() {
      try {
        const nextStates = await getJson<RegionState[]>("/regions/");
        if (!active) {
          return;
        }
        setStates(nextStates);
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
        }
      }
    }

    loadRegions();

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

  function openRequestAccess() {
    setRequestError(null);
    setRequestModalVisible(true);
  }

  function handleForgotPassword() {
    Alert.alert("Coming soon", "Forgot password support will be connected after the recovery flow is added.");
  }

  function closeRequestAccess() {
    if (requestSubmitting) {
      return;
    }
    setRequestModalVisible(false);
  }

  function handleRequestStateSelect(state: RegionState) {
    setRequestState(state);
    setRequestAssociation(null);
    setRequestDistrictUnit(null);
    setRequestUnit(null);
  }

  function handleRequestAssociationSelect(association: Association) {
    setRequestAssociation(association);
    setRequestDistrictUnit(null);
    setRequestUnit(null);
  }

  function handleRequestDistrictUnitSelect(districtUnit: DistrictOperationalUnit) {
    setRequestDistrictUnit(districtUnit);
    setRequestUnit(null);
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
      setRequestNotes("");
      setRequestState(null);
      setRequestAssociation(null);
      setRequestDistrictUnit(null);
      setRequestUnit(null);
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
                    <Text style={styles.passwordToggleIcon}>{showPassword ? "🙈" : "👁"}</Text>
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

                <View style={styles.googleButton}>
                  <View style={styles.googleIconTile}>
                    <Text style={styles.googleGlyph}>G</Text>
                  </View>
                  <Text style={styles.googleText}>Continue with Google</Text>
                  <View style={styles.googleBadge}>
                    <Text style={styles.googleBadgeText}>Coming soon</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          <Pressable style={styles.requestButton} onPress={openRequestAccess}>
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
              <TextInput value={requestBusinessName} onChangeText={setRequestBusinessName} style={styles.input} placeholder="Business / shop name" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>State</Text>
              {loadingRegions ? (
                <ActivityIndicator color={colors.text} style={styles.loader} />
              ) : (
                <View style={styles.chipWrap}>
                  {states.map((state) => (
                    <FilterChip
                      key={state.id}
                      label={state.name}
                      selected={requestState?.id === state.id}
                      onPress={() => handleRequestStateSelect(state)}
                    />
                  ))}
                </View>
              )}

              {requestState?.associations.length ? (
                <>
                  <Text style={styles.inputLabel}>Association</Text>
                  <View style={styles.chipWrap}>
                    {requestState.associations.map((association) => (
                      <FilterChip
                        key={association.id}
                        label={association.name}
                        selected={requestAssociation?.id === association.id}
                        onPress={() => handleRequestAssociationSelect(association)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {requestAssociation?.district_units.length ? (
                <>
                  <Text style={styles.inputLabel}>District Unit</Text>
                  <View style={styles.chipWrap}>
                    {requestAssociation.district_units.map((districtUnit) => (
                      <FilterChip
                        key={districtUnit.id}
                        label={districtUnit.name}
                        selected={requestDistrictUnit?.id === districtUnit.id}
                        onPress={() => handleRequestDistrictUnitSelect(districtUnit)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {requestDistrictUnit?.units.length ? (
                <>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.chipWrap}>
                    {requestDistrictUnit.units.map((unit) => (
                      <FilterChip
                        key={unit.id}
                        label={unit.name}
                        selected={requestUnit?.id === unit.id}
                        onPress={() => setRequestUnit(unit)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

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
    </>
  );
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
    opacity: 0.7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
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
  notesInput: {
    minHeight: 112,
    paddingTop: spacing.md,
  },
});
