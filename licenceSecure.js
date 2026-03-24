/* ======================================================
MODULE 01 — CONFIG
====================================================== */

const API_URL = "https://licence-server-jlr-0jex.onrender.com";
const OFFLINE_MAX_DAYS = 7;
const LOCAL_KEY = "licence_secure_cache";

/* ======================================================
MODULE 02 — HASH SIMPLE
====================================================== */

async function hash(data){
    const enc = new TextEncoder().encode(data);
    const buffer = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2,"0"))
        .join("");
}

/* ======================================================
MODULE 03 — CHIFFREMENT LOCAL
====================================================== */

function encode(data){
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decode(data){
    return JSON.parse(decodeURIComponent(escape(atob(data))));
}

/* ======================================================
MODULE 04 — DEVICE ID ULTRA STABLE
====================================================== */

async function getDeviceId(){

    let id = localStorage.getItem("device_secure_id");

    if(!id){

        const raw = navigator.userAgent + screen.width + screen.height;

        id = await hash(raw + Date.now());

        localStorage.setItem("device_secure_id", id);
    }

    return id;
}

/* ======================================================
MODULE 05 — SAVE SECURISE
====================================================== */

async function saveSecure(data){

    const integrity = await hash(JSON.stringify(data));

    const payload = {
        data,
        integrity
    };

    localStorage.setItem(LOCAL_KEY, encode(payload));
}

/* ======================================================
MODULE 06 — LOAD SECURISE
====================================================== */

async function loadSecure(){

    try{

        const raw = localStorage.getItem(LOCAL_KEY);

        if(!raw) return null;

        const payload = decode(raw);

        const check = await hash(JSON.stringify(payload.data));

        if(check !== payload.integrity){
            console.error("TAMPER DETECTED");
            return null;
        }

        return payload.data;

    }catch{
        return null;
    }
}

/* ======================================================
MODULE 07 — OFFLINE VALIDATION
====================================================== */

async function isOfflineValid(){

    const licence = await loadSecure();

    if(!licence) return false;

    const now = Date.now();
    const diffDays = (now - licence.lastCheck) / (1000*60*60*24);

    if(diffDays > OFFLINE_MAX_DAYS){
        return false;
    }

    return licence.valid === true;
}

/* ======================================================
MODULE 08 — ONLINE VERIFY
====================================================== */

async function verifyOnline(cle, signature){

    try{

        const deviceId = await getDeviceId();

        const res = await fetch(API_URL + "/verify",{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({
                cle,
                signature,
                deviceId
            })
        });

        const data = await res.json();

        if(data.valid){

            await saveSecure({
                valid:true,
                cle,
                signature,
                deviceId,
                lastCheck: Date.now()
            });
        }

        return data.valid;

    }catch{
        return null;
    }
}

/* ======================================================
MODULE 09 — VALIDATION GLOBALE
====================================================== */

async function verifierLicence(cle, signature){

    // 1. ONLINE
    const online = await verifyOnline(cle, signature);

    if(online === true){
        console.log("ONLINE OK");
        return true;
    }

    // 2. OFFLINE MODE
    if(online === null){

        console.warn("OFFLINE MODE");

        const ok = await isOfflineValid();

        if(ok){
            console.log("OFFLINE OK");
            return true;
        }

        console.error("OFFLINE EXPIRED");
        return false;
    }

    // 3. INVALID
    console.error("INVALID");
    return false;
}
