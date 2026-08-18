"use strict";
/* ============================================================================
   PT SARI ADITYA LOKA 2 — DASHBOARD OPERASIONAL (standalone HTML, vanilla JS)
   ========================================================================== */
const LS_KEY = "sal2_dashboard_v2";

/* ----------------------------- mock data ---------------------------------- */
/* Tanggal LOKAL (bukan UTC). toISOString() memakai UTC sehingga bagi pengguna
   WIB (UTC+7) yang input sebelum pukul 07:00, tanggalnya mundur satu hari. */
function localDate(d){ d=d||new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MONTH_FACTOR=[0.82,0.80,0.88,0.95,1.0,1.05,1.08,1.12,1.15,1.10,1.0,0.90];
const r2=n=>Math.round(n*100)/100, r1=n=>Math.round(n*10)/10;

function buildDataset(){
  const rng=mulberry32(20242025);
  const now=new Date(); const end=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const start=new Date(end.getFullYear()-5,end.getMonth(),end.getDate());
  const rows=[];
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const m=d.getMonth(), sf=MONTH_FACTOR[m], yr=d.getFullYear()-start.getFullYear(), drift=1+yr*0.012;
    const dow=d.getDay(), weekend=(dow===0)?0.97:1, noise=()=>(rng()-0.5);
    let tbs=Math.max(380,700*sf*drift*weekend*(1+noise()*0.16));
    let util=Math.min(98.5,Math.max(70,91+noise()*9-(sf>1.08?rng()*2:0)));
    let thr=Math.min(62,Math.max(40,(tbs/24)*(100/util)*(0.9+noise()*0.08)));
    let oer=Math.min(24.6,Math.max(19.4,22.2+(sf-1)*1.2+noise()*1.3+yr*0.05));
    const cpo=tbs*oer/100;
    let restan=Math.max(0,(tbs-700*sf)*0.4+(95-util)*4+noise()*40);
    if(restan<6 && rng()>0.55) restan=0;
    // Mutu & losses: berkorelasi wajar — restan tinggi menaikkan FFA, losses tinggi menekan OER
    const rs=Math.min(1,restan/160), lo=Math.max(0,(22.6-oer)/3);
    const cl=(base,std,sp)=>r2(Math.max(0,base+lo*std*0.22+noise()*std*sp));
    rows.push({id:rows.length+1,date:localDate(new Date(d)),
      throughput:r2(thr),tbs:r1(tbs),oer:r2(oer),cpo:r2(cpo),utility:r2(util),restan:r1(restan),
      // --- Mutu CPO ---
      ffa:r2(Math.max(1.6,2.55+rs*1.15+noise()*0.55)),
      mCpo:r2(Math.max(0.05,0.155+noise()*0.06)+0.0),
      dCpo:Math.round(Math.max(0.004,0.0185+noise()*0.009)*1000)/1000,
      // --- Mutu Kernel ---
      mKrn:r2(Math.min(7.4,Math.max(3.9,5.5+noise()*1.05))),
      dKrn:r2(Math.max(1.2,4.6+noise()*2.2)),
      bKrn:r2(Math.max(4,11.8+noise()*5.6)),
      // --- Losses CPO (OWB) ---
      lSludge:cl(0.52,0.7,0.30), lFibre:cl(3.02,3.6,0.24), lEfb:cl(0.60,0.8,0.30),
      lEfbT:cl(1.58,2.0,0.26), lWetNut:cl(0.36,0.5,0.32), lUsb:cl(1.52,2.0,0.30),
      // --- Losses Kernel ---
      kFibre:cl(0.74,1,0.34), kDest:cl(0.71,1,0.34), kLtds1:cl(0.68,1,0.34),
      kLtds2:cl(0.70,1,0.34), kShell:cl(2.32,3,0.26),
      by:"krani.produksi"});
  }
  return rows;
}

/* --------------------------- KPI definitions ------------------------------ */
const KPIS=[
  {key:"throughput",label:"Throughput",unit:"Ton/Jam",dir:"up",dec:2,icon:"gauge",target:60,warning:55,critical:50},
  {key:"tbs",label:"TBS Olah",unit:"Ton",dir:"up",dec:1,icon:"layers",target:720,warning:650,critical:560},
  {key:"oer",label:"OER",unit:"%",dir:"up",dec:2,icon:"droplets",target:23,warning:21.5,critical:20.5},
  {key:"cpo",label:"Produksi CPO",unit:"Ton",dir:"up",dec:2,icon:"boxes",target:160,warning:140,critical:120},
  {key:"utility",label:"Utility",unit:"%",dir:"up",dec:2,icon:"activity",target:95,warning:88,critical:82},
  {key:"restan",label:"Restan TBS",unit:"Ton",dir:"down",dec:1,icon:"factory",target:0,warning:80,critical:150},
];
/* Standar mutu & losses = batas MAKSIMUM → dipakai sebagai ambang Critical.
   Warning default = 90% dari standar (mendekati batas). Semua bisa diubah di Settings.
   Khusus Moisture Kernel: standar berupa PITA 5–6% — di bawah 5% pun dihitung Warning. */
const W=(std)=>r2(std*0.9);
const QUAL_CPO=[
  {key:"ffa", label:"FFA",          unit:"%",dir:"down",dec:2,icon:"droplets",std:3.5,  target:0,warning:W(3.5),  critical:3.5},
  {key:"mCpo",label:"Moisture CPO", unit:"%",dir:"down",dec:2,icon:"droplets",std:0.20, target:0,warning:0.18,    critical:0.20},
  {key:"dCpo",label:"Dirt CPO",     unit:"%",dir:"down",dec:3,icon:"layers",  std:0.025,target:0,warning:0.023,   critical:0.025},
];
const QUAL_KRN=[
  {key:"mKrn",label:"Moisture Kernel",unit:"%",dir:"band",dec:2,icon:"droplets",std:"5–6",min:5,max:6,critLo:4,critHi:7},
  {key:"dKrn",label:"Dirt Kernel",    unit:"%",dir:"down",dec:2,icon:"layers",  std:6, target:0,warning:W(6), critical:6},
  {key:"bKrn",label:"Broken Nut",     unit:"%",dir:"down",dec:2,icon:"boxes",   std:15,target:0,warning:W(15),critical:15},
];
const LOSS_CPO=[
  {key:"lSludge",label:"OWB HIP Sludge Centrifuge",       unit:"%",dir:"down",dec:2,icon:"droplets",std:0.7,target:0,warning:W(0.7),critical:0.7},
  {key:"lFibre", label:"OWB Fibre in Press Cake",         unit:"%",dir:"down",dec:2,icon:"layers",  std:3.6,target:0,warning:W(3.6),critical:3.6},
  {key:"lEfb",   label:"OWB in Empty Fruit Bunch",        unit:"%",dir:"down",dec:2,icon:"boxes",   std:0.8,target:0,warning:W(0.8),critical:0.8},
  {key:"lEfbT",  label:"OWB in Empty Fruit Bunch (TBM,SAM)",unit:"%",dir:"down",dec:2,icon:"boxes", std:2.0,target:0,warning:W(2.0),critical:2.0},
  {key:"lWetNut",label:"OWB in Wet Nut",                  unit:"%",dir:"down",dec:2,icon:"factory", std:0.5,target:0,warning:W(0.5),critical:0.5},
  {key:"lUsb",   label:"OWB USB",                         unit:"%",dir:"down",dec:2,icon:"layers",  std:2.0,target:0,warning:W(2.0),critical:2.0},
];
const LOSS_KRN=[
  {key:"kFibre",label:"Fibre Cyclone",       unit:"%",dir:"down",dec:2,icon:"activity",std:1,target:0,warning:W(1),critical:1},
  {key:"kDest", label:"Destoner",            unit:"%",dir:"down",dec:2,icon:"factory", std:1,target:0,warning:W(1),critical:1},
  {key:"kLtds1",label:"LTDS 1",              unit:"%",dir:"down",dec:2,icon:"gauge",   std:1,target:0,warning:W(1),critical:1},
  {key:"kLtds2",label:"LTDS 2",              unit:"%",dir:"down",dec:2,icon:"gauge",   std:1,target:0,warning:W(1),critical:1},
  {key:"kShell",label:"Shell ex Hydrocyclone",unit:"%",dir:"down",dec:2,icon:"boxes",  std:3,target:0,warning:W(3),critical:3},
];
const QUAL=[...QUAL_CPO,...QUAL_KRN], LOSS=[...LOSS_CPO,...LOSS_KRN];
const ALLM=[...KPIS,...QUAL,...LOSS];
const GROUPS=[
  {id:"core",label:"Operasional",items:KPIS},
  {id:"qcpo",label:"Mutu CPO",items:QUAL_CPO},
  {id:"qkrn",label:"Mutu Kernel",items:QUAL_KRN},
  {id:"lcpo",label:"Losses CPO",items:LOSS_CPO},
  {id:"lkrn",label:"Losses Kernel",items:LOSS_KRN},
];
const byKey=k=>ALLM.find(x=>x.key===k);
const LOGO="assets/logo-aal.png";
/* CATATAN KEAMANAN: password di bawah tersimpan di sisi klien (bisa dibaca siapa pun
   yang membuka source code). Ini HANYA untuk demo/prototipe. Pada produksi, autentikasi
   wajib dipindahkan ke server (mis. Supabase Auth) dengan password ter-hash. */
const USERS=[
  {name:"Budi Santoso",username:"krani.admin",role:"Administrator",pass:"krani2026",color:"#147a48"},
  {name:"Andi Wijaya",username:"asisten.proses",role:"Staff",pass:"proses2026",color:"#c97a0a"},
  {name:"Ir. Hartono",username:"mill.manager",role:"Management",pass:"manager2026",color:"#b03a2e"},
];
const ST={good:{cls:"s-good",col:"var(--good)",txt:"Normal"},warn:{cls:"s-warn",col:"var(--warn)",txt:"Warning"},
  crit:{cls:"s-crit",col:"var(--crit)",txt:"Critical"},na:{cls:"",col:"var(--faint)",txt:"Tanpa data"}};

/* ------------------------------ helpers ----------------------------------- */
const fmt=(v,dec)=>(v==null||isNaN(v))?"—":Number(v).toLocaleString("id-ID",{minimumFractionDigits:dec,maximumFractionDigits:dec});
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const idDate=s=>new Date(s).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const idDateShort=s=>new Date(s).toLocaleDateString("id-ID",{day:"2-digit",month:"short"});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ICONS={"user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />","eye":"<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","eye-off":"<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" /> <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" /> <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" /> <path d=\"m2 2 20 20\" />","log-in":"<path d=\"m10 17 5-5-5-5\" /> <path d=\"M15 12H3\" /> <path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\" />","log-out":"<path d=\"m16 17 5-5-5-5\" /> <path d=\"M21 12H9\" /> <path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" />","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />","triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m9 12 2 2 4-4\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />","chevron-right":"<path d=\"m9 18 6-6-6-6\" />","shield-alert":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"M12 8v4\" /> <path d=\"M12 16h.01\" />","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />","layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />","trending-up":"<path d=\"M16 7h6v6\" /> <path d=\"m22 7-8.5 8.5-5-5L2 17\" />","square-plus":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M8 12h8\" /> <path d=\"M12 8v8\" />","database":"<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\" /> <path d=\"M3 5V19A9 3 0 0 0 21 19V5\" /> <path d=\"M3 12A9 3 0 0 0 21 12\" />","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","tv":"<path d=\"m17 2-5 5-5-5\" /> <rect width=\"20\" height=\"15\" x=\"2\" y=\"7\" rx=\"2\" />","factory":"<path d=\"M12 16h.01\" /> <path d=\"M16 16h.01\" /> <path d=\"M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z\" /> <path d=\"M8 16h.01\" />","menu":"<path d=\"M4 5h16\" /> <path d=\"M4 12h16\" /> <path d=\"M4 19h16\" />","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /> <path d=\"M21 3v5h-5\" /> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /> <path d=\"M8 16H3v5\" />","maximize-2":"<path d=\"M15 3h6v6\" /> <path d=\"m21 3-7 7\" /> <path d=\"m3 21 7-7\" /> <path d=\"M9 21H3v-6\" />","x":"<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />","search":"<path d=\"m21 21-4.34-4.34\" /> <circle cx=\"11\" cy=\"11\" r=\"8\" />","file-text":"<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" />","download":"<path d=\"M12 15V3\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <path d=\"m7 10 5 5 5-5\" />","upload":"<path d=\"M12 3v12\" /> <path d=\"m17 8-5-5-5 5\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />","pencil":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" /> <path d=\"m15 5 4 4\" />","trash-2":"<path d=\"M10 11v6\" /> <path d=\"M14 11v6\" /> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\" /> <path d=\"M3 6h18\" /> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","clipboard-list":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /> <path d=\"M12 11h4\" /> <path d=\"M12 16h4\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 16h.01\" />","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <path d=\"M16 3.128a4 4 0 0 1 0 7.744\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" />","arrow-up-right":"<path d=\"M7 7h10v10\" /> <path d=\"M7 17 17 7\" />","arrow-down-right":"<path d=\"m7 7 10 10\" /> <path d=\"M17 7v10H7\" />","minus":"<path d=\"M5 12h14\" />","gauge":"<path d=\"m12 14 4-4\" /> <path d=\"M3.34 19a10 10 0 1 1 17.32 0\" />","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />","droplets":"<path d=\"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z\" /> <path d=\"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97\" />","boxes":"<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\" /> <path d=\"m7 16.5-4.74-2.85\" /> <path d=\"m7 16.5 5-3\" /> <path d=\"M7 16.5v5.17\" /> <path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\" /> <path d=\"m17 16.5-5-3\" /> <path d=\"m17 16.5 4.74-2.85\" /> <path d=\"M17 16.5v5.17\" /> <path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\" /> <path d=\"M12 8 7.26 5.15\" /> <path d=\"m12 8 4.74-2.85\" /> <path d=\"M12 13.5V8\" />","activity":"<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\" />","panel-left":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M9 3v18\"/>"};
const ic=(name,cls)=>ICONS[name]?`<svg class="lucide ${cls||""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`:"";

