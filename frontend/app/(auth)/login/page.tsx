"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, setToken } from "@/lib/api";

interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            INV
          </div>
          <div>
            <p className="font-bold leading-tight">PaletFaktur</p>
            <p className="text-xs text-slate-500 leading-tight">Invoice & Inventori Pallet</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-1">Masuk ke akun Anda</h1>
        <p className="text-sm text-slate-500 mb-6">CV Menjemput Berkah</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-6">
          Akun default: <span className="font-mono">admin / Admin123!</span> (ganti setelah setup pertama)
        </p>
      </div>
    </div>
  );
}
