import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  AdvertisementActionType,
  AdvertisementCampaignPayload,
  AdvertisementCampaignRecord,
  AdvertisementPlacement,
  CompanyOption,
  createCompanyAdvertisement,
  fetchCompanyOptions,
  fetchCompanyAdvertisements,
  fetchProductOptions,
  fetchRegionHierarchy,
  ProductOption,
  finalizeAdvertisementMediaAsset,
  RegionHierarchyAssociation,
  RegionHierarchyDistrict,
  RegionHierarchyState,
  RegionHierarchyUnit,
  requestAdvertisementUploadSession,
  updateCompanyAdvertisement,
  uploadFileToSession,
} from "../lib/api";

type SubmissionMode = "draft" | "submit";

type FormState = {
  title: string;
  description: string;
  labelText: string;
  backgroundColor: string;
  placement: AdvertisementPlacement;
  actionType: AdvertisementActionType;
  actionValue: string;
  priority: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  selectedStateId: string;
  selectedAssociationId: string;
  selectedDistrictId: string;
  selectedUnitId: string;
  assetId: number | null;
  imageUrl: string | null;
};

type FeedbackTone = "info" | "success" | "error";

function toDatetimeLocalValue(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function createDefaultDateRange() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  return {
    startDate: toDatetimeLocalValue(start),
    endDate: toDatetimeLocalValue(end),
  };
}

function createEmptyForm(): FormState {
  const dates = createDefaultDateRange();
  return {
    title: "",
    description: "",
    labelText: "ADVERTISEMENT",
    backgroundColor: "#A94B08",
    placement: "dashboard_hero",
    actionType: "external_url",
    actionValue: "",
    priority: "20",
    startDate: dates.startDate,
    endDate: dates.endDate,
    isActive: true,
    selectedStateId: "",
    selectedAssociationId: "",
    selectedDistrictId: "",
    selectedUnitId: "",
    assetId: null,
    imageUrl: null,
  };
}

function buildFormFromCampaign(campaign: AdvertisementCampaignRecord): FormState {
  return {
    title: campaign.title,
    description: campaign.description,
    labelText: campaign.label_text,
    backgroundColor: campaign.background_color || "#A94B08",
    placement: campaign.placement,
    actionType: campaign.action_type,
    actionValue: campaign.action_value,
    priority: String(campaign.priority),
    startDate: campaign.start_date ? campaign.start_date.slice(0, 16) : createDefaultDateRange().startDate,
    endDate: campaign.end_date ? campaign.end_date.slice(0, 16) : createDefaultDateRange().endDate,
    isActive: campaign.is_active,
    selectedStateId: campaign.targeting.state_id ? String(campaign.targeting.state_id) : "",
    selectedAssociationId: campaign.targeting.association_id ? String(campaign.targeting.association_id) : "",
    selectedDistrictId: campaign.targeting.district_operational_unit_id ? String(campaign.targeting.district_operational_unit_id) : "",
    selectedUnitId: campaign.targeting.unit_id ? String(campaign.targeting.unit_id) : "",
    assetId: campaign.asset_id,
    imageUrl: campaign.image_url,
  };
}

function buildActionHelperText(actionType: AdvertisementActionType) {
  if (actionType === "external_url") {
    return "Paste the public destination URL that should open when the banner is tapped.";
  }
  if (actionType === "internal_screen") {
    return "Enter the mobile screen name that should open from the home banner.";
  }
  if (actionType === "product") {
    return "Choose one of your company products to open when the banner is tapped.";
  }
  if (actionType === "company") {
    return "Choose the company profile that should open from the banner tap.";
  }
  return "Enter the category slug or label that should open from the banner.";
}

function getActionPlaceholder(actionType: AdvertisementActionType) {
  if (actionType === "external_url") {
    return "https://example.com/offer";
  }
  if (actionType === "internal_screen") {
    return "Market";
  }
  if (actionType === "product") {
    return "123";
  }
  if (actionType === "company") {
    return "45";
  }
  return "rings";
}

function formatCampaignStatus(status: AdvertisementCampaignRecord["status"]) {
  return status.replace("_", " ");
}