/* Menerima "22,85" maupun "22.85" dan pemisah ribuan "1.234,5" */
function parseNum(s){
  if(s==null) return null;
  s=String(s).trim(); if(s==="") return null;
  if(s.includes(",")) s=s.replace(/\./g,"").replace(",",".");   // format Indonesia
  const n=Number(s); return isNaN(n)?NaN:n;
}
/* Matriks hak akses — sebelumnya Staff & Management identik, padahal PRD
   membedakan keduanya. Staff kini boleh input & edit, tetapi tidak menghapus
   maupun mengubah pengaturan; Management murni pemantau. */
const canInput=r=>r==="Administrator"||r==="Staff";
const canEditRow=r=>r==="Administrator"||r==="Staff";
const canDelete=r=>r==="Administrator";
const canConfig=r=>r==="Administrator";
function statusOf(kpi,v,th){
  const t=(th&&th[kpi.key])||kpi;
  if(v==null||v===""||isNaN(v)) return "na";
  if(kpi.dir==="band"){                       // pita: di luar 5–6% (atas ATAU bawah) = menyimpang
    if(v>=t.min&&v<=t.max) return "good";
    if(v>=t.critLo&&v<=t.critHi) return "warn";
    return "crit";
  }
  if(kpi.dir==="up"){ if(v>=t.warning) return "good"; if(v>=t.critical) return "warn"; return "crit"; }
  if(v<=t.warning) return "good"; if(v<=t.critical) return "warn"; return "crit";
}
function sliceByRange(rows,range){
  if(!rows.length) return rows;
  const last=new Date(rows[rows.length-1].date);
  if(range==="SHI"){   // Sampai Hari Ini: tanggal 1 bulan berjalan s/d data terakhir
    const p=last.toISOString().slice(0,7);
    return rows.filter(r=>r.date.slice(0,7)===p);
  }
  if(range==="YTD"){ const y=last.getFullYear(); return rows.filter(r=>new Date(r.date).getFullYear()===y); }
  const days={ "1D":1,"1W":7,"1M":30,"3M":90,"1Y":365,"3Y":1095,"5Y":1825 }[range];
  const cut=new Date(last); cut.setDate(cut.getDate()-(days-1));
  return rows.filter(r=>new Date(r.date)>=cut);
}

/* --------------------------- persistent state ----------------------------- */
let state = {
  theme:"light", user:null, page:"exec", drawer:false, auto:true,
  rows:[], thresholds:{}, audit:[],
  histRange:"3M", histMetric:"tbs",
  mq:"", myear:"all", mmonth:"all",
  settingsTab:"threshold", editing:null, tv:false, showDemo:false,
  qPeriod:"SHI", lPeriod:"SHI", mgroup:"core", mpage:1, lossFactors:{}, qMetric:"ffa", lMetric:"lFibre", collapsed:false,
};
function defaultThresholds(){ const o={};
  ALLM.forEach(k=>{ o[k.key]= k.dir==="band"
    ? {min:k.min,max:k.max,critLo:k.critLo,critHi:k.critHi}
    : {target:k.target,warning:k.warning,critical:k.critical}; });
  return o; }
/* Faktor konversi tiap item losses ke "% terhadap TBS". BELUM DIISI secara default:
   nilai losses tidak boleh dijumlahkan langsung karena penyebutnya berbeda-beda. */
function defaultLossFactors(){ const o={}; LOSS.forEach(k=>o[k.key]=null); return o; }
function totalLoss(row,items){
  const f=state.lossFactors||{};
  let sum=0, ready=true;
  items.forEach(k=>{ const fv=f[k.key]; const v=row?row[k.key]:null;
    if(fv==null||fv===""||isNaN(fv)||v==null||isNaN(v)) ready=false; else sum+=v*fv; });
  return ready? r2(sum) : null;
}
function periodAvg(rows,key,range){
  const s=sliceByRange(rows,range).map(r=>r[key]).filter(v=>v!=null&&v!==""&&!isNaN(v));
  return s.length? s.reduce((a,b)=>a+b,0)/s.length : null;
}

/* Auto-logout 30 menit (PRD §29). lastActive disimpan di key terpisah yang ringan,
   supaya tidak perlu menulis ulang seluruh dataset setiap kali ada aktivitas. */
const LS_ACT="sal2_lastactive", IDLE_MS=30*60*1000;
function touchActivity(){ try{ localStorage.setItem(LS_ACT,String(Date.now())); }catch(e){} }
function sessionExpired(){
  let t=0; try{ t=+localStorage.getItem(LS_ACT)||0; }catch(e){}
  return !t || (Date.now()-t)>IDLE_MS;
}
function loadState(){
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(LS_KEY)); }catch(e){}
  if(saved && saved.rows && saved.rows.length){
    state.rows=saved.rows; state.thresholds=saved.thresholds||defaultThresholds();
    state.audit=saved.audit||[]; state.theme=saved.theme||"light"; state.lossFactors=saved.lossFactors||defaultLossFactors(); state.collapsed=!!saved.collapsed;
    // Sesi hanya dipulihkan bila belum kedaluwarsa; jika tidak, wajib login ulang.
    state.user = sessionExpired() ? null : (saved.user||null);
  } else {
    state.rows=buildDataset(); state.thresholds=defaultThresholds(); state.audit=[]; state.lossFactors=defaultLossFactors();
  }
}
function persist(){
  // Audit log dibatasi 1.000 entri terbaru — tanpa batas, penyimpanan browser
  // (±5MB) akan penuh dalam ±3 tahun dan seluruh penyimpanan gagal senyap.
  if(state.audit.length>1000) state.audit=state.audit.slice(0,1000);
  try{
    localStorage.setItem(LS_KEY,JSON.stringify({rows:state.rows,thresholds:state.thresholds,audit:state.audit,theme:state.theme,user:state.user,lossFactors:state.lossFactors,collapsed:state.collapsed}));
    state._storageWarned=false;
  }catch(e){
    if(!state._storageWarned){
      state._storageWarned=true;
      try{ toast("Penyimpanan browser penuh — perubahan terakhir TIDAK tersimpan. Ekspor data lalu reset.","crit"); }catch(_){}
      console.error("localStorage gagal:",e);
    }
  }
}
function resetData(){
  if(!confirm("Reset seluruh data ke data contoh awal? Semua input/edit pada perangkat ini akan hilang.")) return;
  state.rows=buildDataset(); state.thresholds=defaultThresholds(); state.audit=[]; state.lossFactors=defaultLossFactors();
  persist(); toast("Data dikembalikan ke contoh awal","warn"); render();
}

/* ------------------------------ data ops ---------------------------------- */
function addRow(rec){
  state.rows=state.rows.filter(r=>r.date!==rec.date);
  state.rows.push({...rec,id:Date.now()+Math.random()});
  state.rows.sort((a,b)=>a.date.localeCompare(b.date)); persist();
}
function updateRow(rec){ state.rows=state.rows.map(r=>r.id===rec.id?{...r,...rec}:r); persist(); }
function deleteRow(id){ state.rows=state.rows.filter(r=>r.id!==id); persist(); }
function addAudit(action,detail){
  state.audit.unshift({time:new Date().toLocaleString("id-ID",{hour12:false}),user:(state.user&&state.user.username)||"sistem",action,detail});
  persist();
}

/* ------------------------------- toasts ----------------------------------- */
function toast(msg,kind){
  kind=kind||"good";
  const el=document.createElement("div"); el.className="toast";
  el.style.borderLeft=`3px solid ${kind==="good"?"var(--good)":kind==="warn"?"var(--warn)":"var(--crit)"}`;
  el.innerHTML=`${ic(kind==="good"?"circle-check":kind==="warn"?"triangle-alert":"circle-alert")}<span style="font-size:13px;font-weight:600">${esc(msg)}</span>`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(()=>el.remove(),3200);
}

/* ------------------------------ Sparkline --------------------------------- */
function sparkline(data,color){
  const w=120,h=34;
  if(!data||data.length<2) return `<svg width="${w}" height="${h}"></svg>`;
  const min=Math.min(...data),max=Math.max(...data),rng=(max-min)||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${(h-2-((v-min)/rng)*(h-4)).toFixed(1)}`).join(" ");
  const last=data[data.length-1],ly=(h-2-((last-min)/rng)*(h-4)).toFixed(1);
  const id="g"+Math.random().toString(36).slice(2,7);
  return `<svg width="${w}" height="${h}" style="overflow:visible">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polyline points="0,${h} ${pts} ${w},${h}" fill="url(#${id})" stroke="none"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${w}" cy="${ly}" r="2.6" fill="${color}"/></svg>`;
}

