import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  AdminNewsCreatePayload,
  AdminNewsCreateResponse,
  CompanyOption,
  NewsTargetInput,
  RegionHierarchyState,
  createAdminNews,
  fetchCompanyOptions,
  fetchRegionHierarchy,
} from "../lib/api";

type AudienceDraft = {
  key: string;
  targetType: NewsTargetInput["target_type"];
  targetId: string;
};

type SubmitBanner = {
  tone: "success" | "warning" | "draft";
  title: string;
  message: string;
  newsId: number;
};

type HierarchyOption = {
  id: number;
  label: string;
};

const PUBLISHER_TYPE_LABELS: Record<AdminNewsCreatePayload["publisher_type"], string> = {
  platform: "Platform",
  association: "Association",
  unit: "Unit",
  company: "Company",
};

const TARGET_TYPE_LABELS: Record<NewsTargetInput["target_type"], string> = {
  platform: "Platform",
  state: "State",
  association: "Association",
  unit: "Unit",
  company: "Company",
  user: "User",
};

const EXCLUDE_TARGET_TYPE_LABELS = Object.fromEntries(
  Object.entries(TARGET_TYPE_LABELS).filter(([value]) => value !== "user"),
) as Record<Exclude<NewsTargetInput["target_type"], "user">, string>;

let nextAudienceDraftId = 1;

function createAudienceDraft(targetType: NewsTargetInput["target_type"]): AudienceDraft {
  const key = `audience-${nextAudienceDraftId}`;
  nextAudienceDraftId += 1;
  return {
    key,
    targetType,
    targetId: "",
  };
}

function getDefaultPublisherType(role: string | undefined): AdminNewsCreatePayload["publisher_type"] {
  if (role === "SUPER_ADMIN") {
    return "platform";
  }
  if (role === "COMPANY_ADMIN") {
    return "company";
  }
  if (role === "UNIT_ADMIN") {
    return "unit";
  }
  return "association";
}

function getDefaultAudienceTargetType(role: string | undefined): NewsTargetInput["target_type"] {
  if (role === "SUPER_ADMIN") {
    return "platform";
  }
  if (role === "COMPANY_ADMIN") {
    return "company";
  }
  if (role === "UNIT_ADMIN") {
    return "unit";
  }
  return "association";
}

function getSubmitBanner(response: AdminNewsCreateResponse): SubmitBanner {
  if (response.news.status === "pending_approval") {
    return {
      tone: "warning",
      title: "Sent for approval",
      message: response.message,
      newsId: response.news.id,
    };
  }
  if (response.news.status === "draft") {
    return {
      tone: "draft",
      title: "Draft saved",
      message: response.message,
      newsId: response.news.id,
    };
  }
  return {
    tone: "success",
    title: "News published",
    message: response.message,
    newsId: response.news.id,
  };
}

function getFeedbackClassName(tone: SubmitBanner["tone"]) {
  if (tone === "warning") {
    return "content-feedback content-feedback--warning";
  }
  if (tone === "draft") {
    return "content-feedback content-feedback--draft";
  }
  return "content-feedback content-feedback--success";
}

function getScopeLabel(
  sessionRole: string | undefined,
  associationName: string | null,
  stateName: string | null,
  companyName: string | null,
) {
  if (sessionRole === "SUPER_ADMIN") {
    return "Platform";
  }
  if (sessionRole === "COMPANY_ADMIN") {
    return companyName ?? "Company scope";
  }
  if (sessionRole === "ASSOCIATION_ADMIN") {
    return associationName ?? "Association scope";
  }
  if (sessionRole === "UNIT_ADMIN") {
    return associationName ? `${associationName} unit scope` : "Unit scope";
  }
  return associationName ?? stateName ?? "Admin scope";
}

