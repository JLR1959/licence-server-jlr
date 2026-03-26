const API = "https://licence-server-jlr-0jex.onrender.com";
const APP = "https://jlr1959.github.io/licence-manager-ui/";

function getSessionId(){
  const params = new URLSearchParams(window.location.search);
  return params.get("session_id");
}

async function activate(){

  const session_id = getSessionId();

  if(!session_id){
    document.getElementById("status").innerText = "❌ session introuvable";
    return;
  }

  try{

    const res = await fetch(API + "/activate-session", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ session_id })
    });

    const data = await res.json();

    if(!data.licence){
      throw new Error("fail");
    }

    localStorage.setItem("user_email", data.email);
    localStorage.setItem("licence_key", data.licence);

    document.getElementById("status").innerText = "Licence activée ✔";

    setTimeout(()=>{
      window.location.href = APP;
    },1500);

  }catch(e){
    console.error(e);
    document.getElementById("status").innerText = "❌ erreur activation";
  }
}

activate();
