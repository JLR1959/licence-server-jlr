/* ======================================================
MODULE 01 — CONFIG
====================================================== */

const API_URL = "https://licence-server-jlr-0jex.onrender.com";
const OFFLINE_MAX_DAYS = 7;

/* ======================================================
MODULE 02 — STOCKAGE LOCAL SECURISE
====================================================== */

function saveLicenceLocal(data){

    const payload = {
        ...data,
        lastCheck: Date.now()
    };

    localStorage.setItem("licence_cache", JSON.stringify(payload));
}

/* ======================================================
MODULE 03 — LECTURE CACHE
====================================================== */

function getLicenceLocal(){

    try{
        return JSON.parse(localStorage.getItem("licence_cache"));
    }catch{
        return null;
    }
}

/* ======================================================
MODULE 04 — VALIDATION OFFLINE
====================================================== */

function isOfflineValid(){

    const licence = getLicenceLocal();

    if(!licence) return false;

    const now = Date.now();
    const diffDays = (now - licence.lastCheck) / (1000 * 60 * 60 * 24);

    if(diffDays > OFFLINE_MAX_DAYS){
        return false;
    }

    return licence.valid === true;
}

/* ======================================================
MODULE 05 — VALIDATION ONLINE
====================================================== */

async function verifyOnline(cle, signature, deviceId){

    try{

        const res = await fetch(API_URL + "/verify",{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ cle, signature, deviceId })
        });

        const data = await res.json();

        if(data.valid){
            saveLicenceLocal({
                valid:true,
                cle,
                signature,
                deviceId
            });
        }

        return data.valid;

    }catch(e){
        return null; // serveur down
    }
}

/* ======================================================
MODULE 06 — DEVICE ID UNIQUE
====================================================== */

function getDeviceId(){

    let id = localStorage.getItem("device_id");

    if(!id){
        id = "DEV-" + crypto.randomUUID();
        localStorage.setItem("device_id", id);
    }

    return id;
}

/* ======================================================
MODULE 07 — VALIDATION GLOBALE
====================================================== */

async function verifierLicence(cle, signature){

    const deviceId = getDeviceId();

    // 1. Essai ONLINE
    const online = await verifyOnline(cle, signature, deviceId);

    if(online === true){
        console.log("LICENCE ONLINE OK");
        return true;
    }

    // 2. Serveur DOWN → fallback OFFLINE
    if(online === null){

        console.warn("MODE OFFLINE");

        if(isOfflineValid()){
            console.log("LICENCE OFFLINE OK");
            return true;
        }

        console.error("OFFLINE EXPIRE");
        return false;
    }

    // 3. Licence invalide
    console.error("LICENCE INVALID");
    return false;
}
