import { AuthProvider } from "@/components/auth-provider";

export default function CredentialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthProvider>{children}</AuthProvider>;
}
