import express from 'express';
import session from 'express-session';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
const PORT=process.env.PORT||3000;
const DATA_DIR=process.env.DATA_DIR||path.resolve('data');
const IMAGE_DIR=path.join(DATA_DIR,'uploads');
const DOC_DIR=path.join(DATA_DIR,'documents');
fs.mkdirSync(DOC_DIR,{recursive:true});
const FILE=path.join(DATA_DIR,'catalog.json');
fs.mkdirSync(IMAGE_DIR,{recursive:true});
const starter=[
 {id:'CLD-101',name:'Architectural Wall Cladding',category:'Cladding',description:'Contemporary facade systems with refined textures and resilient finishes.',image:'https://images.unsplash.com/photo-1777793918984-e40e628d7cf5?w=1100&q=85',featured:true},
 {id:'STN-205',name:'Natural Stone Panels',category:'Stone',description:'Distinctive surfaces for facades, feature walls and commercial spaces.',image:'https://images.unsplash.com/photo-1774290331891-5d759056c68d?w=1100&q=85'},
 {id:'MTL-310',name:'Structural Steel Sections',category:'Steel',description:'Reliable structural profiles for demanding construction projects.',image:'https://images.unsplash.com/photo-1558358235-a0a93f68a52c?w=1100&q=85'},
 {id:'PAV-112',name:'Outdoor Paving Systems',category:'Paving',description:'Versatile, durable paving formats for exterior environments.',image:'https://images.unsplash.com/photo-1760537760008-5fd5b1f872d4?w=1100&q=85'},
 {id:'INT-208',name:'Interior Surface Panels',category:'Interiors',description:'Considered architectural finishes for contemporary interiors.',image:'https://images.unsplash.com/photo-1770816306659-adcf99a11aeb?w=1100&q=85'},
 {id:'CON-402',name:'Precast Concrete Elements',category:'Concrete',description:'Consistent construction components for repeatable project delivery.',image:'https://images.unsplash.com/photo-1695445301510-459fb368d8af?w=1100&q=85'}
];
const placeholderImages=new Set([
 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1100&q=85',
 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1100&q=85',
 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1100&q=85',
 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1100&q=85',
 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1100&q=85',
 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1100&q=85'
]);
if(!fs.existsSync(FILE))fs.writeFileSync(FILE,JSON.stringify(starter,null,2));
function read(){return JSON.parse(fs.readFileSync(FILE,'utf8'));}
function write(data){const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,FILE);}
const hvacById=Object.fromEntries(starter.map(p=>[p.id,p.image]));
{
 const data=read();
 let changed=false;
 for(const p of data){
  const next=hvacById[p.id];
  if(!next||!placeholderImages.has(p.image))continue;
  p.image=next;
  if(Array.isArray(p.images))p.images=p.images.map(url=>placeholderImages.has(url)?next:url);
  changed=true;
 }
 if(changed)write(data);
}
function safe(v,max=500){return String(v??'').trim().slice(0,max);}
const adminUser=process.env.ADMIN_USER||'admin';
const adminPassword=process.env.ADMIN_PASSWORD;
const sessionSecret=process.env.SESSION_SECRET;
if(!adminPassword||!sessionSecret)console.warn('Set ADMIN_PASSWORD and SESSION_SECRET before public deployment. Admin editing disabled until configured.');
app.use(express.json({limit:'150kb'}));
app.use(express.urlencoded({extended:false}));
app.use(session({secret:sessionSecret||crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:1000*60*60*8}}));
app.use('/uploads',express.static(IMAGE_DIR,{immutable:true,maxAge:'7d',index:false}));
app.use('/documents',express.static(DOC_DIR,{index:false,setHeaders:(res)=>res.setHeader('X-Content-Type-Options','nosniff')}));
app.use(express.static('public'));
app.get('/api/products',(req,res)=>res.json(read()));
app.get('/api/config',(req,res)=>res.json({businessName:process.env.BUSINESS_NAME||'RockVent',salesEmail:'sales@rockventuae.com',emailEnabled:!!(process.env.RESEND_API_KEY&&process.env.MAIL_FROM)}));
const attempts=new Map();
function limit(req,res,next){const ip=req.ip||'unknown';const now=Date.now();const a=attempts.get(ip)||[];const recent=a.filter(x=>x>now-15*60*1000);if(recent.length>=30)return res.status(429).json({error:'Too many attempts. Try again later.'});recent.push(now);attempts.set(ip,recent);next();}
function auth(req,res,next){if(!req.session.admin)return res.status(401).json({error:'Please sign in to manage products.'});next();}
app.post('/api/admin/login',limit,(req,res)=>{if(!adminPassword)return res.status(503).json({error:'Admin not configured. Set ADMIN_PASSWORD and SESSION_SECRET.'});const u=safe(req.body.username,100),p=String(req.body.password||'');const match=(a,b)=>{const x=crypto.createHash('sha256').update(a).digest(),y=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(x,y)};if(!match(u,adminUser)||!match(p,adminPassword))return res.status(401).json({error:'Incorrect credentials.'});req.session.admin=true;res.json({ok:true});});
app.get('/api/admin/me',(req,res)=>res.json({admin:!!req.session.admin}));
app.post('/api/admin/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/avif'].includes(file.mimetype))});
app.post('/api/admin/image',auth,upload.single('image'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'Choose a JPG, PNG, AVIF or WebP under 8 MB.'});try{const filename=crypto.randomUUID()+'.webp';await sharp(req.file.buffer,{limitInputPixels:25000000}).rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toFile(path.join(IMAGE_DIR,filename));res.json({url:'/uploads/'+filename});}catch{res.status(400).json({error:'Unable to process this image.'});}});
const docUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024},fileFilter:(req,file,cb)=>cb(null,file.mimetype==='application/pdf')});
app.post('/api/admin/document',auth,docUpload.single('document'),(req,res)=>{if(!req.file || req.file.buffer.subarray(0,5).toString()!=='%PDF-')return res.status(400).json({error:'Upload a PDF file (max 15 MB).'});const filename=crypto.randomUUID()+'.pdf';fs.writeFileSync(path.join(DOC_DIR,filename),req.file.buffer);res.json({url:'/documents/'+filename,name:safe(req.file.originalname,140)});});
function normal(p){const images=Array.isArray(p.images)?p.images.map(x=>safe(x,500)).filter(x=>x.startsWith('/uploads/')||x.startsWith('https://')).slice(0,12):[];const main=safe(p.image,500);if(main&&!images.includes(main))images.unshift(main);const docs=Array.isArray(p.documents)?p.documents.filter(x=>x&&typeof x==='object').map(x=>({name:safe(x.name,140),url:safe(x.url,500)})).filter(x=>x.name&&(x.url.startsWith('/documents/')||x.url.startsWith('https://'))).slice(0,12):[];return{id:safe(p.id,50).toUpperCase(),name:safe(p.name,120),category:safe(p.category,60)||'Other',description:safe(p.description,350),image:images[0]||'',images,documents:docs,minOrder:Math.max(1,Math.min(100000,parseInt(p.minOrder,10)||1)),unit:safe(p.unit,40)||'units',featured:!!p.featured};}
app.post('/api/admin/products',auth,(req,res)=>{const p=normal(req.body);if(!p.id||!p.name)return res.status(400).json({error:'Product ID and name are required.'});const data=read();if(data.some(x=>x.id===p.id))return res.status(409).json({error:'Product ID already exists.'});data.unshift(p);write(data);res.json(p);});
app.put('/api/admin/products/:id',auth,(req,res)=>{const data=read(),idx=data.findIndex(p=>p.id===req.params.id);if(idx<0)return res.sendStatus(404);const p=normal(req.body);if(!p.id||!p.name)return res.status(400).json({error:'Product ID and name are required.'});if(data.some((x,i)=>i!==idx&&x.id===p.id))return res.status(409).json({error:'Product ID already exists.'});data[idx]=p;write(data);res.json(p);});
app.delete('/api/admin/products/:id',auth,(req,res)=>{const data=read(),next=data.filter(p=>p.id!==req.params.id);if(next.length===data.length)return res.sendStatus(404);write(next);res.json({ok:true});});
app.post('/api/admin/import',auth,(req,res)=>{if(!Array.isArray(req.body.products)||req.body.products.length>500)return res.status(400).json({error:'Import up to 500 products per batch.'});const data=read(),idx=new Map(data.map((p,i)=>[p.id,i]));let count=0;for(const raw of req.body.products){const p=normal(raw);if(!p.id||!p.name)continue;if(idx.has(p.id)){const previous=data[idx.get(p.id)];if(!Object.hasOwn(raw,'images'))p.images=previous.images||[previous.image].filter(Boolean);if(!Object.hasOwn(raw,'documents'))p.documents=previous.documents||[];if(!Object.hasOwn(raw,'image')||!raw.image)p.image=p.images[0]||'';data[idx.get(p.id)]=p}else{idx.set(p.id,data.length);data.push(p)}count++;}write(data);res.json({count});});
app.post('/api/quotes',limit,async(req,res)=>{
 const name=safe(req.body.name,120),email=safe(req.body.email,180),company=safe(req.body.company,120),note=safe(req.body.note,2000),honeypot=safe(req.body.website,200);
 if(honeypot)return res.json({ok:true});
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Enter your name and a valid email.'});
 const items=Array.isArray(req.body.items)?req.body.items.slice(0,40):[],catalog=read();
 const valid=items.map(x=>{const p=catalog.find(p=>p.id===x.id);return p?{id:p.id,name:p.name,quantity:Math.min(100000,Math.max(p.minOrder||1,Number.parseInt(x.quantity,10)||p.minOrder||1))}:null}).filter(Boolean);
 if(!valid.length)return res.status(400).json({error:'Please add at least one product.'});
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return res.status(503).json({error:'Online inquiries are not enabled yet. Please use the email option instead.'});
 const lines=[`New product inquiry`, `Customer: ${name}`,`Company: ${company||'Not provided'}`,`Email: ${email}`, '', 'Requested products:',...valid.map(p=>`- ${p.name} [${p.id}] × ${p.quantity}`),'',`Note: ${note||'No note supplied'}`];
 try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from:process.env.MAIL_FROM,to:['sales@rockventuae.com'],reply_to:email,subject:`Quote request: ${valid.map(x=>x.id).join(', ').slice(0,120)}`,text:lines.join('\n')})});if(!response.ok){console.error('Email provider error:',response.status);return res.status(502).json({error:'Unable to send the inquiry right now. Please try the email option.'});}res.json({ok:true});}catch(e){console.error('Email transport failed:',e.message);res.status(502).json({error:'Unable to send the inquiry right now. Please try the email option.'});}
});
app.get('/health',(req,res)=>res.send('ok'));
app.listen(PORT,'0.0.0.0',()=>console.log('Catalog ready on port',PORT));
