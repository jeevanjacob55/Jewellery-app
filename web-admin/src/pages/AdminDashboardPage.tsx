export function AdminDashboardPage() {
  return (
    <section className="admin-overview">
      <div className="admin-overview__intro">
        <p className="admin-overview__eyebrow">Phase 1 Overview</p>
        <h2 className="admin-overview__heading">Core admin workflows are ready to be layered in here.</h2>
        <p className="admin-overview__copy">
          This protected overview is the first authenticated destination. It will expand into approvals, rates, market operations,
          content publishing, and user management during Phase 1.
        </p>
      </div>

      <div className="admin-overview__grid">
        <article className="admin-overview__card">
          <h3>Approvals</h3>
          <p>Member access, company review, product moderation, and publishing decisions.</p>
        </article>
        <article className="admin-overview__card">
          <h3>Rates</h3>
          <p>Official bullion updates, freshness checks, and publishing control.</p>
        </article>
        <article className="admin-overview__card">
          <h3>Market</h3>
          <p>Company visibility, product governance, and category management.</p>
        </article>
        <article className="admin-overview__card">
          <h3>Content</h3>
          <p>News and meeting workflows for association-wide communication.</p>
        </article>
      </div>
    </section>
  );
}
