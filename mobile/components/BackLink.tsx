import Link from "next/link";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-block text-sm text-blue-600 mb-2">
      ← {label}
    </Link>
  );
}
