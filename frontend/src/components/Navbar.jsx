import { useState, useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="navbar">
      <div>
        <h2>Career Intelligence System</h2>
      </div>

      <div className="nav-icons">
        {user && (
          <>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginRight: "8px" }}>
              {user.email}
            </span>
            <button 
              className="outline" 
              onClick={handleSignOut}
              style={{ padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
            <div style={{ borderLeft: "1px solid var(--border-color)", height: "24px", margin: "0 8px" }} />
          </>
        )}

        <Bell size={22} className="icon-shadow" style={{ color: "var(--text-secondary)" }} />
        
        <div 
          onClick={() => navigate("/profile")}
          style={{ 
            width: "32px", 
            height: "32px", 
            borderRadius: "50%", 
            background: "var(--grad-primary)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "white"
          }}
        >
          {user ? user.email.substring(0, 2).toUpperCase() : "?"}
        </div>
      </div>
    </div>
  );
}

export default Navbar;