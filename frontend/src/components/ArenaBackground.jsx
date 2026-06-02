export default function ArenaBackground({ variant = "cyan", className = "" }) {
  const grid = variant === "pink" ? "grid-bg-pink" : "grid-bg";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className={`absolute inset-0 ${grid} grid-bg-animated opacity-60`} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05050A]" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#00FFFF]/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#FF007F]/10 blur-[140px]" />
    </div>
  );
}
