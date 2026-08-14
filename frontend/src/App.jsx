import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import ResumeUpload from "./pages/ResumeUpload";
import CareerProfile from "./pages/CareerProfile";
import JobRecommendations from "./pages/JobRecommendations";
import SkillGap from "./pages/SkillGap";
import InterviewPrep from "./pages/InterviewPrep";
import Networking from "./pages/Networking";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";


function App(){

  return (
    <BrowserRouter>

      <div className="app">

        <Sidebar />

        <main className="content">
          <Navbar />
          <Routes>

            <Route path="/" element={<Dashboard />} />

            <Route 
              path="/resume"
              element={<ResumeUpload />}
            />

            <Route 
              path="/profile"
              element={<CareerProfile />}
            />

            <Route 
              path="/jobs"
              element={<JobRecommendations />}
            />

            <Route 
              path="/skills"
              element={<SkillGap />}
            />

            <Route 
              path="/interview"
              element={<InterviewPrep />}
            />

            <Route 
              path="/networking"
              element={<Networking />}
            />

          </Routes>

        </main>

      </div>

    </BrowserRouter>
  )
}


export default App;