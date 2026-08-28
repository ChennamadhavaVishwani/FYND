import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Dashboard from "./pages/Dashboard";
import ResumeUpload from "./pages/ResumeUpload";
import AtsScanner from "./pages/AtsScanner";
import CareerProfile from "./pages/CareerProfile";
import JobRecommendations from "./pages/JobRecommendations";
import SkillGap from "./pages/SkillGap";
import InterviewPrep from "./pages/InterviewPrep";
import Networking from "./pages/Networking";
import Copilot from "./pages/Copilot";
import Tracker from "./pages/Tracker";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-dark)", color: "white" }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem" }}>Checking session credentials...</p>
      </div>
    );
  }

  // Guarded Layout Structure
  return (
    <BrowserRouter>
      {!session ? (
        // Public Flow
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        // Authenticated Flow
        <div className="app">
          <Sidebar />
          <main className="content">
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/resume" element={<ResumeUpload />} />
              <Route path="/ats-scanner" element={<AtsScanner />} />
              <Route path="/profile" element={<CareerProfile />} />
              <Route path="/jobs" element={<JobRecommendations />} />
              <Route path="/skills" element={<SkillGap />} />
              <Route path="/interview" element={<InterviewPrep />} />
              <Route path="/networking" element={<Networking />} />
              <Route path="/copilot" element={<Copilot />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;