/* ---------------------------- big SVG chart ------------------------------- */
let CHARTS={}; // id -> {points, dec, unit}
function bigChart(id, series, opts){
  // series: [{label, v}]  opts:{color,dec,unit,target,critical,showTarget,multi}
  const W=820,H=opts.h||320, padL=46,padR=14,padT=14,padB=26;
  const cw=W-padL-padR, ch=H-padT-padB;
  const vals=series.map(s=>s.v).concat(opts.extra||[]);
  let min=Math.min(...vals),max=Math.max(...vals);
  if(opts.showTarget&&opts.target!=null){min=Math.min(min,opts.target);max=Math.max(max,opts.target);}
  if(opts.critical!=null){min=Math.min(min,opts.critical);max=Math.max(max,opts.critical);}
  (opts.refs||[]).forEach(rf=>{ min=Math.min(min,rf.v); max=Math.max(max,rf.v); });
  const span=(max-min)||1; min-=span*0.08; max+=span*0.08;
  const x=i=>padL+(series.length<2?cw/2:(i/(series.length-1))*cw);
  const y=v=>padT+ch-((v-min)/(max-min))*ch;
  // gridlines
  let grid="",ylab="";
  for(let g=0;g<=4;g++){ const gv=min+(max-min)*(g/4), gy=y(gv);
    grid+=`<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}" stroke="var(--border)" stroke-dasharray="3 3"/>`;
    ylab+=`<text x="${padL-8}" y="${(gy+3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--faint)" font-family="JetBrains Mono,monospace">${fmt(gv,opts.dec)}</text>`;
  }
  // x labels (~6)
  let xlab=""; const step=Math.max(1,Math.ceil(series.length/6));
  series.forEach((s,i)=>{ if(i%step===0||i===series.length-1){ xlab+=`<text x="${x(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--faint)">${esc(s.label)}</text>`; }});
  // paths
  const line=series.map((s,i)=>`${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join(" ");
  const area=`${padL},${padT+ch} ${line} ${(padL+cw).toFixed(1)},${padT+ch}`;
  let refs="";
  if(opts.showTarget&&opts.target!=null){ const ty=y(opts.target); refs+=`<line x1="${padL}" y1="${ty.toFixed(1)}" x2="${W-padR}" y2="${ty.toFixed(1)}" stroke="var(--good)" stroke-dasharray="5 4" stroke-opacity="0.7"/>`; }
  if(opts.critical!=null){ const cy=y(opts.critical); refs+=`<line x1="${padL}" y1="${cy.toFixed(1)}" x2="${W-padR}" y2="${cy.toFixed(1)}" stroke="var(--crit)" stroke-dasharray="5 4" stroke-opacity="0.5"/>`; }
  (opts.refs||[]).forEach(rf=>{ const ry=y(rf.v);
    refs+=`<line x1="${padL}" y1="${ry.toFixed(1)}" x2="${W-padR}" y2="${ry.toFixed(1)}" stroke="${rf.color}" stroke-dasharray="5 4" stroke-opacity="0.75"/>`;
    refs+=`<text x="${W-padR-3}" y="${(ry-4).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${rf.color}" font-weight="700">${esc(rf.label||"")}</text>`; });
  const gid="ar"+id;
  CHARTS[id]={points:series.map((s,i)=>({px:x(i),py:y(s.v),label:s.label,v:s.v})),dec:opts.dec,unit:opts.unit,padT,ch,padL,cw};
  return `<div class="chart-wrap" id="cw_${id}" data-chart="${id}">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${opts.color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${opts.color}" stop-opacity="0"/></linearGradient></defs>
      ${grid}${ylab}${xlab}${refs}
      <polygon points="${area}" fill="url(#${gid})"/>
      <polyline points="${line}" fill="none" stroke="${opts.color}" stroke-width="2.3" stroke-linejoin="round"/>
      ${opts.line2?`<polyline points="${opts.line2.map((s,i)=>`${x(i).toFixed(1)},${y(s).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--cpo)" stroke-width="2.3" stroke-linejoin="round"/>`:""}
      <line class="chart-cross" id="cr_${id}" y1="${padT}" y2="${padT+ch}"/>
      <circle id="cd_${id}" r="4" fill="${opts.color}" opacity="0"/>
    </svg>
    <div class="chart-tip" id="ct_${id}"></div>
  </div>`;
}
function bindCharts(){
  document.querySelectorAll(".chart-wrap").forEach(wrap=>{
    const id=wrap.getAttribute("data-chart"); const meta=CHARTS[id]; if(!meta) return;
    const tip=document.getElementById("ct_"+id), cross=document.getElementById("cr_"+id), dot=document.getElementById("cd_"+id);
    const svg=wrap.querySelector("svg");
    wrap.onmousemove=e=>{
      const rect=wrap.getBoundingClientRect();
      const relX=(e.clientX-rect.left)/rect.width*820;
      let best=meta.points[0],bd=1e9;
      meta.points.forEach(p=>{const d=Math.abs(p.px-relX); if(d<bd){bd=d;best=p;}});
      const leftPct=(best.px/820)*100, topPct=(best.py/(svg.viewBox.baseVal.height))*100;
      tip.style.left=leftPct+"%"; tip.style.top=topPct+"%"; tip.style.opacity=1;
      tip.innerHTML=`<div style="font-size:11px;color:var(--faint);font-weight:700;margin-bottom:3px">${esc(best.label)}</div><div class="mono" style="font-weight:700;color:${getComputedStyle(dot).fill}">${fmt(best.v,meta.dec)} <span class="faint" style="font-weight:600">${esc(meta.unit)}</span></div>`;
      cross.setAttribute("x1",best.px); cross.setAttribute("x2",best.px); cross.style.opacity=1;
      dot.setAttribute("cx",best.px); dot.setAttribute("cy",best.py); dot.style.opacity=1;
    };
    wrap.onmouseleave=()=>{ tip.style.opacity=0; cross.style.opacity=0; dot.style.opacity=0; };
  });
}

/* ----------------------------- insight engine ----------------------------- */
function buildInsights(rows,th){
  if(rows.length<8) return [];
  const last=rows[rows.length-1],prev=rows[rows.length-2],w7=rows.slice(-8,-1),out=[];
  for(const k of KPIS){
    const v=last[k.key],a7=avg(w7.map(r=>r[k.key])),d7=a7?((v-a7)/a7)*100:0;
    const st=statusOf(k,v,th),up=v>=a7,goodMove=k.dir==="up"?up:!up;
    out.push({k:k.key,st,good:goodMove,sev:st==="crit"?2:st==="warn"?1:(Math.abs(d7)>4?0:-1),
      msg:`${k.label} hari ini ${fmt(v,k.dec)} ${k.unit}, ${goodMove?"naik":"turun"} ${fmt(Math.abs(d7),2)}% dibanding rata-rata 7 hari (${fmt(a7,k.dec)}).`});
  }
  return out.filter(o=>o.sev>=0).sort((a,b)=>b.sev-a.sev).slice(0,4);
}

/* =============================== PAGES ==================================== */
function kpiCard(k,row,prev,series,th){
  const v=row?row[k.key]:null, pv=prev?prev[k.key]:null;
  const st=ST[statusOf(k,v,th)];
  let dpct=null; if(v!=null&&pv!=null&&pv!==0) dpct=((v-pv)/pv)*100;
  const better=dpct==null?0:(k.dir==="up"?dpct:-dpct);
  const dcls=better>0.001?"up":better<-0.001?"down":"flat";
  const arrow=dcls==="up"?"arrow-up-right":dcls==="down"?"arrow-down-right":"minus";
  return `<div class="kpi">
    <div class="kpi-bar" style="background:${st.col}"></div>
    <div class="kpi-top"><div class="kpi-ico">${ic(k.icon)}</div>
      <span class="status-pill ${st.cls}"><span class="led" style="background:${st.col};color:${st.col}"></span>${st.txt}</span></div>
    <div class="kpi-name">${k.label}</div>
    <div style="display:flex;align-items:flex-end;margin-top:6px"><span class="kpi-val mono" data-cv="${v==null?"":v}" data-cd="${k.dec}">${fmt(v,k.dec)}</span><span class="kpi-unit">${k.unit}</span></div>
    <div class="kpi-foot">
      ${dpct!=null?`<span class="delta ${dcls}">${ic(arrow,"sm")}${dpct>0?"+":""}${r1(dpct)}% <span class="faint" style="font-weight:600;margin-left:2px">vs kemarin</span></span>`:`<span class="faint" style="font-size:12px">—</span>`}
      ${sparkline(series,st.col)}
    </div></div>`;
}

function emptyState(judul,pesan){
  return `<div class="card card-pad" style="text-align:center;padding:52px 24px">
    <div style="display:flex;justify-content:center;margin-bottom:12px;color:var(--faint)">${ic("database","")}</div>
    <div style="font-weight:700;font-size:15px">${judul}</div>
    <div class="muted" style="font-size:13px;margin-top:6px;max-width:420px;margin-left:auto;margin-right:auto;line-height:1.6">${pesan}</div>
    ${(state.user&&state.user.role==="Administrator")?`<button class="btn btn-primary" style="margin-top:16px" data-act="nav" data-page="input">${ic("square-plus","sm")} Input Data Sekarang</button>`:""}
  </div>`;
}
function pageExec(){
  const rows=state.rows,th=state.thresholds,last=rows[rows.length-1],prev=rows[rows.length-2];
  if(!rows.length) return emptyState("Belum ada data","Dashboard akan menampilkan KPI setelah data performa harian pertama dimasukkan, baik lewat form input manual maupun unggah Excel.");
  const tail=rows.slice(-14); const series={}; KPIS.forEach(k=>series[k.key]=tail.map(r=>r[k.key]));
  const insights=buildInsights(rows,th);
  const cd=rows.slice(-30).map(r=>({label:idDateShort(r.date),v:r.tbs}));
  const cpoLine=rows.slice(-30).map(r=>r.cpo);
  const critN=KPIS.filter(k=>statusOf(k,last[k.key],th)==="crit").length;
  const warnN=KPIS.filter(k=>statusOf(k,last[k.key],th)==="warn").length;
  const banColor=critN?"crit":warnN?"warn":"good";
  return `
  <div class="card card-pad" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:44px;height:44px;border-radius:11px;display:grid;place-items:center;background:var(--${banColor}-bg);color:var(--${banColor})">${ic(critN?"circle-alert":warnN?"triangle-alert":"circle-check","")}</div>
      <div><div style="font-weight:800;font-size:15px">${critN?`${critN} KPI dalam kondisi Critical`:warnN?`${warnN} KPI perlu perhatian`:"Seluruh KPI dalam kondisi Normal"}</div>
        <div class="muted" style="font-size:12.5px;margin-top:2px">Data performa harian terakhir · ${idDate(last.date)} · Zona waktu WIB</div></div>
    </div>
    <div class="tag" style="font-size:12px">${ic("shield-check","sm")} Single Source of Truth</div>
  </div>
  <div class="grid-kpi">${KPIS.map(k=>kpiCard(k,last,prev,series[k.key],th)).join("")}</div>
  <div class="grid-kpi" style="grid-template-columns:repeat(2,1fr)">
    ${[["Mutu CPO & Kernel",QUAL,"quality"],["Losses CPO & Kernel",LOSS,"losses"]].map(([lbl,items,pg])=>{
      const g=groupStatus(items,last,th), s=ST[g.st];
      return `<div class="card card-pad" data-act="nav" data-page="${pg}" style="cursor:pointer;display:flex;align-items:center;gap:14px">
        <div style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:${s.col}22;color:${s.col}">${ic(g.st==="crit"?"circle-alert":g.st==="warn"?"triangle-alert":"circle-check")}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">${lbl}</div>
          <div class="muted" style="font-size:12.5px;margin-top:2px">${g.c?`${g.c} indikator Critical`:g.w?`${g.w} indikator Warning`:`${items.length} indikator dalam standar`}</div></div>
        ${ic("chevron-right","sm")}</div>`;}).join("")}
  </div>
  <div class="grid-2" style="grid-template-columns:1.6fr 1fr">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Tren 30 Hari — TBS Olah & Produksi CPO</div><div class="card-titsub">Volume olah harian dan output CPO</div></div><span class="tag">${ic("trending-up","sm")} Harian</span></div>
      <div class="card-pad" style="height:300px">${bigChart("exec",cd,{color:"var(--brand)",dec:1,unit:"Ton",h:300,line2:cpoLine})}</div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title" style="display:flex;align-items:center;gap:7px">${ic("lightbulb")} Smart Insight</div><span class="tag faint">otomatis</span></div>
      <div class="card-pad" style="display:flex;flex-direction:column;gap:10px">
        ${insights.length===0?`<div class="muted" style="font-size:13px">Belum cukup data untuk insight.</div>`:insights.map(ins=>`
          <div class="insight"><div class="dot" style="background:${ST[ins.st].col}22;color:${ST[ins.st].col}">${ic(ins.st==="crit"?"circle-alert":ins.st==="warn"?"triangle-alert":ins.good?"arrow-up-right":"arrow-down-right")}</div>
          <div style="font-size:12.8px;line-height:1.45">${esc(ins.msg)}</div></div>`).join("")}
      </div>
    </div>
  </div>`;
}

const RANGES=["1D","SHI","1W","1M","3M","YTD","1Y","3Y","5Y"];
function pageHist(){
  const rows=state.rows,th=state.thresholds,range=state.histRange,metric=state.histMetric;
  if(!rows.length) return emptyState("Belum ada data historis","Analisis tren memerlukan minimal satu data harian.");
  const kpi=KPIS.find(k=>k.key===metric),t=th[kpi.key];
  let sliced=sliceByRange(rows,range);
  let s=sliced; if(s.length>180){const step=Math.ceil(s.length/180); s=s.filter((_,i)=>i%step===0);}
  const longRange=range==="1Y"||range==="3Y"||range==="5Y";
  const series=s.map(r=>({label:longRange?new Date(r.date).toLocaleDateString("id-ID",{month:"short",year:"2-digit"}):idDateShort(r.date),v:r[metric]}));
  const vals=sliced.map(r=>r[metric]);
  const stats={avg:avg(vals),min:Math.min(...vals),max:Math.max(...vals)};
  const trend=vals.length>1?((vals[vals.length-1]-vals[0])/(vals[0]||1))*100:0;
  const last=rows[rows.length-1];
  const benches=[
    {label:"Hari ini vs Kemarin",a:last[metric],b:rows.length>1?rows[rows.length-2][metric]:last[metric]},
    {label:"Hari ini vs Rata-rata 7 Hari",a:last[metric],b:avg(rows.slice(-8,-1).map(r=>r[metric]))},
    {label:"Hari ini vs Rata-rata 30 Hari",a:last[metric],b:avg(rows.slice(-31,-1).map(r=>r[metric]))},
  ];
  const stat=(l,v,i,pct)=>`<div class="card card-pad"><div class="kpi-name" style="margin-bottom:8px">${l}</div>
    <div class="mono" style="font-size:26px;font-weight:700;color:${pct?(v>=0?"var(--good)":"var(--crit)"):"var(--text)"}">${pct?(v>0?"+":""):""}${fmt(v,pct?2:kpi.dec)}<span class="kpi-unit">${pct?"%":kpi.unit}</span></div></div>`;
  return `
  <div class="card card-pad" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div class="seg">${KPIS.map(k=>`<button data-act="histMetric" data-v="${k.key}" class="${metric===k.key?"on":""}">${k.label}</button>`).join("")}</div>
    <div class="seg">${RANGES.map(r=>`<button data-act="histRange" data-v="${r}" class="${range===r?"on":""}">${r}</button>`).join("")}</div>
  </div>
  <div class="grid-kpi" style="grid-template-columns:repeat(4,1fr)">
    ${stat("Rata-rata",stats.avg)}${stat("Minimum",stats.min)}${stat("Maksimum",stats.max)}${stat("Trend Periode",trend,0,true)}
  </div>
  <div class="card">
    <div class="card-head"><div><div class="card-title">${kpi.label} — Historis (${range})</div><div class="card-titsub">${sliced.length} titik data · target ${fmt(t.target,kpi.dec)} ${kpi.unit}</div></div></div>
    <div class="card-pad" style="height:340px">${bigChart("hist",series,{color:"var(--brand)",dec:kpi.dec,unit:kpi.unit,h:340,target:t.target,critical:t.critical,showTarget:kpi.dir==="up"})}</div>
  </div>
  <div class="card">
    <div class="card-head"><div class="card-title">Benchmark Comparison — ${kpi.label}</div></div>
    <div class="card-pad" style="display:flex;flex-direction:column;gap:0">
      ${benches.map((b,i)=>{const diff=b.b?((b.a-b.b)/b.b)*100:0;const good=kpi.dir==="up"?diff>=0:diff<=0;
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;${i<benches.length-1?"border-bottom:1px solid var(--border)":""}">
          <div style="font-size:13px;font-weight:600">${b.label}</div>
          <div style="display:flex;align-items:center;gap:14px"><span class="mono muted" style="font-size:13px">${fmt(b.a,kpi.dec)} <span class="faint">vs</span> ${fmt(b.b,kpi.dec)}</span>
          <span class="delta ${good?"up":"down"}" style="min-width:78px;justify-content:center">${ic(good?"arrow-up-right":"arrow-down-right","sm")}${diff>0?"+":""}${r2(diff)}%</span></div></div>`;}).join("")}
    </div>
  </div>`;
}

function pageInput(){
  const role=(state.user&&state.user.role)||"Staff";
  if(!canInput(role)) return lockCard("Input data hanya dapat dilakukan oleh <b>Administrator (Krani)</b> dan <b>Staff (Asisten Proses)</b>.");
  const today=localDate();
  const grp=(g)=>`<div style="margin-top:16px"><div class="label" style="font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--brand)">${g.label}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">${g.items.map(k=>`<div>
      <label class="label" style="font-weight:600">${k.label} <span class="faint">(${k.unit})</span></label>
      <input class="input mono num-id" id="in_${k.key}" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off"></div>`).join("")}</div></div>`;
  return `<div class="grid-2" style="grid-template-columns:1.3fr 1fr">
    <div class="card">
      <div class="card-head"><div class="card-title">Form Input Manual</div><span class="tag">${ic("clipboard-list","sm")} Harian</span></div>
      <div class="card-pad">
        <div><label class="label">Tanggal</label><input class="input mono" id="in_date" type="date" value="${today}"></div>
        ${GROUPS.map(grp).join("")}
        <div class="muted" style="font-size:11.5px;margin-top:14px;line-height:1.5">${ic("lightbulb","sm")} Kolom <b>Operasional</b> wajib diisi. Mutu &amp; Losses boleh dikosongkan bila analisa lab belum keluar — perhitungan rata-rata otomatis melewati tanggal kosong.</div>
        <div id="inputErr"></div>
        <button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center" data-act="submitInput">${ic("square-plus","sm")} Simpan Data Harian</button>
      </div>
    </div>
    <div class="card" style="align-self:start">
      <div class="card-head"><div class="card-title">Upload Excel</div></div>
      <div class="card-pad" style="display:flex;flex-direction:column;gap:12px">
        <div data-act="pickFile" style="border:2px dashed var(--border2);border-radius:12px;padding:26px 16px;text-align:center;cursor:pointer;background:var(--surface2)">
          ${ic("upload","")}<div style="font-weight:700;font-size:13.5px;margin-top:6px">Pilih file Excel (.xlsx)</div>
          <div class="muted" style="font-size:12px;margin-top:3px">24 kolom: Tanggal + 6 operasional + 6 mutu + 11 losses</div>
          <input id="fileInput" type="file" accept=".xlsx,.xls" hidden>
        </div>
        <button class="btn" style="justify-content:center" data-act="downloadTemplate">${ic("download","sm")} Download Template</button>
        <div class="insight"><div class="dot" style="background:var(--warn-bg);color:var(--warn)">${ic("triangle-alert","sm")}</div>
          <div style="font-size:12px;line-height:1.5">Template berubah dari 7 → 24 kolom. <b>Template lama tidak lagi cocok</b> — unduh yang baru.</div></div>
      </div>
    </div>
    <style>@media(max-width:860px){.input-grid{grid-template-columns:1fr!important}}</style>
  </div>`;
}
function lockCard(msg){
  return `<div class="card card-pad" style="text-align:center;padding:48px">
    <div style="display:flex;justify-content:center;margin-bottom:12px">${ic("lock","")}</div>
    <div style="font-weight:700;font-size:15px">Akses terbatas</div>
    <div class="muted" style="font-size:13px;margin-top:6px">${msg} Peran Anda saat ini: <b>${(state.user&&state.user.role)||"-"}</b>.</div></div>`;
}
function validateRec(rec,skipId){
  const e=[];
  if(!rec.date) e.push("Tanggal wajib diisi.");
  else if(state.rows.some(r=>r.date===rec.date && r.id!==skipId)) e.push(`Data tanggal ${idDate(rec.date)} sudah ada (satu tanggal satu data).`);
  else if(rec.date > localDate()) e.push(`Tanggal ${idDate(rec.date)} berada di masa depan.`);
  else if(rec.date < "2015-01-01") e.push("Tanggal tidak wajar (sebelum 2015).");
  for(const k of KPIS){ const v=parseNum(rec[k.key]);     // operasional = wajib
    if(v===null) e.push(`${k.label} kosong.`);
    else if(isNaN(v)) e.push(`${k.label} bukan angka (gunakan koma atau titik, mis. 22,85).`);
    else if(v<0) e.push(`${k.label} bernilai negatif.`);
    else if(k.unit==="%" && v>100) e.push(`${k.label} melebihi 100%.`);
  }
  for(const k of [...QUAL,...LOSS]){ const v=parseNum(rec[k.key]);  // mutu & losses = opsional
    if(v===null) continue;
    if(isNaN(v)) e.push(`${k.label} bukan angka.`);
    else if(v<0) e.push(`${k.label} bernilai negatif.`);
    else if(k.unit==="%" && v>100) e.push(`${k.label} melebihi 100%.`);
  }
  return e;
}

function pageManage(){
  const role=(state.user&&state.user.role)||"Staff", canEdit=canEditRow(role), canDel=canDelete(role), th=state.thresholds;
  const years=[...new Set(state.rows.map(r=>r.date.slice(0,4)))].sort().reverse();
  const months=[["01","Jan"],["02","Feb"],["03","Mar"],["04","Apr"],["05","Mei"],["06","Jun"],["07","Jul"],["08","Agu"],["09","Sep"],["10","Okt"],["11","Nov"],["12","Des"]];
  const filtered=state.rows.slice().reverse().filter(r=>{
    if(state.myear!=="all"&&r.date.slice(0,4)!==state.myear) return false;
    if(state.mmonth!=="all"&&r.date.slice(5,7)!==state.mmonth) return false;
    if(state.mq&&!r.date.includes(state.mq)) return false; return true;
  });
  const PER=60, maxPage=Math.max(1,Math.ceil(filtered.length/PER));
  if(state.mpage>maxPage) state.mpage=maxPage;
  const pg0=(state.mpage-1)*PER;
  const page=filtered.slice(pg0,pg0+PER);
  const COLS=(GROUPS.find(g=>g.id===state.mgroup)||GROUPS[0]).items;
  return `
  <div class="card card-pad no-print" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <div style="position:relative;flex:1 1 200px;min-width:160px">
      <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--faint);display:flex">${ic("search","sm")}</span>
      <input class="input" id="searchInput" style="padding-left:34px" placeholder="Cari tanggal (YYYY-MM-DD)…" value="${esc(state.mq)}">
    </div>
    <select class="select" id="selYear" style="width:auto"><option value="all">Semua Tahun</option>${years.map(y=>`<option value="${y}" ${state.myear===y?"selected":""}>${y}</option>`).join("")}</select>
    <select class="select" id="selMonth" style="width:auto"><option value="all">Semua Bulan</option>${months.map(([v,l])=>`<option value="${v}" ${state.mmonth===v?"selected":""}>${l}</option>`).join("")}</select>
    <div class="spacer"></div>
    <div class="seg">${GROUPS.map(g=>`<button data-act="mgroup" data-v="${g.id}" class="${state.mgroup===g.id?"on":""}">${g.label}</button>`).join("")}</div>
    <button class="btn" data-act="exportPDF">${ic("file-text","sm")} Export PDF</button>
    <button class="btn" data-act="exportCSV">${ic("download","sm")} CSV</button>
    <button class="btn btn-primary" data-act="exportExcel">${ic("download","sm")} Export Excel</button>
  </div>
  <div class="card" style="overflow:hidden">
    <div class="card-head"><div class="card-title">Riwayat Data Performa Harian</div><span class="tag faint">${filtered.length.toLocaleString("id-ID")} baris · halaman ${state.mpage}/${maxPage}</span></div>
    <div style="overflow-x:auto;max-height:560px">
      <table class="table"><thead><tr><th>Tanggal</th>${COLS.map(k=>`<th class="num">${k.label}</th>`).join("")}<th class="hide-sm">Input</th>${canEdit?'<th class="no-print">Aksi</th>':""}</tr></thead>
      <tbody>${page.map(r=>`<tr>
        <td style="font-weight:600;white-space:nowrap">${idDate(r.date)}</td>
        ${COLS.map(k=>{const st=statusOf(k,r[k.key],th);return `<td class="num" style="color:${st==="crit"?"var(--crit)":st==="warn"?"var(--warn)":st==="na"?"var(--faint)":"var(--text)"};font-weight:${(st!=="good"&&st!=="na")?700:500}">${fmt(r[k.key],k.dec)}</td>`;}).join("")}
        <td class="hide-sm faint" style="font-size:12px">${esc(r.by||"")}</td>
        ${canEdit?`<td class="no-print"><div style="display:flex;gap:4px">
          <button class="btn btn-icon btn-ghost" data-act="edit" data-id="${r.id}" title="Edit">${ic("pencil","sm")}</button>
          ${canDel?`<button class="btn btn-icon btn-ghost" data-act="delete" data-id="${r.id}" title="Hapus" style="color:var(--crit)">${ic("trash-2","sm")}</button>`:""}</div></td>`:""}
      </tr>`).join("")}</tbody></table>
    </div>
    ${maxPage>1?`<div class="card-pad no-print" style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--border);flex-wrap:wrap">
      <div class="muted" style="font-size:12.5px">Menampilkan ${(pg0+1).toLocaleString("id-ID")}–${Math.min(pg0+PER,filtered.length).toLocaleString("id-ID")} dari ${filtered.length.toLocaleString("id-ID")} baris</div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn" data-act="mpage" data-v="1" ${state.mpage===1?"disabled":""}>Awal</button>
        <button class="btn" data-act="mpage" data-v="${state.mpage-1}" ${state.mpage===1?"disabled":""}>Sebelumnya</button>
        <span class="mono" style="font-size:12.5px;padding:0 8px">${state.mpage} / ${maxPage}</span>
        <button class="btn" data-act="mpage" data-v="${state.mpage+1}" ${state.mpage>=maxPage?"disabled":""}>Berikutnya</button>
        <button class="btn" data-act="mpage" data-v="${maxPage}" ${state.mpage>=maxPage?"disabled":""}>Akhir</button>
      </div></div>`:""}
  </div>`;
}

function pageSettings(){
  const role=(state.user&&state.user.role)||"Staff", canManage=canConfig(role), th=state.thresholds, tab=state.settingsTab;
  const tabs=[["threshold","Threshold","triangle-alert"],["factors","Faktor Losses","gauge"],["users","User Management","users"],["audit","Audit Log","clipboard-list"],["data","Data & Sistem","database"]];
  let body="";
  if(tab==="threshold"){
    const cell=(k,f,val)=>`<td class="num"><input class="input mono" id="th_${k.key}_${f}" ${canManage?"":"disabled"} style="width:82px;text-align:right;padding:6px 8px" type="text" inputmode="decimal" aria-label="${k.label} ${f}" value="${String(val).replace(".",",")}"></td>`;
    const tbl=(g)=>`<div class="card" style="margin-top:14px"><div class="card-head"><div><div class="card-title">${g.label}</div>
        <div class="card-titsub">${g.id==="core"?"🟢 Target · 🟡 Warning · 🔴 Critical":"Standar pabrik = batas Critical. Warning default 90% dari standar."}</div></div></div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Indikator</th><th>Satuan</th><th>Arah</th>
        <th class="num">${g.id==="qkrn"?"Batas Bawah":"🟢 Target"}</th><th class="num">${g.id==="qkrn"?"Batas Atas":"🟡 Warning"}</th><th class="num">🔴 Critical</th><th class="num">Std</th></tr></thead>
      <tbody>${g.items.map(k=>{const t=th[k.key]||{};
        return `<tr><td style="font-weight:700">${k.label}</td><td class="muted">${k.unit}</td>
          <td><span class="tag">${k.dir==="up"?"↑ lebih baik":k.dir==="band"?"↔ pita":"↓ lebih baik"}</span></td>
          ${k.dir==="band"
            ? cell(k,"min",t.min)+cell(k,"max",t.max)+`<td class="num faint" style="font-size:11px">&lt;${t.critLo} / &gt;${t.critHi}</td>`
            : cell(k,"target",t.target)+cell(k,"warning",t.warning)+cell(k,"critical",t.critical)}
          <td class="num faint" style="font-size:11.5px">${k.std!=null?k.std:"—"}</td></tr>`;}).join("")}</tbody></table></div></div>`;
    body=GROUPS.map(tbl).join("")+
      (canManage?`<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-primary" data-act="saveThreshold">${ic("circle-check","sm")} Simpan Threshold</button></div>`
                :`<div class="card card-pad muted" style="font-size:12.5px;margin-top:14px">${ic("lock","sm")} Hanya Administrator yang dapat mengubah threshold.</div>`);
  } else if(tab==="factors"){
    const f=state.lossFactors||{};
    const rowsF=(items,title)=>`<div class="card" style="margin-top:14px"><div class="card-head"><div class="card-title">${title}</div></div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Item Losses</th><th class="num">Std (%)</th><th class="num">Faktor → %TBS</th></tr></thead>
      <tbody>${items.map(k=>`<tr><td style="font-weight:600">${k.label}</td><td class="num muted">${k.std}</td>
        <td class="num"><input class="input mono" id="lf_${k.key}" ${canManage?"":"disabled"} style="width:110px;text-align:right;padding:6px 8px" type="text" inputmode="decimal" placeholder="belum diisi" aria-label="Faktor ${k.label}" value="${f[k.key]==null?"":String(f[k.key]).replace(".",",")}"></td></tr>`).join("")}</tbody></table></div></div>`;
    body=`<div class="card card-pad"><div class="insight"><div class="dot" style="background:var(--warn-bg);color:var(--warn)">${ic("triangle-alert","sm")}</div>
      <div style="font-size:12.8px;line-height:1.55">Nilai losses tiap item diukur terhadap <b>penyebut yang berbeda</b> (sampel masing-masing), sehingga <b>tidak boleh dijumlahkan langsung</b> — hasilnya akan jauh lebih besar dari losses sebenarnya.
      Isi faktor konversi tiap item agar dapat diakumulasi menjadi <b>% terhadap TBS</b>. Rumus: <span class="mono">Total = Σ (nilai item × faktor item)</span>.</div></div></div>
      ${rowsF(LOSS_CPO,"Faktor Losses CPO")}${rowsF(LOSS_KRN,"Faktor Losses Kernel")}
      ${canManage?`<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-primary" data-act="saveFactors">${ic("circle-check","sm")} Simpan Faktor</button></div>`:""}`;
  } else if(tab==="users"){
    body=`<div class="card"><div class="card-head"><div class="card-title">Manajemen Pengguna</div><span class="tag faint">${USERS.length} pengguna</span></div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Hak Akses</th></tr></thead>
      <tbody>${USERS.map(u=>`<tr><td style="font-weight:600">${u.name}</td><td class="mono muted">${u.username}</td>
        <td><span class="status-pill ${u.role==="Administrator"?"s-good":u.role==="Management"?"s-warn":""}" ${u.role==="Staff"?'style="background:var(--surface2);color:var(--muted)"':""}>${u.role}</span></td>
        <td class="muted" style="font-size:12px">${u.role==="Administrator"?"Input, Edit, Hapus, Upload, Kelola User, Threshold & Faktor":u.role==="Staff"?"Input, Edit, Upload, Lihat, Ekspor (tanpa hapus & pengaturan)":"Lihat, Analisis, Ekspor (hanya baca)"}</td></tr>`).join("")}</tbody></table></div>
      ${!canManage?`<div class="card-pad muted" style="font-size:12.5px">${ic("lock","sm")} Hanya Administrator yang dapat menambah/mengubah pengguna.</div>`:""}</div>`;
  } else if(tab==="audit"){
    body=`<div class="card"><div class="card-head"><div><div class="card-title">Audit Log</div><div class="card-titsub">Pencatatan seluruh perubahan data</div></div></div>
      <div style="overflow-x:auto;max-height:480px"><table class="table"><thead><tr><th>Waktu (WIB)</th><th>Pengguna</th><th>Aktivitas</th><th>Detail</th></tr></thead>
      <tbody>${state.audit.length===0?'<tr><td colspan="4" class="muted" style="text-align:center;padding:28px">Belum ada aktivitas.</td></tr>':state.audit.map(a=>`<tr>
        <td class="mono" style="font-size:12px;white-space:nowrap">${esc(a.time)}</td><td style="font-weight:600">${esc(a.user)}</td><td><span class="tag">${esc(a.action)}</span></td><td class="muted" style="font-size:12.5px">${esc(a.detail)}</td></tr>`).join("")}</tbody></table></div></div>`;
  } else {
    body=`<div class="card"><div class="card-head"><div class="card-title">Data & Sistem</div></div>
      <div class="card-pad" style="display:flex;flex-direction:column;gap:14px">
        <div class="insight"><div class="dot" style="background:var(--good-bg);color:var(--good)">${ic("database","sm")}</div>
        <div style="font-size:12.8px;line-height:1.5"><b>Penyimpanan lokal (localStorage).</b> Data input, edit, threshold, dan audit log tersimpan di browser perangkat ini dan bertahan setelah refresh. Ini <b>bukan</b> database bersama — tiap perangkat menyimpan datanya sendiri.</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" data-act="exportExcel">${ic("download","sm")} Backup seluruh data ke Excel</button>
          <button class="btn" data-act="resetData" style="color:var(--crit)">${ic("trash-2","sm")} Reset ke data contoh</button>
        </div>
        <div class="muted" style="font-size:12px">Total ${state.rows.length.toLocaleString("id-ID")} baris data tersimpan · rentang ${idDate(state.rows[0].date)} – ${idDate(state.rows[state.rows.length-1].date)}.</div>
      </div></div>`;
  }
  return `<div class="seg no-print">${tabs.map(([k,l,i])=>`<button data-act="settingsTab" data-v="${k}" class="${tab===k?"on":""}">${ic(i,"sm")}${l}</button>`).join("")}</div>${body}`;
}

/* ----------------------------- edit modal --------------------------------- */
function renderModal(){
  const host=document.getElementById("modalHost"); if(!host) return;
  if(!state.editing){ host.innerHTML=""; return; }
  const r=state.editing;
  host.innerHTML=`<div class="scrim show" id="modalScrim" style="display:grid;place-items:center;padding:16px">
    <div class="card" id="modalCard" style="width:min(520px,100%);max-height:90vh;overflow:auto">
      <div class="card-head"><div class="card-title">Edit Data — ${idDate(r.date)}</div><button class="btn btn-icon btn-ghost" data-act="closeModal">${ic("x","sm")}</button></div>
      <div class="card-pad"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${ALLM.map(k=>`<div><label class="label" style="font-size:10.5px">${k.label} <span class="faint">(${k.unit})</span></label><input class="input mono num-id" id="ed_${k.key}" type="text" inputmode="decimal" value="${r[k.key]==null?"":String(r[k.key]).replace(".",",")}" autocomplete="off"></div>`).join("")}
      </div><div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end">
        <button class="btn" data-act="closeModal">Batal</button>
        <button class="btn btn-primary" data-act="saveEdit">Simpan Perubahan</button></div></div></div></div>`;
  document.getElementById("modalScrim").addEventListener("click",e=>{ if(e.target.id==="modalScrim"){ state.editing=null; renderModal(); }});
}

/* ===================== HALAMAN MUTU & LOSSES ===================== */
const PERIODS=[["1D","Hari ini"],["SHI","SHI"],["1W","1 Minggu"],["1M","1 Bulan"],["3M","3 Bulan"],["YTD","YTD"]];
function stdText(k){
  if(k.dir==="band") return `Standar ${k.std}%`;
  const s=k.std!=null?k.std:k.critical;
  return `Standar maks ${fmt(s,k.dec)}${k.unit==="%"?"%":" "+k.unit}`;
}
function metricCard(k,rows,range,th){
  const v = range==="1D" ? (rows.length?rows[rows.length-1][k.key]:null) : periodAvg(rows,k.key,range);
  const st=ST[statusOf(k,v,th)];
  const spark=sliceByRange(rows,"1M").map(r=>r[k.key]).filter(x=>x!=null&&!isNaN(x));
  return `<div class="kpi">
    <div class="kpi-bar" style="background:${st.col}"></div>
    <div class="kpi-top"><div class="kpi-ico">${ic(k.icon)}</div>
      <span class="status-pill ${st.cls}" ${st.cls?"":'style="background:var(--surface2);color:var(--muted)"'}><span class="led" style="background:${st.col};color:${st.col}"></span>${st.txt}</span></div>
    <div class="kpi-name" style="font-size:11.5px">${k.label}</div>
    <div style="display:flex;align-items:flex-end;margin-top:6px"><span class="kpi-val mono" style="font-size:29px" data-cv="${v==null?"":v}" data-cd="${k.dec}">${fmt(v,k.dec)}</span><span class="kpi-unit">${k.unit}</span></div>
    <div class="kpi-foot"><span class="faint" style="font-size:11px">${stdText(k)}</span>${sparkline(spark.slice(-30),st.col)}</div>
  </div>`;
}
function periodBar(act,cur){
  return `<div class="seg">${PERIODS.map(([v,l])=>`<button data-act="${act}" data-v="${v}" class="${cur===v?"on":""}">${l}</button>`).join("")}</div>`;
}
function groupBlock(title,items,rows,range,th,note){
  return `<div class="card"><div class="card-head"><div><div class="card-title">${title}</div>${note?`<div class="card-titsub">${note}</div>`:""}</div></div>
    <div class="card-pad"><div class="grid-kpi">${items.map(k=>metricCard(k,rows,range,th)).join("")}</div></div></div>`;
}

/* Batang perbandingan terhadap standar: menormalkan indikator yang satuannya
   sangat berbeda (0,025% vs 15%) menjadi "% dari standar" agar bisa disandingkan. */
function stdOf(k,th){
  const t=(th&&th[k.key])||k;
  return k.dir==="band" ? t.max : (k.std!=null?k.std:t.critical);
}
function barVsStd(items,rows,range,th,title,note){
  const bars=items.map(k=>{
    const v = range==="1D" ? (rows.length?rows[rows.length-1][k.key]:null) : periodAvg(rows,k.key,range);
    const std=stdOf(k,th);
    const pct = (v==null||!std)? null : (v/std)*100;
    const st=ST[statusOf(k,v,th)];
    return {k,v,std,pct,st};
  });
  const maxPct=Math.max(120,...bars.map(b=>b.pct||0));
  const scale=p=>Math.min(100,(p/maxPct)*100);
  const at100=scale(100);
  return `<div class="card"><div class="card-head"><div><div class="card-title">${title}</div>
      ${note?`<div class="card-titsub">${note}</div>`:""}</div>
      <span class="tag">${ic("gauge","sm")} 100% = batas standar</span></div>
    <div class="card-pad">
      <div class="bars">
        <div class="bar-scale"><span style="left:${at100}%"></span></div>
        ${bars.map(b=>`<div class="bar-row">
          <div class="bar-lbl" title="${esc(b.k.label)}">${esc(b.k.label)}</div>
          <div class="bar-track">
            <div class="bar-limit" style="left:${at100}%"></div>
            <div class="bar-fill" data-w="${b.pct==null?0:scale(b.pct).toFixed(1)}" style="width:${b.pct==null?0:scale(b.pct)}%;background:${b.st.col}"></div>
          </div>
          <div class="bar-val mono" style="color:${b.st.col}">${b.pct==null?"—":fmt(b.pct,0)+"%"}</div>
          <div class="bar-abs mono faint">${b.v==null?"—":fmt(b.v,b.k.dec)} / ${fmt(b.std,b.k.dec)}</div>
        </div>`).join("")}
      </div>
      <div class="muted" style="font-size:11.5px;margin-top:12px;display:flex;align-items:center;gap:6px">
        ${ic("lightbulb","sm")} Garis merah = 100% standar. Batang melewatinya berarti di luar standar.</div>
    </div></div>`;
}
function trendCard(items,sel,rows,range,th,act,title){
  const k=items.find(x=>x.key===sel)||items[0];
  const t=(th&&th[k.key])||k;
  let sl=sliceByRange(rows,range==="1D"?"1M":range);
  const pts=sl.map(r=>({label:idDateShort(r.date),v:r[k.key]})).filter(p=>p.v!=null&&!isNaN(p.v));
  let s=pts; if(s.length>150){const st=Math.ceil(s.length/150); s=s.filter((_,i)=>i%st===0);}
  const refs = k.dir==="band"
    ? [{v:t.min,color:"var(--good)",label:"min "+t.min},{v:t.max,color:"var(--crit)",label:"maks "+t.max}]
    : [{v:stdOf(k,th),color:"var(--crit)",label:"std "+fmt(stdOf(k,th),k.dec)}];
  return `<div class="card"><div class="card-head" style="flex-wrap:wrap">
      <div><div class="card-title">${title}</div><div class="card-titsub">${k.label} · ${s.length} titik data · ${stdText(k)}</div></div>
      <div class="seg">${items.map(x=>`<button data-act="${act}" data-v="${x.key}" class="${x.key===k.key?"on":""}">${x.label.length>18?x.label.slice(0,16)+"…":x.label}</button>`).join("")}</div></div>
    <div class="card-pad" style="height:320px">${s.length<2?`<div class="muted" style="display:grid;place-items:center;height:100%;font-size:13px">Belum cukup data pada periode ini.</div>`:bigChart(act,s,{color:"var(--brand)",dec:k.dec,unit:k.unit,h:320,refs})}</div></div>`;
}
function pageQuality(){
  const rows=state.rows,th=state.thresholds,rg=state.qPeriod;
  if(!rows.length) return emptyState("Belum ada data mutu","Masukkan data harian beserta hasil analisa lab untuk melihat mutu CPO & Kernel.");
  const anchor=rows.length?rows[rows.length-1].date:"";
  return `<div class="card card-pad" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div><div style="font-weight:700;font-size:14px">Periode analisa</div>
        <div class="muted" style="font-size:12px;margin-top:2px">${rg==="SHI"?`SHI = 1 ${new Date(anchor).toLocaleDateString("id-ID",{month:"long",year:"numeric"})} s/d ${idDate(anchor)}`:"Nilai = rata-rata periode terpilih"}</div></div>
      ${periodBar("qPeriod",rg)}</div>
    ${groupBlock("Mutu CPO",QUAL_CPO,rows,rg,th,"FFA, Moisture, Dirt — makin kecil makin baik")}
    ${groupBlock("Mutu Kernel",QUAL_KRN,rows,rg,th,"Moisture berupa pita 5–6%: di bawah 5% (over-drying) juga dihitung menyimpang")}
    ${trendCard(QUAL,state.qMetric,rows,rg,th,"qMetric","Tren Mutu")}
    ${barVsStd(QUAL,rows,rg,th,"Mutu terhadap Standar","Semua indikator mutu dinormalkan ke % dari standar")}`;
}
function pageLosses(){
  const rows=state.rows,th=state.thresholds,rg=state.lPeriod;
  if(!rows.length) return emptyState("Belum ada data losses","Masukkan data harian beserta hasil analisa losses untuk melihat perbandingan terhadap standar.");
  const last=rows[rows.length-1];
  const tC=totalLoss(last,LOSS_CPO), tK=totalLoss(last,LOSS_KRN);
  const notReady=`<div class="card card-pad"><div class="insight" style="border-color:var(--warn)"><div class="dot" style="background:var(--warn-bg);color:var(--warn)">${ic("triangle-alert","sm")}</div>
    <div style="font-size:12.8px;line-height:1.5"><b>Total losses belum dapat dihitung.</b> Tiap item losses punya penyebut berbeda, sehingga <b>tidak boleh dijumlahkan langsung</b>. Isi faktor konversi ke %TBS di <b>Settings → Faktor Losses</b> agar total muncul.</div></div></div>`;
  const totalCard=(label,val)=>`<div class="card card-pad"><div class="kpi-name">${label}</div>
    <div class="mono" style="font-size:28px;font-weight:700;margin-top:6px">${val==null?'<span class="faint" style="font-size:15px">belum dikonfigurasi</span>':fmt(val,3)+'<span class="kpi-unit">% thd TBS</span>'}</div></div>`;
  return `<div class="card card-pad" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div><div style="font-weight:700;font-size:14px">Periode analisa</div><div class="muted" style="font-size:12px;margin-top:2px">Standar mengacu Standard Losses PKS</div></div>
      ${periodBar("lPeriod",rg)}</div>
    ${(tC==null||tK==null)?notReady:""}
    <div class="grid-kpi" style="grid-template-columns:repeat(2,1fr)">${totalCard("Total Losses CPO",tC)}${totalCard("Total Losses Kernel",tK)}</div>
    ${groupBlock("Losses CPO (OWB)",LOSS_CPO,rows,rg,th)}
    ${groupBlock("Losses Kernel",LOSS_KRN,rows,rg,th)}
    ${trendCard(LOSS,state.lMetric,rows,rg,th,"lMetric","Tren Losses")}
    ${barVsStd(LOSS,rows,rg,th,"Losses terhadap Standard Losses","Menunjukkan item mana yang paling mendekati / melewati batas")}`;
}
function groupStatus(items,row,th){
  let c=0,w=0; items.forEach(k=>{const s=statusOf(k,row[k.key],th); if(s==="crit")c++; else if(s==="warn")w++;});
  return {c,w,st:c?"crit":w?"warn":"good"};
}

/* ------------------------------- TV mode ---------------------------------- */
let tvClockTimer=null;
function renderTV(){
  const rows=state.rows,th=state.thresholds;
  if(!rows.length){ state.tv=false; toast("Belum ada data untuk ditampilkan di TV Mode","warn"); render(); return; }
  const last=rows[rows.length-1],prev=rows[rows.length-2]||rows[rows.length-1];
  const app=document.getElementById("app"); app.setAttribute("data-theme","dark");
  app.innerHTML=`<div class="tv">
    <div class="tv-head">
      <div style="display:flex;align-items:center;gap:16px"><div class="brand-logo" style="width:60px;height:60px;border-radius:14px;padding:5px">${LOGO?`<img src="${LOGO}" alt="AAL">`:ic("factory","")}</div>
      <div><div class="tv-title">SAWIT · PKS SARI ADITYA LOKA 2</div><div style="font-size:18px;color:#9ec9b4;font-weight:600">Monitoring Operasional · ${idDate(last.date)}</div></div></div>
      <div style="text-align:right"><div class="tv-clock" id="tvClock"></div>
      <button class="btn" style="margin-top:8px;background:rgba(255,255,255,.1);color:#eafff3;border:1px solid rgba(255,255,255,.2)" data-act="exitTV">${ic("x","sm")} Keluar TV Mode (Esc)</button></div>
    </div>
    <div class="tv-grid">${KPIS.map(k=>{const v=last[k.key],pv=prev[k.key],st=ST[statusOf(k,v,th)];
      const delta=pv?((v-pv)/pv)*100:0,better=k.dir==="up"?delta>=0:delta<=0;
      return `<div class="tv-card"><div class="tvbar" style="background:${st.col}"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="tv-name">${k.label}</div><span style="width:18px;height:18px;border-radius:50%;background:${st.col};box-shadow:0 0 18px ${st.col}"></span></div>
        <div><div class="tv-val" style="color:${st.col}">${fmt(v,k.dec)}</div><div style="font-size:20px;color:#9ec9b4;font-weight:700;margin-top:4px">${k.unit}</div></div>
        <div class="tv-foot"><span style="color:${st.col}">${st.txt}</span><span style="color:${better?"#34d27e":"#f0564a"};display:inline-flex;align-items:center;gap:4px">${ic(better?"arrow-up-right":"arrow-down-right","")}${delta>0?"+":""}${r1(delta)}%</span></div></div>`;}).join("")}</div>
  </div>`;
  const clk=document.getElementById("tvClock"); const upd=()=>{ if(clk) clk.textContent=new Date().toLocaleTimeString("id-ID")+" WIB"; };
  upd(); clearInterval(tvClockTimer);
  let tick=0;
  tvClockTimer=setInterval(()=>{ upd();
    // Layar pabrik menyala seharian: muat ulang data tiap 60 dtk agar tidak basi.
    if(++tick%60===0 && state.tv){ loadState(); renderTV(); }
  },1000);
}

/* ------------------------------- login ------------------------------------ */
/* ---- Kebun sawit hologram: pohon digambar prosedural, base di titik (0,0) ---- */
function palmTree(o){
  // Semua warna ditulis sebagai ATRIBUT SVG (bukan CSS) supaya tak bisa gagal diwarnai.
  const H=o.h, R=o.R, N=o.n, lean=o.lean||0, dim=o.dim||1;
  const ox=lean, oy=-H;
  const wB=o.wB||13, wT=o.wT||8;
  const bez=(p0,p1,p2,p3,t)=>{const u=1-t;return[
    u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
    u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];};
  const A=[0,0],B=[lean*0.25,-H*0.4],C=[lean*0.7,-H*0.75],D=[ox,oy];
  let left="",right="",rungs="";
  const pts=[]; for(let i=0;i<=10;i++){const t=i/10;pts.push({p:bez(A,B,C,D,t),w:(wB+(wT-wB)*t)/2});}
  pts.forEach((s,i)=>{ left += (i?" L":"M")+(s.p[0]-s.w).toFixed(1)+","+s.p[1].toFixed(1); });
  [...pts].reverse().forEach((s,i)=>{ right += (i?" L":"M")+(s.p[0]+s.w).toFixed(1)+","+s.p[1].toFixed(1); });
  for(let i=1;i<pts.length-1;i++){ const s=pts[i];
    rungs+=`M${(s.p[0]-s.w*0.82).toFixed(1)},${s.p[1].toFixed(1)} L${(s.p[0]+s.w*0.82).toFixed(1)},${s.p[1].toFixed(1)}`;
    rungs+=`M${(s.p[0]-s.w*0.5).toFixed(1)},${(s.p[1]-3).toFixed(1)} L${s.p[0].toFixed(1)},${(s.p[1]+2).toFixed(1)} L${(s.p[0]+s.w*0.5).toFixed(1)},${(s.p[1]-3).toFixed(1)}`; }
  let out=`<path d="${left} ${right}" fill="none" stroke="#a6f78a" stroke-width="2" stroke-linejoin="round" opacity="${(0.95*dim).toFixed(2)}"/>`
        + `<path d="${rungs}" fill="none" stroke="#bdf7a6" stroke-width="1.1" stroke-linecap="round" opacity="${(0.5*dim).toFixed(2)}"/>`;

  for(let i=0;i<N;i++){
    const a=(-176 + i*(172/(N-1)))*Math.PI/180;
    const ca=Math.cos(a), sa=Math.sin(a);
    const L=R*(0.78+0.28*Math.abs(sa))*(o.jit?(0.92+((i*37)%13)/60):1);
    const drop=0.52*L*Math.pow(1-Math.abs(sa),1.25)+9;
    const T=[ox+L*ca, oy+L*sa+drop];
    const c1=[ox+0.30*L*ca, oy+0.30*L*sa-7];
    const c2=[ox+0.74*L*ca, oy+0.74*L*sa-5];
    let leaf="";
    const steps=o.leaflets||13;
    for(let k=1;k<=steps;k++){
      const t=0.10+0.88*(k/steps);
      const P=bez([ox,oy],c1,c2,T,t), P2=bez([ox,oy],c1,c2,T,Math.min(1,t+0.02));
      let tx=P2[0]-P[0], ty=P2[1]-P[1];
      const m=Math.hypot(tx,ty)||1; tx/=m; ty/=m;
      const px=-ty, py=tx;
      const len=(o.lf||24)*(0.32+0.68*Math.sin(Math.PI*Math.min(1,t*1.02)));
      const s1x=px*0.88-tx*0.46, s1y=py*0.88-ty*0.46;
      const s2x=-px*0.88-tx*0.46, s2y=-py*0.88-ty*0.46;
      const n1=Math.hypot(s1x,s1y)||1, n2=Math.hypot(s2x,s2y)||1;
      leaf+=`M${P[0].toFixed(1)},${P[1].toFixed(1)} L${(P[0]+s1x/n1*len).toFixed(1)},${(P[1]+s1y/n1*len).toFixed(1)}`;
      leaf+=`M${P[0].toFixed(1)},${P[1].toFixed(1)} L${(P[0]+s2x/n2*len).toFixed(1)},${(P[1]+s2y/n2*len).toFixed(1)}`;
    }
    out+=`<path d="${leaf}" fill="none" stroke="#9df58a" stroke-width="0.9" stroke-linecap="round" opacity="${(0.62*dim).toFixed(2)}"/>`;
    out+=`<path d="M${ox.toFixed(1)},${oy.toFixed(1)} C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${T[0].toFixed(1)},${T[1].toFixed(1)}" fill="none" stroke="#e2ffd4" stroke-width="1.5" stroke-linecap="round" opacity="${(0.92*dim).toFixed(2)}"/>`;
  }
  if(o.fruit!==false){
    const bunch=(bx,by,s)=>{ let d=`<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${(12*s).toFixed(1)}" ry="${(10*s).toFixed(1)}" fill="rgba(240,169,58,0.18)" stroke="#ffb648" stroke-width="1.6" opacity="${(0.9*dim).toFixed(2)}"/>`;
      for(let r=0;r<4;r++) for(let c=0;c<4;c++){
        const dx=(c-1.5)*4.4*s+(r%2?2.2*s:0), dy=(r-1.5)*4.0*s;
        if(Math.hypot(dx/1.15,dy)>10*s) continue;
        d+=`<circle cx="${(bx+dx).toFixed(1)}" cy="${(by+dy).toFixed(1)}" r="${(1.9*s).toFixed(1)}" fill="#ffc061" opacity="${(0.95*dim).toFixed(2)}"/>`; }
      return d; };
    out+=bunch(ox-16,oy+17,1.25)+bunch(ox+17,oy+20,1.1);
  }
  return out;
}
function groveSVG(){
  // Pohon ditulis LANGSUNG (inline) — tanpa <use>, tanpa <defs>, tanpa <mask>.
  const V={A:{h:150,R:104,n:13,lean:-4,lf:25,leaflets:13},
           B:{h:126,R:92, n:11,lean:6, lf:22,leaflets:11,jit:1},
           C:{h:170,R:112,n:15,lean:-8,lf:26,leaflets:14,jit:1}};
  const back =[[70,'B',.62],[210,'A',.58],[350,'C',.60],[500,'B',.64],[650,'A',.57],[800,'C',.62],[950,'B',.59],[1100,'A',.63],[1180,'C',.58]];
  const front=[[10,'C',.98],[165,'A',.9],[330,'B',1.02],[470,'C',.94],[620,'A',1.0],[770,'B',.92],[920,'C',1.0],[1075,'A',.95],[1195,'B',.9]];
  const row=(arr,y,opt)=>arr.map(([x,v,s])=>
    `<g transform="translate(${x},${y}) scale(${s})">${palmTree({...V[v],...opt})}</g>`).join("");
  let ground="";
  for(let i=0;i<26;i++){ const x=(i*47)%1200, w=26+((i*13)%40), y=452+((i*7)%10);
    ground+=`<line x1="${x}" y1="${y}" x2="${x+w}" y2="${y}" stroke="#9df58a" stroke-width="1.2" stroke-linecap="round" opacity="0.28"/>`; }
  return `<div class="grove-glow" aria-hidden="true"></div>
  <div class="grove" id="grove" aria-hidden="true">
    <svg viewBox="0 0 1200 480" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
      <g>${row(back,412,{dim:0.45,leaflets:7,fruit:false})}</g>
      <g>${row(front,474,{})}</g>
      <g>${ground}</g>
    </svg>
  </div>`;
}
function renderLogin(){
  const app=document.getElementById("app");
  app.setAttribute("data-theme",state.theme);
  app.style.cssText="";
  app.innerHTML=`<div class="login-wrap">
    <section class="login-stage">
      <div class="stage-aurora a1"></div><div class="stage-aurora a2"></div><div class="stage-aurora a3"></div>
      <div class="stage-grid"></div>
      ${groveSVG()}
      <div class="stage-inner">
        <div class="logo-plate"><img src="${LOGO}" alt="Astra Agro Lestari"></div>
        <h1 class="sawit-mark">SAWIT</h1>
        <div class="sawit-rule"></div>
        <div class="sawit-sub">SAL Web-based Integrated Tracking</div>
        <div class="sawit-unit">PT Sari Aditya Loka 2</div>
      </div>
    </section>

    <section class="login-side">
      <button class="btn btn-icon btn-ghost theme-fab" data-act="theme" title="Ganti tema">${ic(state.theme==="dark"?"sun":"moon","sm")}</button>
      <div class="login-card">
        <div class="login-h">Masuk</div>

        <div class="field">
          <div class="field-wrap">
            <span class="lead">${ic("user")}</span>
            <input class="input" id="lg_user" type="text" autocomplete="username" placeholder="Username" spellcheck="false" aria-label="Username">
          </div>
        </div>

        <div class="field">
          <div class="field-wrap">
            <span class="lead">${ic("lock")}</span>
            <input class="input has-eye" id="lg_pass" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">
            <button class="peek" id="peekBtn" type="button" data-act="peek" title="Lihat password" aria-label="Lihat password">${ic("eye","sm")}</button>
          </div>
          <div class="caps" id="capsHint" style="display:none">${ic("triangle-alert","sm")} Caps Lock aktif</div>
        </div>

        <div id="loginErr"></div>
        <button class="btn btn-primary login-btn" id="loginBtn" data-act="doLogin">Masuk</button>

        <button class="demo-toggle" data-act="demoToggle">${state.showDemo?"Sembunyikan akun demo":"Akun demo"}</button>
        <div class="demo-box" ${state.showDemo?"":'style="display:none"'}>
          ${USERS.map(u=>`<button class="demo-row" data-act="fill" data-user="${u.username}">
            <span class="demo-ava" style="background:${u.color}">${u.name[0]}</span>
            <span style="flex:1;min-width:0">
              <span style="display:block;font-weight:600;font-size:12.5px">${u.role}</span>
              <span class="mono faint" style="display:block;font-size:11px">${u.username} · ${u.pass}</span>
            </span>
          </button>`).join("")}
        </div>

        <div class="login-note">${ic("shield-alert","sm")}<span>Prototipe — password diperiksa di browser, belum aman untuk data sungguhan.</span></div>
      </div>
    </section>
  </div>`;
  // Jaring pengaman lintas-browser: pastikan kebun benar-benar punya tinggi.
  requestAnimationFrame(()=>{
    const gv=document.getElementById("grove");
    if(gv && gv.offsetHeight < 40){ gv.style.height=(gv.offsetWidth*0.4)+"px"; gv.style.paddingBottom="0"; }
  });
  const pass=document.getElementById("lg_pass"), user=document.getElementById("lg_user"), caps=document.getElementById("capsHint");
  const onKey=e=>{ if(caps) caps.style.display=e.getModifierState&&e.getModifierState("CapsLock")?"flex":"none"; };
  [user,pass].forEach(el=>{ el.addEventListener("keyup",onKey); el.addEventListener("keydown",e=>{ onKey(e); if(e.key==="Enter") submitLogin(); }); });
  user.focus();
}
function togglePeek(){
  const p=document.getElementById("lg_pass"), b=document.getElementById("peekBtn");
  if(!p||!b) return;
  const show=p.type==="password";
  p.type=show?"text":"password";
  b.innerHTML=ic(show?"eye-off":"eye","sm");
  b.title=show?"Sembunyikan password":"Lihat password";
  p.focus();
}
function submitLogin(){
  const u=document.getElementById("lg_user").value.trim().toLowerCase();
  const p=document.getElementById("lg_pass").value;
  const box=document.getElementById("loginErr");
  const showErr=m=>{ box.innerHTML=`<div class="login-err">${ic("circle-alert","sm")}<span>${esc(m)}</span></div>`; };
  if(!u||!p){ showErr("Username dan password wajib diisi."); return; }
  const found=USERS.find(x=>x.username===u && x.pass===p);
  if(!found){ showErr("Username atau password salah."); const pw=document.getElementById("lg_pass"); pw.value=""; pw.focus(); return; }
  const btn=document.getElementById("loginBtn");
  btn.disabled=true; btn.innerHTML=`<span class="spinner"></span> Memverifikasi…`;
  const enter=()=>{
    state.user={name:found.name,username:found.username,role:found.role};
    state.page="exec"; state._entering=true; touchActivity(); persist();
    addAudit("Login",`${found.name} masuk sebagai ${found.role}`);
    render();
    setTimeout(()=>toast(`Selamat datang, ${found.name.split(" ")[0]}`,"good"),420);
  };
  if(noMotion()){ setTimeout(enter,300); return; }
  setTimeout(()=>{
    // 1) halaman login memudar & sedikit mengabur
    const wrap=document.querySelector(".login-wrap");
    if(wrap) wrap.classList.add("login-leave");
    setTimeout(()=>{
      // 2) tirai hijau menutup layar
      const veil=document.createElement("div");
      veil.className="veil"; document.body.appendChild(veil);
      // 3) tunggu tirai benar-benar tergambar, baru render dashboard di baliknya
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        enter();
        // 4) render selesai → tirai memudar, menyingkap dashboard
        requestAnimationFrame(()=>{
          veil.classList.add("veil-fade");
          setTimeout(()=>veil.remove(),480);
        });
      }));
    },230);
  },260);
}


