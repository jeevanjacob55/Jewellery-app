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

export function formatDateTimeLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
