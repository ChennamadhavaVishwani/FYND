import { useState } from "react";
import { supabase } from "../lib/supabase";


export default function Signup(){

    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");


    async function signup(){

        const {data,error} =
            await supabase.auth.signUp({
                email,
                password
            });


        if(error){
            console.log(error.message);
            return;
        }


        console.log(
            "User created:",
            data.user
        );
    }


    return (
        <div>

            <input
                placeholder="Email"
                onChange={(e)=>setEmail(e.target.value)}
            />

            <input
                placeholder="Password"
                type="password"
                onChange={(e)=>setPassword(e.target.value)}
            />

            <button onClick={signup}>
                Signup
            </button>

        </div>
    )
}