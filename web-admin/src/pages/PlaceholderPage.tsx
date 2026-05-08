type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({ eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <section className="admin-placeholder">
      <div className="admin-placeholder__card">
        <p className="admin-placeholder__eyebrow">{eyebrow}</p>
        <h2 className="admin-placeholder__title">{title}</h2>
        <p className="admin-placeholder__copy">{description}</p>
      </div>
    </section>
  );
}
