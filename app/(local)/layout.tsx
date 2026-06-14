import { AuthProvider } from "@/components/auth-provider";

export default function LocalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthProvider>{children}</AuthProvider>;
}
