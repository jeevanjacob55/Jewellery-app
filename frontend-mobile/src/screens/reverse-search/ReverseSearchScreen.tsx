import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getJson, postJson } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { ReverseSearchRequest } from "../../types/api";
import { titleCase } from "../../utils/format";

export function ReverseSearchScreen() {
  const { status } = useSession();
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState<ReverseSearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRequests() {
    try {
      const nextRequests = await getJson<ReverseSearchRequest[]>("/reverse-search/", true);
      setRequests(nextRequests);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load reverse-search requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    loadRequests();
  }, [status]);

  async function handleCreateRequest() {
    if (!notes.trim()) {
      setMessage("Add a note describing the design you need matched.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await postJson("/reverse-search/", { notes: notes.trim() }, true);
      setNotes("");
      await loadRequests();
      setMessage("Reverse-search request created. Upload session wiring is the next step.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create reverse-search request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== "authenticated") {
    return <ScreenState title="Member login required" detail="Reverse search is protected because requests and responses are private." />;
  }

  if (loading) {
    return <ScreenState title="Loading reverse search" detail="Fetching your existing requests and supplier responses." loading />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeading>Reverse Design Search</SectionHeading>
      <SurfaceCard>
        <Text style={styles.title}>Create request</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe the design, weight, finish, or supplier preference"
          multiline
          style={styles.notesInput}
        />
        <Text style={styles.meta}>Upload session and file finalization are still pending, but request creation is now wired.</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable style={styles.button} onPress={handleCreateRequest} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Create Request"}</Text>
        </Pressable>
      </SurfaceCard>

      {requests.map((request) => (
        <SurfaceCard key={request.id}>
          <Text style={styles.title}>Request #{request.id}</Text>
          <Text style={styles.meta}>{request.notes}</Text>
          <Text style={styles.status}>Status: {titleCase(request.status)}</Text>
          {request.responses.length ? (
            <View style={styles.responseBlock}>
              {request.responses.map((response) => (
                <View key={response.id} style={styles.responseRow}>
                  <Text style={styles.responseMessage}>{response.message}</Text>
                  <Text style={styles.meta}>{response.availability_label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>No supplier responses yet.</Text>
          )}
        </SurfaceCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: spacing.sm },
  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
  },
  meta: { color: colors.mutedText, marginTop: spacing.sm },
  message: { color: colors.text, marginTop: spacing.sm },
  button: { backgroundColor: colors.text, padding: spacing.md, marginTop: spacing.md },
  buttonText: { color: colors.surface, textAlign: "center", fontWeight: "700" },
  status: { color: colors.accentGold, fontWeight: "700", marginTop: spacing.sm },
  responseBlock: { marginTop: spacing.sm, gap: spacing.sm },
  responseRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  responseMessage: { color: colors.text, fontWeight: "600" },
});
