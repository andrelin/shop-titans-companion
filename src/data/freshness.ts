/**
 * Compare the version string baked into the committed data against the live
 * spreadsheet. Returns a remote version if it's strictly different, or null if
 * everything is up to date / the check failed.
 *
 * Google sheets serve the export endpoint with permissive CORS so we can hit
 * it directly from the browser without a proxy. We only download the small
 * Home tab; the full data refresh is handled by the scheduled GitHub Action.
 */
const SPREADSHEET_ID = "1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c";
const HOME_TAB_GID = 0;

export async function checkLiveVersion(
  localVersion: string | null,
): Promise<string | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${HOME_TAB_GID}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const text = await res.text();
    // Look for a token like "v26.5.0" in the first few KB.
    const head = text.slice(0, 4096);
    const m = head.match(/v\d+(\.\d+){1,3}[A-Za-z0-9.\-]*/);
    if (!m) return null;
    const live = m[0];
    if (!localVersion || live === localVersion) return null;
    return live;
  } catch {
    return null;
  }
}
