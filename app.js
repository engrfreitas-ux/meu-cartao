import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, updateDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATPm1ZKSt29-UDL1sxJVoE7k30wmTO4vA",
  authDomain: "meu-cartao-rafael.firebaseapp.com",
  projectId: "meu-cartao-rafael",
  storageBucket: "meu-cartao-rafael.firebasestorage.app",
  messagingSenderId: "1095143893427",
  appId: "1:1095143893427:web:0a09c30e1361c6f91003c6",
  measurementId: "G-6L9PREG7YN"
};
const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const $ = id => document.getElementById(id);
let auth, db, currentUser, purchases = [], settings = {limit:0, billMonth:"2026-12", monthlyLimits:{}};
const brl = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateOnly = d => {const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const currentMonth = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
const normalizeMonth = value => String(value||"").slice(0,7) || "2026-12";
const shiftMonth = (month, n) => {const [y,m]=normalizeMonth(month).split("-").map(Number);const d=new Date(y,m-1+n,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
const monthDate = month => {const [y,m]=normalizeMonth(month).split("-").map(Number);return new Date(y,m-1,1,12)};
const monthLabel = month => monthDate(month).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
const showToast = msg => { $("toast").textContent=msg; $("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600); };
function initFirebase(){ if(!configured){showToast("Falta inserir a configuração do Firebase no app.js");return false;} const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);return true; }
async function login(){ if(!auth)return showToast("Configure o Firebase antes do login.");const provider=new GoogleAuthProvider();try{await signInWithPopup(auth,provider)}catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/popup-closed-by-user")await signInWithRedirect(auth,provider);else showToast(e.message)} }
async function loadData(){
 const pref=doc(db,"users",currentUser.uid,"settings","main");const ps=await getDoc(pref);if(ps.exists())settings={...settings,...ps.data()};
 if(!settings.billMonth)settings.billMonth="2026-12";
 const q=query(collection(db,"users",currentUser.uid,"purchases"),orderBy("date","desc"));const snap=await getDocs(q);purchases=snap.docs.map(d=>({id:d.id,...d.data(),firstBillMonth:normalizeMonth(d.data().firstBillMonth||d.data().date)}));render();
}
async function saveSettings(){settings.limit=Number($("limitInput").value||0);settings.billMonth=normalizeMonth($("billMonthInput").value||"2026-12");settings.monthlyLimits=settings.monthlyLimits||{};await setDoc(doc(db,"users",currentUser.uid,"settings","main"),settings,{merge:true});$("settingsDialog").close();render();showToast("Configurações salvas.");}
const limitForMonth = month => {const value=settings.monthlyLimits?.[month];return value===undefined||value===null||value===""?Number(settings.limit||0):Number(value);};
function installmentRows(p){const n=Math.max(1,Number(p.installments||1)),total=Number(p.amount||0),each=Math.round(total/n*100)/100;let out=[];for(let i=0;i<n;i++){let val=i===n-1?Math.round((total-each*(n-1))*100)/100:each;out.push({month:shiftMonth(p.firstBillMonth||p.date,i),value:val,index:i+1,total:n});}return out;}
function render(){
 const billMonth=normalizeMonth(settings.billMonth||"2026-12");let rows=purchases.flatMap(p=>installmentRows(p).map(r=>({...r,p})));let current=rows.filter(r=>r.month===billMonth).reduce((s,r)=>s+r.value,0);let future=rows.filter(r=>r.month>billMonth).reduce((s,r)=>s+r.value,0);const activeLimit=limitForMonth(billMonth);let available=activeLimit-current;
 $("available").textContent=brl(available);$("limitLabel").textContent=brl(activeLimit);$("spentLabel").textContent=brl(current);$("futureLabel").textContent=brl(future);
 let pct=settings.limit?Math.min(100,current/settings.limit*100):0;$("usagePct").textContent=`${Math.round(pct)}% usado`;$("progressBar").style.width=pct+"%";$("progressBar").style.background=pct>=100?"#ff8c8c":pct>=85?"#ffd166":"#52d6b5";
 $("monthLabel").textContent=monthLabel(billMonth);
 const cats={};rows.filter(r=>r.month===billMonth).forEach(r=>cats[r.p.category]=(cats[r.p.category]||0)+r.value);
 const catEntries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);$("categoryList").innerHTML=catEntries.length?catEntries.map(([name,val])=>`<div class="cat-row"><strong>${escapeHtml(name)}</strong><span>${brl(val)}</span><div class="cat-bar"><i style="width:${current?val/current*100:0}%"></i></div></div>`).join(""):'<p class="empty">Nenhum gasto nesta fatura.</p>';
 const itemHtml=p=>`<div class="purchase"><div class="purchase-main"><strong>${escapeHtml(p.description)}</strong><small>${escapeHtml(p.category)} · Compra em ${dateOnly(p.date).split("-").reverse().join("/")} · ${p.installments>1?`${p.installments}x de ${brl(p.amount/p.installments)}`:"À vista"}</small><label class="charge-month-label">1ª cobrança em<input type="month" value="${normalizeMonth(p.firstBillMonth||p.date)}" data-first-month="${p.id}" aria-label="Primeiro mês de cobrança"></label></div><div class="purchase-actions"><span class="amount-val">${brl(p.amount)}</span><button class="delete" data-delete="${p.id}" aria-label="Excluir">Excluir</button></div></div>`;
 $("recentList").innerHTML=purchases.length?purchases.slice(0,4).map(itemHtml).join(""):'<p class="empty">Adicione sua primeira compra.</p>';
 $("purchaseList").innerHTML=purchases.length?purchases.map(itemHtml).join(""):'<p class="empty">Nenhum lançamento cadastrado.</p>';
 const totals={};rows.forEach(r=>totals[r.month]=(totals[r.month]||0)+r.value);
 const latestMonth=Object.keys(totals).sort().slice(-1)[0]||billMonth;
 const monthsToShow=Math.max(12,Math.min(36,Math.round((monthDate(latestMonth)-monthDate(billMonth))/(1000*60*60*24*30.4375))+1));
 const monthKeys=Array.from({length:monthsToShow},(_,i)=>shiftMonth(billMonth,i));
 $("futureList").innerHTML=monthKeys.map(m=>{const total=totals[m]||0,limit=limitForMonth(m),balance=limit-total;return `<div class="panel future-card month-budget"><div class="month-budget-head"><h3>${escapeHtml(monthLabel(m))}</h3><button class="text-btn month-select" data-month-select="${m}">Ver no resumo</button></div><div class="month-budget-grid"><div><small>Gastos previstos</small><strong>${brl(total)}</strong></div><div><small>Disponível</small><strong class="${balance<0?'over-budget':''}">${brl(balance)}</strong></div></div><label class="month-limit-label">Limite deste mês (R$)<input type="number" min="0" step="0.01" inputmode="decimal" value="${limit.toFixed(2)}" data-month-limit="${m}" aria-label="Limite de ${escapeHtml(monthLabel(m))}"></label></div>`;}).join("");
 $("limitInput").value=settings.limit||"";$("billMonthInput").value=billMonth;$("firstMonth").value=normalizeMonth($("firstMonth").value||billMonth);
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function addPurchase(e){e.preventDefault();const amount=Number($("amount").value),n=Number($("installments").value),date=$("date").value,firstBillMonth=normalizeMonth($("firstMonth").value||settings.billMonth||"2026-12");if(!amount||amount<=0||!date||!firstBillMonth)return showToast("Confira valor, data e mês da cobrança.");await addDoc(collection(db,"users",currentUser.uid,"purchases"),{description:$("description").value.trim(),amount,category:$("category").value,date,installments:n,firstBillMonth,createdAt:serverTimestamp()});$("purchaseDialog").close();$("purchaseForm").reset();$("date").value=dateOnly(new Date());$("firstMonth").value=normalizeMonth(settings.billMonth||"2026-12");updatePreview();await loadData();showToast("Compra adicionada.");}
async function changeFirstMonth(id,value){const month=normalizeMonth(value);if(!/^\d{4}-\d{2}$/.test(month))return;await updateDoc(doc(db,"users",currentUser.uid,"purchases",id),{firstBillMonth:month});const p=purchases.find(x=>x.id===id);if(p)p.firstBillMonth=month;render();showToast("Mês de cobrança atualizado.");}
async function removePurchase(id){if(!confirm("Excluir esta compra e todas as parcelas previstas?"))return;await deleteDoc(doc(db,"users",currentUser.uid,"purchases",id));await loadData();showToast("Compra excluída.");}
function switchTab(tab){["overview","purchases","future"].forEach(t=>$(t+"Tab").classList.toggle("hidden",t!==tab));document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));}
$("loginBtn").addEventListener("click",login);$("logoutBtn").addEventListener("click",()=>signOut(auth));
$("purchaseForm").addEventListener("submit",addPurchase);$("settingsForm").addEventListener("submit",e=>{e.preventDefault();saveSettings()});
$("settingsBtn").addEventListener("click",()=>$("settingsDialog").showModal());$("addBtn").addEventListener("click",()=>{$("firstMonth").value=normalizeMonth(settings.billMonth||"2026-12");$("purchaseDialog").showModal();});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.goto)));
document.body.addEventListener("click",e=>{const b=e.target.closest("[data-delete]");if(b)removePurchase(b.dataset.delete)});
document.body.addEventListener("change",e=>{const input=e.target.closest("[data-first-month]");if(input)changeFirstMonth(input.dataset.firstMonth,input.value).catch(err=>showToast("Erro ao atualizar: "+err.message));const limitInput=e.target.closest("[data-month-limit]");if(limitInput)saveMonthlyLimit(limitInput.dataset.monthLimit,limitInput.value).catch(err=>showToast("Erro ao salvar limite: "+err.message));});
document.body.addEventListener("click",e=>{const select=e.target.closest("[data-month-select]");if(select)selectMonthForSummary(select.dataset.monthSelect).catch(err=>showToast("Erro: "+err.message));});
async function saveMonthlyLimit(month,value){settings.monthlyLimits=settings.monthlyLimits||{};settings.monthlyLimits[month]=Math.max(0,Number(value||0));await setDoc(doc(db,"users",currentUser.uid,"settings","main"),{monthlyLimits:settings.monthlyLimits},{merge:true});render();showToast(`Limite de ${monthLabel(month)} salvo.`);}
async function selectMonthForSummary(month){settings.billMonth=normalizeMonth(month);await setDoc(doc(db,"users",currentUser.uid,"settings","main"),{billMonth:settings.billMonth},{merge:true});render();switchTab("overview");showToast(`Resumo de ${monthLabel(month)}.`);}
function updatePreview(){const a=Number($("amount").value||0),n=Number($("installments").value||1);$("installmentPreview").textContent=`${n} parcela(s) de ${brl(a/n)}${n>1?" (valor aproximado)":""}`;}
$("amount").addEventListener("input",updatePreview);$("installments").addEventListener("change",updatePreview);
$("date").value=dateOnly(new Date());$("firstMonth").value=settings.billMonth;
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
if(initFirebase()){getRedirectResult(auth).catch(()=>{});onAuthStateChanged(auth,async user=>{currentUser=user;$("loginView").classList.toggle("hidden",!!user);$("appView").classList.toggle("hidden",!user);$("bottomNav").classList.toggle("hidden",!user);$("logoutBtn").classList.toggle("hidden",!user);if(user)try{await loadData()}catch(e){showToast("Erro ao carregar dados: "+e.message)}})}
