import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { getJson, postJson, uploadBinary } from "../../api/client";
import { ScreenState } from "../../components/ScreenState";
import { SectionHeading } from "../../components/SectionHeading";
import { SurfaceCard } from "../../components/SurfaceCard";
import { useSession } from "../../session/SessionProvider";
import { colors, spacing } from "../../theme/tokens";
import { ReverseSearchRequest, ReverseSearchUploadSession } from "../../types/api";
import { titleCase } from "../../utils/format";

type UploadPhase = "idle" | "picking" | "creating_request" | "uploading" | "finalizing" | "success" | "error";

type SelectedImage = {
  uri: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
};

type PendingUpload = {
  requestId: number;
  image: SelectedImage;
};

export function ReverseSearchScreen() {
  const { status } = useSession();
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState<ReverseSearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const isBusy =
    uploadPhase === "picking" ||
    uploadPhase === "creating_request" ||
    uploadPhase === "uploading" ||
    uploadPhase === "finalizing";

  async function loadRequests(keepMessage = false) {
    try {
      const nextRequests = await getJson<ReverseSearchRequest[]>("/reverse-search/", true);
      setRequests(nextRequests);
      if (!keepMessage) {
        setMessage(null);
      }
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

  async function handlePickImage() {
    setUploadPhase("picking");
    setMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadPhase("error");
        setMessage("Media library permission is required to select a reference image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) {
        setUploadPhase("idle");
        return;
      }

      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName ?? asset.uri.split("/").pop() ?? "reference-image.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        width: asset.width,
        height: asset.height,
      });
      setPendingUpload(null);
      setUploadPhase("idle");
    } catch (error) {
      setUploadPhase("error");
      setMessage(error instanceof Error ? error.message : "Unable to select a reference image.");
    }
  }

  async function createOrReuseRequestId(image: SelectedImage): Promise<number> {
    if (pendingUpload) {
      return pendingUpload.requestId;
    }

    setUploadPhase("creating_request");
    const createdRequest = await postJson<ReverseSearchRequest>("/reverse-search/", { notes: notes.trim() }, true);
    setPendingUpload({ requestId: createdRequest.id, image });
    return createdRequest.id;
  }

  async function uploadAndFinalize(requestId: number, image: SelectedImage) {
    setUploadPhase("uploading");
    const uploadSession = await postJson<ReverseSearchUploadSession>(
      "/reverse-search/upload-session/",
      { request_id: requestId, filename: image.name },
      true
    );
    const fileResponse = await fetch(image.uri);
    const blob = await fileResponse.blob();
    const mimeType = image.mimeType || blob.type || "image/jpeg";

    await uploadBinary(uploadSession.upload_url, blob, mimeType);

    setUploadPhase("finalizing");
    return postJson<ReverseSearchRequest>(
      "/reverse-search/finalize-attachment/",
      {
        request_id: requestId,
        object_key: uploadSession.object_key,
        bucket_name: uploadSession.bucket_name,
        original_filename: image.name,
        mime_type: mimeType,
        file_size: blob.size,
        width: image.width,
        height: image.height,
      },
      true
    );
  }

  async function handleCreateRequest() {
    if (!notes.trim()) {
      setMessage("Add a note describing the design you need matched.");
      setUploadPhase("error");
      return;
    }

    const image = pendingUpload?.image ?? selectedImage;
    if (!image) {
      setMessage("Select one reference image before creating your request.");
      setUploadPhase("error");
      return;
    }

    setMessage(null);
    try {
      const requestId = await createOrReuseRequestId(image);
      const updatedRequest = await uploadAndFinalize(requestId, image);
      setRequests((currentRequests) => [updatedRequest, ...currentRequests.filter((request) => request.id !== updatedRequest.id)]);
      setNotes("");
      setSelectedImage(null);
      setPendingUpload(null);
      setUploadPhase("success");
      await loadRequests(true);
      setMessage("Reference image uploaded and attached to your reverse-search request.");
    } catch (error) {
      if (!pendingUpload && image) {
        setPendingUpload((currentValue) => currentValue ?? { requestId: 0, image });
      }
      setUploadPhase("error");
      setMessage(error instanceof Error ? error.message : "Unable to complete the reverse-search upload flow.");
    }
  }

  async function handleRetryUpload() {
    if (!pendingUpload || pendingUpload.requestId === 0) {
      await handleCreateRequest();
      return;
    }

    setMessage(null);
    try {
      const updatedRequest = await uploadAndFinalize(pendingUpload.requestId, pendingUpload.image);
      setNotes("");
      setSelectedImage(null);
      setPendingUpload(null);
      setUploadPhase("success");
      await loadRequests(true);
      setMessage("Reference image uploaded and attached to your reverse-search request.");
      setRequests((currentRequests) => [updatedRequest, ...currentRequests.filter((request) => request.id !== updatedRequest.id)]);
    } catch (error) {
      setUploadPhase("error");
      setMessage(error instanceof Error ? error.message : "Unable to retry the reverse-search upload.");
    }
  }

  function getPrimaryButtonLabel() {
    switch (uploadPhase) {
      case "picking":
        return "Selecting Image...";
      case "creating_request":
        return "Creating Request...";
      case "uploading":
        return "Uploading Image...";
      case "finalizing":
        return "Finalizing Upload...";
      default:
        return pendingUpload?.requestId ? "Resume Upload" : "Create Request";
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
        <View style={styles.actionsRow}>
          <Pressable style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]} onPress={handlePickImage} disabled={isBusy}>
            <Text style={styles.secondaryButtonText}>{selectedImage ? "Replace Image" : "Choose Image"}</Text>
          </Pressable>
        </View>
        {selectedImage ? (
          <View style={styles.selectionCard}>
            <Text style={styles.selectionTitle}>Selected image</Text>
            <Text style={styles.meta}>{selectedImage.name}</Text>
          </View>
        ) : (
          <Text style={styles.meta}>Choose one gallery image to include with your request.</Text>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable style={[styles.button, isBusy ? styles.buttonDisabled : null]} onPress={handleCreateRequest} disabled={isBusy}>
          <Text style={styles.buttonText}>{getPrimaryButtonLabel()}</Text>
        </Pressable>
        {uploadPhase === "error" ? (
          <Pressable style={styles.retryButton} onPress={handleRetryUpload} disabled={isBusy}>
            <Text style={styles.retryButtonText}>Retry Upload</Text>
          </Pressable>
        ) : null}
      </SurfaceCard>

      {requests.map((request) => (
        <SurfaceCard key={request.id}>
          <Text style={styles.title}>Request #{request.id}</Text>
          <Text style={styles.meta}>{request.notes}</Text>
          <Text style={styles.status}>Status: {titleCase(request.status)}</Text>
          {request.attachments.length ? (
            <View style={styles.attachmentBlock}>
              {request.attachments.map((attachment) => (
                <View key={attachment.id} style={styles.attachmentRow}>
                  <Text style={styles.responseMessage}>{attachment.original_filename}</Text>
                  <Text style={styles.meta}>
                    {titleCase(attachment.moderation_status)} • {titleCase(attachment.visibility)} upload
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>No reference image uploaded yet.</Text>
          )}
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
  buttonDisabled: { opacity: 0.65 },
  actionsRow: { marginTop: spacing.md },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
  },
  secondaryButtonText: { color: colors.text, textAlign: "center", fontWeight: "700" },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.text,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  retryButtonText: { color: colors.text, textAlign: "center", fontWeight: "700" },
  selectionCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionTitle: { color: colors.text, fontWeight: "700" },
  status: { color: colors.accentGold, fontWeight: "700", marginTop: spacing.sm },
  attachmentBlock: { marginTop: spacing.sm, gap: spacing.sm },
  attachmentRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  responseBlock: { marginTop: spacing.sm, gap: spacing.sm },
  responseRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  responseMessage: { color: colors.text, fontWeight: "600" },
});
