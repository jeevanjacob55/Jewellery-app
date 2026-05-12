import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  AssociationSpotlightCollection,
  AssociationSpotlightItem,
  createAssociationSpotlight,
  deleteAssociationSpotlight,
  fetchAssociationSpotlights,
  fetchRegionHierarchy,
  finalizeAssociationSpotlightMediaAsset,
  RegionHierarchyAssociation,
  RegionHierarchyState,
  reorderAssociationSpotlights,
  requestAssociationSpotlightUploadSession,
  updateAssociationSpotlight,
  uploadFileToSession,
} from "../lib/api";

type FeedbackTone = "success" | "error" | "info";

type FormState = {
  title: string;
  subtitle: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  assetId: number | null;
  imageUrl: string | null;
};

type AssociationOption = {
  id: number;
  name: string;
  stateName: string;
};

function createEmptyForm(): FormState {
  return {
    title: "",
    subtitle: "",
    isActive: true,
    startsAt: "",
    endsAt: "",
    assetId: null,
    imageUrl: null,
  };
}

function toLocalDatetimeInput(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toApiDatetime(value: string) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

function buildFormFromItem(item: AssociationSpotlightItem): FormState {
  return {
    title: item.title,
    subtitle: item.subtitle,
    isActive: item.is_active,
    startsAt: toLocalDatetimeInput(item.starts_at),
    endsAt: toLocalDatetimeInput(item.ends_at),
    assetId: item.asset_id,
    imageUrl: item.image_url,
  };
}

async function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected image dimensions."));
    };
    image.src = objectUrl;
  });
}

function buildAssociationOptions(states: RegionHierarchyState[]): AssociationOption[] {
  return states.flatMap((state) =>
    state.associations.map((association: RegionHierarchyAssociation) => ({
      id: association.id,
      name: association.name,
      stateName: state.name,
    })),
  );
}

