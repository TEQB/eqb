import { AdminLayoutClient } from "./AdminLayoutClient";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { secret: string };
}) {
  return <AdminLayoutClient secret={params.secret}>{children}</AdminLayoutClient>;
}
