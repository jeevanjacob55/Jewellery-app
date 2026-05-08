import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  attachCompanyImage,
  CompanyManagementDetail,
  CompanyManagementProduct,
  CompanyManagementUpdatePayload,
  createCompanyProduct,
  fetchCompanyManagement,
  fetchProductFilterConfig,
  finalizeCompanyMediaAsset,
  ProductFilterConfig,
  requestCompanyUploadSession,
  saveCompanyManagement,
  updateCompanyProduct,
  uploadFileToSession,
} from "../lib/api";

type ProductDraftImage =
  | {
      kind: "existing";
      assetId: number;
      url: string;
      originalFilename: string;
    }
  | {
      kind: "new";
      file: File;
      previewUrl: string;
    };

type ProductFormState = {
  id?: number;
  name: string;
  categoryId: string;
  subcategoryId: string;
  weightGrams: string;
  purity: string;
  price: string;
  description: string;
  isActive: boolean;
  images: ProductDraftImage[];
};

type EmptyState = {
  eyebrow: string;
  title: string;
  description: string;
};

type CompanyEditorWorkspaceProps = {
  companyId: number | null;
  emptyState: EmptyState;
};

function buildProfileForm(detail: CompanyManagementDetail | null): CompanyManagementUpdatePayload {
  if (!detail) {
    return {
      name: "",
      category: "",
      city: "",
      state: "",
      about: "",
      daily_capacity: "",
      specialization: "",
    };
  }

  return {
    name: detail.company.name,
    category: detail.company.category,
    city: detail.company.city,
    state: detail.company.state,
    about: detail.company.about,
    daily_capacity: detail.company.daily_capacity,
    specialization: detail.company.specialization,
  };
}

function buildProductForm(product?: CompanyManagementProduct): ProductFormState {
  if (!product) {
    return {
      name: "",
      categoryId: "",
      subcategoryId: "",
      weightGrams: "",
      purity: "",
      price: "",
      description: "",
      isActive: false,
      images: [],
    };
  }

  return {
    id: product.id,
    name: product.name,
    categoryId: String(product.category_id),
    subcategoryId: product.subcategory_id ? String(product.subcategory_id) : "",
    weightGrams: product.weight_grams,
    purity: product.purity,
    price: product.price ?? "",
    description: product.description,
    isActive: product.is_active,
    images: product.images.map((image) => ({
      kind: "existing" as const,
      assetId: image.asset_id,
      url: image.url,
      originalFilename: image.original_filename,
    })),
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

async function readImageDimensions(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Unable to inspect image dimensions."));
    image.src = dataUrl;
  });
}

