import {Link} from "react-router-dom";


function Sidebar(){

return(

<div className="sidebar">

<h2>
FYND
</h2>


<Link to="/">
Dashboard
</Link>


<Link to="/resume">
Resume Upload
</Link>


<Link to="/profile">
Career Profile
</Link>


<Link to="/jobs">
Job Recommendations
</Link>


<Link to="/skills">
Skill Gap Analysis
</Link>


<Link to="/interview">
Interview Prep
</Link>


<Link to="/networking">
Networking
</Link>


</div>

)

}


export default Sidebar;