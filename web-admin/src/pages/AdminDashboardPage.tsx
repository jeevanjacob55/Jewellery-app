export function AdminDashboardPage() {
  return (
    <section className="section" id="admin">
      <div className="container">
        <p className="eyebrow">Hosted Admin Shell</p>
        <div className="grid">
          <article className="panel">
            <h3>Approvals</h3>
            <p>Ad approvals, member verification, and media moderation.</p>
          </article>
          <article className="panel">
            <h3>Rates</h3>
            <p>Manual bullion rate updates and regional comparison publishing.</p>
          </article>
          <article className="panel">
            <h3>Reverse Search</h3>
            <p>Assign supplier follow-up, review protected uploads, and manage responses.</p>
          </article>
          <article className="panel">
            <h3>Media Storage</h3>
            <p>Public company/product assets plus private reverse-search attachments via signed upload flows.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