function formatCampaignDate(value: string | null) {
  if (!value) {
    return "Unscheduled";
  }
  return new Date(value).toLocaleString();
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

export function AdvertisementUploadPage() {
  const { session } = useAuth();
  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [campaigns, setCampaigns] = useState<AdvertisementCampaignRecord[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<RegionHierarchyState[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [actionOptionsLoading, setActionOptionsLoading] = useState(true);
  const [actionOptionsError, setActionOptionsError] = useState<string | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetPreview, setAssetPreview] = useState<string | null>(null);
  const [assetName, setAssetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; title: string; message: string } | null>({
    tone: "info",
    title: "Company-based campaign flow",
    message: "Company admins can save drafts, upload banner media, and submit campaigns for approval without needing any product catalog entries.",
  });

  const isCompanyAdmin = Boolean(session?.user.role === "COMPANY_ADMIN" && session?.company);
  const companyEligibilityError = isCompanyAdmin && (!session?.company?.is_active || !session?.company?.is_approved)
    ? "Your linked company must be active and approved before it can create or submit advertisement campaigns."
    : null;

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      if (!isCompanyAdmin) {
        setCampaignsLoading(false);
        setHierarchyLoading(false);
        setActionOptionsLoading(false);
        return;
      }

      setCampaignsLoading(true);
      setHierarchyLoading(true);
      setActionOptionsLoading(true);
      setCampaignsError(null);
      setHierarchyError(null);
      setActionOptionsError(null);

      try {
        const [campaignPayload, hierarchyPayload, companyPayload, productPayload] = await Promise.all([
          fetchCompanyAdvertisements(),
          fetchRegionHierarchy(),
          fetchCompanyOptions(),
          fetchProductOptions(session?.company?.id),
        ]);

        if (!active) {
          return;
        }

        setCampaigns(campaignPayload.results);
        setHierarchy(hierarchyPayload);
        setCompanyOptions(companyPayload);
        setProductOptions(productPayload);
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unable to load advertisement setup data.";
        setCampaignsError(message);
        setHierarchyError(message);
        setActionOptionsError(message);
      } finally {
        if (active) {
          setCampaignsLoading(false);
          setHierarchyLoading(false);
          setActionOptionsLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      active = false;
    };
  }, [isCompanyAdmin, session?.company?.id]);

  useEffect(() => {
    return () => {
      if (assetPreview) {
        URL.revokeObjectURL(assetPreview);
      }
    };
  }, [assetPreview]);

  const selectedState = useMemo(
    () => hierarchy.find((item) => String(item.id) === form.selectedStateId) ?? null,
    [form.selectedStateId, hierarchy],
  );

  const selectedAssociation = useMemo<RegionHierarchyAssociation | null>(() => {
    if (!selectedState) {
      return null;
    }
    return selectedState.associations.find((item) => String(item.id) === form.selectedAssociationId) ?? null;
  }, [form.selectedAssociationId, selectedState]);

  const selectedDistrict = useMemo<RegionHierarchyDistrict | null>(() => {
    if (!selectedAssociation) {
      return null;
    }
    return selectedAssociation.district_units.find((item) => String(item.id) === form.selectedDistrictId) ?? null;
  }, [form.selectedDistrictId, selectedAssociation]);

  const selectedUnit = useMemo<RegionHierarchyUnit | null>(() => {
    if (!selectedDistrict) {
      return null;
    }
    return selectedDistrict.units.find((item) => String(item.id) === form.selectedUnitId) ?? null;
  }, [form.selectedUnitId, selectedDistrict]);

  const companyActionOptions = useMemo(() => {
    const ownCompany = session?.company
      ? [{ id: session.company.id, name: `${session.company.name} (Your company)`, city: "", state: "" }]
      : [];
    const otherCompanies = companyOptions.filter((company) => company.id !== session?.company?.id);
    return [...ownCompany, ...otherCompanies];
  }, [companyOptions, session?.company]);

  const selectedCompanyOption = useMemo(
    () => companyActionOptions.find((company) => String(company.id) === form.actionValue) ?? null,
    [companyActionOptions, form.actionValue],
  );

  const selectedProductOption = useMemo(
    () => productOptions.find((product) => String(product.id) === form.actionValue) ?? null,
    [form.actionValue, productOptions],
  );

  function updateForm(nextValues: Partial<FormState>) {
    setForm((current) => ({ ...current, ...nextValues }));
  }

  function handleStateChange(event: ChangeEvent<HTMLSelectElement>) {
    updateForm({
      selectedStateId: event.target.value,
      selectedAssociationId: "",
      selectedDistrictId: "",
      selectedUnitId: "",
    });
  }

  function handleAssociationChange(event: ChangeEvent<HTMLSelectElement>) {
    updateForm({
      selectedAssociationId: event.target.value,
      selectedDistrictId: "",
      selectedUnitId: "",
    });
  }

  function handleDistrictChange(event: ChangeEvent<HTMLSelectElement>) {
    updateForm({
      selectedDistrictId: event.target.value,
      selectedUnitId: "",
    });
  }

  function handleAssetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (assetPreview) {
      URL.revokeObjectURL(assetPreview);
    }
    if (!file) {
      setAssetFile(null);
      setAssetName("");
      setAssetPreview(null);
      return;
    }
    setAssetFile(file);
    setAssetName(file.name);
    setAssetPreview(URL.createObjectURL(file));
  }

  function selectCampaign(campaign: AdvertisementCampaignRecord) {
    setSelectedCampaignId(campaign.id);
    setForm(buildFormFromCampaign(campaign));
    setAssetFile(null);
    setAssetName("");
    if (assetPreview) {
      URL.revokeObjectURL(assetPreview);
    }
    setAssetPreview(null);
    setFeedback({
      tone: "info",
      title: "Campaign loaded",
      message: "You can adjust the draft or resubmit this campaign from the editor.",
    });
  }

  function startNewCampaign() {
    setSelectedCampaignId(null);
    setForm(createEmptyForm());
    setAssetFile(null);
    setAssetName("");
    if (assetPreview) {
      URL.revokeObjectURL(assetPreview);
    }
    setAssetPreview(null);
    setFeedback({
      tone: "info",
      title: "New campaign",
      message: "Start a fresh banner draft for your linked company.",
    });
  }

  async function uploadSelectedAsset() {
    if (!assetFile) {
      return {
        assetId: form.assetId,
        imageUrl: form.imageUrl,
      };
    }

    const uploadSession = await requestAdvertisementUploadSession(assetFile.name);
    await uploadFileToSession(uploadSession.upload_url, assetFile);
    const dimensions = await readImageDimensions(assetFile);
    const finalized = await finalizeAdvertisementMediaAsset({
      object_key: uploadSession.object_key,
      bucket_name: uploadSession.bucket_name,
      original_filename: assetFile.name,
      mime_type: assetFile.type || "image/png",
      file_size: assetFile.size,
      width: dimensions.width,
      height: dimensions.height,
    });

    return {
      assetId: finalized.asset_id,
      imageUrl: finalized.public_url,
    };
  }

  function buildPayload(mode: SubmissionMode, assetId: number | null): AdvertisementCampaignPayload {
    return {
      title: form.title,
      description: form.description,
      label_text: form.labelText,
      background_color: form.backgroundColor,
      placement: form.placement,
      action_type: form.actionType,
      action_value: form.actionValue,
      priority: Number.parseInt(form.priority || "0", 10) || 0,
      is_active: form.isActive,
      start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
      end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
      status: mode === "submit" ? "submitted" : "draft",
      asset_id: assetId,
      targeting: {
        state_id: form.selectedStateId ? Number(form.selectedStateId) : null,
        association_id: form.selectedAssociationId ? Number(form.selectedAssociationId) : null,
        district_operational_unit_id: form.selectedDistrictId ? Number(form.selectedDistrictId) : null,
        unit_id: form.selectedUnitId ? Number(form.selectedUnitId) : null,
      },
    };
  }

  async function handleSave(mode: SubmissionMode) {
    if (!isCompanyAdmin) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const uploadedAsset = await uploadSelectedAsset();
      const payload = buildPayload(mode, uploadedAsset.assetId);
      const response = selectedCampaignId
        ? await updateCompanyAdvertisement(selectedCampaignId, payload)
        : await createCompanyAdvertisement(payload);
      const nextCampaign = response.advertisement;

      setCampaigns((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextCampaign.id);
        return [nextCampaign, ...withoutCurrent].sort(
          (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
        );
      });
      setSelectedCampaignId(nextCampaign.id);
      setForm(buildFormFromCampaign(nextCampaign));
      setAssetFile(null);
      setAssetName("");
      if (assetPreview) {
        URL.revokeObjectURL(assetPreview);
      }
      setAssetPreview(null);
      setFeedback({
        tone: "success",
        title: mode === "submit" ? "Campaign submitted" : "Draft saved",
        message: response.message,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: mode === "submit" ? "Submission blocked" : "Draft save failed",
        message: error instanceof Error ? error.message : "Unable to save this advertisement right now.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isCompanyAdmin) {
    return (
      <section className="ads-page">
        <div className="ads-page__hero">
          <div>
            <p className="ads-page__eyebrow">Advertisements</p>
            <h2 className="ads-page__title">Company advertisers submit campaigns from this screen</h2>
            <p className="ads-page__copy">
              The Phase 1 ad workflow is company-based. Linked company admins can save drafts and submit banner campaigns here, while
              platform or scoped admins review them from the approvals dashboard.
            </p>
          </div>

          <div className="ads-page__hero-meta">
            <span className="ads-page__placement-badge">Review Flow</span>
            <p className="ads-page__placement-copy">Use the Approvals page to approve or reject submitted campaigns</p>
          </div>
        </div>

        <div className="ads-feedback">
          <div>
            <strong>Company-admin workflow only</strong>
            <p>This page is reserved for company-linked advertiser accounts. Non-company admins can continue reviewing submissions from Approvals.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ads-page">
      <div className="ads-page__hero">
        <div>
          <p className="ads-page__eyebrow">Advertisements</p>
          <h2 className="ads-page__title">Upload a homepage advertisement campaign</h2>
          <p className="ads-page__copy">
            Campaigns are tied to your registered company account, not to product uploads. Companies without product listings can still
            draft banners, upload media, and submit them for review.
          </p>
        </div>

        <div className="ads-page__hero-meta">
          <span className="ads-page__placement-badge">{session?.company?.name ?? "Linked company"}</span>
          <p className="ads-page__placement-copy">Home placement locked for this first pass</p>
        </div>
      </div>

      {feedback ? (
        <div className={`ads-feedback${feedback.tone === "success" ? " ads-feedback--success" : ""}${feedback.tone === "error" ? " ads-feedback--warning" : ""}`}>
          <div>
            <strong>{feedback.title}</strong>
            <p>{feedback.message}</p>
          </div>
        </div>
      ) : null}

      {companyEligibilityError ? (
        <div className="ads-feedback ads-feedback--warning">
          <div>
            <strong>Company approval required</strong>
            <p>{companyEligibilityError}</p>
          </div>
        </div>
      ) : null}

      {campaignsError ? (
        <div className="ads-feedback ads-feedback--warning">
          <div>
            <strong>Campaign data unavailable</strong>
            <p>{campaignsError}</p>
          </div>
        </div>
      ) : null}

      {hierarchyError ? (
        <div className="ads-feedback ads-feedback--warning">
          <div>
            <strong>Targeting references unavailable</strong>
            <p>{hierarchyError}</p>
          </div>
        </div>
      ) : null}

      <div className="ads-page__grid">
        <div className="ads-panel">
          <div className="ads-panel__header">
            <div>
              <p className="ads-panel__eyebrow">Campaign Setup</p>
              <h3 className="ads-panel__title">{selectedCampaignId ? "Edit campaign" : "Create a new campaign"}</h3>
            </div>
            <button type="button" className="ads-page__secondary-action" onClick={startNewCampaign}>
              Start New Campaign
            </button>
          </div>

          <div className="ads-form">
            <label className="ads-form__field ads-form__field--full">
              <span>Campaign title</span>
              <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Akshaya Tritiya Home Banner" />
            </label>

            <label className="ads-form__field ads-form__field--full">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
                placeholder="Describe the offer, launch, or promotional context for reviewers."
              />
            </label>

            <label className="ads-form__field">
              <span>Label text</span>
              <input value={form.labelText} onChange={(event) => updateForm({ labelText: event.target.value })} placeholder="ADVERTISEMENT" />
            </label>

            <label className="ads-form__field">
              <span>Background color</span>
              <div className="ads-form__color-row">
                <input type="color" value={form.backgroundColor} onChange={(event) => updateForm({ backgroundColor: event.target.value })} />
                <input value={form.backgroundColor} onChange={(event) => updateForm({ backgroundColor: event.target.value })} placeholder="#A94B08" />
              </div>
            </label>

            <label className="ads-form__field">
              <span>Action type</span>
              <select value={form.actionType} onChange={(event) => updateForm({ actionType: event.target.value as AdvertisementActionType, actionValue: "" })}>
                <option value="external_url">External URL</option>
                <option value="internal_screen">Internal Screen</option>
                <option value="product">Product</option>
                <option value="company">Company</option>
                <option value="category">Category</option>
              </select>
            </label>

            <label className="ads-form__field">
              <span>Action value</span>
              {form.actionType === "company" ? (
                <select
                  value={form.actionValue}
                  onChange={(event) => updateForm({ actionValue: event.target.value })}
                  disabled={actionOptionsLoading}
                >
                  <option value="">
                    {actionOptionsLoading ? "Loading companies..." : "Select a company"}
                  </option>
                  {selectedCompanyOption && !companyActionOptions.some((company) => company.id === selectedCompanyOption.id) ? (
                    <option value={selectedCompanyOption.id}>{selectedCompanyOption.name}</option>
                  ) : null}
                  {companyActionOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              ) : form.actionType === "product" ? (
                <select
                  value={form.actionValue}
                  onChange={(event) => updateForm({ actionValue: event.target.value })}
                  disabled={actionOptionsLoading}
                >
                  <option value="">
                    {actionOptionsLoading ? "Loading products..." : "Select a product"}
                  </option>
                  {selectedProductOption && !productOptions.some((product) => product.id === selectedProductOption.id) ? (
                    <option value={selectedProductOption.id}>{selectedProductOption.name}</option>
                  ) : null}
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.actionValue}
                  onChange={(event) => updateForm({ actionValue: event.target.value })}
                  placeholder={getActionPlaceholder(form.actionType)}
                />
              )}
            </label>

            <div className="ads-form__helper ads-form__field--full">
              <strong>Tap behavior</strong>
              <p>{buildActionHelperText(form.actionType)}</p>
              {form.actionType === "company" && session?.company ? <p>Your company is pinned at the top, followed by all listed companies.</p> : null}
              {form.actionType === "product" && session?.company ? <p>Showing products from {session.company.name} using the existing product listing API.</p> : null}
              {actionOptionsError && (form.actionType === "company" || form.actionType === "product") ? <p>{actionOptionsError}</p> : null}
            </div>

            <label className="ads-form__field">
              <span>Start date</span>
              <input type="datetime-local" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} />
            </label>

            <label className="ads-form__field">
              <span>End date</span>
              <input type="datetime-local" value={form.endDate} onChange={(event) => updateForm({ endDate: event.target.value })} />
            </label>

            <label className="ads-form__field">
              <span>Priority</span>
              <input type="number" min="0" value={form.priority} onChange={(event) => updateForm({ priority: event.target.value })} />
            </label>

            <label className="ads-form__checkbox">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm({ isActive: event.target.checked })} />
              <div>
                <strong>Campaign active</strong>
                <p>Controls whether the banner is eligible to go live once it has been approved.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="ads-page__side-stack">
          <div className="ads-panel">
            <div className="ads-panel__header">
              <div>
                <p className="ads-panel__eyebrow">Saved Campaigns</p>
                <h3 className="ads-panel__title">Your company queue</h3>
              </div>
            </div>

            {campaignsLoading ? (
              <div className="ads-campaigns__empty">
                <strong>Loading campaigns...</strong>
                <p>Reading saved drafts and submitted banners for your company.</p>
              </div>
            ) : campaigns.length ? (
              <div className="ads-campaigns">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    className={`ads-campaigns__card${selectedCampaignId === campaign.id ? " ads-campaigns__card--active" : ""}`}
                    onClick={() => selectCampaign(campaign)}
                  >
                    <div className="ads-campaigns__meta">
                      <span>{formatCampaignStatus(campaign.status)}</span>
                      <span>{campaign.placement}</span>
                    </div>
                    <strong>{campaign.title}</strong>
                    <p>{campaign.description || "No description added yet."}</p>
                    <small>Updated {formatCampaignDate(campaign.updated_at)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="ads-campaigns__empty">
                <strong>No campaigns yet</strong>
                <p>Save a draft or submit your first banner from this page.</p>
              </div>
            )}
          </div>

          <div className="ads-panel">
            <div className="ads-panel__header">
              <div>
                <p className="ads-panel__eyebrow">Placement Preview</p>
                <h3 className="ads-panel__title">Home banner card</h3>
              </div>
            </div>

            <div className="ads-preview">
              <div className="ads-preview__card" style={{ background: form.backgroundColor || "#A94B08" }}>
                {assetPreview ? <img src={assetPreview} alt="Advertisement preview" className="ads-preview__image" /> : null}
                {!assetPreview && form.imageUrl ? <img src={form.imageUrl} alt="Advertisement preview" className="ads-preview__image" /> : null}
                <div className="ads-preview__overlay" />
                <div className="ads-preview__content">
                  <span className="ads-preview__label">{form.labelText || "ADVERTISEMENT"}</span>
                  <strong>{form.title || "Homepage campaign title"}</strong>
                  <p>{form.description || "Campaign description preview appears here for layout testing."}</p>
                </div>
              </div>

              <div className="ads-preview__meta">
                <span>Placement</span>
                <strong>{form.placement}</strong>
                <p>Primary mobile home banner slot</p>
              </div>
            </div>
          </div>

          <div className="ads-panel">
            <div className="ads-panel__header">
              <div>
                <p className="ads-panel__eyebrow">Asset Upload</p>
                <h3 className="ads-panel__title">Banner media</h3>
              </div>
            </div>

            <label className="ads-upload">
              <input type="file" accept="image/*" onChange={handleAssetChange} />
              <span>{assetName || "Select a banner image"}</span>
              <small>{form.assetId ? "Uploading a new file will replace the current banner asset." : "Uploaded assets stay attached to the current campaign."}</small>
            </label>
          </div>
        </div>

        <div className="ads-panel ads-panel--full">
          <div className="ads-panel__header">
            <div>
              <p className="ads-panel__eyebrow">Targeting</p>
              <h3 className="ads-panel__title">Regional delivery scope</h3>
            </div>
          </div>

          <div className="ads-targeting">
            <label className="ads-form__field">
              <span>State</span>
              <select value={form.selectedStateId} onChange={handleStateChange}>
                <option value="">{hierarchyLoading ? "Loading states..." : "All available states"}</option>
                {hierarchy.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ads-form__field">
              <span>Association</span>
              <select value={form.selectedAssociationId} onChange={handleAssociationChange} disabled={!selectedState}>
                <option value="">{selectedState ? "Select association" : "Choose state first"}</option>
                {selectedState?.associations.map((association) => (
                  <option key={association.id} value={association.id}>
                    {association.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ads-form__field">
              <span>District operational unit</span>
              <select value={form.selectedDistrictId} onChange={handleDistrictChange} disabled={!selectedAssociation}>
                <option value="">{selectedAssociation ? "Select district unit" : "Choose association first"}</option>
                {selectedAssociation?.district_units.map((districtUnit) => (
                  <option key={districtUnit.id} value={districtUnit.id}>
                    {districtUnit.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ads-form__field">
              <span>Unit</span>
              <select value={form.selectedUnitId} onChange={(event) => updateForm({ selectedUnitId: event.target.value })} disabled={!selectedDistrict}>
                <option value="">{selectedDistrict ? "Select unit" : "Choose district unit first"}</option>
                {selectedDistrict?.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ads-targeting__summary">
            <strong>Current targeting preview</strong>
            <p>
              {selectedState?.name ?? "All states"} / {selectedAssociation?.name ?? "All associations"} /{" "}
              {selectedDistrict?.name ?? "All district units"} / {selectedUnit?.name ?? "All units"}
            </p>
          </div>
        </div>

        <div className="ads-page__actions">
          <button
            type="button"
            className="ads-page__secondary-action"
            disabled={isSaving || Boolean(companyEligibilityError)}
            onClick={() => void handleSave("draft")}
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="ads-page__primary-action"
            disabled={isSaving || Boolean(companyEligibilityError)}
            onClick={() => void handleSave("submit")}
          >
            {isSaving ? "Submitting..." : "Submit For Review"}
          </button>
        </div>
      </div>
    </section>
  );
}
