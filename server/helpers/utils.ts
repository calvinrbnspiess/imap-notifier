export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
export const isOlderThan3Minutes = (timestamp: number) =>
  new Date().getTime() - timestamp > 3 * 60 * 10000;

export function formatIsoToDate(isoString) {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDate(dateString: string) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
