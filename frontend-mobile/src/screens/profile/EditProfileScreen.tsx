import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenState } from "../../components/ScreenState";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, radii, spacing, typography } from "../../theme/tokens";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function EditProfileScreen() {
  const { me, refreshCurrentUser, updateCurrentUser } = useSession();
  const [loading, setLoading] = useState(!me);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (me) {
      const nextName = splitName(me.user.name);
      setFirstName(nextName.firstName);
      setLastName(nextName.lastName);
      setEmail(me.user.email);
      setPhoneNumber(me.user.phone ?? "");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void refreshCurrentUser()
      .then(() => {
        if (active) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setMessage("Could not load profile.");
        }
      });

    return () => {
      active = false;
    };
  }, [me, refreshCurrentUser]);

  async function handleSave() {
    setSubmitting(true);
    setMessage(null);
    try {
      await updateCurrentUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        member_profile: {
          phone_number: phoneNumber.trim(),
        },
      });
      setMessage("Profile details saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile details.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ScreenState title="Loading profile" detail="Preparing editable account details." loading />;
  }

  if (!me) {
    return <ScreenState title="Profile unavailable" detail={message ?? "Could not load profile."} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <Text style={styles.eyebrow}>Edit Profile</Text>
        <Text style={styles.title}>Update your account details</Text>

        <Text style={styles.label}>First name</Text>
        <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" style={styles.input} />

        <Text style={styles.label}>Last name</Text>
        <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="member@example.com" autoCapitalize="none" style={styles.input} />

        <Text style={styles.label}>Phone number</Text>
        <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" style={styles.input} />

        {message ? <Text style={styles.statusMessage}>{message}</Text> : null}

        <Pressable style={[styles.primaryButton, submitting && styles.disabledButton]} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Save profile details</Text>}
        </Pressable>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.secondaryTitle}>Association Context</Text>
        <Text style={styles.secondaryBody}>Association and state are shown on your profile and stay managed by your membership hierarchy.</Text>
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>Association</Text>
          <Text style={styles.readOnlyValue}>{me.hierarchy.association ?? "Association not assigned"}</Text>
        </View>
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>State</Text>
          <Text style={styles.readOnlyValue}>{me.hierarchy.state ?? "State not assigned"}</Text>
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: "#8A6400",
    marginBottom: spacing.xs,
    ...typography.eyebrow,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  label: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    ...typography.label,
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  statusMessage: {
    color: colors.mutedText,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    textAlign: "center",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  secondaryBody: {
    color: colors.mutedText,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  readOnlyRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  readOnlyLabel: {
    color: "#8A6400",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  readOnlyValue: {
    color: colors.text,
    fontWeight: "700",
  },
});
