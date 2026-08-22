/**
 * Overlay maintenance — s'affiche par-dessus tout le site quand
 * /api/public/maintenance retourne { maintenance: true }.
 * Vérifié au montage, puis toutes les 30 s pour lever l'overlay
 * automatiquement quand l'admin désactive le mode.
 */
import { useEffect, useState } from "react";
import * as api from "../lib/api";

export default function MaintenanceOverlay() {
  const [state, setState] = useState(null); // null=loading, false=ok, {message}=maintenance

  const check = async () => {
    try {
      const r = await api.getMaintenance();
      setState(r.maintenance ? { message: r.message } : false);
    } catch {
      setState(false); // en cas d'erreur réseau, on ne bloque pas le site
    }
  };

  useEffect(() => {
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!state) return null; // false = pas de maintenance, null = encore en cours

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,8,14,0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "maint-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <style>{`
        @keyframes maint-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes maint-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .6; transform: scale(.93); }
        }
        @keyframes maint-ring {
          0%   { transform: scale(.8);  opacity: .7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes maint-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>

      {/* Anneaux pulsants en fond */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 320, height: 320,
            marginLeft: -160, marginTop: -160,
            borderRadius: "50%",
            border: "2px solid rgba(242,169,59,0.18)",
            animation: `maint-ring 3s ease-out ${i * 1}s infinite`,
          }} />
        ))}
      </div>

      {/* Icône */}
      <div style={{
        animation: "maint-float 4s ease-in-out infinite",
        marginBottom: 32,
      }}>
        <div style={{
          width: 88, height: 88,
          borderRadius: "50%",
          background: "rgba(242,169,59,0.1)",
          border: "2px solid rgba(242,169,59,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "maint-pulse 2.5s ease-in-out infinite",
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f2a93b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
      </div>

      {/* Texte */}
      <div style={{ textAlign: "center", maxWidth: 480, padding: "0 24px" }}>
        <p style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#f2a93b",
          marginBottom: 14,
        }}>
          Maintenance en cours
        </p>
        <h1 style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
          fontWeight: 900,
          color: "#e8e4d8",
          lineHeight: 1.15,
          marginBottom: 18,
          letterSpacing: "-0.02em",
        }}>
          QuizArena reviendra
          <br />bientôt
        </h1>
        <p style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 15,
          color: "#7a7060",
          lineHeight: 1.6,
          maxWidth: 360,
          margin: "0 auto",
        }}>
          {state.message}
        </p>
      </div>

      {/* Barre de progression indéterminée */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 3,
        overflow: "hidden",
        background: "rgba(242,169,59,0.08)",
      }}>
        <div style={{
          height: "100%",
          width: "40%",
          background: "linear-gradient(to right, transparent, #f2a93b, transparent)",
          animation: "maint-progress 2s ease-in-out infinite",
        }} />
        <style>{`
          @keyframes maint-progress {
            from { transform: translateX(-200%); }
            to   { transform: translateX(400%); }
          }
        `}</style>
      </div>
    </div>
  );
}
