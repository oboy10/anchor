export default function WalletLoading() {
  return (
    <>
      <div className="h-10 w-full animate-pulse rounded-full bg-line" />
      <div className="mt-8 space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-line" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-card bg-line" />
          <div className="h-28 animate-pulse rounded-card bg-line" />
          <div className="h-28 animate-pulse rounded-card bg-line" />
        </div>
        <div className="h-40 animate-pulse rounded-card bg-line" />
      </div>
    </>
  );
}
