export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const area = document.createElement("textarea");
  area.value = text; area.setAttribute("readonly", "");
  area.style.position = "fixed"; area.style.opacity = "0";
  document.body.appendChild(area); area.select(); area.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy"); area.remove();
  return copied;
}
