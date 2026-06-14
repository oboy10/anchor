import { Brand } from "@/components/brand";
import {
  VerifyPacketContent,
  VerifyPacketStatus,
  VerifyResolvedShareProvider,
} from "./verify-client";

export default function VerifyPage() {
  return (
    <VerifyResolvedShareProvider>
      <div className="min-h-full bg-canvas">
        <header className="border-b border-line bg-surface/80">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
            <Brand href="/" />
            <VerifyPacketStatus />
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
          <VerifyPacketContent />
        </main>
      </div>
    </VerifyResolvedShareProvider>
  );
}
