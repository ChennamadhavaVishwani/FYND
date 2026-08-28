import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  User, 
  Briefcase, 
  Compass, 
  BookOpen, 
  Users,
  Sparkles,
  ClipboardList,
  ShieldCheck
} from "lucide-react";

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/resume", label: "Resume Upload", icon: FileText },
    { path: "/ats-scanner", label: "ATS Scanner & Score", icon: ShieldCheck },
    { path: "/profile", label: "Personal Dashboard", icon: User },
    { path: "/jobs", label: "Job Recommendations", icon: Briefcase },
    { path: "/skills", label: "Skill Gap Analysis", icon: Compass },
    { path: "/interview", label: "Interview Prep", icon: BookOpen },
    { path: "/networking", label: "Networking Suggestions", icon: Users },
    { path: "/copilot", label: "AI Career Copilot", icon: Sparkles },
    { path: "/tracker", label: "Application Tracker", icon: ClipboardList },
  ];

  return (
    <div className="sidebar">
      <h2>FYND</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={isActive ? "active" : ""}
            >
              <Icon size={18} className="icon-shadow" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;