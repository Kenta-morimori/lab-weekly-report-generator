export function repeatToLength(seed: string, limit: number): string {
  if (!seed) return "".padEnd(limit, " ");
  return seed.repeat(Math.ceil(limit / seed.length)).slice(0, limit);
}
