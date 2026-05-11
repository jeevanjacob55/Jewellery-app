import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FilterChip } from "../../components/FilterChip";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { ProductFilterCategory, ProductFilterConfigResponse } from "../../types/api";

type ProductTypeKey = ProductFilterCategory["product_type"];

export type ProductSearchFilters = {
  productType: ProductTypeKey | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
  purity: string | null;
  companyId: number | null;
  state: string | null;
  priceMin: string;
  priceMax: string;
  weightMin: string;
  weightMax: string;
  attributes: Record<string, string>;
};

type ProductSearchFilterSheetProps = {
  visible: boolean;
  filters: ProductSearchFilters;
  config: ProductFilterConfigResponse | null;
  companyScoped: boolean;
  onChange: (next: ProductSearchFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
  onClose: () => void;
};

const PRODUCT_TYPE_OPTIONS: Array<{ key: ProductTypeKey; label: string }> = [
  { key: "gold", label: "Gold" },
  { key: "diamond", label: "Diamond" },
  { key: "silver", label: "Silver" },
  { key: "other", label: "Other" },
];

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InputGroup({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.rangeField}>
      <Text style={styles.rangeLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9B908D"
        keyboardType="decimal-pad"
        style={styles.rangeInput}
      />
    </View>
  );
}

export function ProductSearchFilterSheet({
  visible,
  filters,
  config,
  companyScoped,
  onChange,
  onApply,
  onClearAll,
  onClose,
}: ProductSearchFilterSheetProps) {
  const categories = config?.categories ?? [];
  const visibleCategories = filters.productType ? categories.filter((category) => category.product_type === filters.productType) : categories;
  const selectedCategory = categories.find((category) => category.slug === filters.categorySlug) ?? null;
  const selectedSubcategories = selectedCategory?.subcategories ?? [];
  const dynamicAttributes = (selectedCategory?.attributes ?? []).filter((attribute) => attribute.type !== "number");

  function update(next: Partial<ProductSearchFilters>) {
    onChange({ ...filters, ...next });
  }

  function handleProductTypeSelect(nextType: ProductTypeKey) {
    const productType = filters.productType === nextType ? null : nextType;
    update({
      productType,
      categorySlug: null,
      subcategorySlug: null,
      attributes: {},
    });
  }

  function handleCategorySelect(category: ProductFilterCategory) {
    if (filters.categorySlug === category.slug) {
      update({ categorySlug: null, subcategorySlug: null, attributes: {} });
      return;
    }
    update({
      productType: category.product_type,
      categorySlug: category.slug,
      subcategorySlug: null,
      attributes: {},
    });
  }

  function toggleAttribute(key: string, value: string) {
    const nextAttributes = { ...filters.attributes };
    if (nextAttributes[key] === value) {
      delete nextAttributes[key];
    } else {
      nextAttributes[key] = value;
    }
    update({ attributes: nextAttributes });
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Refine Search</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <FilterSection title="Product Type">
              <View style={styles.chipWrap}>
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.key}
                    label={option.label}
                    selected={filters.productType === option.key}
                    onPress={() => handleProductTypeSelect(option.key)}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="Category">
              <View style={styles.chipWrap}>
                {visibleCategories.map((category) => (
                  <FilterChip
                    key={category.slug}
                    label={category.name}
                    selected={filters.categorySlug === category.slug}
                    onPress={() => handleCategorySelect(category)}
                  />
                ))}
              </View>
            </FilterSection>

            {selectedCategory && selectedSubcategories.length ? (
              <FilterSection title="Subcategory">
                <View style={styles.chipWrap}>
                  {selectedSubcategories.map((subcategory) => (
                    <FilterChip
                      key={subcategory.slug}
                      label={subcategory.name}
                      selected={filters.subcategorySlug === subcategory.slug}
                      onPress={() =>
                        update({
                          subcategorySlug: filters.subcategorySlug === subcategory.slug ? null : subcategory.slug,
                        })
                      }
                    />
                  ))}
                </View>
              </FilterSection>
            ) : null}

            <FilterSection title="Metal Purity">
              <View style={styles.chipWrap}>
                {(config?.purity_options ?? []).map((option) => (
                  <FilterChip
                    key={option}
                    label={option}
                    selected={filters.purity === option}
                    onPress={() => update({ purity: filters.purity === option ? null : option })}
                  />
                ))}
              </View>
            </FilterSection>

            <FilterSection title="Price Range">
              <View style={styles.rangeGrid}>
                <InputGroup
                  label="Min"
                  value={filters.priceMin}
                  onChangeText={(value) => update({ priceMin: value })}
                  placeholder={config?.price_min ?? "0"}
                />
                <InputGroup
                  label="Max"
                  value={filters.priceMax}
                  onChangeText={(value) => update({ priceMax: value })}
                  placeholder={config?.price_max ?? "Any"}
                />
              </View>
            </FilterSection>

            <FilterSection title="Weight Range (g)">
              <View style={styles.rangeGrid}>
                <InputGroup
                  label="Min"
                  value={filters.weightMin}
                  onChangeText={(value) => update({ weightMin: value })}
                  placeholder={config?.weight_min ?? "0"}
                />
                <InputGroup
                  label="Max"
                  value={filters.weightMax}
                  onChangeText={(value) => update({ weightMax: value })}
                  placeholder={config?.weight_max ?? "Any"}
                />
              </View>
            </FilterSection>

            {!companyScoped ? (
              <FilterSection title="Company">
                <View style={styles.chipWrap}>
                  {(config?.companies ?? []).map((company) => (
                    <FilterChip
                      key={company.id}
                      label={company.name}
                      selected={filters.companyId === company.id}
                      onPress={() => update({ companyId: filters.companyId === company.id ? null : company.id })}
                    />
                  ))}
                </View>
              </FilterSection>
            ) : null}

            <FilterSection title="State">
              <View style={styles.chipWrap}>
                {(config?.states ?? []).map((state) => (
                  <FilterChip
                    key={state}
                    label={state}
                    selected={filters.state === state}
                    onPress={() => update({ state: filters.state === state ? null : state })}
                  />
                ))}
              </View>
            </FilterSection>

            {selectedCategory && dynamicAttributes.length ? (
              dynamicAttributes.map((attribute) => (
                <FilterSection key={attribute.id} title={attribute.label}>
                  <View style={styles.chipWrap}>
                    {attribute.options.map((option) => {
                      const optionLabel = typeof option === "string" ? option : String(option);
                      return (
                        <FilterChip
                          key={`${attribute.key}-${optionLabel}`}
                          label={optionLabel}
                          selected={filters.attributes[attribute.key] === optionLabel}
                          onPress={() => toggleAttribute(attribute.key, optionLabel)}
                        />
                      );
                    })}
                  </View>
                </FilterSection>
              ))
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.clearButton} onPress={onClearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={onApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 26, 26, 0.42)",
  },
  sheet: {
    maxHeight: "86%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    color: colors.mutedText,
    fontWeight: "700",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.mutedText,
    ...typography.eyebrow,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rangeGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rangeField: {
    flex: 1,
    gap: spacing.xs,
  },
  rangeLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  clearButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  applyButton: {
    flex: 1.4,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.text,
  },
  applyButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
