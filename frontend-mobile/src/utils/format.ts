export function formatCurrency(value: number, digits = 2) {
  return `Rs. ${value.toFixed(digits)}`;
}

export function formatCompactNumber(value: number) {
  return value.toFixed(2);
}

export function titleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
