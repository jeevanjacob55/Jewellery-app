import { useEffect, useState } from "react";

import {
  AdminTaxonomyAttribute,
  AdminTaxonomyAttributePayload,
  AdminTaxonomyCategory,
  AdminTaxonomyCategoryPayload,
  AdminTaxonomyGroup,
  AdminTaxonomySubcategory,
  AdminTaxonomySubcategoryPayload,
  createAdminTaxonomyAttribute,
  createAdminTaxonomyCategory,
  createAdminTaxonomySubcategory,
  fetchAdminTaxonomy,
  ProductTypeKey,
  updateAdminTaxonomyAttribute,
  updateAdminTaxonomyCategory,
  updateAdminTaxonomySubcategory,
} from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type CategoryDraft = AdminTaxonomyCategoryPayload;
type SubcategoryDraft = AdminTaxonomySubcategoryPayload;
type AttributeDraft = AdminTaxonomyAttributePayload;

const PRODUCT_TYPE_LABELS: Record<ProductTypeKey, string> = {
  gold: "Gold",
  diamond: "Diamond",
  silver: "Silver",
  other: "Other",
};

const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "select", label: "Select" },
  { value: "range", label: "Range" },
  { value: "number", label: "Number" },
];

function buildCategoryDraft(category: AdminTaxonomyCategory): CategoryDraft {
  return {
    name: category.name,
    slug: category.slug,
    product_type: category.product_type,
    icon_key: category.icon_key,
    is_active: category.is_active,
    display_order: category.display_order,
  };
}

function buildSubcategoryDraft(subcategory: AdminTaxonomySubcategory): SubcategoryDraft {
  return {
    category: subcategory.category,
    name: subcategory.name,
    slug: subcategory.slug,
    is_active: subcategory.is_active,
    display_order: subcategory.display_order,
  };
}

function buildAttributeDraft(attribute: AdminTaxonomyAttribute): AttributeDraft {
  return {
    category: attribute.category,
    key: attribute.key,
    label: attribute.label,
    type: attribute.type,
    options: attribute.options,
    is_required: attribute.is_required,
    is_active: attribute.is_active,
    display_order: attribute.display_order,
  };
}

function buildNewCategoryDraft(productType: ProductTypeKey): CategoryDraft {
  return {
    name: "",
    slug: "",
    product_type: productType,
    icon_key: "diamond",
    is_active: true,
    display_order: 1,
  };
}

function buildNewSubcategoryDraft(categoryId: number): SubcategoryDraft {
  return {
    category: categoryId,
    name: "",
    slug: "",
    is_active: true,
    display_order: 1,
  };
}

function buildNewAttributeDraft(categoryId: number): AttributeDraft {
  return {
    category: categoryId,
    key: "",
    label: "",
    type: "select",
    options: [],
    is_required: false,
    is_active: true,
    display_order: 1,
  };
}

function parseOptionsInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatOptionsInput(options: string[]) {
  return options.join(", ");
}

