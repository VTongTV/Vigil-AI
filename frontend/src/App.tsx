/**
 * App — root router. Maps every page under the shared Layout shell.
 */

import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Violations from "./pages/Violations";
import Evidence from "./pages/Evidence";
import Analytics from "./pages/Analytics";
import Map from "./pages/Map";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="violations" element={<Violations />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="map" element={<Map />} />
      </Route>
    </Routes>
  );
}
