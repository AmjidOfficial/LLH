(()=> {
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api=async(path,opts={})=>{const r=await fetch(path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
 let store='top-fashion-leather',reviews=[],comments=[];
 async function load(){try{const s=$('#storeSelect')?.value||store;store=s;const d=await api('/api/community-management?store='+encodeURIComponent(store));reviews=d.reviews||[];comments=d.comments||[];render();}catch(e){const n=$('#notice');if(n)n.textContent=e.message;}}
 function actions(kind,x){return '<div class="row-actions">'+(x.status==='pending'?'<button data-moderate="'+kind+'" data-id="'+x.id+'" data-status="approved">Approve</button>':'')+(x.status!=='rejected'?'<button data-moderate="'+kind+'" data-id="'+x.id+'" data-status="rejected">Reject</button>':'<button data-moderate="'+kind+'" data-id="'+x.id+'" data-status="pending">Restore</button>')+'<button data-remove="'+kind+'" data-id="'+x.id+'">Delete</button></div>'}
 function render(){
  const rp=reviews.filter(x=>x.status==='pending').length,cp=comments.filter(x=>x.status==='pending').length;
  $('#reviewPendingCount').textContent=rp+' pending';$('#commentPendingCount').textContent=cp+' pending';
  $('#communityReviews').innerHTML=reviews.map(x=>'<article class="content-item"><div class="content-main"><div class="content-meta"><span class="tag">'+esc(x.status)+'</span><span class="tag">'+('★'.repeat(x.rating))+'</span></div><b>'+esc(x.title)+'</b><small>'+esc(x.customer_name)+' · '+esc(x.product_name||'Store review')+' · '+new Date(x.created_at).toLocaleString()+'</small><p>'+esc(x.body)+'</p>'+actions('review',x)+'</div></article>').join('')||'<p>No customer reviews yet.</p>';
  $('#communityComments').innerHTML=comments.map(x=>'<article class="content-item"><div class="content-main"><div class="content-meta"><span class="tag">'+esc(x.status)+'</span></div><b>'+esc(x.post_title)+'</b><small>'+esc(x.customer_name)+' · '+new Date(x.created_at).toLocaleString()+'</small><p>'+esc(x.body)+'</p>'+actions('comment',x)+'</div></article>').join('')||'<p>No comments yet.</p>';
  document.querySelectorAll('[data-moderate]').forEach(b=>b.onclick=()=>moderate(b.dataset.moderate,b.dataset.id,b.dataset.status));
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>remove(b.dataset.remove,b.dataset.id));
 }
 async function moderate(kind,id,status){try{await api('/api/community-management',{method:'PATCH',body:JSON.stringify({store,kind,id,status})});await load();const n=$('#notice');if(n)n.textContent='Submission '+status+'.';}catch(e){const n=$('#notice');if(n)n.textContent=e.message;}}
 async function remove(kind,id){if(!confirm('Permanently delete this submission?'))return;try{await api('/api/community-management',{method:'DELETE',body:JSON.stringify({store,kind,id})});await load();}catch(e){const n=$('#notice');if(n)n.textContent=e.message;}}
 document.querySelectorAll('.nav[data-view="community"],[data-jump="community"]').forEach(b=>b.addEventListener('click',load));
 $('#refreshCommunity')?.addEventListener('click',load);$('#storeSelect')?.addEventListener('change',load);
})();