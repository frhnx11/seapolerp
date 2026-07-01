import { formatStamp } from "@/core/edit-window";

/**
 * Stamp lines shown in edit popups once a value has been recorded: who last
 * edited it (and when), plus the immutable first-entry stamp — who first
 * recorded it and when. First entry is the anchor of the 30-minute editing
 * window and never changes, so the operator can gauge how much of it is left.
 */
export function LastUpdatedLine({
  by,
  at,
  firstBy,
  firstAt,
}: {
  by: string | null;
  at?: string | null;
  firstBy?: string | null;
  firstAt?: string | null;
}) {
  if (!by && !firstBy && !firstAt) return null;
  return (
    <div className="space-y-0.5 text-xs text-gray-500">
      {by && (
        <p>
          Last updated by:{" "}
          <span className="font-medium text-gray-700">{by}</span>
          {at && <> · {formatStamp(at)}</>}
        </p>
      )}
      {(firstBy || firstAt) && (
        <p>
          First entered by:{" "}
          {firstBy && (
            <span className="font-medium text-gray-700">{firstBy}</span>
          )}
          {firstBy && firstAt && " · "}
          {firstAt && (
            <span className="font-medium text-gray-700">
              {formatStamp(firstAt)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
