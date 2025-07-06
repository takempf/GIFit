export function times<TResult>(
  count: number,
  callback: (index: number) => TResult
): TResult[] {
  // Ensure count is a non-negative integer, though the loop handles <= 0 naturally.
  const numTimes = Math.max(0, Math.floor(count));
  const results: TResult[] = [];

  for (let i = 0; i < numTimes; i++) {
    results.push(callback(i));
  }

  return results;
}