/* ==================== MESIN INTERAKSI ====================
   Prinsip: animasi hanya dipicu saat ada perubahan nyata, durasi pendek,
   dan seluruhnya dimatikan bila pengguna memilih "reduce motion". */
const noMotion=()=>window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Angka menghitung naik — hanya saat berpindah halaman, agar tidak mengganggu
   ketika pengguna sekadar mengganti periode. */
function countUp(){
  if(noMotion()) return;
  document.querySelectorAll("[data-cv]").forEach(el=>{
    const to=parseFloat(el.getAttribute("data-cv")), dec=+el.getAttribute("data-cd")||0;
    if(isNaN(to)) return;
    const dur=620, t0=performance.now();
    const step=(now)=>{
      const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=fmt(to*e,dec);
      if(p<1) requestAnimationFrame(step); else el.textContent=fmt(to,dec);
    };
    requestAnimationFrame(step);
  });
}
/* Garis grafik tergambar dari kiri ke kanan */
function drawCharts(){
  if(noMotion()) return;
  document.querySelectorAll(".chart-wrap svg polyline:not(.chart-cross)").forEach(pl=>{
    let len=0; try{ len=pl.getTotalLength(); }catch(e){ return; }
    if(!len) return;
    pl.style.setProperty("--len",len);
    pl.classList.add("chart-draw");
  });
}
/* Batang tumbuh dari nol */
function growBars(){
  const bars=document.querySelectorAll(".bar-fill[data-w]");
  if(!bars.length) return;
  if(noMotion()){ bars.forEach(b=>b.style.width=b.getAttribute("data-w")+"%"); return; }
  // Matikan transisi, set ke nol, paksa reflow agar keadaan awal benar-benar
  // tercatat browser — tanpa ini transisi ditimpa dan batang langsung penuh.
  bars.forEach(b=>{ b.style.transition="none"; b.style.width="0%"; });
  void document.body.offsetHeight;
  requestAnimationFrame(()=>{
    bars.forEach((b,i)=>{ b.style.transition=`width .7s cubic-bezier(.22,.9,.3,1) ${(i*0.035).toFixed(2)}s`;
      b.style.width=b.getAttribute("data-w")+"%"; });
  });
}
/* Riak sentuh */
document.addEventListener("pointerdown",e=>{
  if(noMotion()) return;
  const t=e.target.closest(".btn,.nav-item,.seg button,.demo-row");
  if(!t) return;
  if(t.closest(".sidebar.collapsed") && window.innerWidth>860) return;  // rail sempit: tooltip butuh overflow terbuka
  const r=t.getBoundingClientRect(), d=Math.max(r.width,r.height);
  const s=document.createElement("span");
  s.className="rip";
  s.style.width=s.style.height=d+"px";
  s.style.left=(e.clientX-r.left-d/2)+"px";
  s.style.top=(e.clientY-r.top-d/2)+"px";
  t.appendChild(s);
  setTimeout(()=>s.remove(),560);
},{passive:true});
/* Tombol kembali ke atas */
function initToTop(){
  let el=document.getElementById("toTop");
  if(!el){
    el=document.createElement("button");
    el.id="toTop"; el.className="to-top no-print"; el.title="Kembali ke atas";
    el.innerHTML=ic("arrow-up-right","sm");
    el.style.transform="none";
    el.onclick=()=>window.scrollTo({top:0,behavior:noMotion()?"auto":"smooth"});
    document.body.appendChild(el);
  }
  const onScroll=()=>{ el.classList.toggle("show", window.scrollY>320); };
  window.removeEventListener("scroll",window.__tt); window.__tt=onScroll;
  window.addEventListener("scroll",onScroll,{passive:true}); onScroll();
}

