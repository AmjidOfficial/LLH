const params=new URLSearchParams(location.search),STORE=params.get('store')||'top-fashion-leather';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-PK');
let products=[],campaigns=[],store=null,activeGender='all',installPrompt=null;
let cart=JSON.parse(localStorage.getItem('shop-cart-'+STORE)||'[]');
const phone=()=>String(store?.whatsapp_phone||'923328884141').replace(/[^0-9]/g,'');
const whatsapp=(message)=>'https://wa.me/'+phone()+'?text='+encodeURIComponent(message);
function currentPrice(p){
 const now=Date.now(),start=p.offer_starts_at?new Date(p.offer_starts_at).getTime():0,end=p.offer_ends_at?new Date(p.offer_ends_at).getTime():Infinity;
 if(p.offer_price_pkr!=null&&now>=start&&now<end)return Number(p.offer_price_pkr);
 return p.price_pkr==null?null:Number(p.price_pkr);
}
function available(p){return Number(p.quantity_on_hand||0)-Number(p.quantity_reserved||0)>0&&p.stock_status==='in_stock'&&p.product_status==='active'}
function productCard(p,i){
 const price=currentPrice(p),canBuy=price!=null&&available(p),gender=p.product_details?.gender||'Collection';
 const action=canBuy?'<button class="shop-add" data-add="'+esc(p.id)+'">Add to bag <span>＋</span></button>':'<a class="shop-enquire" href="'+whatsapp('Hello Legacy Leathers. I would like to enquire about '+p.name+' ('+(p.sku||'')+'). Please confirm stock, available sizes, colour options, price and delivery.')+'" target="_blank" rel="noreferrer">Enquire about this style <span>↗</span></a>';
 return '<article class="shop-product"><a class="shop-product-image" href="/#'+(gender==='Women'?'women':'men')+'">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+' catalogue illustration" loading="lazy">':'<span class="product-fallback">LL</span>')+'</a><div class="shop-product-copy"><div class="shop-product-meta"><span>'+esc(gender)+'</span><span>'+esc(p.product_details?.catalogue_subtitle||p.style||'Atelier style')+'</span></div><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'Made with care by the Legacy Leathers atelier.')+'</p><strong class="shop-price">'+(price!=null?money(price):'Price on request')+'</strong><small class="shop-stock">'+esc(available(p)?'Ready stock · Quantity may change':'Catalogue style · Availability to confirm')+'</small>'+action+'</div></article>';
}
function renderCampaigns(){
 const el=$('#campaignBanner');if(!el)return;const c=campaigns[0];
 if(!c){el.hidden=true;return}
 el.hidden=false;el.innerHTML='<div><small>'+esc(c.campaign_type==='offer'?'ATELIER OFFER':'FROM THE HOUSE')+'</small><strong>'+esc(c.title)+'</strong><p>'+esc(c.body||'')+(c.discount_percent?' · '+esc(c.discount_percent)+'% off':'')+'</p></div>'+(c.coupon_code?'<b>CODE · '+esc(c.coupon_code)+'</b>':'');
}
function render(){
 const q=($('#shopSearch')?.value||'').trim().toLowerCase(),cat=$('#shopCategory')?.value||'';
 const list=products.filter(p=>{const gender=p.product_details?.gender||'';return(!cat||p.category===cat)&&(activeGender==='all'||gender===activeGender)&&[p.name,p.style,p.category,p.leather_type,p.description,gender].join(' ').toLowerCase().includes(q)});
 $('#productCount').textContent=list.length+' styles';
 $('#shopProducts').innerHTML=list.length?list.map(productCard).join(''):'<div class="loading-state">No styles match your search. Try another term or contact our atelier.</div>';
 document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.add)));
 renderCart();
}
function add(id){
 const p=products.find(x=>x.id===id);if(!p||currentPrice(p)==null||!available(p))return;
 const item=cart.find(x=>x.product_id===id),max=Number(p.quantity_on_hand)-Number(p.quantity_reserved||0);
 if(item)item.quantity=Math.min(max,20,item.quantity+1);else cart.push({product_id:id,quantity:1});
 save();
}
function save(){localStorage.setItem('shop-cart-'+STORE,JSON.stringify(cart));renderCart()}
function renderCart(){
 cart=cart.filter(x=>products.some(p=>p.id===x.product_id&&available(p)&&currentPrice(p)!=null));
 const count=cart.reduce((n,x)=>n+x.quantity,0),total=cart.reduce((n,x)=>n+currentPrice(products.find(p=>p.id===x.product_id))*x.quantity,0);
 $('#cartCount').textContent=count+' items';$('#cartTotal').textContent=money(total);$('#checkoutOpen').disabled=!count;
 $('#cartItems').innerHTML=cart.length?cart.map(x=>{const p=products.find(z=>z.id===x.product_id);return '<div class="cart-item"><div><b>'+esc(p.name)+'</b><small>'+money(currentPrice(p))+' each</small><br><button data-remove="'+esc(x.product_id)+'">Remove</button></div><div class="cart-qty"><button data-dec="'+esc(x.product_id)+'" aria-label="Decrease quantity">−</button><span>'+x.quantity+'</span><button data-inc="'+esc(x.product_id)+'" aria-label="Increase quantity">+</button></div></div>'}).join(''):'<p class="empty-cart">Your bag is empty. Enquire about catalogue styles or add ready-stock items when available.</p>';
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>x.product_id!==b.dataset.remove);save()});
 document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{const x=cart.find(z=>z.product_id===b.dataset.inc),p=products.find(z=>z.id===b.dataset.inc);if(x&&p)x.quantity=Math.min(20,Number(p.quantity_on_hand)-Number(p.quantity_reserved||0),x.quantity+1);save()});
 document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{const x=cart.find(z=>z.product_id===b.dataset.dec);if(x){x.quantity--;if(x.quantity<1)cart=cart.filter(z=>z!==x)}save()});
}
async function load(){
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
 try{
  const r=await fetch('/api/storefront?store='+encodeURIComponent(STORE),{headers:{'Accept':'application/json'}});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Store unavailable');
  store=d.store||{};products=(d.products||[]).filter(p=>p.product_status!=='archived'&&p.product_status!=='sold'&&!p.product_details?.is_demo);campaigns=d.campaigns||[];
  renderCampaigns();$('#storeName').textContent=store.display_name||'Legacy Leathers';$('#storeDescription').textContent=store.description||'Timeless leather since 1998.';render();
 }catch(e){$('#storeName').textContent='Collection unavailable';$('#storeDescription').textContent='Please contact Khalid Jalil on WhatsApp for help.';$('#productCount').textContent='Please contact our atelier';$('#shopProducts').innerHTML='<div class="loading-state">The live catalogue could not be loaded. <a class="text-link" href="https://wa.me/923328884141">Contact our atelier ↗</a></div>'}
}
$('#shopSearch').addEventListener('input',render);$('#shopCategory').addEventListener('change',render);
document.querySelectorAll('[data-gender]').forEach(b=>b.addEventListener('click',()=>{activeGender=b.dataset.gender;document.querySelectorAll('[data-gender]').forEach(x=>x.classList.toggle('is-active',x===b));render()}));
$('#checkoutOpen').onclick=()=>{$('#checkoutBackdrop').hidden=false};
$('#checkoutClose').onclick=()=>{$('#checkoutBackdrop').hidden=true};
$('#checkoutBackdrop').addEventListener('click',e=>{if(e.target.id==='checkoutBackdrop')e.currentTarget.hidden=true});
$('#checkoutForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;
 const d=Object.fromEntries(new FormData(f).entries()),body={store:STORE,customer_name:d.customer_name,customer_phone:d.customer_phone,customer_email:d.customer_email,shipping_address:{address:d.address,city:d.city},payment_method:d.payment_method,customer_note:d.customer_note,items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity}))};
 const btn=f.querySelector('button[type=submit]');btn.disabled=true;$('#checkoutMessage').textContent='Submitting your order request…';
 try{const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const out=await r.json();if(!r.ok)throw new Error(out.error||'Could not place this order');$('#checkoutMessage').textContent='Order request received: '+out.order.order_number+'. The atelier will confirm delivery and payment details.';cart=[];save();f.reset()}
 catch(err){$('#checkoutMessage').textContent=err.message}
 finally{btn.disabled=false}
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=$('#installApp');if(b)b.hidden=false});
$('#installApp').addEventListener('click',async()=>{if(!installPrompt){$('#installApp').textContent='Install from browser menu';return}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installApp').hidden=true});
window.addEventListener('appinstalled',()=>{$('#installApp').hidden=true});
load();