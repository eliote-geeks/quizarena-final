// Détection heuristique navigateur/OS — juste pour adapter un libellé ou
// des instructions à l'écran, jamais une détection fiable/exhaustive.
export function describeBrowser(ua = (typeof navigator !== "undefined" ? navigator.userAgent : "")) {
  const s = ua || "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(s);
  let browser = "navigateur";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\//.test(s)) browser = "Opera";
  else if (/CriOS\//.test(s)) browser = "Chrome"; // Chrome sur iOS
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s) && !/Chrome/.test(s)) browser = "Safari";
  let os = "";
  if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(s)) os = "iOS";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";
  return { browser, os, isMobile, label: os ? `${browser} · ${os}` : browser };
}
