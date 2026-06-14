export default function LocalLoading() {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(135deg,rgba(25,128,127,0.07),transparent_32rem),var(--canvas)]">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="h-6 w-36 animate-pulse rounded-full bg-line" />
        <div className="mt-8 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-line" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-line" />
          <div className="h-4 w-3/4 max-w-lg animate-pulse rounded bg-line" />
        </div>
      </main>
    </div>
  );
}