export function TaxonomyManagementPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const [groups, setGroups] = useState<AdminTaxonomyGroup[]>([]);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, CategoryDraft>>({});
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<number, SubcategoryDraft>>({});
  const [attributeDrafts, setAttributeDrafts] = useState<Record<number, AttributeDraft>>({});
  const [newCategoryDrafts, setNewCategoryDrafts] = useState<Record<ProductTypeKey, CategoryDraft>>({
    gold: buildNewCategoryDraft("gold"),
    diamond: buildNewCategoryDraft("diamond"),
    silver: buildNewCategoryDraft("silver"),
    other: buildNewCategoryDraft("other"),
  });
  const [newSubcategoryDrafts, setNewSubcategoryDrafts] = useState<Record<number, SubcategoryDraft>>({});
  const [newAttributeDrafts, setNewAttributeDrafts] = useState<Record<number, AttributeDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function loadTaxonomy() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminTaxonomy();
      setGroups(response.product_types);
      const nextCategoryDrafts: Record<number, CategoryDraft> = {};
      const nextSubcategoryDrafts: Record<number, SubcategoryDraft> = {};
      const nextAttributeDrafts: Record<number, AttributeDraft> = {};
      const nextNewSubcategoryDrafts: Record<number, SubcategoryDraft> = {};
      const nextNewAttributeDrafts: Record<number, AttributeDraft> = {};
      for (const group of response.product_types) {
        for (const category of group.categories) {
          nextCategoryDrafts[category.id] = buildCategoryDraft(category);
          nextNewSubcategoryDrafts[category.id] = buildNewSubcategoryDraft(category.id);
          nextNewAttributeDrafts[category.id] = buildNewAttributeDraft(category.id);
          for (const subcategory of category.subcategories) {
            nextSubcategoryDrafts[subcategory.id] = buildSubcategoryDraft(subcategory);
          }
          for (const attribute of category.attributes) {
            nextAttributeDrafts[attribute.id] = buildAttributeDraft(attribute);
          }
        }
      }
      setCategoryDrafts(nextCategoryDrafts);
      setSubcategoryDrafts(nextSubcategoryDrafts);
      setAttributeDrafts(nextAttributeDrafts);
      setNewSubcategoryDrafts(nextNewSubcategoryDrafts);
      setNewAttributeDrafts(nextNewAttributeDrafts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load taxonomy.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTaxonomy();
  }, []);

  async function handleCreateCategory(productType: ProductTypeKey) {
    const draft = newCategoryDrafts[productType];
    setSavingKey(`new-category-${productType}`);
    setError("");
    setSuccessMessage("");
    try {
      await createAdminTaxonomyCategory(draft);
      await loadTaxonomy();
      setNewCategoryDrafts((current) => ({
        ...current,
        [productType]: buildNewCategoryDraft(productType),
      }));
      setSuccessMessage(`${PRODUCT_TYPE_LABELS[productType]} category created.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create category.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleSaveCategory(categoryId: number) {
    setSavingKey(`category-${categoryId}`);
    setError("");
    setSuccessMessage("");
    try {
      await updateAdminTaxonomyCategory(categoryId, categoryDrafts[categoryId]);
      await loadTaxonomy();
      setSuccessMessage("Category updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update category.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateSubcategory(categoryId: number) {
    setSavingKey(`new-subcategory-${categoryId}`);
    setError("");
    setSuccessMessage("");
    try {
      await createAdminTaxonomySubcategory(newSubcategoryDrafts[categoryId]);
      await loadTaxonomy();
      setSuccessMessage("Subcategory created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create subcategory.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleSaveSubcategory(subcategoryId: number) {
    setSavingKey(`subcategory-${subcategoryId}`);
    setError("");
    setSuccessMessage("");
    try {
      await updateAdminTaxonomySubcategory(subcategoryId, subcategoryDrafts[subcategoryId]);
      await loadTaxonomy();
      setSuccessMessage("Subcategory updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update subcategory.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateAttribute(categoryId: number) {
    setSavingKey(`new-attribute-${categoryId}`);
    setError("");
    setSuccessMessage("");
    try {
      await createAdminTaxonomyAttribute(newAttributeDrafts[categoryId]);
      await loadTaxonomy();
      setSuccessMessage("Attribute created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create attribute.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleSaveAttribute(attributeId: number) {
    setSavingKey(`attribute-${attributeId}`);
    setError("");
    setSuccessMessage("");
    try {
      await updateAdminTaxonomyAttribute(attributeId, attributeDrafts[attributeId]);
      await loadTaxonomy();
      setSuccessMessage("Attribute updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update attribute.");
    } finally {
      setSavingKey("");
    }
  }

  if (!isSuperAdmin) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Restricted</p>
          <h2 className="admin-placeholder__title">Taxonomy Management is only available to super admins.</h2>
          <p className="admin-placeholder__copy">Use a super-admin account to manage master product types, categories, subcategories, and dynamic attributes.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Loading</p>
          <h2 className="admin-placeholder__title">Preparing taxonomy management</h2>
          <p className="admin-placeholder__copy">Loading the master category tree and attribute definitions.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="taxonomy-page">
      <div className="taxonomy-page__hero">
        <div>
          <p className="taxonomy-page__eyebrow">Master Taxonomy</p>
          <h2 className="taxonomy-page__title">Central product types, categories, and attributes</h2>
          <p className="taxonomy-page__copy">
            Keep product search clean by managing the official catalog structure in one place for every company.
          </p>
        </div>
      </div>

      {error ? <div className="rates-feedback rates-feedback--error">{error}</div> : null}
      {successMessage ? <div className="rates-feedback rates-feedback--success">{successMessage}</div> : null}

      <div className="taxonomy-page__stack">
        {groups.map((group) => (
          <article key={group.key} className="taxonomy-card taxonomy-card--section">
            <div className="taxonomy-card__header">
              <div>
                <p className="taxonomy-card__eyebrow">Product Type</p>
                <h3 className="taxonomy-card__title">{group.label}</h3>
              </div>
            </div>

            <div className="taxonomy-form taxonomy-form--category-create">
              <label className="rates-form__field">
                <span>Category name</span>
                <input
                  value={newCategoryDrafts[group.key].name}
                  onChange={(event) =>
                    setNewCategoryDrafts((current) => ({
                      ...current,
                      [group.key]: { ...current[group.key], name: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="rates-form__field">
                <span>Slug</span>
                <input
                  value={newCategoryDrafts[group.key].slug ?? ""}
                  onChange={(event) =>
                    setNewCategoryDrafts((current) => ({
                      ...current,
                      [group.key]: { ...current[group.key], slug: event.target.value },
                    }))
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="rates-form__field">
                <span>Icon key</span>
                <input
                  value={newCategoryDrafts[group.key].icon_key}
                  onChange={(event) =>
                    setNewCategoryDrafts((current) => ({
                      ...current,
                      [group.key]: { ...current[group.key], icon_key: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="rates-form__field">
                <span>Display order</span>
                <input
                  type="number"
                  value={newCategoryDrafts[group.key].display_order}
                  onChange={(event) =>
                    setNewCategoryDrafts((current) => ({
                      ...current,
                      [group.key]: {
                        ...current[group.key],
                        display_order: Number.parseInt(event.target.value || "0", 10),
                      },
                    }))
                  }
                />
              </label>
              <label className="company-checkbox">
                <input
                  type="checkbox"
                  checked={newCategoryDrafts[group.key].is_active}
                  onChange={(event) =>
                    setNewCategoryDrafts((current) => ({
                      ...current,
                      [group.key]: { ...current[group.key], is_active: event.target.checked },
                    }))
                  }
                />
                <span>Active category</span>
              </label>
              <div className="taxonomy-actions">
                <button
                  className="rates-form__button"
                  type="button"
                  onClick={() => void handleCreateCategory(group.key)}
                  disabled={savingKey === `new-category-${group.key}`}
                >
                  {savingKey === `new-category-${group.key}` ? "Creating..." : `Add ${group.label} Category`}
                </button>
              </div>
            </div>

            <div className="taxonomy-page__grid">
              {group.categories.length ? (
                group.categories.map((category) => (
                  <div key={category.id} className="taxonomy-card">
                    <div className="taxonomy-card__header">
                      <div>
                        <p className="taxonomy-card__eyebrow">Category</p>
                        <h4 className="taxonomy-card__title">{category.name}</h4>
                      </div>
                      <span className={`taxonomy-status${category.is_active ? " taxonomy-status--on" : ""}`}>
                        {category.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>

                    <div className="taxonomy-form">
                      <label className="rates-form__field">
                        <span>Name</span>
                        <input
                          value={categoryDrafts[category.id]?.name ?? ""}
                          onChange={(event) =>
                            setCategoryDrafts((current) => ({
                              ...current,
                              [category.id]: { ...current[category.id], name: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="rates-form__field">
                        <span>Slug</span>
                        <input
                          value={categoryDrafts[category.id]?.slug ?? ""}
                          onChange={(event) =>
                            setCategoryDrafts((current) => ({
                              ...current,
                              [category.id]: { ...current[category.id], slug: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="rates-form__field">
                        <span>Icon key</span>
                        <input
                          value={categoryDrafts[category.id]?.icon_key ?? ""}
                          onChange={(event) =>
                            setCategoryDrafts((current) => ({
                              ...current,
                              [category.id]: { ...current[category.id], icon_key: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="rates-form__field">
                        <span>Display order</span>
                        <input
                          type="number"
                          value={categoryDrafts[category.id]?.display_order ?? 0}
                          onChange={(event) =>
                            setCategoryDrafts((current) => ({
                              ...current,
                              [category.id]: {
                                ...current[category.id],
                                display_order: Number.parseInt(event.target.value || "0", 10),
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="company-checkbox">
                        <input
                          type="checkbox"
                          checked={categoryDrafts[category.id]?.is_active ?? false}
                          onChange={(event) =>
                            setCategoryDrafts((current) => ({
                              ...current,
                              [category.id]: { ...current[category.id], is_active: event.target.checked },
                            }))
                          }
                        />
                        <span>Active category</span>
                      </label>
                    </div>

                    <div className="taxonomy-actions">
                      <button
                        className="rates-form__button"
                        type="button"
                        onClick={() => void handleSaveCategory(category.id)}
                        disabled={savingKey === `category-${category.id}`}
                      >
                        {savingKey === `category-${category.id}` ? "Saving..." : "Save Category"}
                      </button>
                    </div>

                    <div className="taxonomy-block">
                      <div className="taxonomy-card__header">
                        <div>
                          <p className="taxonomy-card__eyebrow">Subcategories</p>
                          <h4 className="taxonomy-card__title">Category children</h4>
                        </div>
                      </div>

                      <div className="taxonomy-inline-list">
                        {category.subcategories.map((subcategory) => (
                          <div key={subcategory.id} className="taxonomy-inline-card">
                            <div className="taxonomy-inline-grid">
                              <label className="rates-form__field">
                                <span>Name</span>
                                <input
                                  value={subcategoryDrafts[subcategory.id]?.name ?? ""}
                                  onChange={(event) =>
                                    setSubcategoryDrafts((current) => ({
                                      ...current,
                                      [subcategory.id]: { ...current[subcategory.id], name: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="rates-form__field">
                                <span>Slug</span>
                                <input
                                  value={subcategoryDrafts[subcategory.id]?.slug ?? ""}
                                  onChange={(event) =>
                                    setSubcategoryDrafts((current) => ({
                                      ...current,
                                      [subcategory.id]: { ...current[subcategory.id], slug: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="rates-form__field">
                                <span>Order</span>
                                <input
                                  type="number"
                                  value={subcategoryDrafts[subcategory.id]?.display_order ?? 0}
                                  onChange={(event) =>
                                    setSubcategoryDrafts((current) => ({
                                      ...current,
                                      [subcategory.id]: {
                                        ...current[subcategory.id],
                                        display_order: Number.parseInt(event.target.value || "0", 10),
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <label className="company-checkbox">
                                <input
                                  type="checkbox"
                                  checked={subcategoryDrafts[subcategory.id]?.is_active ?? false}
                                  onChange={(event) =>
                                    setSubcategoryDrafts((current) => ({
                                      ...current,
                                      [subcategory.id]: { ...current[subcategory.id], is_active: event.target.checked },
                                    }))
                                  }
                                />
                                <span>Active</span>
                              </label>
                            </div>
                            <div className="taxonomy-actions">
                              <button
                                className="company-table__action"
                                type="button"
                                onClick={() => void handleSaveSubcategory(subcategory.id)}
                                disabled={savingKey === `subcategory-${subcategory.id}`}
                              >
                                {savingKey === `subcategory-${subcategory.id}` ? "Saving..." : "Save Subcategory"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="taxonomy-inline-card taxonomy-inline-card--new">
                        <div className="taxonomy-inline-grid">
                          <label className="rates-form__field">
                            <span>New subcategory</span>
                            <input
                              value={newSubcategoryDrafts[category.id]?.name ?? ""}
                              onChange={(event) =>
                                setNewSubcategoryDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], name: event.target.value },
                                }))
                              }
                            />
                          </label>
                          <label className="rates-form__field">
                            <span>Slug</span>
                            <input
                              value={newSubcategoryDrafts[category.id]?.slug ?? ""}
                              onChange={(event) =>
                                setNewSubcategoryDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], slug: event.target.value },
                                }))
                              }
                              placeholder="Optional"
                            />
                          </label>
                          <label className="rates-form__field">
                            <span>Order</span>
                            <input
                              type="number"
                              value={newSubcategoryDrafts[category.id]?.display_order ?? 1}
                              onChange={(event) =>
                                setNewSubcategoryDrafts((current) => ({
                                  ...current,
                                  [category.id]: {
                                    ...current[category.id],
                                    display_order: Number.parseInt(event.target.value || "0", 10),
                                  },
                                }))
                              }
                            />
                          </label>
                          <label className="company-checkbox">
                            <input
                              type="checkbox"
                              checked={newSubcategoryDrafts[category.id]?.is_active ?? true}
                              onChange={(event) =>
                                setNewSubcategoryDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], is_active: event.target.checked },
                                }))
                              }
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="taxonomy-actions">
                          <button
                            className="company-table__action"
                            type="button"
                            onClick={() => void handleCreateSubcategory(category.id)}
                            disabled={savingKey === `new-subcategory-${category.id}`}
                          >
                            {savingKey === `new-subcategory-${category.id}` ? "Creating..." : "Add Subcategory"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="taxonomy-block">
                      <div className="taxonomy-card__header">
                        <div>
                          <p className="taxonomy-card__eyebrow">Dynamic Attributes</p>
                          <h4 className="taxonomy-card__title">Category-specific fields</h4>
                        </div>
                      </div>

                      <div className="taxonomy-inline-list">
                        {category.attributes.map((attribute) => (
                          <div key={attribute.id} className="taxonomy-inline-card">
                            <div className="taxonomy-inline-grid taxonomy-inline-grid--attribute">
                              <label className="rates-form__field">
                                <span>Label</span>
                                <input
                                  value={attributeDrafts[attribute.id]?.label ?? ""}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], label: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="rates-form__field">
                                <span>Key</span>
                                <input
                                  value={attributeDrafts[attribute.id]?.key ?? ""}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], key: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="rates-form__field">
                                <span>Type</span>
                                <select
                                  value={attributeDrafts[attribute.id]?.type ?? "select"}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], type: event.target.value },
                                    }))
                                  }
                                >
                                  {ATTRIBUTE_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="rates-form__field">
                                <span>Options</span>
                                <input
                                  value={formatOptionsInput(attributeDrafts[attribute.id]?.options ?? [])}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], options: parseOptionsInput(event.target.value) },
                                    }))
                                  }
                                  placeholder="Comma separated"
                                />
                              </label>
                              <label className="rates-form__field">
                                <span>Order</span>
                                <input
                                  type="number"
                                  value={attributeDrafts[attribute.id]?.display_order ?? 0}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: {
                                        ...current[attribute.id],
                                        display_order: Number.parseInt(event.target.value || "0", 10),
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <label className="company-checkbox">
                                <input
                                  type="checkbox"
                                  checked={attributeDrafts[attribute.id]?.is_required ?? false}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], is_required: event.target.checked },
                                    }))
                                  }
                                />
                                <span>Required</span>
                              </label>
                              <label className="company-checkbox">
                                <input
                                  type="checkbox"
                                  checked={attributeDrafts[attribute.id]?.is_active ?? false}
                                  onChange={(event) =>
                                    setAttributeDrafts((current) => ({
                                      ...current,
                                      [attribute.id]: { ...current[attribute.id], is_active: event.target.checked },
                                    }))
                                  }
                                />
                                <span>Active</span>
                              </label>
                            </div>
                            <div className="taxonomy-actions">
                              <button
                                className="company-table__action"
                                type="button"
                                onClick={() => void handleSaveAttribute(attribute.id)}
                                disabled={savingKey === `attribute-${attribute.id}`}
                              >
                                {savingKey === `attribute-${attribute.id}` ? "Saving..." : "Save Attribute"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="taxonomy-inline-card taxonomy-inline-card--new">
                        <div className="taxonomy-inline-grid taxonomy-inline-grid--attribute">
                          <label className="rates-form__field">
                            <span>New label</span>
                            <input
                              value={newAttributeDrafts[category.id]?.label ?? ""}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], label: event.target.value },
                                }))
                              }
                            />
                          </label>
                          <label className="rates-form__field">
                            <span>Key</span>
                            <input
                              value={newAttributeDrafts[category.id]?.key ?? ""}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], key: event.target.value },
                                }))
                              }
                            />
                          </label>
                          <label className="rates-form__field">
                            <span>Type</span>
                            <select
                              value={newAttributeDrafts[category.id]?.type ?? "select"}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], type: event.target.value },
                                }))
                              }
                            >
                              {ATTRIBUTE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="rates-form__field">
                            <span>Options</span>
                            <input
                              value={formatOptionsInput(newAttributeDrafts[category.id]?.options ?? [])}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], options: parseOptionsInput(event.target.value) },
                                }))
                              }
                              placeholder="Comma separated"
                            />
                          </label>
                          <label className="rates-form__field">
                            <span>Order</span>
                            <input
                              type="number"
                              value={newAttributeDrafts[category.id]?.display_order ?? 1}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: {
                                    ...current[category.id],
                                    display_order: Number.parseInt(event.target.value || "0", 10),
                                  },
                                }))
                              }
                            />
                          </label>
                          <label className="company-checkbox">
                            <input
                              type="checkbox"
                              checked={newAttributeDrafts[category.id]?.is_required ?? false}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], is_required: event.target.checked },
                                }))
                              }
                            />
                            <span>Required</span>
                          </label>
                          <label className="company-checkbox">
                            <input
                              type="checkbox"
                              checked={newAttributeDrafts[category.id]?.is_active ?? true}
                              onChange={(event) =>
                                setNewAttributeDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...current[category.id], is_active: event.target.checked },
                                }))
                              }
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="taxonomy-actions">
                          <button
                            className="company-table__action"
                            type="button"
                            onClick={() => void handleCreateAttribute(category.id)}
                            disabled={savingKey === `new-attribute-${category.id}`}
                          >
                            {savingKey === `new-attribute-${category.id}` ? "Creating..." : "Add Attribute"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="company-empty-state">No categories have been added for this product type yet.</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
