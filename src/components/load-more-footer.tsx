"use client";

/** Shared "Showing X of Y · Load More" footer for paginated tables. */
export function LoadMoreFooter({
  shown,
  total,
  hasMore,
  noun,
  onLoadMore,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  /** Plural noun for the count line, e.g. "work orders". */
  noun: string;
  onLoadMore: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">
        Showing {shown} of {total} {noun}
      </p>
      {hasMore && (
        <button
          onClick={onLoadMore}
          className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Load More
        </button>
      )}
    </div>
  );
}
