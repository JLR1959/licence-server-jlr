
/* ======================================================
SERVEUR LICENCE JLR — FINAL CHECKOUT API
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
ROOT
====================================================== */

app.get("/", (req,res)=>{
  res.send("SERVEUR CHECKOUT OK");
});

/* ======================================================
STRIPE
====================================================== */

let stripe = null;

try{
  if(process.env.STRIPE_SECRET_KEY){
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe chargé");
  }
}catch(e){
  console.log("❌ Stripe error:", e.message);
}

/* ======================================================
EMAIL (RESEND)
====================================================== */

async function envoyerEmail(email, cle){

  try{
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `VPIJLR <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Votre licence VPIJLR",
        html: `<h2>${cle}</h2>`
      })
    });
    console.log("📧 Email envoyé :", email);
  }catch(e){
    console.log("❌ Email error:", e.message);
  }
}

/* ======================================================
DATA
====================================================== */

function load(){
  try{
    if(!fs.existsSync(DATA_FILE)) return { actives: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  }catch{
    return { actives: [] };
  }
}

function save(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

/* ======================================================
CLE
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
CREATE CHECKOUT SESSION
====================================================== */

app.post("/create-checkout-session", async (req,res)=>{

  const { email } = req.body;

  if(!email){
    return res.status(400).json({error:"Email requis"});
  }

  try{

    const session = await stripe.checkout.sessions.create({

      payment_method_types:["card"],
      mode:"payment",
      customer_email: email,

      line_items:[
        {
          price_data:{
            currency:"cad",
            product_data:{ name:"Licence VPIJLR" },
            unit_amount:1000
          },
          quantity:1
        }
      ],

      success_url:"https://jlr1959.github.io/licence-manager-ui/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:"https://jlr1959.github.io/licence-manager-ui/cancel.html"

    });

    res.json({url:session.url});

  }catch(e){
    console.log("❌ Stripe:", e.message);
    res.status(500).json({error:e.message});
  }

});

/* ======================================================
WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({type:"application/json"}),
  async (req,res)=>{

    let event;

    try{
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    }catch(err){
      return res.status(400).send("Webhook Error");
    }

    if(event.type === "checkout.session.completed"){

      const session = event.data.object;
      const email = session.customer_email;

      const data = load();

      const cle = genererCle();

      data.actives.push({
        cle,
        email,
        actif:true,
        date:new Date().toISOString()
      });

      save(data);

      envoyerEmail(email, cle);
    }

    res.json({received:true});
});

/* ======================================================
SESSION
====================================================== */

app.get("/session/:id", async (req,res)=>{

  try{

    const session = await stripe.checkout.sessions.retrieve(req.params.id);

    res.json({ email: session.customer_email });

  }catch{
    res.status(500).json({error:"Session invalide"});
  }

});

/* ======================================================
LICENCE
====================================================== */

app.get("/licence/:email",(req,res)=>{

  const data = load();

  const licence = data.actives.find(l=>l.email===req.params.email);

  if(!licence){
    return res.status(404).json({error:"Licence introuvable"});
  }

  res.json({cle:licence.cle});
});

/* ======================================================
START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR FINAL CHECKOUT");
});
