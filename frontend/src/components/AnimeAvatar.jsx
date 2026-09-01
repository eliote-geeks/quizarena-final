import { avatarUrl } from "../lib/api";

/** Portrait manga déterministe (dicebear, à partir du pseudo), sauf si
 * `src` est fourni : un joueur qui a uploadé sa propre photo (§Profile.jsx
 * Settings, modules/uploads côté backend) l'affiche à la place. */
export default function AnimeAvatar({ seed, src, alt = "", className = "", size = 40 }) {
  const safeSeed = seed || "joueur";
  return <img src={src || avatarUrl(safeSeed)} alt={alt} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
}
