import { CompanySettingsResponse } from "@/lib/types";

// Footer kantor + kontak di bawah lembar cetak (garis tebal di atasnya).
export default function DocumentFooter({ settings: s }: { settings: CompanySettingsResponse }) {
  return (
    <div className="border-t-[3px] border-black pt-2 break-inside-avoid flex justify-between text-[9px] leading-snug">
      <div>
        <p className="font-bold">{s.companyName}</p>
        <p>Kantor dan Gudang Pusat:</p>
        <p className="max-w-sm">{s.address}</p>
      </div>
      <div>
        <p className="font-bold">Contact</p>
        {s.phone && <p>No. HP : {s.phone}</p>}
        {s.email && <p>Email : {s.email}</p>}
        {s.website && <p>Website : {s.website}</p>}
      </div>
    </div>
  );
}
