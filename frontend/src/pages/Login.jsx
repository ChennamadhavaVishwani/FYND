import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";


export default function Login(){

    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error,setError] = useState("");

    const navigate = useNavigate();


    async function handleLogin(){

        const {data,error} =
            await supabase.auth.signInWithPassword({
                email,
                password
            });


        if(error){
            setError(error.message);
            return;
        }


        console.log(data.session);

        navigate("/");
    }


    return (
        <div>

            <h1>Login</h1>

            <input
                placeholder="Email"
                onChange={(e)=>setEmail(e.target.value)}
            />

            <input
                placeholder="Password"
                type="password"
                onChange={(e)=>setPassword(e.target.value)}
            />

            <button onClick={handleLogin}>
                Login
            </button>

            {error && <p>{error}</p>}

        </div>
    );
}