import { Bell, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";


function Navbar(){

    const navigate = useNavigate();


    return(
 
        <div className="navbar">

            <div>
                <h2>
                    Career Intelligence System
                </h2>
            </div>


            <div className="nav-icons">

                <button onClick={() => navigate("/login")}>
                    Login
                </button>


                <button onClick={() => navigate("/signup")}>
                    Signup
                </button>


                <Bell size={22}/>

                <UserCircle size={28}/>

            </div>

        </div>

    )
}


export default Navbar;