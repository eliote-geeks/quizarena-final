const dateTimeFormatter = new Intl.DateTimeFormat("fr-CM", {
  day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("fr-CM", { day: "2-digit", month: "long", year: "numeric" });

export function formatDateTime(value, fallback = "Date indisponible") {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormatter.format(date) : fallback;
}
export function formatDate(value, fallback = "Date indisponible") {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : fallback;
}
export function formatTransactionStatus(status) {
  return ({ COMPLETED: "Validée", PENDING: "En attente", FAILED: "Refusée", CANCELLED: "Annulée" })[status] || status;
}