/* ------------------------------- shell ------------------------------------ */
const NAV=[
  {key:"exec",label:"Dashboard",icon:"layout-dashboard"},
  {key:"quality",label:"Quality",icon:"shield-check"},
  {key:"losses",label:"Losses",icon:"arrow-down-right"},
  {key:"hist",label:"Historical Analytics",icon:"trending-up"},
  {key:"input",label:"Data Input",icon:"square-plus",admin:true},
  {key:"manage",label:"Data Management",icon:"database"},
  {key:"settings",label:"Settings",icon:"settings"},
];
const META={
  exec:["Executive Summary","Kondisi pabrik dalam sekejap — KPI utama"],
  quality:["Quality","Mutu CPO & Kernel terhadap standar pabrik"],
  losses:["Losses","Kehilangan produksi CPO & Kernel terhadap Standard Losses"],
  hist:["Historical Analytics","Analisis tren & perbandingan hingga 5 tahun"],
  input:["Data Input","Input manual & upload Excel data harian"],
  manage:["Data Management","Riwayat, edit, hapus, dan ekspor data"],
  settings:["Settings","Threshold KPI, pengguna, audit log, & sistem"],
};

function render(){
  if(!state.user){ renderLogin(); return; }
  if(state.tv){ renderTV(); return; }
  CHARTS={};
  const app=document.getElementById("app");
  app.setAttribute("data-theme",state.theme);
  app.style.cssText=""; // clear login styles
  const role=state.user.role, m=META[state.page];
  const body = state.page==="exec"?pageExec():state.page==="quality"?pageQuality():state.page==="losses"?pageLosses():state.page==="hist"?pageHist():state.page==="input"?pageInput():state.page==="manage"?pageManage():pageSettings();
  app.innerHTML=`<div class="shell">
    <div class="scrim ${state.drawer?"show":""}" data-act="closeDrawer"></div>
    <aside class="sidebar ${state.drawer?"open":""} ${state.collapsed?"collapsed":""}">
      <div class="brand"><div class="brand-logo"><img src="${LOGO}" alt="AAL"></div>
        <div class="brand-txt"><div class="brand-name">SAWIT</div><div class="brand-sub">Sari Aditya Loka 2</div></div>
        <button class="drawer-close no-print" data-act="closeDrawer" title="Tutup menu">${ic("x","sm")}</button></div>
      <nav class="nav"><div class="nav-sec">Menu</div>
        ${NAV.map(n=>{const locked=n.admin&&!canInput(role);return `<button class="nav-item ${state.page===n.key?"active":""}" data-act="nav" data-page="${n.key}" data-label="${n.label}">${ic(n.icon)}<span class="nav-lbl">${n.label}</span>${locked?`<span class="nav-lock">${ic("lock","sm faint")}</span>`:""}</button>`;}).join("")}
        <div class="nav-sec">Tampilan</div>
        <button class="nav-item" data-act="tv" data-label="TV Display Mode">${ic("tv")}<span class="nav-lbl">TV Display Mode</span></button>
        <button class="nav-item" data-act="theme" data-label="${state.theme==="dark"?"Light Mode":"Dark Mode"}">${ic(state.theme==="dark"?"sun":"moon")}<span class="nav-lbl">${state.theme==="dark"?"Light Mode":"Dark Mode"}</span></button>
        <button class="nav-item desk-only" data-act="collapse" data-label="${state.collapsed?"Lebarkan menu":"Ciutkan menu"}">${ic("panel-left","collapse-ico")}<span class="nav-lbl">Ciutkan menu</span></button>
      </nav>
      <div class="nav-foot"><div class="role-chip" title="${state.user.name} · ${role}"><span class="role-ava">${state.user.name[0]}</span>
        <div class="role-txt" style="flex:1;min-width:0"><div style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${state.user.name}</div><div class="muted" style="font-size:11px">${role}</div></div>
        <button class="btn btn-icon btn-ghost logout-btn" data-act="logout" title="Keluar">${ic("log-out","sm")}</button></div>
        ${state.collapsed?`<button class="nav-item desk-only" data-act="logout" data-label="Keluar" style="margin-top:6px;justify-content:center">${ic("log-out")}</button>`:""}</div>
    </aside>
    <div class="main">
      <header class="topbar no-print">
        <button class="btn btn-icon btn-ghost mob-only" data-act="openDrawer" aria-label="Buka menu" title="Buka menu">${ic("menu","")}</button>
        <button class="btn btn-icon btn-ghost desk-only" data-act="collapse" title="${state.collapsed?"Lebarkan menu (Ctrl+B)":"Ciutkan menu (Ctrl+B)"}" aria-label="${state.collapsed?"Lebarkan menu":"Ciutkan menu"}" aria-expanded="${!state.collapsed}">${ic("panel-left","collapse-ico")}</button>
        <div><div class="page-title">${m[0]}</div><div class="page-sub hide-sm">${m[1]}</div></div>
        <div class="spacer"></div>
        <button class="btn btn-ghost hide-sm" data-act="toggleAuto" title="Auto refresh">${ic("refresh-cw","sm")}<span class="mono" id="clk" style="font-size:12px">${new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span></button>
        <button class="btn btn-icon btn-ghost hide-sm" data-act="fullscreen" title="Fullscreen">${ic("maximize-2","sm")}</button>
        <button class="btn btn-icon btn-ghost" data-act="theme" aria-label="${state.theme==="dark"?"Mode terang":"Mode gelap"}" title="${state.theme==="dark"?"Mode terang":"Mode gelap"}">${ic(state.theme==="dark"?"sun":"moon","sm")}</button>
        <button class="btn btn-primary hide-sm" data-act="tv">${ic("tv","sm")} TV Mode</button>
      </header>
      <main class="content">${body}</main>
    </div></div>
    <div id="modalHost"></div>`;
  bindCharts();
  renderModal();
  // Kartu & angka hanya beranimasi saat BERPINDAH halaman; grafik/batang setiap
  // kali datanya berubah (karena itulah yang memang baru bagi pengguna).
  const changed = state._lastPage !== state.page;
  state._lastPage = state.page;
  if(state._entering){
    const sh=document.querySelector(".shell");
    if(sh && !noMotion()) sh.classList.add("shell-in");
    state._entering=false;
  }
  const mainEl=document.querySelector(".content");
  if(mainEl && changed && !noMotion()){
    mainEl.classList.add("anim-in");
    document.querySelector(".page-title").parentElement.classList.add("page-head-anim");
    countUp();
    setTimeout(()=>mainEl.classList.remove("anim-in"),700);
  }
  drawCharts(); growBars(); initToTop();
  // restore search focus
  if(state._focusSearch){ const si=document.getElementById("searchInput"); if(si){ si.focus(); const val=si.value; si.value=""; si.value=val; } state._focusSearch=false; }
}

