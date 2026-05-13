import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  AdvertisementCampaignRecord,
  AssociationAdminAccessRequestRecord,
  CompanyAdminAccessRequestRecord,
  AccessRequestMutationResponse,
  approveAdvertisement,
  approveAssociationAdminAccessRequest,
  approveCompanyAdminAccessRequest,
  fetchPendingAdvertisementApprovals,
  fetchPendingAssociationAdminAccessRequests,
  fetchPendingCompanyAdminAccessRequests,
  rejectAdvertisement,
  rejectAssociationAdminAccessRequest,
  rejectCompanyAdminAccessRequest,
} from "../lib/api";

type ApprovalTab = "all" | "ads" | "users" | "news" | "tiers";
type ApprovalItemType = Exclude<ApprovalTab, "all">;

type ApprovalItem = {
  id: string;
  recordId?: number;
  type: ApprovalItemType;
  title: string;
  subtitle: string;
  status: "pending";
  source: "ads" | "company_access" | "association_access" | "skeleton";
};

const TAB_LABELS: Record<ApprovalTab, string> = {
  all: "All Pending",
  ads: "Approve Ads",
  users: "Approve Users",
  news: "Approve News",
  tiers: "Approve Tiers",
};

const SKELETON_ITEMS: ApprovalItem[] = [
  {
    id: "news-association-bulletin",
    type: "news",
    title: "Association-wide Holiday Bulletin",
    subtitle: "News item awaiting approval for KGSMA-wide publishing",
    status: "pending",
    source: "skeleton",
  },
  {
    id: "tiers-heritage-upgrade",
    type: "tiers",
    title: "Heritage Gold House Tier Upgrade",
    subtitle: "Prime Circle to Prime Premier upgrade request",
    status: "pending",
    source: "skeleton",
  },
  {
    id: "news-unit-announcement",
    type: "news",
    title: "Unit Meeting Announcement",
    subtitle: "Branch update submitted for association review",
    status: "pending",
    source: "skeleton",
  },
  {
    id: "tiers-coastal-upgrade",
    type: "tiers",
    title: "Coastal Bullion Works Tier Upgrade",
    subtitle: "Prime Premier to Prime Signature upgrade request",
    status: "pending",
    source: "skeleton",
  },
];

function mapAdvertisementApproval(advertisement: AdvertisementCampaignRecord): ApprovalItem {
  const companyName = advertisement.company?.name ?? "Linked company";
  return {
    id: `ads-${advertisement.id}`,
    recordId: advertisement.id,
    type: "ads",
    title: advertisement.title,
    subtitle: `${companyName} submitted a ${advertisement.placement.replace("_", " ")} campaign for review`,
    status: "pending",
    source: "ads",
  };
}

function mapCompanyAccessRequest(request: CompanyAdminAccessRequestRecord): ApprovalItem {
  const scopeLabel = request.association?.name ?? request.state.name;
  return {
    id: `company-access-${request.id}`,
    recordId: request.id,
    type: "users",
    title: request.requester_name,
    subtitle: `${request.company_name} requested company admin access in ${scopeLabel}`,
    status: "pending",
    source: "company_access",
  };
}

function mapAssociationAccessRequest(request: AssociationAdminAccessRequestRecord): ApprovalItem {
  const scopeLabel =
    request.unit?.name ??
    request.district_operational_unit?.name ??
    request.association?.name ??
    request.state.name;
  return {
    id: `association-access-${request.id}`,
    recordId: request.id,
    type: "users",
    title: request.requester_name,
    subtitle: `${request.requested_role.replace("_", " ")} request for ${scopeLabel}`,
    status: "pending",
    source: "association_access",
  };
}

