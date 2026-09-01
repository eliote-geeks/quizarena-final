export default function ErrorMessage({ text }) {
  return (
    <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(244,63,94,.1)", color: "var(--danger)" }}>
      {text}
    </p>
  );
}