/* ------------------------------ actions ----------------------------------- */
const XLCOL={throughput:"Throughput",tbs:"TBS_Olah",oer:"OER",cpo:"Produksi_CPO",utility:"Utility",restan:"Restan_TBS",
  ffa:"FFA",mCpo:"Moisture_CPO",dCpo:"Dirt_CPO",mKrn:"Moisture_Kernel",dKrn:"Dirt_Kernel",bKrn:"Broken_Nut",
  lSludge:"L_Sludge_Centrifuge",lFibre:"L_Fibre_Press_Cake",lEfb:"L_EFB",lEfbT:"L_EFB_TBM_SAM",lWetNut:"L_Wet_Nut",lUsb:"L_USB",
  kFibre:"K_Fibre_Cyclone",kDest:"K_Destoner",kLtds1:"K_LTDS_1",kLtds2:"K_LTDS_2",kShell:"K_Shell_Hydrocyclone"};
const XLREV=Object.fromEntries(Object.entries(XLCOL).map(([k,v])=>[v,k]));
/* Excel menyimpan tanggal sebagai ANGKA SERIAL (mis. 46265 = 12 Agu 2026).
   new Date(46265) menghasilkan 1970. Juga menangani format Indonesia dd/mm/yyyy
   yang oleh JavaScript ditafsirkan terbalik sebagai bulan/hari. */
