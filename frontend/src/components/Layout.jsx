import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function Layout() {
  return (
    <div className="min-h-screen bg-arena text-white font-body">
      <Navbar />
      <main className="relative">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0B0B14",
            border: "1px solid rgba(0,255,255,0.3)",
            color: "#fff",
            fontFamily: "Outfit",
          },
        }}
      />
    </div>
  );
}
