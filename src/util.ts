/**
 * Utility functions for the Lightscripts Workshop
 */

/**
 * Gets a URL parameter by name
 * @param name The name of the parameter to get
 * @param url Optional URL string (default: window.location.href)
 * @returns The parameter value or null if not found
 */
export function getParameterByName(
  name: string,
  url = window.location.href,
): string | null {
  name = name.replace(/[[\]]/g, "\\$&");
  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
