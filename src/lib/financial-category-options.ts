export const categoryTypeValues = [
  "INCOME",
  "EXPENSE",
  "ASSET",
  "LIABILITY",
  "DISCOUNT",
  "TAX",
  "OTHER",
] as const;

export type CategoryTypeValue = (typeof categoryTypeValues)[number];

export const categoryTypeOptions = [
  { value: "INCOME", label: "درآمد" },
  { value: "EXPENSE", label: "هزینه" },
  { value: "ASSET", label: "دارایی" },
  { value: "LIABILITY", label: "بدهی" },
  { value: "DISCOUNT", label: "تخفیف" },
  { value: "TAX", label: "مالیات" },
  { value: "OTHER", label: "سایر" },
] as const satisfies ReadonlyArray<{
  value: CategoryTypeValue;
  label: string;
}>;

export const categoryTypeLabels = Object.fromEntries(
  categoryTypeOptions.map((option) => [option.value, option.label]),
) as Record<CategoryTypeValue, string>;

export function isCategoryTypeValue(
  value: string | undefined,
): value is CategoryTypeValue {
  return categoryTypeValues.includes(value as CategoryTypeValue);
}
