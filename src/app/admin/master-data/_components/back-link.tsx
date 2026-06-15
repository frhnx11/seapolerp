import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Top-left "back" link for the master-data sub-pages (defaults to Master Data). */
export function BackLink({
  href = "/admin/master-data",
  label = "Back to Master Data",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
    >
      <ArrowLeft size={18} />
      {label}
    </Link>
  );
}
