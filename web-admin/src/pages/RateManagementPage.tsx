import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { AssociationRateCatalog, fetchAssociationRateCatalog, RateCatalogCategory, saveAssociationRateCatalog } from "../lib/api";

function createLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

type EditableRateSubcategory = {
  id?: number;
  localId: string;
  name: string;
  unit_label: string;
  current_value: string;
};

type EditableRateCategory = {
  id?: number;
  localId: string;
  name: string;
  unit_label: string;
  current_value: string;
  subcategories: EditableRateSubcategory[];
};

function toEditableCategories(categories: AssociationRateCatalog["categories"]): EditableRateCategory[] {
  return categories.map((category) => ({
    id: category.id,
    localId: `category-${category.id ?? createLocalId()}`,
    name: category.name,
    unit_label: category.unit_label,
    current_value: category.current_value ?? "",
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      localId: `subcategory-${subcategory.id ?? createLocalId()}`,
      name: subcategory.name,
      unit_label: subcategory.unit_label,
      current_value: subcategory.current_value ?? "",
    })),
  }));
}

function toPayload(categories: EditableRateCategory[]): { categories: RateCatalogCategory[] } {
  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name.trim(),
      unit_label: category.unit_label.trim() || "1 Gram",
      current_value: category.current_value.trim() || null,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name.trim(),
        unit_label: subcategory.unit_label.trim() || category.unit_label.trim() || "1 Gram",
        current_value: subcategory.current_value.trim() || null,
      })),
    })),
  };
}

function createCategory(name = "", unitLabel = "1 Gram"): EditableRateCategory {
  return {
    localId: `category-${createLocalId()}`,
    name,
    unit_label: unitLabel,
    current_value: "",
    subcategories: [],
  };
}

function createSubcategory(unitLabel = "1 Gram"): EditableRateSubcategory {
  return {
    localId: `subcategory-${createLocalId()}`,
    name: "",
    unit_label: unitLabel,
    current_value: "",
  };
}

