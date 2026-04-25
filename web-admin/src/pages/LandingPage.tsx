export function LandingPage() {
  return (
    <section className="section hero">
      <div className="container split">
        <div>
          <p className="eyebrow">Jewellery Association Network</p>
          <h1>Professional market intelligence and member operations in one platform.</h1>
          <p className="lede">
            Android member app, operational admin tools, controlled media workflows, and region-aware trade communication.
          </p>
          <div className="actions">
            <a className="button button-dark" href="#admin">
              Admin Console
            </a>
            <a className="button button-light" href="https://play.google.com">
              Play Store Release
            </a>
          </div>
        </div>
        <div className="panel">
          <h2>Included modules</h2>
          <ul>
            <li>Rates dashboard and comparison</li>
            <li>Market tiers and company profiles</li>
            <li>Product catalogue and enquiries</li>
            <li>Compliance services and alerts</li>
            <li>Manual reverse-search workflow</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