export function ApprovalDashboardPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<ApprovalTab>("all");
  const [skeletonItems, setSkeletonItems] = useState<ApprovalItem[]>(SKELETON_ITEMS);
  const [advertisementItems, setAdvertisementItems] = useState<ApprovalItem[]>([]);
  const [companyAccessItems, setCompanyAccessItems] = useState<ApprovalItem[]>([]);
  const [associationAccessItems, setAssociationAccessItems] = useState<ApprovalItem[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [decisioningId, setDecisioningId] = useState<string | null>(null);

  const canReviewAdvertisements = Boolean(session?.user.is_admin);

  useEffect(() => {
    let active = true;

    async function loadAdvertisementApprovals() {
      if (!canReviewAdvertisements) {
        setAdvertisementItems([]);
        setAdsLoading(false);
        return;
      }

      setAdsLoading(true);
      setAdsError(null);
      try {
        const payload = await fetchPendingAdvertisementApprovals();
        if (active) {
          setAdvertisementItems(payload.results.map(mapAdvertisementApproval));
        }
      } catch (error) {
        if (active) {
          setAdsError(error instanceof Error ? error.message : "Unable to load submitted advertisements.");
        }
      } finally {
        if (active) {
          setAdsLoading(false);
        }
      }
    }

    void loadAdvertisementApprovals();

    return () => {
      active = false;
    };
  }, [canReviewAdvertisements]);

  useEffect(() => {
    let active = true;

    async function loadAccessRequests() {
      if (!canReviewAdvertisements) {
        setCompanyAccessItems([]);
        setAssociationAccessItems([]);
        setAccessLoading(false);
        return;
      }

      setAccessLoading(true);
      setAccessError(null);
      try {
        const [companyPayload, associationPayload] = await Promise.all([
          fetchPendingCompanyAdminAccessRequests(),
          fetchPendingAssociationAdminAccessRequests(),
        ]);
        if (active) {
          setCompanyAccessItems(companyPayload.results.map(mapCompanyAccessRequest));
          setAssociationAccessItems(associationPayload.results.map(mapAssociationAccessRequest));
        }
      } catch (error) {
        if (active) {
          setAccessError(error instanceof Error ? error.message : "Unable to load access-request approvals.");
        }
      } finally {
        if (active) {
          setAccessLoading(false);
        }
      }
    }

    void loadAccessRequests();

    return () => {
      active = false;
    };
  }, [canReviewAdvertisements]);

  const items = useMemo(
    () => [...advertisementItems, ...companyAccessItems, ...associationAccessItems, ...skeletonItems],
    [advertisementItems, associationAccessItems, companyAccessItems, skeletonItems],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      ads: advertisementItems.length,
      users: companyAccessItems.length + associationAccessItems.length,
      news: items.filter((item) => item.type === "news").length,
      tiers: items.filter((item) => item.type === "tiers").length,
    }),
    [advertisementItems.length, associationAccessItems.length, companyAccessItems.length, items],
  );

  const visibleItems = useMemo(() => {
    if (activeTab === "all") {
      return items;
    }
    return items.filter((item) => item.type === activeTab);
  }, [activeTab, items]);

  async function handleDecision(item: ApprovalItem, decision: "approve" | "reject") {
    if (item.source === "skeleton" || !item.recordId) {
      setSkeletonItems((current) => current.filter((entry) => entry.id !== item.id));
      return;
    }

    setDecisioningId(item.id);
    setAdsError(null);
    setAccessError(null);
    setActivationMessage(null);
    try {
      let activation:
        | AccessRequestMutationResponse<CompanyAdminAccessRequestRecord>["activation"]
        | AccessRequestMutationResponse<AssociationAdminAccessRequestRecord>["activation"]
        | undefined;

      if (item.source === "ads") {
        if (decision === "approve") {
          await approveAdvertisement(item.recordId);
        } else {
          await rejectAdvertisement(item.recordId);
        }
        setAdvertisementItems((current) => current.filter((entry) => entry.id !== item.id));
      } else if (item.source === "company_access") {
        const response =
          decision === "approve"
            ? await approveCompanyAdminAccessRequest(item.recordId)
            : await rejectCompanyAdminAccessRequest(item.recordId);
        activation = response.activation;
        setCompanyAccessItems((current) => current.filter((entry) => entry.id !== item.id));
      } else if (item.source === "association_access") {
        const response =
          decision === "approve"
            ? await approveAssociationAdminAccessRequest(item.recordId)
            : await rejectAssociationAdminAccessRequest(item.recordId);
        activation = response.activation;
        setAssociationAccessItems((current) => current.filter((entry) => entry.id !== item.id));
      }
      if (activation?.activation_token) {
        const appActivationUrl = `${window.location.origin}/activate/${activation.activation_token}`;
        setActivationMessage(`Approved. Share this activation link with the requester: ${appActivationUrl}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update this approval right now.";
      if (item.source === "ads") {
        setAdsError(message);
      } else {
        setAccessError(message);
      }
    } finally {
      setDecisioningId(null);
    }
  }

  return (
    <section className="approvals-page">
      <div className="approvals-page__hero">
        <div>
          <p className="approvals-page__eyebrow">Approval Dashboard</p>
          <h2 className="approvals-page__title">Review pending approval work in one place</h2>
          <p className="approvals-page__copy">
            Company admin requests, association admin requests, and advertisement submissions are now live in this queue. News and tier
            placeholders remain available so the inbox shape stays stable while those review flows catch up.
          </p>
        </div>
        <div className="approvals-page__hero-stat">
          <span>Pending now</span>
          <strong>{counts[activeTab]}</strong>
        </div>
      </div>

      {adsError ? (
        <div className="ads-feedback ads-feedback--warning">
          <div>
            <strong>Advertisement approvals unavailable</strong>
            <p>{adsError}</p>
          </div>
        </div>
      ) : null}

      {accessError ? (
        <div className="ads-feedback ads-feedback--warning">
          <div>
            <strong>Access-request approvals unavailable</strong>
            <p>{accessError}</p>
          </div>
        </div>
      ) : null}

      {activationMessage ? (
        <div className="ads-feedback ads-feedback--success">
          <div>
            <strong>Activation link ready</strong>
            <p>{activationMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="approvals-layout">
        <aside className="approvals-tabs" aria-label="Approval types">
          {(Object.keys(TAB_LABELS) as ApprovalTab[]).map((tab) => (
            <button
              key={tab}
              className={`approvals-tabs__button${activeTab === tab ? " approvals-tabs__button--active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              <span>{TAB_LABELS[tab]}</span>
              <strong>{counts[tab]}</strong>
            </button>
          ))}
        </aside>

        <div className="approvals-content">
          <div className="approvals-content__header">
            <div>
              <p className="approvals-content__eyebrow">Pending Queue</p>
              <h3 className="approvals-content__title">{TAB_LABELS[activeTab]}</h3>
            </div>
            <span className="approvals-content__count">{visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}</span>
          </div>

          {(adsLoading || accessLoading) && activeTab !== "news" && activeTab !== "tiers" ? (
            <div className="approvals-empty">
              <strong>Loading approval queues...</strong>
              <p>Reading the current advertisement and access-request inbox.</p>
            </div>
          ) : null}

          {!adsLoading && !accessLoading && visibleItems.length ? (
            <div className="approvals-list">
              {visibleItems.map((item) => (
                <article key={item.id} className="approvals-item">
                  <div className="approvals-item__copy">
                    <div className="approvals-item__meta">
                      <span className="approvals-item__type">{TAB_LABELS[item.type]}</span>
                      <span className="approvals-item__status">{item.status}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>

                  <div className="approvals-item__actions">
                    <button
                      className="approvals-item__action approvals-item__action--approve"
                      type="button"
                      disabled={decisioningId === item.id}
                      onClick={() => void handleDecision(item, "approve")}
                    >
                      {decisioningId === item.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      className="approvals-item__action approvals-item__action--reject"
                      type="button"
                      disabled={decisioningId === item.id}
                      onClick={() => void handleDecision(item, "reject")}
                    >
                      {decisioningId === item.id ? "Working..." : "Reject"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!adsLoading && !accessLoading && !visibleItems.length ? (
            <div className="approvals-empty">
              <strong>No pending items</strong>
              <p>
                {activeTab === "ads" && !canReviewAdvertisements
                  ? "Advertisement review is handled by platform or scoped admins."
                  : `The ${TAB_LABELS[activeTab].toLowerCase()} queue is clear right now.`}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
