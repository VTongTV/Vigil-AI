/**
 * App — root router.
 * /          => LandingPage (standalone full-page layout)
 * /dashboard => Dashboard (and all other app pages under the Layout shell)
 */

import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Violations from "./pages/Violations";
import Evidence from "./pages/Evidence";
import Analytics from "./pages/Analytics";
import Map from "./pages/Map";
import Video from "./pages/Video";
import Citizen from "./pages/Citizen";
import Tracking from "./pages/Tracking";
import Deepfake from "./pages/Deepfake";
import Generator from "./pages/Generator";
import Scraper from "./pages/Scraper";
import LandingPage from "./landing/LandingPage";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Landing page at root */}
        <Route path="/" element={<LandingPage />} />

        {/* App pages nested under shared Layout, all under /dashboard prefix */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="violations" element={<Violations />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="map" element={<Map />} />
          <Route path="video" element={<Video />} />
          <Route path="citizen" element={<Citizen />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="deepfake" element={<Deepfake />} />
          <Route path="generator" element={<Generator />} />
          <Route path="scraper" element={<Scraper />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