function excelDate(v){
  if(v==null||v==="") return null;
  if(v instanceof Date) return localDate(v);
  if(typeof v==="number" && v>20000 && v<80000){          // serial Excel (basis 1899-12-30)
    return localDate(new Date(Date.UTC(1899,11,30)+v*86400000));
  }
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);      // yyyy-mm-dd
  if(m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);          // dd/mm/yyyy (Indonesia)
  if(m){ const d=+m[1],mo=+m[2];
    if(d>12 && mo<=12) return `${m[3]}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(mo>12) return null;                                 // ambigu/salah
    return `${m[3]}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  const p=new Date(s); return isNaN(p)?null:localDate(p);
}
function rowToXl(r){ const o={Tanggal:r.date}; ALLM.forEach(k=>o[XLCOL[k.key]]=r[k.key]); o.Input_Oleh=r.by; return o; }
function doExportExcel(){
  const rows=state.rows.map(rowToXl);
  if(typeof XLSX==="undefined"){ toast("SheetJS belum termuat — gunakan Export CSV","warn"); return; }
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Data Harian"); XLSX.writeFile(wb,"Data_Operasional_SAL2.xlsx");
  addAudit("Export Excel",`Export ${rows.length} baris`); toast("File Excel diunduh","good");
}
function doExportCSV(){
  const head=["Tanggal",...ALLM.map(k=>XLCOL[k.key]),"Input_Oleh"];
  const lines=[head.join(",")].concat(state.rows.map(r=>[r.date,...ALLM.map(k=>r[k.key]==null?"":r[k.key]),r.by].join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="Data_Operasional_SAL2.csv"; a.click(); URL.revokeObjectURL(url);
  toast("File CSV diunduh","good");
}
function doDownloadTemplate(){
  if(typeof XLSX==="undefined"){ toast("SheetJS belum termuat — coba saat online","warn"); return; }
  const ex={Tanggal:localDate()};
  const _t=localDate(); ALLM.forEach(k=>ex[XLCOL[k.key]]= k.dir==="band" ? 5.5 : (k.std!=null? r2(k.std*0.8) : (k.key==="tbs"?712:k.key==="cpo"?162.3:k.key==="oer"?22.8:k.key==="throughput"?58.5:k.key==="utility"?93.5:40)));
  const ws=XLSX.utils.json_to_sheet([ex]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Template"); XLSX.writeFile(wb,"Template_Data_Harian_SAL2.xlsx");
}
function handleFile(file){
  if(typeof XLSX==="undefined"){ toast("SheetJS belum termuat — fitur Excel butuh internet","crit"); return; }
  const rd=new FileReader();
  rd.onload=e=>{ try{
    const wb=XLSX.read(e.target.result,{type:"array",cellDates:true});  // minta SheetJS mengurai tanggal const json=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    let ok=0,skip=0,errLines=[];
    json.forEach((j,idx)=>{
      const rec={date:excelDate(j.Tanggal),by:"upload.excel"};
      ALLM.forEach(k=>{ const raw=j[XLCOL[k.key]]; const v=parseNum(raw); rec[k.key]=(v===null||isNaN(v))?null:v; });
      const er=validateRec(rec); if(er.length){ skip++; if(errLines.length<3) errLines.push(`Baris ${idx+2}: ${er[0]}`);} else { addRow(rec); ok++; }
    });
    addAudit("Upload Excel",`Import ${ok} baris, ${skip} ditolak`);
    toast(`Import selesai: ${ok} masuk${skip?`, ${skip} ditolak`:""}`,skip?"warn":"good");
    render();
    if(errLines.length){ const box=document.getElementById("inputErr"); if(box) box.innerHTML=errBox(errLines); }
  }catch(err){ toast("Format Excel tidak sesuai / gagal dibaca","crit"); } };
  rd.readAsArrayBuffer(file);
}
function errBox(errs){
  return `<div style="margin-top:14px;padding:11px 13px;border-radius:10px;background:var(--crit-bg);border:1px solid var(--crit);color:var(--crit)">
    <div style="font-weight:700;font-size:12.5px;display:flex;align-items:center;gap:6px;margin-bottom:5px">${ic("triangle-alert","sm")} Validasi gagal</div>
    ${errs.map(e=>`<div style="font-size:12.5px;line-height:1.5">• ${esc(e)}</div>`).join("")}</div>`;
}
function submitInput(){
  // Pengguna Indonesia terbiasa mengetik koma. Input type=number membuang koma
  // sehingga "22,85" menjadi 2285 — 100x lipat. Diterjemahkan lewat data-raw.
  const get=k=>{const el=document.getElementById("in_"+k); if(!el) return "";
    const raw=el.getAttribute("data-raw"); return (raw!=null&&raw!=="")?raw:el.value;};
  const rec={date:get("date")}; ALLM.forEach(k=>rec[k.key]=get(k.key));
  const errs=validateRec(rec);
  const box=document.getElementById("inputErr");
  if(errs.length){ if(box) box.innerHTML=errBox(errs); return; }
  const clean={date:rec.date,by:"krani.produksi"};
  ALLM.forEach(k=>{ const v=parseNum(rec[k.key]); clean[k.key]= v===null?null:v; });
  addRow(clean); addAudit("Input Data",`Menambah data ${idDate(clean.date)}`); toast("Data tersimpan","good"); render();
}
function saveThreshold(){
  ALLM.forEach(k=>{ (k.dir==="band"?["min","max"]:["target","warning","critical"]).forEach(f=>{
    const el=document.getElementById(`th_${k.key}_${f}`); if(!el||el.value==="") return;
    const v=parseNum(el.value); if(v!==null&&!isNaN(v)) state.thresholds[k.key][f]=v; }); });
  persist(); addAudit("Edit Threshold","Memperbarui threshold KPI"); toast("Threshold diperbarui — KPI berubah warna otomatis","good"); render();
}
function saveFactors(){
  LOSS.forEach(k=>{ const el=document.getElementById("lf_"+k.key); if(!el) return;
    const v=parseNum(el.value); state.lossFactors[k.key]=(v===null||isNaN(v))?null:v; });
  persist(); addAudit("Edit Faktor Losses","Memperbarui faktor konversi losses ke %TBS");
  const miss=LOSS.filter(k=>state.lossFactors[k.key]==null).length;
  toast(miss?`Tersimpan — ${miss} faktor masih kosong, total belum muncul`:"Faktor tersimpan — Total Losses kini aktif", miss?"warn":"good"); render();
}
function saveEdit(){
  const r=state.editing; const rec={...r};
  ALLM.forEach(k=>{ const el=document.getElementById("ed_"+k.key); if(!el) return;
    const v=parseNum(el.value); rec[k.key]= v===null?null:v; });
  const changes=ALLM.filter(k=>r[k.key]!==rec[k.key]).map(k=>`${k.label} ${r[k.key]}→${rec[k.key]}`).join(", ")||"tanpa perubahan";
  updateRow(rec); addAudit("Edit Data",`Ubah data ${idDate(rec.date)}: ${changes}`); state.editing=null;
  toast("Perubahan disimpan","good"); render();
}

/* --------------------------- event delegation ----------------------------- */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-act]"); if(!t) return;
  const act=t.getAttribute("data-act");
  switch(act){
    case "doLogin": submitLogin(); break;
    case "peek": togglePeek(); break;
    case "demoToggle": state.showDemo=!state.showDemo; renderLogin(); break;
    case "fill":{ const u=USERS.find(x=>x.username===t.getAttribute("data-user")); if(u){ document.getElementById("lg_user").value=u.username; document.getElementById("lg_pass").value=u.pass; document.getElementById("loginErr").innerHTML=""; document.getElementById("loginBtn").focus(); } break; }
    case "logout": state.user=null; state.page="exec"; persist(); render(); break;
    case "nav": state.page=t.getAttribute("data-page"); state.drawer=false; render(); break;
    case "theme": state.theme=state.theme==="dark"?"light":"dark"; persist(); render(); break;
    case "tv": state.tv=true; render(); break;
    case "exitTV": state.tv=false; clearInterval(tvClockTimer); render(); break;
    case "collapse": state.collapsed=!state.collapsed; persist(); render(); break;
    case "openDrawer": state.drawer=true; render(); break;
    case "closeDrawer": case "closeDrawerBtn": state.drawer=false; render(); break;
    case "toggleAuto": state.auto=!state.auto; toast(state.auto?"Auto refresh aktif":"Auto refresh nonaktif","good"); break;
    case "fullscreen": if(!document.fullscreenElement){ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen(); } else { document.exitFullscreen&&document.exitFullscreen(); } break;
    case "histMetric": state.histMetric=t.getAttribute("data-v"); render(); break;
    case "histRange": state.histRange=t.getAttribute("data-v"); render(); break;
    case "qPeriod": state.qPeriod=t.getAttribute("data-v"); render(); break;
    case "qMetric": state.qMetric=t.getAttribute("data-v"); render(); break;
    case "lMetric": state.lMetric=t.getAttribute("data-v"); render(); break;
    case "lPeriod": state.lPeriod=t.getAttribute("data-v"); render(); break;
    case "mgroup": state.mgroup=t.getAttribute("data-v"); render(); break;
    case "mpage": state.mpage=Math.max(1,+t.getAttribute("data-v")); render(); window.scrollTo({top:0,behavior:"smooth"}); break;
    case "settingsTab": state.settingsTab=t.getAttribute("data-v"); render(); break;
    case "submitInput": submitInput(); break;
    case "pickFile": document.getElementById("fileInput").click(); break;
    case "downloadTemplate": doDownloadTemplate(); break;
    case "exportExcel": doExportExcel(); break;
    case "exportCSV": doExportCSV(); break;
    case "exportPDF": window.print(); break;
    case "saveThreshold": saveThreshold(); break;
    case "saveFactors": saveFactors(); break;
    case "resetData": resetData(); break;
    case "edit":{ const id=t.getAttribute("data-id"); state.editing=state.rows.find(r=>String(r.id)===id); renderModal(); break; }
    case "delete":{ const id=t.getAttribute("data-id"); const r=state.rows.find(x=>String(x.id)===id); if(r&&confirm(`Hapus data ${idDate(r.date)}?`)){ deleteRow(r.id); addAudit("Delete Data",`Hapus data ${idDate(r.date)}`); toast("Data dihapus","warn"); render(); } break; }
    case "closeModal": state.editing=null; renderModal(); break;
    case "saveEdit": saveEdit(); break;
  }
});
document.addEventListener("change",e=>{
  if(e.target.id==="fileInput" && e.target.files[0]){ handleFile(e.target.files[0]); e.target.value=""; }
  if(e.target.id==="selYear"){ state.myear=e.target.value; state.mpage=1; render(); }
  if(e.target.id==="selMonth"){ state.mmonth=e.target.value; state.mpage=1; render(); }
});
document.addEventListener("input",e=>{
  if(e.target.id==="searchInput"){ state.mq=e.target.value; state.mpage=1; state._focusSearch=true; render(); }
});
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey) && (e.key==="b"||e.key==="B") && state.user && !state.tv){
    e.preventDefault(); state.collapsed=!state.collapsed; persist(); render(); return; }
  if(e.key==="Escape" && state.drawer){ state.drawer=false; render(); return; }
  if(e.key==="Escape"&&state.tv){ state.tv=false; clearInterval(tvClockTimer); render(); } });

