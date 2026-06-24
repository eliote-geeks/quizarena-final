export default function ArenaBackground({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 grid-bg-animated opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(229,168,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,168,0,0.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05050A]" />
      <div className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#E5A800]/[0.04] blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#E5A800]/[0.03] blur-[140px]" />
    </div>
  );
}
