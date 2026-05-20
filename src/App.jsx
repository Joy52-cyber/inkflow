import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Genre from "./pages/Genre.jsx";
import MangaDetail from "./pages/MangaDetail.jsx";
import Reader from "./pages/Reader.jsx";
import Upload from "./pages/Upload.jsx";
import UploadReader from "./pages/UploadReader.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const { pathname } = useLocation();
  const isReader = pathname.startsWith("/read/") || pathname.startsWith("/u/");
  return (
    <>
      {!isReader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/genre/:slug" element={<Genre />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/read/:mangaId/:chapterId" element={<Reader />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/u/:id" element={<UploadReader />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}