export function AdminNewsCreatePage() {
  const { session } = useAuth();
  const role = session?.user.role;
  const associationName = session?.hierarchy?.association ?? null;
  const stateName = session?.hierarchy?.state ?? null;
  const companyName = session?.company?.name ?? null;
  const companyId = session?.company?.id ?? null;
  const canCreateNews =
    role === "SUPER_ADMIN" || role === "ASSOCIATION_ADMIN" || role === "UNIT_ADMIN" || role === "COMPANY_ADMIN";
  const defaultPublisherType = getDefaultPublisherType(role);
  const defaultAudienceType = getDefaultAudienceTargetType(role);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publisherType, setPublisherType] = useState<AdminNewsCreatePayload["publisher_type"]>(defaultPublisherType);
  const [publisherId, setPublisherId] = useState("");
  const [includeTargets, setIncludeTargets] = useState<AudienceDraft[]>([createAudienceDraft(defaultAudienceType)]);
  const [excludeTargets, setExcludeTargets] = useState<AudienceDraft[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [hierarchy, setHierarchy] = useState<RegionHierarchyState[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitBanner, setSubmitBanner] = useState<SubmitBanner | null>(null);

  useEffect(() => {
    setPublisherType(defaultPublisherType);
    setIncludeTargets((current) => (current.length ? current : [createAudienceDraft(defaultAudienceType)]));
  }, [defaultAudienceType, defaultPublisherType]);

  const loadHierarchy = useCallback(async () => {
    setHierarchyLoading(true);
    setHierarchyError(null);
    try {
      const [regionPayload, companyPayload] = await Promise.all([
        fetchRegionHierarchy(),
        fetchCompanyOptions(),
      ]);
      setHierarchy(regionPayload);
      setCompanies(companyPayload);
    } catch (error) {
      setHierarchyError(error instanceof Error ? error.message : "Unable to load reference options.");
    } finally {
      setHierarchyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canCreateNews) {
      return;
    }
    void loadHierarchy();
  }, [canCreateNews, loadHierarchy]);

  const stateOptions = useMemo<HierarchyOption[]>(
    () => hierarchy.map((item) => ({ id: item.id, label: item.name })),
    [hierarchy],
  );

  const associationOptions = useMemo<HierarchyOption[]>(
    () =>
      hierarchy.flatMap((state) =>
        state.associations.map((association) => ({
          id: association.id,
          label: `${association.name} (${state.name})`,
        })),
      ),
    [hierarchy],
  );

  const unitOptions = useMemo<HierarchyOption[]>(
    () =>
      hierarchy.flatMap((state) =>
        state.associations.flatMap((association) =>
          association.district_units.flatMap((districtUnit) =>
            districtUnit.units.map((unit) => ({
              id: unit.id,
              label: `${unit.name} (${districtUnit.name}, ${association.name})`,
            })),
          ),
        ),
      ),
    [hierarchy],
  );

  const companyOptions = useMemo<HierarchyOption[]>(
    () =>
      companies.map((company) => {
        const location = [company.city, company.state].filter(Boolean).join(", ");
        return {
          id: company.id,
          label: location ? `${company.name} (${location})` : company.name,
        };
      }),
    [companies],
  );

  const derivedAssociationId = useMemo(() => {
    if (!associationName) {
      return null;
    }
    return associationOptions.find((option) => option.label.startsWith(`${associationName} (`))?.id ?? null;
  }, [associationName, associationOptions]);

  useEffect(() => {
    if (role === "ASSOCIATION_ADMIN" && derivedAssociationId && publisherId === "") {
      setPublisherId(String(derivedAssociationId));
    }
    if (role === "COMPANY_ADMIN" && companyId && publisherId === "") {
      setPublisherId(String(companyId));
    }
    if (role === "SUPER_ADMIN") {
      setPublisherId("");
    }
  }, [companyId, derivedAssociationId, publisherId, role]);

  const publisherIdOptions = useMemo(() => {
    if (publisherType === "association") {
      return associationOptions;
    }
    if (publisherType === "unit") {
      return unitOptions;
    }
    return [];
  }, [associationOptions, publisherType, unitOptions]);

  const isPublisherTypeLocked =
    role === "SUPER_ADMIN" || role === "ASSOCIATION_ADMIN" || role === "UNIT_ADMIN" || role === "COMPANY_ADMIN";
  const scopeLabel = getScopeLabel(role, associationName, stateName, companyName);

  function getTargetOptions(targetType: NewsTargetInput["target_type"]) {
    if (targetType === "state") {
      return stateOptions;
    }
    if (targetType === "association") {
      return associationOptions;
    }
    if (targetType === "unit") {
      return unitOptions;
    }
    if (targetType === "company") {
      return companyOptions;
    }
    return [];
  }

  function updateAudienceDraft(
    mode: "include" | "exclude",
    key: string,
    patch: Partial<AudienceDraft>,
  ) {
    const setter = mode === "include" ? setIncludeTargets : setExcludeTargets;
    setter((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }
        const nextItem = { ...item, ...patch };
        if (patch.targetType === "platform") {
          nextItem.targetId = "";
        }
        return nextItem;
      }),
    );
  }

  function addAudienceDraft(mode: "include" | "exclude") {
    const setter = mode === "include" ? setIncludeTargets : setExcludeTargets;
    setter((current) => [...current, createAudienceDraft(defaultAudienceType)]);
  }

  function removeAudienceDraft(mode: "include" | "exclude", key: string) {
    const setter = mode === "include" ? setIncludeTargets : setExcludeTargets;
    setter((current) => current.filter((item) => item.key !== key));
  }

  function parseTargetDraft(item: AudienceDraft, label: string): NewsTargetInput {
    if (item.targetType === "platform") {
      return {
        target_type: item.targetType,
        target_id: null,
      };
    }

    const parsedId = Number(item.targetId);
    if (!Number.isInteger(parsedId) || parsedId < 1) {
      throw new Error(`${label} needs a valid target id.`);
    }

    return {
      target_type: item.targetType,
      target_id: parsedId,
    };
  }

  function buildPayload(): AdminNewsCreatePayload {
    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!nextTitle) {
      throw new Error("Title is required.");
    }
    if (!nextDescription) {
      throw new Error("Description is required.");
    }
    if (!canCreateNews) {
      throw new Error("This role cannot create news in Phase 1.");
    }

    const resolvedPublisherId =
      publisherType === "platform"
        ? null
        : (() => {
            const parsedId = Number(publisherId);
            if (!Number.isInteger(parsedId) || parsedId < 1) {
              throw new Error("Publisher scope needs a valid id.");
            }
            return parsedId;
          })();

    if (!includeTargets.length) {
      throw new Error("At least one include target is required.");
    }

    return {
      title: nextTitle,
      description: nextDescription,
      publisher_type: publisherType,
      publisher_id: resolvedPublisherId,
      include_targets: includeTargets.map((item, index) => parseTargetDraft(item, `Include target ${index + 1}`)),
      exclude_targets: excludeTargets.map((item, index) => parseTargetDraft(item, `Exclude target ${index + 1}`)),
      save_as_draft: saveAsDraft,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitBanner(null);

    try {
      const payload = buildPayload();
      setSubmitting(true);
      const response = await createAdminNews(payload);
      setSubmitBanner(getSubmitBanner(response));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to submit news.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderTargetIdField(mode: "include" | "exclude", item: AudienceDraft, index: number) {
    const options = getTargetOptions(item.targetType);
    const fieldId = `${mode}-target-${index}`;

    if (item.targetType === "platform") {
      return (
        <div className="content-form__helper-card">
          <strong>Platform audience</strong>
          <p>This target applies globally and does not need an id.</p>
        </div>
      );
    }

    if (options.length) {
      return (
        <label className="content-form__field">
          <span>Target</span>
          <select value={item.targetId} onChange={(event) => updateAudienceDraft(mode, item.key, { targetId: event.target.value })}>
            <option value="">Select a target</option>
            {options.map((option) => (
              <option key={`${fieldId}-${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="content-form__field">
        <span>Target id</span>
        <input
          type="number"
          min="1"
          value={item.targetId}
          onChange={(event) => updateAudienceDraft(mode, item.key, { targetId: event.target.value })}
          placeholder={item.targetType === "company" ? "Enter company id" : "Enter user id"}
        />
      </label>
    );
  }

  if (!canCreateNews) {
    return (
      <section className="content-page">
        <div className="content-page__hero">
          <div>
            <p className="content-page__eyebrow">Content Submission</p>
            <h2 className="content-page__title">News upload is not enabled for this role</h2>
            <p className="content-page__copy">
              This screen stays visible in the shared admin shell, but this role does not yet have a direct publisher scope in the
              current backend rules. The UI remains available so the navigation structure stays consistent across admin roles.
            </p>
          </div>
          <span className="content-page__scope-badge">{scopeLabel}</span>
        </div>

        <div className="content-feedback content-feedback--info">
          <div>
            <strong>Current role</strong>
            <p>{session?.user.role_display_name ?? "Administrator"} can still use the rest of the web-admin shell.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content-page">
      <div className="content-page__hero">
        <div>
          <p className="content-page__eyebrow">Content Submission</p>
          <h2 className="content-page__title">Create news for the current admin scope</h2>
          <p className="content-page__copy">
            This Phase 1 editor uses the live news create API and reflects the backend decision directly. In-scope audiences
            publish immediately, while broader audiences stay subject to approval.
          </p>
        </div>

        <div className="content-page__hero-meta">
          <span className="content-page__scope-badge">{scopeLabel}</span>
          <p className="content-page__scope-copy">{session?.user.role_display_name ?? "Administrator"}</p>
        </div>
      </div>

      {hierarchyError ? (
        <div className="content-feedback content-feedback--warning">
          <div>
            <strong>Reference hierarchy unavailable</strong>
            <p>{hierarchyError} You can still submit by entering numeric ids manually for user targets.</p>
          </div>
          <button className="content-feedback__action" type="button" onClick={() => void loadHierarchy()}>
            Retry
          </button>
        </div>
      ) : null}

      {submitBanner ? (
        <div className={getFeedbackClassName(submitBanner.tone)}>
          <div>
            <strong>{submitBanner.title}</strong>
            <p>{submitBanner.message}</p>
          </div>
          <span className="content-feedback__pill">News #{submitBanner.newsId}</span>
        </div>
      ) : null}

      {formError ? (
        <div className="content-feedback content-feedback--error">
          <div>
            <strong>Submission blocked</strong>
            <p>{formError}</p>
          </div>
        </div>
      ) : null}

      <form className="content-page__grid" onSubmit={(event) => void handleSubmit(event)}>
        <div className="content-panel">
          <div className="content-panel__header">
            <div>
              <p className="content-panel__eyebrow">News Draft</p>
              <h3 className="content-panel__title">Compose the item</h3>
            </div>
          </div>

          <div className="content-form">
            <label className="content-form__field content-form__field--full">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a clear operational headline" />
            </label>

            <label className="content-form__field content-form__field--full">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Write the full message exactly as it should be stored."
              />
            </label>

            <label className="content-form__field">
              <span>Publisher type</span>
              <select
                value={publisherType}
                onChange={(event) => setPublisherType(event.target.value as AdminNewsCreatePayload["publisher_type"])}
                disabled={isPublisherTypeLocked}
              >
                {Object.entries(PUBLISHER_TYPE_LABELS)
                  .filter(([value]) => {
                    if (role === "SUPER_ADMIN") {
                      return value === "platform";
                    }
                    if (role === "COMPANY_ADMIN") {
                      return value === "company";
                    }
                    if (role === "ASSOCIATION_ADMIN") {
                      return value === "association";
                    }
                    if (role === "UNIT_ADMIN") {
                      return value === "unit";
                    }
                    return false;
                  })
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>

            {publisherType === "platform" ? (
              <div className="content-form__field">
                <span>Publisher id</span>
                <div className="content-form__helper-card">
                  <strong>Not required</strong>
                  <p>Platform publishers are identified by role and do not send a publisher id.</p>
                </div>
              </div>
            ) : publisherType === "company" && companyId ? (
              <div className="content-form__field">
                <span>Publisher id</span>
                <div className="content-form__helper-card">
                  <strong>{companyName ?? "Current company"}</strong>
                  <p>Company news is locked to your own managed company scope. Publisher id: {companyId}</p>
                </div>
              </div>
            ) : publisherIdOptions.length ? (
              <label className="content-form__field">
                <span>Publisher id</span>
                <select value={publisherId} onChange={(event) => setPublisherId(event.target.value)} disabled={role === "ASSOCIATION_ADMIN"}>
                  <option value="">{hierarchyLoading ? "Loading scope options..." : "Select scope"}</option>
                  {publisherIdOptions.map((option) => (
                    <option key={`publisher-${option.id}`} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="content-form__field">
                <span>Publisher id</span>
                <input
                  type="number"
                  min="1"
                  value={publisherId}
                  onChange={(event) => setPublisherId(event.target.value)}
                  placeholder={publisherType === "association" ? "Enter association id" : "Enter unit id"}
                />
              </label>
            )}

            <label className="content-form__checkbox content-form__field--full">
              <input type="checkbox" checked={saveAsDraft} onChange={(event) => setSaveAsDraft(event.target.checked)} />
              <div>
                <strong>Save as draft</strong>
                <p>Drafts skip publish and approval until you submit them again later.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="content-page__side-stack">
          <div className="content-panel">
            <div className="content-panel__header">
              <div>
                <p className="content-panel__eyebrow">Feature Image</p>
                <h3 className="content-panel__title">Reserved for a later phase</h3>
              </div>
            </div>
            <div className="content-image-placeholder">
              <strong>Image upload is not wired yet</strong>
              <p>This placeholder keeps the layout ready for the later media phase without implying a live upload flow today.</p>
            </div>
          </div>

          <div className="content-panel">
            <div className="content-panel__header">
              <div>
                <p className="content-panel__eyebrow">Publishing Notes</p>
                <h3 className="content-panel__title">Scope and approval behavior</h3>
              </div>
            </div>
            <ul className="content-rules">
              <li>Association news can publish directly only to audiences inside the same association scope.</li>
              <li>Unit news can publish directly only to audiences inside the same unit scope.</li>
              <li>Company news can publish directly only to the same company or users that belong to that company scope.</li>
              <li>Any broader audience is handled by the backend and may move to pending approval.</li>
              <li>Company audience targets use the live company list, while user audience targets still use numeric ids.</li>
            </ul>
          </div>
        </div>

        <div className="content-panel content-panel--full">
          <div className="content-panel__header">
            <div>
              <p className="content-panel__eyebrow">Audience Builder</p>
              <h3 className="content-panel__title">Include and exclude targets</h3>
            </div>
          </div>

          <div className="content-audience">
            <section className="content-audience__section">
              <div className="content-audience__section-header">
                <div>
                  <p className="content-audience__label">Include targets</p>
                  <h4>Who should receive this news</h4>
                </div>
                <button className="content-audience__button" type="button" onClick={() => addAudienceDraft("include")}>
                  Add include target
                </button>
              </div>

              <div className="content-audience__rows">
                {includeTargets.map((item, index) => (
                  <div key={item.key} className="content-audience__row">
                    <label className="content-form__field">
                      <span>Target type</span>
                      <select
                        value={item.targetType}
                        onChange={(event) =>
                          updateAudienceDraft("include", item.key, {
                            targetType: event.target.value as NewsTargetInput["target_type"],
                            targetId: "",
                          })
                        }
                      >
                        {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                          <option key={`include-${item.key}-${value}`} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {renderTargetIdField("include", item, index)}

                    <button
                      className="content-audience__remove"
                      type="button"
                      onClick={() => removeAudienceDraft("include", item.key)}
                      disabled={includeTargets.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-audience__section">
              <div className="content-audience__section-header">
                <div>
                  <p className="content-audience__label">Exclude targets</p>
                  <h4>Who should be carved out of the included audience</h4>
                </div>
                <button className="content-audience__button" type="button" onClick={() => addAudienceDraft("exclude")}>
                  Add exclude target
                </button>
              </div>

              {excludeTargets.length ? (
                <div className="content-audience__rows">
                  {excludeTargets.map((item, index) => (
                    <div key={item.key} className="content-audience__row">
                      <label className="content-form__field">
                        <span>Target type</span>
                        <select
                          value={item.targetType}
                          onChange={(event) =>
                            updateAudienceDraft("exclude", item.key, {
                              targetType: event.target.value as NewsTargetInput["target_type"],
                              targetId: "",
                            })
                          }
                        >
                          {Object.entries(EXCLUDE_TARGET_TYPE_LABELS).map(([value, label]) => (
                            <option key={`exclude-${item.key}-${value}`} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {renderTargetIdField("exclude", item, index)}

                      <button className="content-audience__remove" type="button" onClick={() => removeAudienceDraft("exclude", item.key)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="content-empty-state">
                  <strong>No exclusions yet</strong>
                  <p>Add exclusions only when a segment should be left out of the main audience.</p>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="content-page__actions">
          <button className="content-page__submit" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : saveAsDraft ? "Save Draft" : "Submit News"}
          </button>
        </div>
      </form>
    </section>
  );
}
