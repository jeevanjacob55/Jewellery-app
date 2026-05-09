import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  approveAdminTierRequest,
  cancelCompanyTierRequest,
  CompanyTierRecord,
  CompanyTierManagementOverview,
  createCompanyTierRequest,
  fetchAdminTierDetail,
  fetchAdminTierRequests,
  fetchAdminTiers,
  fetchCompanyTierManagementOverview,
  rejectAdminTierRequest,
  TierAdminDetail,
  TierChangeRequestRecord,
  updateAdminTier,
} from "../lib/api";

type TierEditForm = {
  name: string;
  slug: string;
  description: string;
  max_products: string;
  min_photos_per_product: string;
  max_photos_per_product: string;
  max_companies_allowed: string;
  price: string;
  is_free: boolean;
  is_active: boolean;
  base_weight: string;
  hero_eligible: boolean;
  premium_floor_share: string;
  cooldown_hours: string;
  display_priority: string;
  visibility_type: string;
};

function buildTierEditForm(tier: CompanyTierRecord | null): TierEditForm {
  if (!tier) {
    return {
      name: "",
      slug: "",
      description: "",
      max_products: "",
      min_photos_per_product: "",
      max_photos_per_product: "",
      max_companies_allowed: "",
      price: "",
      is_free: false,
      is_active: false,
      base_weight: "",
      hero_eligible: false,
      premium_floor_share: "",
      cooldown_hours: "",
      display_priority: "",
      visibility_type: "normal",
    };
  }
  return {
    name: tier.name,
    slug: tier.slug,
    description: tier.description,
    max_products: String(tier.max_products),
    min_photos_per_product: String(tier.min_photos_per_product),
    max_photos_per_product: String(tier.max_photos_per_product),
    max_companies_allowed: tier.max_companies_allowed == null ? "" : String(tier.max_companies_allowed),
    price: tier.price,
    is_free: tier.is_free,
    is_active: tier.is_active,
    base_weight: String(tier.base_weight),
    hero_eligible: tier.hero_eligible,
    premium_floor_share: tier.premium_floor_share,
    cooldown_hours: String(tier.cooldown_hours),
    display_priority: String(tier.display_priority),
    visibility_type: tier.visibility_type,
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }
  return new Date(value).toLocaleString();
}

function formatRequestStatus(status: TierChangeRequestRecord["status"]) {
  return status.replace("_", " ");
}

function formatRequestType(value: TierChangeRequestRecord["request_type"]) {
  return value === "upgrade" ? "Upgrade" : "Downgrade";
}

function parseTierPayload(form: TierEditForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description,
    max_products: Number.parseInt(form.max_products || "0", 10),
    min_photos_per_product: Number.parseInt(form.min_photos_per_product || "0", 10),
    max_photos_per_product: Number.parseInt(form.max_photos_per_product || "0", 10),
    max_companies_allowed: form.max_companies_allowed.trim() ? Number.parseInt(form.max_companies_allowed, 10) : null,
    price: form.price,
    is_free: form.is_free,
    is_active: form.is_active,
    base_weight: Number.parseInt(form.base_weight || "0", 10),
    hero_eligible: form.hero_eligible,
    premium_floor_share: form.premium_floor_share,
    cooldown_hours: Number.parseInt(form.cooldown_hours || "0", 10),
    display_priority: Number.parseInt(form.display_priority || "0", 10),
    visibility_type: form.visibility_type,
  };
}