export function RateManagementPage() {
  const { session } = useAuth();
  const [catalog, setCatalog] = useState<AssociationRateCatalog | null>(null);
  const [categories, setCategories] = useState<EditableRateCategory[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [selectedCategoryLocalId, setSelectedCategoryLocalId] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryUnitLabel, setSubcategoryUnitLabel] = useState("1 Gram");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const associationName = catalog?.association.name ?? session?.hierarchy.association ?? "Assigned Association";
  const isAssociationAdmin = session?.user.role === "ASSOCIATION_ADMIN";
  const selectedCategory = useMemo(
    () => categories.find((category) => category.localId === selectedCategoryLocalId) ?? categories[0] ?? null,
    [categories, selectedCategoryLocalId],
  );

  useEffect(() => {
    if (!isAssociationAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError("");
      try {
        const nextCatalog = await fetchAssociationRateCatalog();
        if (!active) {
          return;
        }
        const nextCategories = toEditableCategories(nextCatalog.categories);
        setCatalog(nextCatalog);
        setCategories(nextCategories);
        setSelectedCategoryLocalId(nextCategories[0]?.localId ?? "");
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load the rate catalog.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [isAssociationAdmin]);

  function updateCategory(localId: string, updater: (category: EditableRateCategory) => EditableRateCategory) {
    setCategories((current) => current.map((category) => (category.localId === localId ? updater(category) : category)));
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = categoryName.trim();
    if (!nextName) {
      return;
    }
    if (categories.some((category) => category.name.trim().toLowerCase() === nextName.toLowerCase())) {
      setError("Category names must be unique.");
      return;
    }

    const nextCategory = createCategory(nextName, "1 Gram");
    setCategories((current) => [...current, nextCategory]);
    setSelectedCategoryLocalId(nextCategory.localId);
    setCategoryName("");
    setSuccessMessage("");
    setError("");
  }

  function handleAddSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = subcategoryName.trim();
    if (!nextName || !selectedCategory) {
      return;
    }
    if (selectedCategory.subcategories.some((subcategory) => subcategory.name.trim().toLowerCase() === nextName.toLowerCase())) {
      setError("Subcategory names must be unique within a category.");
      return;
    }

    const nextSubcategory = createSubcategory(subcategoryUnitLabel || selectedCategory.unit_label || "1 Gram");
    nextSubcategory.name = nextName;

    updateCategory(selectedCategory.localId, (category) => ({
      ...category,
      subcategories: [...category.subcategories, nextSubcategory],
      current_value: "",
    }));
    setSubcategoryName("");
    setSubcategoryUnitLabel(selectedCategory.unit_label || "1 Gram");
    setSuccessMessage("");
    setError("");
  }

  function handleRemoveCategory(localId: string) {
    const nextCategories = categories.filter((category) => category.localId !== localId);
    setCategories(nextCategories);
    setSelectedCategoryLocalId(nextCategories[0]?.localId ?? "");
    setSuccessMessage("");
  }

  function handleRemoveSubcategory(categoryLocalId: string, subcategoryLocalId: string) {
    updateCategory(categoryLocalId, (category) => ({
      ...category,
      subcategories: category.subcategories.filter((subcategory) => subcategory.localId !== subcategoryLocalId),
    }));
    setSuccessMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = toPayload(categories);
      const nextCatalog = await saveAssociationRateCatalog(payload);
      const nextCategories = toEditableCategories(nextCatalog.categories);
      setCatalog(nextCatalog);
      setCategories(nextCategories);
      setSelectedCategoryLocalId(nextCategories[0]?.localId ?? "");
      setSuccessMessage(`Rates published for ${nextCatalog.association.name}. Members in that association will now see the updated values.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save rate updates.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAssociationAdmin) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Restricted</p>
          <h2 className="admin-placeholder__title">Rate Management is limited to association admins.</h2>
          <p className="admin-placeholder__copy">Sign in with an association-admin account to manage live category, subcategory, and rate values.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rates-page">
        <div className="rates-panel">
          <h3 className="rates-panel__title">Loading rate catalog</h3>
          <p className="admin-placeholder__copy">Fetching the current association categories and published values.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rates-page">
      <div className="rates-page__hero">
        <div>
          <p className="rates-page__eyebrow">Association Admin Only</p>
          <h2 className="rates-page__title">Manage rate categories for {associationName}</h2>
          <p className="rates-page__copy">Changes saved here are published to members in this association and reused by the existing member-facing market rate views.</p>
        </div>
        <div className="rates-page__hero-meta">
          <div className="rates-page__badge">{associationName}</div>
          <p className="rates-page__updated">Last published: {catalog?.updated_at_label ?? "Pending"}</p>
        </div>
      </div>

      {error ? <div className="rates-feedback rates-feedback--error">{error}</div> : null}
      {successMessage ? <div className="rates-feedback rates-feedback--success">{successMessage}</div> : null}

      <div className="rates-page__grid">
        <article className="rates-panel">
          <h3 className="rates-panel__title">Add Category</h3>
          <form className="rates-form" onSubmit={handleAddCategory}>
            <label className="rates-form__field">
              <span>Category Name</span>
              <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Gold, Silver, Diamond" />
            </label>
            <button className="rates-form__button" type="submit">
              Add Category
            </button>
          </form>
        </article>

        <article className="rates-panel">
          <h3 className="rates-panel__title">Add Subcategory</h3>
          <form className="rates-form" onSubmit={handleAddSubcategory}>
            <label className="rates-form__field">
              <span>Category</span>
              <select value={selectedCategoryLocalId} onChange={(event) => setSelectedCategoryLocalId(event.target.value)} disabled={!categories.length}>
                {categories.map((category) => (
                  <option key={category.localId} value={category.localId}>
                    {category.name || "Untitled Category"}
                  </option>
                ))}
              </select>
            </label>
            <label className="rates-form__field">
              <span>Subcategory Name</span>
              <input value={subcategoryName} onChange={(event) => setSubcategoryName(event.target.value)} placeholder="18K, 22K, 24K, 999" />
            </label>
            <label className="rates-form__field">
              <span>Unit Label</span>
              <input value={subcategoryUnitLabel} onChange={(event) => setSubcategoryUnitLabel(event.target.value)} placeholder="1 Gram, 1 Carat" />
            </label>
            <button className="rates-form__button" type="submit" disabled={!categories.length}>
              Add Subcategory
            </button>
          </form>
        </article>
      </div>

      <div className="rates-toolbar">
        <div>
          <p className="rates-toolbar__label">Publish Scope</p>
          <strong className="rates-toolbar__value">{associationName}</strong>
        </div>
        <button className="rates-form__button" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Publishing..." : "Publish Rates"}
        </button>
      </div>

      <div className="rates-categories">
        {categories.map((category) => (
          <article key={category.localId} className="rates-category-card">
            <div className="rates-category-card__header">
              <div>
                <p className="rates-category-card__eyebrow">Category</p>
                <h3 className="rates-category-card__title">{category.name || "Untitled Category"}</h3>
              </div>
              <button className="rates-category-card__remove" type="button" onClick={() => handleRemoveCategory(category.localId)}>
                Remove
              </button>
            </div>

            <div className="rates-category-card__editor">
              <label className="rates-form__field">
                <span>Category Name</span>
                <input value={category.name} onChange={(event) => updateCategory(category.localId, (current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="rates-form__field">
                <span>Unit Label</span>
                <input
                  value={category.unit_label}
                  onChange={(event) =>
                    updateCategory(category.localId, (current) => ({
                      ...current,
                      unit_label: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="rates-form__field">
                <span>Category Rate</span>
                <input
                  value={category.current_value}
                  onChange={(event) =>
                    updateCategory(category.localId, (current) => ({
                      ...current,
                      current_value: event.target.value,
                    }))
                  }
                  placeholder={category.subcategories.length ? "Optional when subcategories carry the rates" : "0.00"}
                />
              </label>
            </div>

            <div className="rates-subcategories">
              <div className="rates-subcategories__header">
                <strong>Subcategories</strong>
                <span>{category.subcategories.length}</span>
              </div>

              {category.subcategories.length ? (
                category.subcategories.map((subcategory) => (
                  <div key={subcategory.localId} className="rates-subcategory-row">
                    <label className="rates-form__field">
                      <span>Name</span>
                      <input
                        value={subcategory.name}
                        onChange={(event) =>
                          updateCategory(category.localId, (current) => ({
                            ...current,
                            subcategories: current.subcategories.map((currentSubcategory) =>
                              currentSubcategory.localId === subcategory.localId
                                ? { ...currentSubcategory, name: event.target.value }
                                : currentSubcategory,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="rates-form__field">
                      <span>Unit</span>
                      <input
                        value={subcategory.unit_label}
                        onChange={(event) =>
                          updateCategory(category.localId, (current) => ({
                            ...current,
                            subcategories: current.subcategories.map((currentSubcategory) =>
                              currentSubcategory.localId === subcategory.localId
                                ? { ...currentSubcategory, unit_label: event.target.value }
                                : currentSubcategory,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="rates-form__field">
                      <span>Rate</span>
                      <input
                        value={subcategory.current_value}
                        onChange={(event) =>
                          updateCategory(category.localId, (current) => ({
                            ...current,
                            subcategories: current.subcategories.map((currentSubcategory) =>
                              currentSubcategory.localId === subcategory.localId
                                ? { ...currentSubcategory, current_value: event.target.value }
                                : currentSubcategory,
                            ),
                          }))
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <button className="rates-category-card__remove rates-category-card__remove--inline" type="button" onClick={() => handleRemoveSubcategory(category.localId, subcategory.localId)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <span className="rates-category-card__empty">No subcategories added yet.</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
