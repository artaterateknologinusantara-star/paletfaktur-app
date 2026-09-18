import Sidebar from "@/components/Sidebar";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 print:p-0">{children}</main>
    </div>
  );
}
