import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  AssociationAccessRequestPayload,
  CompanyAccessRequestPayload,
  RegionHierarchyAssociation,
  RegionHierarchyDistrict,
  RegionHierarchyState,
  fetchRegionHierarchy,
  submitAssociationAdminAccessRequest,
  submitCompanyAdminAccessRequest,
} from "../lib/api";

type AccessMode = "company" | "association";

const ASSOCIATION_ROLE_OPTIONS = [
  { value: "state_admin", label: "State Admin" },
  { value: "association_admin", label: "Association Admin" },
  { value: "district_admin", label: "District Admin" },
  { value: "unit_admin", label: "Unit Admin" },
] as const;

type RequestState = {
  requester_name: string;
  requester_phone: string;
  requester_email: string;
  state_id: string;
  association_id: string;
  district_operational_unit_id: string;
  unit_id: string;
  notes: string;
};

type CompanyRequestState = RequestState & {
  company_name: string;
  business_type: string;
};

type AssociationRequestState = RequestState & {
  requested_role: (typeof ASSOCIATION_ROLE_OPTIONS)[number]["value"];
};

const initialCompanyState: CompanyRequestState = {
  requester_name: "",
  requester_phone: "",
  requester_email: "",
  company_name: "",
  business_type: "",
  state_id: "",
  association_id: "",
  district_operational_unit_id: "",
  unit_id: "",
  notes: "",
};

const initialAssociationState: AssociationRequestState = {
  requester_name: "",
  requester_phone: "",
  requester_email: "",
  requested_role: "association_admin",
  state_id: "",
  association_id: "",
  district_operational_unit_id: "",
  unit_id: "",
  notes: "",
};

function toNumberOrNull(value: string) {
  return value ? Number(value) : null;
}

function requiresAssociation(role: AssociationRequestState["requested_role"]) {
  return role !== "state_admin";
}

function requiresDistrict(role: AssociationRequestState["requested_role"]) {
  return role === "district_admin" || role === "unit_admin";
}

function requiresUnit(role: AssociationRequestState["requested_role"]) {
  return role === "unit_admin";
}