export function TierManagementPage() {
  const { session } = useAuth();
  const isCompanyAdmin = session?.user.role === "COMPANY_ADMIN";
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [companyOverview, setCompanyOverview] = useState<CompanyTierManagementOverview | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [tiers, setTiers] = useState<CompanyTierRecord[]>([]);
  const [tierDetail, setTierDetail] = useState<TierAdminDetail | null>(null);
  const [tierRequests, setTierRequests] = useState<TierChangeRequestRecord[]>([]);
  const [tierEditForm, setTierEditForm] = useState<TierEditForm>(buildTierEditForm(null));
  const [selectedTargetTierId, setSelectedTargetTierId] = useState("");
  const [companyNote, setCompanyNote] = useState("");
  const [retainedProductIds, setRetainedProductIds] = useState<number[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [savingTier, setSavingTier] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const selectedCompanyTierTarget = useMemo(() => {
    const options = companyOverview ? [...companyOverview.available_upgrades, ...companyOverview.available_downgrades] : [];
    return options.find((tier) => String(tier.id) === selectedTargetTierId) ?? null;
  }, [companyOverview, selectedTargetTierId]);

  const selectedTierRequest = useMemo(
    () => tierRequests.find((request) => request.status === "pending") ?? tierRequests[0] ?? null,
    [tierRequests],
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        if (isCompanyAdmin) {
          const overview = await fetchCompanyTierManagementOverview();
          if (!active) {
            return;
          }
          setCompanyOverview(overview);
          setSelectedTargetTierId(overview.available_upgrades[0] ? String(overview.available_upgrades[0].id) : "");
        } else if (isSuperAdmin) {
          const [tierList, requestPayload] = await Promise.all([
            fetchAdminTiers(),
            fetchAdminTierRequests(),
          ]);
          if (!active) {
            return;
          }
          setTiers(tierList);
          setTierRequests(requestPayload.results);
          const nextTierId = tierList[0]?.id ?? null;
          setSelectedTierId(nextTierId);
          if (nextTierId) {
            const detail = await fetchAdminTierDetail(nextTierId);
            if (!active) {
              return;
            }
            setTierDetail(detail);
            setTierEditForm(buildTierEditForm(detail.tier));
          }
        } else {
          setError("Tier Management is only available to company admins and super admins.");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load tier management.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [isCompanyAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !selectedTierId) {
      return;
    }
    let active = true;
    async function loadTierDetail() {
      try {
        const detail = await fetchAdminTierDetail(selectedTierId);
        if (!active) {
          return;
        }
        setTierDetail(detail);
        setTierEditForm(buildTierEditForm(detail.tier));
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load tier detail.");
      }
    }
    void loadTierDetail();
    return () => {
      active = false;
    };
  }, [isSuperAdmin, selectedTierId]);

  useEffect(() => {
    setRetainedProductIds([]);
  }, [selectedTargetTierId]);

  async function reloadCompanyOverview() {
    const overview = await fetchCompanyTierManagementOverview();
    setCompanyOverview(overview);
  }

  async function reloadAdminData(focusTierId?: number) {
    const [tierList, requestPayload] = await Promise.all([fetchAdminTiers(), fetchAdminTierRequests()]);
    setTiers(tierList);
    setTierRequests(requestPayload.results);
    const nextTierId = focusTierId ?? selectedTierId ?? tierList[0]?.id ?? null;
    setSelectedTierId(nextTierId);
    if (nextTierId) {
      const detail = await fetchAdminTierDetail(nextTierId);
      setTierDetail(detail);
      setTierEditForm(buildTierEditForm(detail.tier));
    } else {
      setTierDetail(null);
      setTierEditForm(buildTierEditForm(null));
    }
  }

  async function handleCompanyRequestSubmit() {
    if (!selectedCompanyTierTarget) {
      return;
    }
    setSubmittingRequest(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await createCompanyTierRequest({
        requested_tier_id: selectedCompanyTierTarget.id,
        company_note: companyNote,
        retain_active_product_ids: retainedProductIds,
      });
      await reloadCompanyOverview();
      setCompanyNote("");
      setSuccessMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit tier request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleCancelPendingRequest(requestId: number) {
    setProcessingRequestId(requestId);
    setError("");
    setSuccessMessage("");
    try {
      const response = await cancelCompanyTierRequest(requestId);
      await reloadCompanyOverview();
      setSuccessMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel the tier request.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleSaveTier() {
    if (!tierDetail) {
      return;
    }
    setSavingTier(true);
    setError("");
    setSuccessMessage("");
    try {
      await updateAdminTier(tierDetail.tier.id, parseTierPayload(tierEditForm));
      await reloadAdminData(tierDetail.tier.id);
      setSuccessMessage("Tier specification updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save tier changes.");
    } finally {
      setSavingTier(false);
    }
  }

  async function handleReviewRequest(action: "approve" | "reject", requestId: number) {
    setProcessingRequestId(requestId);
    setError("");
    setSuccessMessage("");
    try {
      const response =
        action === "approve"
          ? await approveAdminTierRequest(requestId, reviewNote)
          : await rejectAdminTierRequest(requestId, reviewNote);
      await reloadAdminData(tierDetail?.tier.id);
      setReviewNote("");
      setSuccessMessage(response.message);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to process tier request.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  if (loading) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Loading</p>
          <h2 className="admin-placeholder__title">Preparing tier management</h2>
          <p className="admin-placeholder__copy">Loading plan data, requests, and tier specifications.</p>
        </div>
      </section>
    );
  }

  if (!isCompanyAdmin && !isSuperAdmin) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Restricted</p>
          <h2 className="admin-placeholder__title">Tier Management is not available for this role.</h2>
          <p className="admin-placeholder__copy">Use a company-admin or super-admin account to access plan management.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="company-page">
      <div className="company-page__hero">
        <div>
          <p className="company-page__eyebrow">Tier Management</p>
          <h2 className="company-page__title">{isCompanyAdmin ? "Plan upgrades and downgrade requests" : "Manage tier definitions and company requests"}</h2>
          <p className="company-page__copy">
            {isCompanyAdmin
              ? "Review your current tier, compare higher plans, and submit manual approval requests."
              : "Review company tier requests, update plan specifications, and track companies enrolled in each tier."}
          </p>
        </div>
      </div>

      {error ? <div className="rates-feedback rates-feedback--error">{error}</div> : null}
      {successMessage ? <div className="rates-feedback rates-feedback--success">{successMessage}</div> : null}

      {isCompanyAdmin && companyOverview ? (
        <>
          <div className="company-page__grid">
            <article className="company-card">
              <div className="company-card__header">
                <div>
                  <p className="company-card__eyebrow">Current Plan</p>
                  <h3 className="company-card__title">{companyOverview.current_tier.name}</h3>
                </div>
              </div>
              <div className="company-readonly-grid">
                <div className="company-readonly"><span>Visibility</span><strong>{companyOverview.current_tier.visibility_type}</strong></div>
                <div className="company-readonly"><span>Max products</span><strong>{companyOverview.current_tier.max_products}</strong></div>
                <div className="company-readonly"><span>Image range</span><strong>{companyOverview.current_tier.min_photos_per_product} to {companyOverview.current_tier.max_photos_per_product}</strong></div>
                <div className="company-readonly"><span>Hero eligible</span><strong>{companyOverview.current_tier.hero_eligible ? "Yes" : "No"}</strong></div>
                <div className="company-readonly"><span>Fairness weight</span><strong>{companyOverview.capabilities.fairness_weight}</strong></div>
                <div className="company-readonly"><span>Cooldown</span><strong>{companyOverview.capabilities.cooldown_hours} hours</strong></div>
              </div>
            </article>

            <article className="company-card">
              <div className="company-card__header">
                <div>
                  <p className="company-card__eyebrow">Request Status</p>
                  <h3 className="company-card__title">{companyOverview.pending_request ? "Pending manual review" : "No active request"}</h3>
                </div>
              </div>
              {companyOverview.pending_request ? (
                <div className="company-empty-state">
                  <strong>{formatRequestType(companyOverview.pending_request.request_type)} to {companyOverview.pending_request.requested_tier_name}</strong>
                  <p>Submitted {formatDateTime(companyOverview.pending_request.created_at)}</p>
                  <button
                    className="company-table__action"
                    type="button"
                    disabled={processingRequestId === companyOverview.pending_request.id}
                    onClick={() => void handleCancelPendingRequest(companyOverview.pending_request!.id)}
                  >
                    {processingRequestId === companyOverview.pending_request.id ? "Cancelling..." : "Cancel Request"}
                  </button>
                </div>
              ) : (
                <div className="company-empty-state">You can submit one open request at a time for manual approval.</div>
              )}
            </article>
          </div>

          <article className="company-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Request A Change</p>
                <h3 className="company-card__title">Available tiers</h3>
              </div>
            </div>
            <div className="company-form">
              <label className="rates-form__field">
                <span>Target tier</span>
                <select value={selectedTargetTierId} onChange={(event) => setSelectedTargetTierId(event.target.value)} disabled={Boolean(companyOverview.pending_request)}>
                  <option value="">Select a tier</option>
                  {[...companyOverview.available_upgrades, ...companyOverview.available_downgrades].map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} ({tier.visibility_type})
                    </option>
                  ))}
                </select>
              </label>
              <label className="rates-form__field company-form__field--full">
                <span>Why are you requesting this change?</span>
                <textarea
                  value={companyNote}
                  onChange={(event) => setCompanyNote(event.target.value)}
                  rows={4}
                  disabled={Boolean(companyOverview.pending_request)}
                />
              </label>
            </div>
            {selectedCompanyTierTarget ? (
              <div className="company-readonly-grid">
                <div className="company-readonly"><span>Target max products</span><strong>{selectedCompanyTierTarget.max_products}</strong></div>
                <div className="company-readonly"><span>Target image range</span><strong>{selectedCompanyTierTarget.min_photos_per_product} to {selectedCompanyTierTarget.max_photos_per_product}</strong></div>
                <div className="company-readonly"><span>Target weight</span><strong>{selectedCompanyTierTarget.base_weight}</strong></div>
                <div className="company-readonly"><span>Hero eligible</span><strong>{selectedCompanyTierTarget.hero_eligible ? "Yes" : "No"}</strong></div>
              </div>
            ) : null}
            {selectedCompanyTierTarget && selectedCompanyTierTarget.display_priority > companyOverview.current_tier.display_priority && companyOverview.company.active_product_count > selectedCompanyTierTarget.max_products ? (
              <div className="company-card">
                <div className="company-card__header">
                  <div>
                    <p className="company-card__eyebrow">Downgrade Selection</p>
                    <h3 className="company-card__title">Choose active products to retain</h3>
                  </div>
                </div>
                <div className="company-products-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Keep</th>
                        <th>Product</th>
                        <th>Purity</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyOverview.active_products.map((product) => {
                        const checked = retainedProductIds.includes(product.id);
                        const disabled = !checked && retainedProductIds.length >= selectedCompanyTierTarget.max_products;
                        return (
                          <tr key={product.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled || Boolean(companyOverview.pending_request)}
                                onChange={(event) =>
                                  setRetainedProductIds((current) =>
                                    event.target.checked
                                      ? [...current, product.id]
                                      : current.filter((item) => item !== product.id),
                                  )
                                }
                              />
                            </td>
                            <td>{product.name}</td>
                            <td>{product.purity}</td>
                            <td>{product.weight_grams} g</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="company-page__copy">Select up to {selectedCompanyTierTarget.max_products} active products to keep enabled after the downgrade.</p>
              </div>
            ) : null}
            <div className="company-modal__actions">
              <button
                className="rates-form__button"
                type="button"
                disabled={!selectedCompanyTierTarget || submittingRequest || Boolean(companyOverview.pending_request)}
                onClick={() => void handleCompanyRequestSubmit()}
              >
                {submittingRequest ? "Submitting..." : "Submit Tier Request"}
              </button>
            </div>
          </article>

          <article className="company-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">History</p>
                <h3 className="company-card__title">Recent requests</h3>
              </div>
            </div>
            {companyOverview.requests.length ? (
              <div className="company-products-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Requested tier</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Reviewed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyOverview.requests.map((request) => (
                      <tr key={request.id}>
                        <td>{formatRequestType(request.request_type)}</td>
                        <td>{request.requested_tier_name}</td>
                        <td>{formatRequestStatus(request.status)}</td>
                        <td>{formatDateTime(request.created_at)}</td>
                        <td>{formatDateTime(request.reviewed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="company-empty-state">No tier requests yet.</div>
            )}
          </article>
        </>
      ) : null}

      {isSuperAdmin ? (
        <div className="company-page__grid">
          <article className="company-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Tiers</p>
                <h3 className="company-card__title">All plans</h3>
              </div>
            </div>
            <div className="ads-campaigns">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  className={`ads-campaigns__card${selectedTierId === tier.id ? " ads-campaigns__card--active" : ""}`}
                  onClick={() => setSelectedTierId(tier.id)}
                >
                  <div className="ads-campaigns__meta">
                    <span>{tier.visibility_type}</span>
                    <span>{tier.current_company_count} companies</span>
                  </div>
                  <strong>{tier.name}</strong>
                  <p>{tier.description || "No description added yet."}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="company-card">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Tier Detail</p>
                <h3 className="company-card__title">{tierDetail?.tier.name ?? "Select a tier"}</h3>
              </div>
              <button className="rates-form__button" type="button" onClick={() => void handleSaveTier()} disabled={!tierDetail || savingTier}>
                {savingTier ? "Saving..." : "Save Tier"}
              </button>
            </div>
            {tierDetail ? (
              <>
                <div className="company-form">
                  <label className="rates-form__field"><span>Name</span><input value={tierEditForm.name} onChange={(event) => setTierEditForm((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Slug</span><input value={tierEditForm.slug} onChange={(event) => setTierEditForm((current) => ({ ...current, slug: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Visibility</span><select value={tierEditForm.visibility_type} onChange={(event) => setTierEditForm((current) => ({ ...current, visibility_type: event.target.value }))}><option value="featured">featured</option><option value="pro">pro</option><option value="normal">normal</option></select></label>
                  <label className="rates-form__field"><span>Price</span><input value={tierEditForm.price} onChange={(event) => setTierEditForm((current) => ({ ...current, price: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Max products</span><input type="number" value={tierEditForm.max_products} onChange={(event) => setTierEditForm((current) => ({ ...current, max_products: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Min photos</span><input type="number" value={tierEditForm.min_photos_per_product} onChange={(event) => setTierEditForm((current) => ({ ...current, min_photos_per_product: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Max photos</span><input type="number" value={tierEditForm.max_photos_per_product} onChange={(event) => setTierEditForm((current) => ({ ...current, max_photos_per_product: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Company cap</span><input type="number" value={tierEditForm.max_companies_allowed} onChange={(event) => setTierEditForm((current) => ({ ...current, max_companies_allowed: event.target.value }))} placeholder="Unlimited when empty" /></label>
                  <label className="rates-form__field"><span>Base weight</span><input type="number" value={tierEditForm.base_weight} onChange={(event) => setTierEditForm((current) => ({ ...current, base_weight: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Premium floor share</span><input value={tierEditForm.premium_floor_share} onChange={(event) => setTierEditForm((current) => ({ ...current, premium_floor_share: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Cooldown hours</span><input type="number" value={tierEditForm.cooldown_hours} onChange={(event) => setTierEditForm((current) => ({ ...current, cooldown_hours: event.target.value }))} /></label>
                  <label className="rates-form__field"><span>Display priority</span><input type="number" value={tierEditForm.display_priority} onChange={(event) => setTierEditForm((current) => ({ ...current, display_priority: event.target.value }))} /></label>
                  <label className="rates-form__field company-form__field--full"><span>Description</span><textarea value={tierEditForm.description} onChange={(event) => setTierEditForm((current) => ({ ...current, description: event.target.value }))} rows={4} /></label>
                  <label className="company-checkbox"><input type="checkbox" checked={tierEditForm.is_free} onChange={(event) => setTierEditForm((current) => ({ ...current, is_free: event.target.checked }))} /><span>Free plan</span></label>
                  <label className="company-checkbox"><input type="checkbox" checked={tierEditForm.is_active} onChange={(event) => setTierEditForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>Active tier</span></label>
                  <label className="company-checkbox"><input type="checkbox" checked={tierEditForm.hero_eligible} onChange={(event) => setTierEditForm((current) => ({ ...current, hero_eligible: event.target.checked }))} /><span>Hero eligible</span></label>
                </div>

                <div className="company-products-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Enrolled company</th>
                        <th>Location</th>
                        <th>Products</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierDetail.enrolled_companies.map((company) => (
                        <tr key={company.id}>
                          <td>{company.name}</td>
                          <td>{company.city}, {company.state}</td>
                          <td>{company.active_product_count}</td>
                          <td>{company.is_active && company.is_approved ? "Active" : "Restricted"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="company-empty-state">Select a tier to review its companies and specifications.</div>
            )}
          </article>

          <article className="company-card company-card--full">
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">Manual Review</p>
                <h3 className="company-card__title">Pending and recent requests</h3>
              </div>
            </div>
            <label className="rates-form__field company-form__field--full">
              <span>Review note</span>
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} />
            </label>
            {tierRequests.length ? (
              <div className="company-products-table">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Type</th>
                      <th>Current</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tierRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.company.name}</strong>
                          <span>{request.company.state}</span>
                        </td>
                        <td>{formatRequestType(request.request_type)}</td>
                        <td>{request.current_tier_name}</td>
                        <td>{request.requested_tier_name}</td>
                        <td>{formatRequestStatus(request.status)}</td>
                        <td>{formatDateTime(request.created_at)}</td>
                        <td>
                          {request.status === "pending" ? (
                            <div className="company-modal__actions">
                              <button className="company-table__action" type="button" disabled={processingRequestId === request.id} onClick={() => void handleReviewRequest("reject", request.id)}>
                                Reject
                              </button>
                              <button className="rates-form__button" type="button" disabled={processingRequestId === request.id} onClick={() => void handleReviewRequest("approve", request.id)}>
                                Approve
                              </button>
                            </div>
                          ) : (
                            <span>{request.reviewed_by_name ?? "Closed"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="company-empty-state">No tier requests are waiting for review.</div>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
