import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Recharge automatiquement sur un chunk périmé (onglet resté ouvert depuis
// avant un déploiement : le fichier référencé — ex. 548.<ancien-hash>.chunk.js
// — n'existe plus sur le serveur). Sans ça, l'utilisateur reste bloqué sur
// une page cassée (SyntaxError "Unexpected token '<'", le serveur renvoyant
// index.html à la place) sans comprendre pourquoi. Un seul rechargement
// automatique par session (sessionStorage) pour ne jamais boucler si le
// vrai problème est ailleurs.
window.addEventListener("error", (event) => {
  const isChunkError = event.message?.includes("ChunkLoadError")
    || /Loading chunk .* failed/.test(event.message || "")
    || /Unexpected token '<'/.test(event.message || "");
  if (!isChunkError) return;
  if (sessionStorage.getItem("qa_chunk_reload")) return;
  sessionStorage.setItem("qa_chunk_reload", "1");
  window.location.reload();
});
window.addEventListener("unhandledrejection", (event) => {
  const name = event.reason?.name || "";
  if (name !== "ChunkLoadError") return;
  if (sessionStorage.getItem("qa_chunk_reload")) return;
  sessionStorage.setItem("qa_chunk_reload", "1");
  window.location.reload();
});
// La garde anti-boucle ne doit couvrir que le rechargement immédiat qui
// suit — pas condamner tout le reste de la session si un vrai souci de
// chunk survient bien plus tard après un nouveau déploiement.
setTimeout(() => sessionStorage.removeItem("qa_chunk_reload"), 30_000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
