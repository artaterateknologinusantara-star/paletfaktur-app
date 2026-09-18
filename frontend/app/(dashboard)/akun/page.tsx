"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function AkunPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: { oldPassword, newPassword },
      });
      setSuccess("Password berhasil diubah.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Akun</h1>
      <p className="text-sm text-slate-500 mb-6">Ubah password login Anda.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 max-w-md space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password Lama *</label>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password Baru *</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Konfirmasi Password Baru *</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Ubah Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