export function CompanyEditorWorkspace({ companyId, emptyState }: CompanyEditorWorkspaceProps) {
  const [detail, setDetail] = useState<CompanyManagementDetail | null>(null);
  const [filterConfig, setFilterConfig] = useState<ProductFilterConfig | null>(null);
  const [profileForm, setProfileForm] = useState<CompanyManagementUpdatePayload>(buildProfileForm(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<"logo" | "hero" | null>(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(buildProductForm());
  const [productSaving, setProductSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [nextDetail, nextFilterConfig] = await Promise.all([
        fetchCompanyManagement(companyId),
        fetchProductFilterConfig(),
      ]);
      setDetail(nextDetail);
      setFilterConfig(nextFilterConfig);
      setProfileForm(buildProfileForm(nextDetail));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load company management.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedCategory = useMemo(
    () => filterConfig?.categories.find((category) => String(category.id) === productForm.categoryId) ?? null,
    [filterConfig, productForm.categoryId],
  );

  function openCreateProduct() {
    setProductForm(buildProductForm());
    setProductEditorOpen(true);
    setError("");
    setSuccessMessage("");
  }

  function openEditProduct(product: CompanyManagementProduct) {
    setProductForm(buildProductForm(product));
    setProductEditorOpen(true);
    setError("");
    setSuccessMessage("");
  }

  function closeProductEditor() {
    setProductEditorOpen(false);
    setProductForm(buildProductForm());
  }

  async function handleProfileSave() {
    if (!companyId) {
      return;
    }

    setSavingProfile(true);
    setError("");
    setSuccessMessage("");
    try {
      const nextDetail = await saveCompanyManagement(companyId, profileForm);
      setDetail(nextDetail);
      setProfileForm(buildProfileForm(nextDetail));
      setSuccessMessage("Company profile updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save company profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCompanyImageUpload(slot: "logo" | "hero", file: File) {
    if (!companyId) {
      return;
    }

    setUploadingSlot(slot);
    setError("");
    setSuccessMessage("");
    try {
      const uploadSession = await requestCompanyUploadSession(companyId, file.name);
      await uploadFileToSession(uploadSession.upload_url, file);
      const dimensions = await readImageDimensions(file);
      const asset = await finalizeCompanyMediaAsset(companyId, {
        object_key: uploadSession.object_key,
        bucket_name: uploadSession.bucket_name,
        original_filename: file.name,
        mime_type: file.type || "image/jpeg",
        file_size: file.size,
        width: dimensions.width,
        height: dimensions.height,
      });
      const nextDetail = await attachCompanyImage(companyId, { asset_id: asset.asset_id, slot });
      setDetail(nextDetail);
      setProfileForm(buildProfileForm(nextDetail));
      setSuccessMessage(`${slot === "logo" ? "Logo" : "Hero image"} updated.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload company image.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function handleCompanyImageInput(slot: "logo" | "hero", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void handleCompanyImageUpload(slot, file);
  }

  function handleProductImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) {
      return;
    }

    setProductForm((current) => ({
      ...current,
      images: [
        ...current.images,
        ...files.map((file) => ({
          kind: "new" as const,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ],
    }));
  }

  async function handleProductSave() {
    if (!companyId) {
      return;
    }

    setProductSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const imageAssetIds: number[] = [];

      for (const image of productForm.images) {
        if (image.kind === "existing") {
          imageAssetIds.push(image.assetId);
          continue;
        }

        const uploadSession = await requestCompanyUploadSession(companyId, image.file.name);
        await uploadFileToSession(uploadSession.upload_url, image.file);
        const dimensions = await readImageDimensions(image.file);
        const asset = await finalizeCompanyMediaAsset(companyId, {
          object_key: uploadSession.object_key,
          bucket_name: uploadSession.bucket_name,
          original_filename: image.file.name,
          mime_type: image.file.type || "image/jpeg",
          file_size: image.file.size,
          width: dimensions.width,
          height: dimensions.height,
        });
        imageAssetIds.push(asset.asset_id);
      }

      const payload = {
        name: productForm.name.trim(),
        category: Number(productForm.categoryId),
        subcategory: productForm.subcategoryId ? Number(productForm.subcategoryId) : null,
        weight_grams: productForm.weightGrams,
        purity: productForm.purity,
        price: productForm.price.trim() || null,
        description: productForm.description,
        is_active: productForm.isActive,
        image_asset_ids: imageAssetIds,
      };

      if (productForm.id) {
        await updateCompanyProduct(companyId, productForm.id, payload);
      } else {
        await createCompanyProduct(companyId, payload);
      }

      await loadData();
      closeProductEditor();
      setSuccessMessage(productForm.id ? "Product updated." : "Product created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setProductSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">Loading</p>
          <h2 className="admin-placeholder__title">Preparing company management</h2>
          <p className="admin-placeholder__copy">Loading company profile, product list, and category options.</p>
        </div>
      </section>
    );
  }

  if (!companyId || !detail) {
    return (
      <section className="admin-placeholder">
        <div className="admin-placeholder__card">
          <p className="admin-placeholder__eyebrow">{emptyState.eyebrow}</p>
          <h2 className="admin-placeholder__title">{emptyState.title}</h2>
          <p className="admin-placeholder__copy">{emptyState.description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="company-page">
      <div className="company-page__hero">
        <div>
          <p className="company-page__eyebrow">Company Workspace</p>
          <h2 className="company-page__title">{detail.company.name}</h2>
          <p className="company-page__copy">
            Manage public company profile details, brand images, and product catalog information from one place.
          </p>
          <div className="company-page__meta">
            <span>
              {detail.company.city}, {detail.company.state}
            </span>
            <span>{detail.company.tier.name}</span>
            <span>
              {detail.company.active_product_count} of {detail.company.tier.max_products} active products
            </span>
          </div>
        </div>

        <div className="company-page__status-grid">
          <div className="company-page__status-card">
            <span className="company-page__status-label">Approval</span>
            <strong>{detail.company.is_approved ? "Approved" : "Pending"}</strong>
          </div>
          <div className="company-page__status-card">
            <span className="company-page__status-label">Market</span>
            <strong>{detail.company.is_market_visible ? "Visible" : "Hidden"}</strong>
          </div>
          <div className="company-page__status-card">
            <span className="company-page__status-label">Verification</span>
            <strong>
              {detail.company.verification.gst_registered ||
              detail.company.verification.bis_hallmarked ||
              detail.company.verification.export_licensed
                ? "Verified"
                : "Unverified"}
            </strong>
          </div>
        </div>
      </div>

      {error ? <div className="rates-feedback rates-feedback--error">{error}</div> : null}
      {successMessage ? <div className="rates-feedback rates-feedback--success">{successMessage}</div> : null}

      <div className="company-page__grid">
        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Profile</p>
              <h3 className="company-card__title">Company Details</h3>
            </div>
            <button className="rates-form__button" type="button" onClick={handleProfileSave} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="company-form">
            <label className="rates-form__field">
              <span>Company Name</span>
              <input value={profileForm.name ?? ""} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="rates-form__field">
              <span>Category</span>
              <input value={profileForm.category ?? ""} onChange={(event) => setProfileForm((current) => ({ ...current, category: event.target.value }))} />
            </label>
            <label className="rates-form__field">
              <span>City</span>
              <input value={profileForm.city ?? ""} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} />
            </label>
            <label className="rates-form__field">
              <span>State</span>
              <input value={profileForm.state ?? ""} onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))} />
            </label>
            <label className="rates-form__field company-form__field--full">
              <span>About</span>
              <textarea value={profileForm.about ?? ""} onChange={(event) => setProfileForm((current) => ({ ...current, about: event.target.value }))} rows={4} />
            </label>
            <label className="rates-form__field">
              <span>Daily Capacity</span>
              <input
                value={profileForm.daily_capacity ?? ""}
                onChange={(event) => setProfileForm((current) => ({ ...current, daily_capacity: event.target.value }))}
              />
            </label>
            <label className="rates-form__field">
              <span>Specialization</span>
              <input
                value={profileForm.specialization ?? ""}
                onChange={(event) => setProfileForm((current) => ({ ...current, specialization: event.target.value }))}
              />
            </label>
          </div>

          <div className="company-readonly-grid">
            <div className="company-readonly">
              <span>Tier</span>
              <strong>{detail.company.tier.name}</strong>
            </div>
            <div className="company-readonly">
              <span>Max products</span>
              <strong>{detail.company.tier.max_products}</strong>
            </div>
            <div className="company-readonly">
              <span>Image range</span>
              <strong>
                {detail.company.tier.min_photos_per_product} to {detail.company.tier.max_photos_per_product}
              </strong>
            </div>
            <div className="company-readonly">
              <span>Visibility tier</span>
              <strong>{detail.company.tier.visibility_type}</strong>
            </div>
          </div>
        </article>

        <article className="company-card">
          <div className="company-card__header">
            <div>
              <p className="company-card__eyebrow">Brand Images</p>
              <h3 className="company-card__title">Logo and Hero</h3>
            </div>
          </div>

          <div className="company-images">
            <label className="company-image-card">
              <span className="company-image-card__label">Logo</span>
              {detail.company.logo_image_url ? <img src={detail.company.logo_image_url} alt="Company logo" /> : <div className="company-image-card__empty">No logo</div>}
              <input type="file" accept="image/*" hidden onChange={(event) => handleCompanyImageInput("logo", event)} />
              <span className="company-image-card__action">{uploadingSlot === "logo" ? "Uploading..." : "Replace Logo"}</span>
            </label>
            <label className="company-image-card">
              <span className="company-image-card__label">Hero</span>
              {detail.company.hero_image_url ? <img src={detail.company.hero_image_url} alt="Company hero" /> : <div className="company-image-card__empty">No hero image</div>}
              <input type="file" accept="image/*" hidden onChange={(event) => handleCompanyImageInput("hero", event)} />
              <span className="company-image-card__action">{uploadingSlot === "hero" ? "Uploading..." : "Replace Hero"}</span>
            </label>
          </div>

          <div className="company-verification">
            <span className={`company-badge${detail.company.verification.gst_registered ? " company-badge--on" : ""}`}>GST</span>
            <span className={`company-badge${detail.company.verification.bis_hallmarked ? " company-badge--on" : ""}`}>BIS</span>
            <span className={`company-badge${detail.company.verification.export_licensed ? " company-badge--on" : ""}`}>Export</span>
          </div>
        </article>
      </div>

      <article className="company-card">
        <div className="company-card__header">
          <div>
            <p className="company-card__eyebrow">Catalog</p>
            <h3 className="company-card__title">Products</h3>
          </div>
          <button className="rates-form__button" type="button" onClick={openCreateProduct}>
            Add Product
          </button>
        </div>

        {detail.products.length ? (
          <div className="company-products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Purity</th>
                  <th>Weight</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Images</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detail.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <span>{product.subcategory_name ?? "No subcategory"}</span>
                    </td>
                    <td>{product.category_name}</td>
                    <td>{product.purity}</td>
                    <td>{product.weight_grams} g</td>
                    <td>{product.price ?? "Pending"}</td>
                    <td>{product.is_active ? "Active" : "Inactive"}</td>
                    <td>{product.image_count}</td>
                    <td>{formatDate(product.created_at)}</td>
                    <td>
                      <button className="company-table__action" type="button" onClick={() => openEditProduct(product)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="company-empty-state">No products have been created for this company yet.</div>
        )}
      </article>

      {productEditorOpen ? (
        <div className="company-modal-backdrop" role="presentation" onClick={closeProductEditor}>
          <div className="company-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="company-card__header">
              <div>
                <p className="company-card__eyebrow">{productForm.id ? "Edit Product" : "Create Product"}</p>
                <h3 className="company-card__title">{productForm.id ? productForm.name : "New Product"}</h3>
              </div>
              <button className="company-table__action" type="button" onClick={closeProductEditor}>
                Close
              </button>
            </div>

            <div className="company-form">
              <label className="rates-form__field">
                <span>Product Name</span>
                <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="rates-form__field">
                <span>Category</span>
                <select
                  value={productForm.categoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                      subcategoryId: "",
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {filterConfig?.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rates-form__field">
                <span>Subcategory</span>
                <select
                  value={productForm.subcategoryId}
                  onChange={(event) => setProductForm((current) => ({ ...current, subcategoryId: event.target.value }))}
                  disabled={!selectedCategory}
                >
                  <option value="">No subcategory</option>
                  {selectedCategory?.subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rates-form__field">
                <span>Purity</span>
                <select value={productForm.purity} onChange={(event) => setProductForm((current) => ({ ...current, purity: event.target.value }))}>
                  <option value="">Select purity</option>
                  {filterConfig?.purity_options.map((purityOption) => (
                    <option key={purityOption} value={purityOption}>
                      {purityOption}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rates-form__field">
                <span>Weight (grams)</span>
                <input value={productForm.weightGrams} onChange={(event) => setProductForm((current) => ({ ...current, weightGrams: event.target.value }))} />
              </label>
              <label className="rates-form__field">
                <span>Price</span>
                <input
                  value={productForm.price}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label className="rates-form__field company-form__field--full">
                <span>Description</span>
                <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} rows={4} />
              </label>
              <label className="company-checkbox">
                <input type="checkbox" checked={productForm.isActive} onChange={(event) => setProductForm((current) => ({ ...current, isActive: event.target.checked }))} />
                <span>Keep this product active in the market</span>
              </label>
            </div>

            <div className="company-product-images">
              <div className="company-card__header">
                <div>
                  <p className="company-card__eyebrow">Images</p>
                  <h3 className="company-card__title">Product Images</h3>
                </div>
                <label className="company-table__action">
                  Add Images
                  <input type="file" accept="image/*" hidden multiple onChange={handleProductImageSelection} />
                </label>
              </div>

              <div className="company-product-images__grid">
                {productForm.images.length ? (
                  productForm.images.map((image, index) => (
                    <div key={image.kind === "existing" ? image.assetId : `${image.file.name}-${index}`} className="company-product-image-card">
                      <img src={image.kind === "existing" ? image.url : image.previewUrl} alt="" />
                      <button
                        className="company-product-image-card__remove"
                        type="button"
                        onClick={() =>
                          setProductForm((current) => ({
                            ...current,
                            images: current.images.filter((_, imageIndex) => imageIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="company-empty-state">Add at least the required number of images before activating the product.</div>
                )}
              </div>
            </div>

            <div className="company-modal__actions">
              <button className="company-table__action" type="button" onClick={closeProductEditor}>
                Cancel
              </button>
              <button className="rates-form__button" type="button" onClick={handleProductSave} disabled={productSaving}>
                {productSaving ? "Saving..." : productForm.id ? "Save Product" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
