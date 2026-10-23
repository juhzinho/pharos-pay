export function summarizeCalls(names) {
  const counts = names.reduce((acc, n) => ((acc[n] = (acc[n] ?? 0) + 1), acc), {});
  return Object.entries(counts)
    .map(([n, c]) => (c > 1 ? `${n} ×${c}` : n))
    .join(", ");
}
