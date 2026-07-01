import { toast } from "sonner";

/**
 * Fetch a report .xlsx and save it, surfacing failures with a toast instead of
 * the silent anchor-click no-op (a 403/400/500 previously either did nothing or
 * downloaded an error body). Never throws — the caller just awaits it.
 */
export async function downloadReport(
  url: string,
  fallbackName: string,
): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      toast.error(
        res.status === 403
          ? "You're not allowed to download this report."
          : "Couldn't generate the report — please try again.",
      );
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? fallbackName;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    toast.error("Couldn't generate the report — please try again.");
  }
}
