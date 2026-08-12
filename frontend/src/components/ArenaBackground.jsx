export default function ArenaBackground({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 grid-bg-animated"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(229,168,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,168,0,0.07) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: "var(--qa-grid-opacity, 0.12)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, transparent 60%, var(--qa-page) 100%)",
        }}
      />
      <div className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#E5A800]/[0.04] blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#E5A800]/[0.03] blur-[140px]" />
    </div>
  );
}
