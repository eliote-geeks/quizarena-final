import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Lobby from "./pages/Lobby";
import Categories from "./pages/Categories";
import QuizPlay from "./pages/QuizPlay";
import DuelSetup from "./pages/DuelSetup";
import Tournaments from "./pages/Tournaments";
import Leaderboard from "./pages/Leaderboard";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";

function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Landing />} />
              <Route path="lobby" element={<Lobby />} />
              <Route path="categories" element={<Categories />} />
              <Route path="play/:categoryId" element={<QuizPlay />} />
              <Route path="duel" element={<DuelSetup />} />
              <Route path="tournaments" element={<Tournaments />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
