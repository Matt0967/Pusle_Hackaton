export function formatMw(value: number) {
  return `${Math.round(value).toLocaleString("fr-FR")} MW`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)} %`;
}

export function formatTime(isoTimestamp: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTimestamp));
}
