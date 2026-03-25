/* ======================================================
SERVEUR LICENCE JLR — MODE RECUPERATION
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

/* ======================================================
MODULE 00 — BASE
====================================================== */

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 01 — DATA
====================================================== */

function load(){
  try{
    if(!fs.existsSync(DATA_FILE)) return { actives: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  }catch(e){
    console.log("❌ JSON ERROR:", e.message);
    return { actives: [] };
  }
}

function save(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

/* ======================================================
MODULE 02 — PING
====================================================== */

app.get("/ping",(req,res)=>{
  res.send("pong");
});

/* ======================================================
MODULE 03 — GET LICENCES
====================================================== */

app.get("/licences",(req,res)=>{
  const data = load();
  res.json(data.actives);
});

/* ======================================================
MODULE 04 — TEST
====================================================== */

app.get("/test",(req,res)=>{
  res.send("server ok");
});

/* ======================================================
MODULE 05 — START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR RECOVERY PORT",PORT);
});
