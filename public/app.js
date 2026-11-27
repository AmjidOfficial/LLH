const STORE='top-fashion-leather';
const DEFAULT_WA='923328884141';
let storeSettings=null,products=[],contentItems=[],installPrompt=null;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanPhone=v=>String(v||DEFAULT_WA).replace(/[^0-9]/g,'')||DEFAULT_WA;
const waLink=(message)=>'https://wa.me/'+cleanPhone(storeSettings?.whatsapp_phone)+'?text='+encodeURIComponent(message);
function revealOnScroll(){
 const nodes=document.querySelectorAll('.reveal:not(.is-visible),.product-card:not(.is-visible)');
 if(!('IntersectionObserver' in window)){nodes.forEach(n=>n.classList.add('is-visible'));return}
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -25px 0px'});
 nodes.forEach(n=>observer.observe(n));
}
function shortStyle(p){
 const v=p.product_details?.catalogue_subtitle;
 if(v)return v;
 return p.style||p.product_details?.gender||'ATELIER STYLE';
}
function stockCopy(p){
 if(p.stock_status==='in_stock'&&Number(p.quantity_on_hand)>0)return 'Ready stock · Confirm at checkout';
 if(p.product_details?.catalogue_style)return 'Catalogue style · Availability to confirm';
 if(p.stock_status==='sold'||p.product_status==='sold')return 'Recently sold · Ask about a new piece';
 return 'Availability to confirm';
}
function productCard(p,index){
 const gender=p.product_details?.gender||p.style||'Collection';
 const img=p.image_url||'';
 const src=img.startsWith('storage:')?'':img;
 return '<article class="product-card reveal" style="--delay:'+((index%6)*65)+'ms" data-product-card="'+esc(p.id)+'">'+
  '<a class="product-image-wrap" href="/shop.html?store='+STORE+'&product='+encodeURIComponent(p.slug||p.id)+'" aria-label="View '+esc(p.name)+'">'+
  '<span class="product-index">'+String(index+1).padStart(2,'0')+'</span>'+
  (src?'<img class="product-image" src="'+esc(src)+'" alt="'+esc(p.name)+' catalogue style" loading="lazy">':'<div class="product-fallback">LL</div>')+
  '</a><div class="product-info"><div class="product-meta"><span>'+esc(gender)+'</span><span>'+esc(shortStyle(p))+'</span></div>'+
  '<h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'Designed with the Legacy Leathers spirit. Ask our atelier for details.')+'</p>'+
  '<div class="product-bottom"><span class="product-price">'+(p.price_pkr!=null?'Rs. '+Number(p.price_pkr).toLocaleString('en-PK'):'Price on request')+'</span>'+
  '<button type="button" class="product-enquire" data-enquire="'+esc(p.id)+'">Ask about this style <span>↗</span></button></div>'+
  '<small class="product-stock">'+esc(stockCopy(p))+'</small></div></article>';
}
function renderCollections(){
 const men=products.filter(p=>String(p.product_details?.gender||p.style||'').toLowerCase()==='men');
 const women=products.filter(p=>String(p.product_details?.gender||p.style||'').toLowerCase()==='women');
 const mg=$('#menGrid'),wg=$('#womenGrid');
 if(mg)mg.innerHTML=men.length?men.map((p,i)=>productCard(p,i)).join(''):'<div class="empty-state">The men’s collection is being prepared. Please contact our atelier for details.</div>';
 if(wg)wg.innerHTML=women.length?women.map((p,i)=>productCard(p,i+6)).join(''):'<div class="empty-state">The women’s collection is being prepared. Please contact our atelier for details.</div>';
 document.querySelectorAll('[data-enquire]').forEach(btn=>btn.addEventListener('click',()=>{const p=products.find(x=>x.id===btn.dataset.enquire);if(!p)return;window.open(waLink('Hello Legacy Leathers. I would like to enquire about '+p.name+' ('+(p.sku||'')+'). Please confirm the available options, price and delivery.'),'_blank','noopener,noreferrer')}));
 document.querySelectorAll('.product-card').forEach(card=>{
  card.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||innerWidth<800)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform='translateY(-6px) rotateX('+(-y*3)+'deg) rotateY('+(x*3)+'deg)'});
  card.addEventListener('pointerleave',()=>card.style.transform='');
 });
 revealOnScroll();
}
function renderPosts(items){
 const posts=(items||[]).filter(x=>['post','gallery'].includes(x.content_type)&&['journal','announcement'].includes(x.placement));
 const section=$('#journal'),grid=$('#housePosts');if(!section||!grid||!posts.length)return;
 section.hidden=false;
 grid.innerHTML=posts.slice(0,6).map(x=>'<article class="journal-card reveal">'+(x.image_url?'<img src="'+esc(x.image_url)+'" alt="'+esc(x.image_alt||x.title)+'" loading="lazy">':'')+'<p class="eyebrow">FROM THE HOUSE</p><h3>'+esc(x.title)+'</h3><p>'+esc(x.body||'')+'</p></article>').join('');
 revealOnScroll();
}
async function loadStore(){
 try{
  const r=await fetch('/api/storefront?store='+encodeURIComponent(STORE),{headers:{'Accept':'application/json'}});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Collection is temporarily unavailable.');
  storeSettings=d.store||{};products=(d.products||[]).filter(p=>p.product_status!=='archived'&&p.product_status!=='sold'&&!p.product_details?.is_demo);contentItems=d.content||[];
  renderCollections();renderPosts(contentItems);
  if(storeSettings.logo_url){document.querySelectorAll('.brand-logo img').forEach(img=>{img.src=storeSettings.logo_url;img.alt='Legacy Leathers since 1998'})}
  const year=$('#year');if(year)year.textContent=new Date().getFullYear();
 }catch(err){
  const fallback='<div class="empty-state">Our catalogue is updating. Please contact Khalid Jalil on WhatsApp for help.</div>';
  if($('#menGrid'))$('#menGrid').innerHTML=fallback;if($('#womenGrid'))$('#womenGrid').innerHTML=fallback;
 }
}
function bespokeMessage(d){
 return 'LEGACY LEATHERS — BESPOKE ENQUIRY\nPakistan Contact: +92 332 8884141\n\nCUSTOMER\nName: '+(d.name||'Not provided')+'\nPhone: '+(d.phone||'Not provided')+
 '\n\nJACKET\nStyle: '+(d.style||'Not selected')+'\nColour / finish: '+(d.colour||'Discuss')+'\nFit: '+(d.fit||'Discuss')+
 '\n\nMEASUREMENTS\nChest: '+(d.chest||'Not provided')+'\nWaist: '+(d.waist||'Not provided')+
 '\n\nAdditional details: '+(d.notes||'None')+
 '\n\nPlease review my request and advise on final specifications, quotation, making time and delivery. I understand this is an enquiry, not a confirmed order.';
}
function bindBespoke(){
 const form=$('#mtmForm');if(!form)return;
 form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const d=Object.fromEntries(new FormData(form).entries());$('#formMessage').textContent='Opening WhatsApp with your enquiry details…';window.open(waLink(bespokeMessage(d)),'_blank','noopener,noreferrer')});
 document.querySelectorAll('[data-style]').forEach(link=>link.addEventListener('click',()=>{const field=$('#bespokeStyle');if(field){field.value=link.dataset.style;field.dispatchEvent(new Event('change'))}}));
}
function bindNavigation(){
 const toggle=$('#menuToggle'),nav=$('#mainNav');if(toggle&&nav){toggle.addEventListener('click',()=>{const opened=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(opened))});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}))}
}
function bindMotion(){
 revealOnScroll();
 if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>io.observe(el))}
 const hero=$('.hero');let ticking=false;
 if(hero&&!matchMedia('(prefers-reduced-motion: reduce)').matches){window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=Math.min(window.scrollY,500);const jacket=$('.hero-jacket-wrap');if(jacket&&innerWidth>780)jacket.style.translate='0 '+(y*.045)+'px';ticking=false})},{passive:true})}
}
function bindInstall(){
 if(!('serviceWorker' in navigator))return;
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=$('#installApp');if(b)b.hidden=false});
 $('#installApp')?.addEventListener('click',async()=>{const b=$('#installApp');if(!installPrompt){if(b)b.textContent='Install from browser menu';return}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;if(b)b.hidden=true});
 window.addEventListener('appinstalled',()=>{const b=$('#installApp');if(b)b.hidden=true});
}
document.addEventListener('DOMContentLoaded',()=>{bindNavigation();bindBespoke();bindMotion();bindInstall();loadStore();const y=$('#year');if(y)y.textContent=new Date().getFullYear()});