export function AssociationSpotlightPage() {
  const { session } = useAuth();
  const isAssociationAdmin = session?.user.role === "ASSOCIATION_ADMIN";
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";
  const canManage = isAssociationAdmin || isSuperAdmin;

  const [hierarchy, setHierarchy] = useState<RegionHierarchyState[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [selectedAssociationId, setSelectedAssociationId] = useState("");
  const [collection, setCollection] = useState<AssociationSpotlightCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetPreview, setAssetPreview] = useState<string | null>(null);

  const associationOptions = useMemo(() => buildAssociationOptions(hierarchy), [hierarchy]);
  const selectedAssociationOption = useMemo(
    () => associationOptions.find((option) => String(option.id) === selectedAssociationId) ?? null,
    [associationOptions, selectedAssociationId],
  );

  useEffect(() => {
    return () => {
      if (assetPreview) {
        URL.revokeObjectURL(assetPreview);
      }
    };
  }, [assetPreview]);

  function clearSelectedAssetPreview() {
    setAssetPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadHierarchy() {
      if (!isSuperAdmin) {
        return;
      }
      setHierarchyLoading(true);
      setHierarchyError(null);
      try {
        const payload = await fetchRegionHierarchy();
        if (!active) {
          return;
        }
        setHierarchy(payload);
        const options = buildAssociationOptions(payload);
        setSelectedAssociationId((current) => current || String(options[0]?.id ?? ""));
      } catch (loadError) {
        if (!active) {
          return;
        }
        setHierarchyError(loadError instanceof Error ? loadError.message : "Unable to load associations.");
      } finally {
        if (active) {
          setHierarchyLoading(false);
        }
      }
    }

    void loadHierarchy();

    return () => {
      active = false;
    };
  }, [canManage, isSuperAdmin]);

  useEffect(() => {
    if (!canManage) {
      return;
    }
    if (isSuperAdmin && !selectedAssociationId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadCollection() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchAssociationSpotlights(isSuperAdmin ? Number(selectedAssociationId) : undefined);
        if (!active) {
          return;
        }
        setCollection(payload);
        if (payload.items[0]) {
          setSelectedItemId((current) => (current && payload.items.some((item) => item.id === current) ? current : payload.items[0].id));
          const initialItem = payload.items.find((item) => item.id === selectedItemId) ?? payload.items[0];
          setForm(buildFormFromItem(initialItem));
        } else {
          setSelectedItemId(null);
          setForm(createEmptyForm());
        }
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load spotlight items.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCollection();

    return () => {
      active = false;
    };
  }, [canManage, isSuperAdmin, selectedAssociationId]);

  useEffect(() => {
    if (!collection) {
      return;
    }
    if (!selectedItemId) {
      return;
    }
    const selectedItem = collection.items.find((item) => item.id === selectedItemId);
    if (selectedItem) {
      setForm(buildFormFromItem(selectedItem));
      setAssetFile(null);
      clearSelectedAssetPreview();
    }
  }, [collection, selectedItemId]);

  function startNewItem() {
    setSelectedItemId(null);
    setForm(createEmptyForm());
    setAssetFile(null);
    clearSelectedAssetPreview();
    setFeedback({ tone: "info", message: "New spotlight item ready. Upload an image and save it for the selected association." });
  }

  function selectItem(item: AssociationSpotlightItem) {
    setSelectedItemId(item.id);
    setForm(buildFormFromItem(item));
    setAssetFile(null);
    clearSelectedAssetPreview();
  }

  function updateForm(nextValues: Partial<FormState>) {
    setForm((current) => ({ ...current, ...nextValues }));
  }

  function handleAssetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    clearSelectedAssetPreview();
    if (!file) {
      setAssetFile(null);
      return;
    }
    setAssetFile(file);
    setAssetPreview(URL.createObjectURL(file));
  }

  async function uploadSelectedAsset() {
    if (!assetFile) {
      return {
        assetId: form.assetId,
        imageUrl: form.imageUrl,
      };
    }
    setUploading(true);
    try {
      const uploadSession = await requestAssociationSpotlightUploadSession(
        assetFile.name,
        isSuperAdmin ? Number(selectedAssociationId) : undefined,
      );
      await uploadFileToSession(uploadSession.upload_url, assetFile);
      const dimensions = await readImageDimensions(assetFile);
      const finalized = await finalizeAssociationSpotlightMediaAsset({
        object_key: uploadSession.object_key,
        bucket_name: uploadSession.bucket_name,
        original_filename: assetFile.name,
        mime_type: assetFile.type || "image/jpeg",
        file_size: assetFile.size,
        width: dimensions.width,
        height: dimensions.height,
        association_id: isSuperAdmin ? Number(selectedAssociationId) : undefined,
      });
      return {
        assetId: finalized.asset_id,
        imageUrl: finalized.public_url,
      };
    } finally {
      setUploading(false);
    }
  }

  async function refreshCollection(preferredItemId?: number | null) {
    const payload = await fetchAssociationSpotlights(isSuperAdmin ? Number(selectedAssociationId) : undefined);
    setCollection(payload);
    const selected = preferredItemId ? payload.items.find((item) => item.id === preferredItemId) : null;
    if (selected) {
      setSelectedItemId(selected.id);
      setForm(buildFormFromItem(selected));
    } else if (payload.items[0]) {
      setSelectedItemId(payload.items[0].id);
      setForm(buildFormFromItem(payload.items[0]));
    } else {
      setSelectedItemId(null);
      setForm(createEmptyForm());
    }
  }

  async function handleSave() {
    if (!canManage) {
      return;
    }
    if (isSuperAdmin && !selectedAssociationId) {
      setError("Select an association before saving spotlight content.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const uploadedAsset = await uploadSelectedAsset();
      if (!uploadedAsset.assetId) {
        throw new Error("Upload an image before saving this spotlight item.");
      }
      const payload = {
        association_id: isSuperAdmin ? Number(selectedAssociationId) : undefined,
        asset_id: uploadedAsset.assetId,
        title: form.title,
        subtitle: form.subtitle,
        is_active: form.isActive,
        starts_at: toApiDatetime(form.startsAt),
        ends_at: toApiDatetime(form.endsAt),
      };
      const savedItem = selectedItemId
        ? await updateAssociationSpotlight(selectedItemId, payload)
        : await createAssociationSpotlight(payload);
      await refreshCollection(savedItem.id);
      setSelectedItemId(savedItem.id);
      setAssetFile(null);
      clearSelectedAssetPreview();
      setFeedback({
        tone: "success",
        message: `${savedItem.association_name} spotlight updated. Members in that association will see the latest eligible filmstrip items.`,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save spotlight content.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId: number) {
    if (!window.confirm("Delete this spotlight item?")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteAssociationSpotlight(itemId);
      await refreshCollection(selectedItemId === itemId ? null : selectedItemId);
      setFeedback({ tone: "success", message: "Spotlight item deleted." });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete spotlight item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(itemId: number, direction: -1 | 1) {
    if (!collection) {
      return;
    }
    const index = collection.items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= collection.items.length) {
      return;
    }
    const reordered = [...collection.items];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, movedItem);
    try {
      const response = await reorderAssociationSpotlights(
        reordered.map((item) => item.id),
        isSuperAdmin ? Number(selectedAssociationId) : undefined,
      );
      setCollection((current) => (current ? { ...current, items: response.items } : current));
      setFeedback({ tone: "success", message: "Spotlight order updated." });
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Unable to reorder spotlight items.");
    }
  }

  if (!canManage) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Restricted</p>
          <h2 className="admin-placeholder__title">Welcome Spotlight is limited to association admins and super admins.</h2>
          <p className="admin-placeholder__copy">Use an eligible admin account to upload and manage association-specific dashboard filmstrip content.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="spotlight-page">
      <div className="spotlight-page__hero">
        <div>
          <p className="spotlight-page__eyebrow">Dashboard Welcome Filmstrip</p>
          <h2 className="spotlight-page__title">Manage association spotlight visuals</h2>
          <p className="spotlight-page__copy">
            Spotlight images appear only for authenticated members of the matching association and hide automatically when the filmstrip window completes.
          </p>
        </div>
        <div className="spotlight-page__hero-meta">
          <div className="spotlight-page__badge">{collection?.association.name ?? selectedAssociationOption?.name ?? "Association scope"}</div>
          <p className="spotlight-page__updated">
            Filmstrip config: {collection?.config.duration_seconds ?? 5}s / {collection?.config.scroll_speed ?? "medium"} speed
          </p>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="spotlight-toolbar">
          <label className="spotlight-form__field">
            <span>Association</span>
            <select
              value={selectedAssociationId}
              onChange={(event) => setSelectedAssociationId(event.target.value)}
              disabled={hierarchyLoading || !associationOptions.length}
            >
              <option value="">Select association</option>
              {associationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.stateName})
                </option>
              ))}
            </select>
          </label>
          {hierarchyError ? <p className="spotlight-feedback spotlight-feedback--error">{hierarchyError}</p> : null}
        </div>
      ) : null}

      {error ? <div className="spotlight-feedback spotlight-feedback--error">{error}</div> : null}
      {feedback ? <div className={`spotlight-feedback spotlight-feedback--${feedback.tone}`}>{feedback.message}</div> : null}

      <div className="spotlight-grid">
        <article className="spotlight-panel spotlight-panel--list">
          <div className="spotlight-panel__header">
            <div>
              <p className="spotlight-panel__eyebrow">Live Queue</p>
              <h3 className="spotlight-panel__title">Ordered spotlight items</h3>
            </div>
            <button className="spotlight-button spotlight-button--ghost" type="button" onClick={startNewItem}>
              New Item
            </button>
          </div>

          {loading ? <p className="spotlight-panel__empty">Loading spotlight items...</p> : null}
          {!loading && !collection?.items.length ? (
            <p className="spotlight-panel__empty">No spotlight images yet. Upload the first hero visual for this association.</p>
          ) : null}

          <div className="spotlight-list">
            {collection?.items.map((item, index) => (
              <div
                key={item.id}
                className={`spotlight-list__item${item.id === selectedItemId ? " spotlight-list__item--active" : ""}`}
              >
                <button type="button" className="spotlight-list__main" onClick={() => selectItem(item)}>
                  <img className="spotlight-list__thumb" src={item.image_url} alt={item.title || item.association_name} />
                  <div className="spotlight-list__content">
                    <strong>{item.title || "Untitled spotlight"}</strong>
                    <span>{item.subtitle || item.association_name}</span>
                    <small>{item.is_active ? "Active" : "Inactive"}{item.starts_at || item.ends_at ? " • Scheduled" : ""}</small>
                  </div>
                </button>
                <div className="spotlight-list__actions">
                  <span className="spotlight-list__order">#{index + 1}</span>
                  <button type="button" className="spotlight-icon-button" onClick={() => void handleMove(item.id, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button type="button" className="spotlight-icon-button" onClick={() => void handleMove(item.id, 1)} disabled={index === collection.items.length - 1}>
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="spotlight-panel">
          <div className="spotlight-panel__header">
            <div>
              <p className="spotlight-panel__eyebrow">{selectedItemId ? "Edit Item" : "Create Item"}</p>
              <h3 className="spotlight-panel__title">
                {selectedItemId ? "Update spotlight details" : "Create a new spotlight visual"}
              </h3>
            </div>
          </div>

          <div className="spotlight-form">
            <label className="spotlight-form__field">
              <span>Title</span>
              <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Welcome to the association market" />
            </label>

            <label className="spotlight-form__field">
              <span>Subtitle</span>
              <textarea
                value={form.subtitle}
                onChange={(event) => updateForm({ subtitle: event.target.value })}
                placeholder="Add a short premium message for members."
                rows={3}
              />
            </label>

            <label className="spotlight-form__field">
              <span>Image</span>
              <input type="file" accept="image/*" onChange={handleAssetChange} />
            </label>

            {assetPreview || form.imageUrl ? (
              <div className="spotlight-preview">
                <img src={assetPreview ?? form.imageUrl ?? ""} alt={form.title || "Spotlight preview"} />
              </div>
            ) : null}

            <div className="spotlight-form__grid">
              <label className="spotlight-form__field">
                <span>Starts At</span>
                <input type="datetime-local" value={form.startsAt} onChange={(event) => updateForm({ startsAt: event.target.value })} />
              </label>
              <label className="spotlight-form__field">
                <span>Ends At</span>
                <input type="datetime-local" value={form.endsAt} onChange={(event) => updateForm({ endsAt: event.target.value })} />
              </label>
            </div>

            <label className="spotlight-form__toggle">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm({ isActive: event.target.checked })} />
              <span>Active and eligible for the mobile welcome filmstrip</span>
            </label>

            <div className="spotlight-form__actions">
              <button className="spotlight-button" type="button" onClick={() => void handleSave()} disabled={saving || uploading}>
                {saving || uploading ? "Saving..." : selectedItemId ? "Save Changes" : "Create Spotlight"}
              </button>
              {selectedItemId ? (
                <button className="spotlight-button spotlight-button--danger" type="button" onClick={() => void handleDelete(selectedItemId)} disabled={saving}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