/* auto-refresh clock */
setInterval(()=>{ if(state.auto && !state.tv && state.user){ const c=document.getElementById("clk"); if(c) c.textContent=new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); } },30000);

/* --------- geser ke kiri untuk menutup drawer (smartphone) --------- */
let swX=null, swY=null;
document.addEventListener("touchstart",e=>{
  if(!state.drawer) return;
  const t=e.target.closest(".sidebar"); if(!t) return;
  swX=e.touches[0].clientX; swY=e.touches[0].clientY;
},{passive:true});
document.addEventListener("touchend",e=>{
  if(swX==null||!state.drawer) return;
  const dx=e.changedTouches[0].clientX-swX, dy=Math.abs(e.changedTouches[0].clientY-swY);
  if(dx<-55 && dy<60){ state.drawer=false; render(); }   // geser kiri, bukan gulir vertikal
  swX=swY=null;
},{passive:true});

/* --------- auto-logout 30 menit (idle) --------- */
let actThrottle=0;
["click","keydown","mousemove","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{
  if(!state.user) return;
  const now=Date.now();
  if(now-actThrottle>10000){ actThrottle=now; touchActivity(); }
},{passive:true}));
setInterval(()=>{
  if(!state.user || state.tv) return;   // Mode TV dibiarkan menyala untuk display pabrik
  let last=0; try{ last=+localStorage.getItem(LS_ACT)||0; }catch(e){}
  const sisa=IDLE_MS-(Date.now()-last);
  if(sisa>0 && sisa<=120000 && !state._logoutWarned){    // peringatan 2 menit sebelumnya
    state._logoutWarned=true;
    toast("Sesi akan berakhir dalam 2 menit karena tidak ada aktivitas","warn");
  }
  if(sisa>120000) state._logoutWarned=false;
  if(sessionExpired()){
    addAudit("Auto Logout","Sesi berakhir setelah 30 menit tidak aktif");
    state.user=null; persist(); render();
    toast("Sesi berakhir — silakan masuk kembali","warn");
  }
},60000);

/* ------------------------------- init ------------------------------------- */
loadState();
function boot(){ render(); }
boot();
