import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold text-white mb-3">404</h1>
      <p className="text-zinc-400 mb-6">This Admin page does not exist.</p>
      <Link href="/admin/dashboard" className="admin-btn-cyan px-6 py-2.5 text-sm">
        Back to Dashboard
      </Link>
    </div>
  );
}