export function RequestAdminAccessPage() {
  const [mode, setMode] = useState<AccessMode>("company");
  const [regions, setRegions] = useState<RegionHierarchyState[]>([]);
  const [companyForm, setCompanyForm] = useState(initialCompanyState);
  const [associationForm, setAssociationForm] = useState(initialAssociationState);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRegions() {
      setLoadingRegions(true);
      try {
        const payload = await fetchRegionHierarchy();
        if (active) {
          setRegions(payload);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load the hierarchy options.");
        }
      } finally {
        if (active) {
          setLoadingRegions(false);
        }
      }
    }
    void loadRegions();
    return () => {
      active = false;
    };
  }, []);

  const selectedCompanyState = useMemo(
    () => regions.find((state) => state.id === Number(companyForm.state_id)) ?? null,
    [companyForm.state_id, regions],
  );
  const selectedCompanyAssociation = useMemo(
    () => selectedCompanyState?.associations.find((association) => association.id === Number(companyForm.association_id)) ?? null,
    [companyForm.association_id, selectedCompanyState],
  );
  const selectedCompanyDistrict = useMemo(
    () =>
      selectedCompanyAssociation?.district_units.find((district) => district.id === Number(companyForm.district_operational_unit_id)) ?? null,
    [companyForm.district_operational_unit_id, selectedCompanyAssociation],
  );

  const selectedAssociationState = useMemo(
    () => regions.find((state) => state.id === Number(associationForm.state_id)) ?? null,
    [associationForm.state_id, regions],
  );
  const selectedAssociation = useMemo(
    () =>
      selectedAssociationState?.associations.find((association) => association.id === Number(associationForm.association_id)) ?? null,
    [associationForm.association_id, selectedAssociationState],
  );
  const selectedAssociationDistrict = useMemo(
    () =>
      selectedAssociation?.district_units.find((district) => district.id === Number(associationForm.district_operational_unit_id)) ?? null,
    [associationForm.district_operational_unit_id, selectedAssociation],
  );

  function resetFeedback() {
    setError(null);
    setSuccessMessage(null);
  }

  function updateCompanyField<Key extends keyof CompanyRequestState>(key: Key, value: CompanyRequestState[Key]) {
    resetFeedback();
    setCompanyForm((current) => {
      if (key === "state_id") {
        return { ...current, state_id: value, association_id: "", district_operational_unit_id: "", unit_id: "" };
      }
      if (key === "association_id") {
        return { ...current, association_id: value, district_operational_unit_id: "", unit_id: "" };
      }
      if (key === "district_operational_unit_id") {
        return { ...current, district_operational_unit_id: value, unit_id: "" };
      }
      return { ...current, [key]: value };
    });
  }

  function updateAssociationField<Key extends keyof AssociationRequestState>(key: Key, value: AssociationRequestState[Key]) {
    resetFeedback();
    setAssociationForm((current) => {
      if (key === "requested_role") {
        return {
          ...current,
          requested_role: value as AssociationRequestState["requested_role"],
          association_id: "",
          district_operational_unit_id: "",
          unit_id: "",
        };
      }
      if (key === "state_id") {
        return { ...current, state_id: value, association_id: "", district_operational_unit_id: "", unit_id: "" };
      }
      if (key === "association_id") {
        return { ...current, association_id: value, district_operational_unit_id: "", unit_id: "" };
      }
      if (key === "district_operational_unit_id") {
        return { ...current, district_operational_unit_id: value, unit_id: "" };
      }
      return { ...current, [key]: value };
    });
  }

  async function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    resetFeedback();
    try {
      const payload: CompanyAccessRequestPayload = {
        requester_name: companyForm.requester_name,
        requester_phone: companyForm.requester_phone,
        requester_email: companyForm.requester_email,
        company_name: companyForm.company_name,
        business_type: companyForm.business_type,
        state_id: Number(companyForm.state_id),
        association_id: toNumberOrNull(companyForm.association_id),
        district_operational_unit_id: toNumberOrNull(companyForm.district_operational_unit_id),
        unit_id: toNumberOrNull(companyForm.unit_id),
        notes: companyForm.notes,
      };
      const response = await submitCompanyAdminAccessRequest(payload);
      setCompanyForm(initialCompanyState);
      setSuccessMessage(response.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit the company admin request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssociationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    resetFeedback();
    try {
      const payload: AssociationAccessRequestPayload = {
        requester_name: associationForm.requester_name,
        requester_phone: associationForm.requester_phone,
        requester_email: associationForm.requester_email,
        requested_role: associationForm.requested_role,
        state_id: Number(associationForm.state_id),
        association_id: requiresAssociation(associationForm.requested_role) ? toNumberOrNull(associationForm.association_id) : null,
        district_operational_unit_id: requiresDistrict(associationForm.requested_role)
          ? toNumberOrNull(associationForm.district_operational_unit_id)
          : null,
        unit_id: requiresUnit(associationForm.requested_role) ? toNumberOrNull(associationForm.unit_id) : null,
        notes: associationForm.notes,
      };
      const response = await submitAssociationAdminAccessRequest(payload);
      setAssociationForm(initialAssociationState);
      setSuccessMessage(response.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit the association admin request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="request-access-page">
      <section className="request-access-page__card">
        <div className="request-access-page__header">
          <p className="request-access-page__eyebrow">Secure Onboarding</p>
          <h1 className="request-access-page__title">Request administrator access</h1>
          <p className="request-access-page__copy">
            Choose the access path that matches your responsibility. Requests route to the right reviewing admin based on the hierarchy
            you select.
          </p>
          <div className="request-access-page__tabs">
            <button
              className={`request-access-page__tab${mode === "company" ? " request-access-page__tab--active" : ""}`}
              type="button"
              onClick={() => setMode("company")}
            >
              Company Admin
            </button>
            <button
              className={`request-access-page__tab${mode === "association" ? " request-access-page__tab--active" : ""}`}
              type="button"
              onClick={() => setMode("association")}
            >
              Association Admin
            </button>
          </div>
        </div>

        {error ? <div className="login-form__error">{error}</div> : null}
        {successMessage ? <div className="request-access-page__success">{successMessage}</div> : null}

        {loadingRegions ? (
          <div className="request-access-page__empty">
            <strong>Loading hierarchy options...</strong>
            <p>Fetching states, associations, district units, and local units.</p>
          </div>
        ) : null}

        {!loadingRegions && mode === "company" ? (
          <form className="request-access-form" onSubmit={handleCompanySubmit}>
            <div className="request-access-form__grid">
              <label className="request-access-form__field">
                <span>Requester name</span>
                <input value={companyForm.requester_name} onChange={(event) => updateCompanyField("requester_name", event.target.value)} required />
              </label>
              <label className="request-access-form__field">
                <span>Phone number</span>
                <input value={companyForm.requester_phone} onChange={(event) => updateCompanyField("requester_phone", event.target.value)} required />
              </label>
              <label className="request-access-form__field">
                <span>Email</span>
                <input
                  type="email"
                  value={companyForm.requester_email}
                  onChange={(event) => updateCompanyField("requester_email", event.target.value)}
                  required
                />
              </label>
              <label className="request-access-form__field">
                <span>Company name</span>
                <input value={companyForm.company_name} onChange={(event) => updateCompanyField("company_name", event.target.value)} required />
              </label>
              <label className="request-access-form__field">
                <span>Business type</span>
                <input value={companyForm.business_type} onChange={(event) => updateCompanyField("business_type", event.target.value)} required />
              </label>
              <label className="request-access-form__field">
                <span>State</span>
                <select value={companyForm.state_id} onChange={(event) => updateCompanyField("state_id", event.target.value)} required>
                  <option value="">Select state</option>
                  {regions.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>Association</span>
                <select
                  value={companyForm.association_id}
                  onChange={(event) => updateCompanyField("association_id", event.target.value)}
                  disabled={!selectedCompanyState}
                >
                  <option value="">Independent jeweller</option>
                  {(selectedCompanyState?.associations ?? []).map((association) => (
                    <option key={association.id} value={association.id}>
                      {association.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>District operational unit</span>
                <select
                  value={companyForm.district_operational_unit_id}
                  onChange={(event) => updateCompanyField("district_operational_unit_id", event.target.value)}
                  disabled={!selectedCompanyAssociation}
                >
                  <option value="">Optional</option>
                  {(selectedCompanyAssociation?.district_units ?? []).map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>Local unit</span>
                <select
                  value={companyForm.unit_id}
                  onChange={(event) => updateCompanyField("unit_id", event.target.value)}
                  disabled={!selectedCompanyDistrict}
                >
                  <option value="">Optional</option>
                  {(selectedCompanyDistrict?.units ?? []).map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field request-access-form__field--full">
                <span>Notes</span>
                <textarea value={companyForm.notes} onChange={(event) => updateCompanyField("notes", event.target.value)} />
              </label>
            </div>
            <div className="request-access-form__actions">
              <button className="login-form__submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Submitting..." : "Submit Company Request"}</span>
              </button>
            </div>
          </form>
        ) : null}

        {!loadingRegions && mode === "association" ? (
          <form className="request-access-form" onSubmit={handleAssociationSubmit}>
            <div className="request-access-form__grid">
              <label className="request-access-form__field">
                <span>Requester name</span>
                <input value={associationForm.requester_name} onChange={(event) => updateAssociationField("requester_name", event.target.value)} required />
              </label>
              <label className="request-access-form__field">
                <span>Phone number</span>
                <input
                  value={associationForm.requester_phone}
                  onChange={(event) => updateAssociationField("requester_phone", event.target.value)}
                  required
                />
              </label>
              <label className="request-access-form__field">
                <span>Email</span>
                <input
                  type="email"
                  value={associationForm.requester_email}
                  onChange={(event) => updateAssociationField("requester_email", event.target.value)}
                  required
                />
              </label>
              <label className="request-access-form__field">
                <span>Requested role</span>
                <select
                  value={associationForm.requested_role}
                  onChange={(event) => updateAssociationField("requested_role", event.target.value as AssociationRequestState["requested_role"])}
                >
                  {ASSOCIATION_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>State</span>
                <select value={associationForm.state_id} onChange={(event) => updateAssociationField("state_id", event.target.value)} required>
                  <option value="">Select state</option>
                  {regions.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>Association</span>
                <select
                  value={associationForm.association_id}
                  onChange={(event) => updateAssociationField("association_id", event.target.value)}
                  disabled={!selectedAssociationState || !requiresAssociation(associationForm.requested_role)}
                  required={requiresAssociation(associationForm.requested_role)}
                >
                  <option value="">Select association</option>
                  {(selectedAssociationState?.associations ?? []).map((association) => (
                    <option key={association.id} value={association.id}>
                      {association.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>District operational unit</span>
                <select
                  value={associationForm.district_operational_unit_id}
                  onChange={(event) => updateAssociationField("district_operational_unit_id", event.target.value)}
                  disabled={!selectedAssociation || !requiresDistrict(associationForm.requested_role)}
                  required={requiresDistrict(associationForm.requested_role)}
                >
                  <option value="">Select district</option>
                  {(selectedAssociation?.district_units ?? []).map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field">
                <span>Local unit</span>
                <select
                  value={associationForm.unit_id}
                  onChange={(event) => updateAssociationField("unit_id", event.target.value)}
                  disabled={!selectedAssociationDistrict || !requiresUnit(associationForm.requested_role)}
                  required={requiresUnit(associationForm.requested_role)}
                >
                  <option value="">Select unit</option>
                  {(selectedAssociationDistrict?.units ?? []).map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="request-access-form__field request-access-form__field--full">
                <span>Notes</span>
                <textarea value={associationForm.notes} onChange={(event) => updateAssociationField("notes", event.target.value)} />
              </label>
            </div>
            <div className="request-access-form__actions">
              <button className="login-form__submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Submitting..." : "Submit Association Request"}</span>
              </button>
            </div>
          </form>
        ) : null}

        <div className="request-access-page__footer">
          <Link className="login-form__text-action" to="/login">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
