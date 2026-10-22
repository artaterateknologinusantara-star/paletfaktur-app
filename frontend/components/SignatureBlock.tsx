import { assetUrl } from "@/lib/api";
import { CompanySettingsResponse } from "@/lib/types";

// Ruang tanda tangan penanda tangan perusahaan di dokumen cetak: stempel (samar, sedikit menimpa)
// dan tanda tangan digital dari Pengaturan. Tanpa gambar / dimatikan = ruang kosong untuk tanda tangan basah.
export default function SignatureBlock({
  settings: s,
  show,
  className = "h-14",
}: {
  settings: CompanySettingsResponse;
  show: boolean;
  className?: string;
}) {
  const signature = show ? s.signatureUrl : null;
  const stamp = show ? s.stampUrl : null;

  return (
    <div className={`relative ${className}`}>
      {stamp && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(stamp)}
          alt="Stempel"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[20mm] w-auto max-w-none opacity-80 mix-blend-multiply pointer-events-none"
        />
      )}
      {signature && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(signature)} alt="Tanda tangan" className="absolute left-10 bottom-0 h-full w-auto max-w-[60mm] object-contain mix-blend-multiply" />
      )}
    </div>
  );
}
