import { assetUrl } from "@/lib/api";
import { CompanySettingsResponse } from "@/lib/types";

// Kop surat bergradasi kuning (dipakai Invoice dan Surat Jalan). Di layar melebar sampai tepi lembar;
// saat cetak mengikuti area cetak A4.
export default function DocumentHeader({ settings: s }: { settings: CompanySettingsResponse }) {
  const contact = [s.website, s.phone, s.email].filter(Boolean).join(" | ");

  return (
    <div
      className="flex items-center gap-4 border-b-[3px] border-black -mx-12 -mt-10 px-12 pt-4 pb-2 print:mx-0 print:mt-0 print:px-2 print:pt-2"
      style={{ background: "linear-gradient(90deg, #fff59d 0%, #fffbd0 50%, #ffffff 100%)" }}
    >
      <div className="w-24 h-24 shrink-0 flex items-center justify-center">
        {s.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(s.logoUrl)} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply" />
        )}
      </div>
      <div className="flex-1 text-center">
        <p className="text-[28px] font-extrabold leading-tight uppercase">{s.companyName}</p>
        {s.tagline && <p className="font-bold text-lg mt-1">{s.tagline}</p>}
        {s.address && <p className="text-[10px] font-medium mt-2">{s.address}</p>}
        {contact && <p className="text-[11px] font-medium mt-1">{contact}</p>}
      </div>
    </div>
  );
}
