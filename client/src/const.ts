export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Login page URL (local auth)
export const getLoginUrl = (returnPath?: string) => {
  const base = "/login";
  if (returnPath) {
    return `${base}?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return base;
};
