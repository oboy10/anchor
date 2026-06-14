export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-cream" />
      <div
        className="ambient-orb absolute -left-[10%] top-[8%] h-[55vh] w-[55vh] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(42,96,96,0.09) 0%, transparent 70%)",
        }}
      />
      <div
        className="ambient-orb-delayed absolute -right-[5%] top-[35%] h-[45vh] w-[45vh] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(42,96,96,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="ambient-orb absolute bottom-[10%] left-[25%] h-[40vh] w-[40vh] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(235,229,218,0.9) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
