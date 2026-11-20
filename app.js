// Configure este arquivo com os dados do app Web do Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let auth, db, currentUser, purchases = [], settings = {limit:0, closingDay:20};
const brl = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateOnly = d => {const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const monthKey = d => {const x=new Date(d+"T12:00:00");return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`};
const shiftMonth = (date, n) => {const d=new Date(date+"T12:00:00");d.setDate(1);d.setMonth(d.getMonth()+n);return dateOnly(d)};
const showToast = msg => { $("toast").textContent=msg; $("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400); };
function initFirebase(){ if(!configured){showToast("Falta inserir a configuração do Firebase no app.js");return false;} const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);return true; }
async function login(){ if(!auth)return showToast("Configure o Firebase antes do login.");const provider=new GoogleAuthProvider();try{await signInWithPopup(auth,provider)}catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/popup-closed-by-user")await signInWithRedirect(auth,provider);else showToast(e.message)} }
async function loadData(){
 const pref=doc(db,"users",currentUser.uid,"settings","main");const ps=await getDoc(pref);if(ps.exists())settings={...settings,...ps.data()};
 const q=query(collection(db,"users",currentUser.uid,"purchases"),orderBy("date","desc"));const snap=await getDocs(q);purchases=snap.docs.map(d=>({id:d.id,...d.data()}));render();
}
async function saveSettings(){settings.limit=Number($("limitInput").value||0);settings.closingDay=Number($("closingDay").value||20);await setDoc(doc(db,"users",currentUser.uid,"settings","main"),settings);$("settingsDialog").close();render();showToast("Configurações salvas.");}
function installmentRows(p){const n=Number(p.installments||1),total=Number(p.amount),each=Math.round(total/n*100)/100;let out=[];for(let i=0;i<n;i++){let val=i===n-1?Math.round((total-each*(n-1))*100)/100:each;out.push({month:shiftMonth(p.firstBillMonth||p.date,i),value:val,index:i+1,total:n});}return out;}
function getCurrentBillMonth(){const now=new Date(),day=now.getDate();let y=now.getFullYear(),m=now.getMonth();if(day>settings.closingDay)m++;return `${y}-${String(m+1).padStart(2,"0")}`;}
function render(){
 const billMonth=getCurrentBillMonth();let rows=purchases.flatMap(p=>installmentRows(p).map(r=>({...r,p})));let current=rows.filter(r=>r.month===billMonth).reduce((s,r)=>s+r.value,0);let future=rows.filter(r=>r.month>billMonth).reduce((s,r)=>s+r.value,0);let available=settings.limit-current;
 $("available").textContent=brl(available);$("limitLabel").textContent=brl(settings.limit);$("spentLabel").textContent=brl(current);$("futureLabel").textContent=brl(future);
 let pct=settings.limit?Math.min(100,current/settings.limit*100):0;$("usagePct").textContent=`${Math.round(pct)}% usado`;$("progressBar").style.width=pct+"%";$("progressBar").style.background=pct>=100?"#ff8c8c":pct>=85?"#ffd166":"#52d6b5";
 $("monthLabel").textContent=billMonth.split("-").reverse().join("/");
 const cats={};rows.filter(r=>r.month===billMonth).forEach(r=>cats[r.p.category]=(cats[r.p.category]||0)+r.value);
 const catEntries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);$("categoryList").innerHTML=catEntries.length?catEntries.map(([name,val])=>`<div class="cat-row"><strong>${escapeHtml(name)}</strong><span>${brl(val)}</span><div class="cat-bar"><i style="width:${current?val/current*100:0}%"></i></div></div>`).join(""):'<p class="empty">Nenhum gasto nesta fatura.</p>';
 const itemHtml=p=>`<div class="purchase"><div><strong>${escapeHtml(p.description)}</strong><small>${escapeHtml(p.category)} · ${dateOnly(p.date).split("-").reverse().join("/")} · ${p.installments>1?`${p.installments}x de ${brl(p.amount/p.installments)}`:"À vista"}</small></div><div><span class="amount-val">${brl(p.amount)}</span><button class="delete" data-delete="${p.id}" aria-label="Excluir">Excluir</button></div></div>`;
 $("recentList").innerHTML=purchases.length?purchases.slice(0,4).map(itemHtml).join(""):'<p class="empty">Adicione sua primeira compra.</p>';
 $("purchaseList").innerHTML=purchases.length?purchases.map(itemHtml).join(""):'<p class="empty">Nenhum lançamento cadastrado.</p>';
 const months={};rows.filter(r=>r.month>billMonth).forEach(r=>months[r.month]=(months[r.month]||0)+r.value);
 $("futureList").innerHTML=Object.keys(months).sort().length?Object.keys(months).sort().map(m=>`<div class="panel future-card"><h3>${m.split("-").reverse().join("/")}</h3><p>Total previsto: <strong>${brl(months[m])}</strong></p></div>`).join(""):'<div class="panel empty">Nenhuma parcela futura cadastrada.</div>';
 $("limitInput").value=settings.limit||"";$("closingDay").value=settings.closingDay||20;
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function addPurchase(e){e.preventDefault();const amount=Number($("amount").value),n=Number($("installments").value),date=$("date").value;const firstBillMonth=shiftMonth(date,Number($("firstMonth").value));await addDoc(collection(db,"users",currentUser.uid,"purchases"),{description:$("description").value.trim(),amount,category:$("category").value,date,installments:n,firstBillMonth,createdAt:serverTimestamp()});$("purchaseDialog").close();$("purchaseForm").reset();$("date").value=dateOnly(new Date());await loadData();showToast("Compra adicionada.");}
async function removePurchase(id){if(!confirm("Excluir esta compra e todas as parcelas previstas?"))return;await deleteDoc(doc(db,"users",currentUser.uid,"purchases",id));await loadData();showToast("Compra excluída.");}
function switchTab(tab){["overview","purchases","future"].forEach(t=>$(t+"Tab").classList.toggle("hidden",t!==tab));document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));}
$("loginBtn").addEventListener("click",login);$("logoutBtn").addEventListener("click",()=>signOut(auth));
$("purchaseForm").addEventListener("submit",addPurchase);$("settingsForm").addEventListener("submit",e=>{e.preventDefault();saveSettings()});
$("settingsBtn").addEventListener("click",()=>$("settingsDialog").showModal());$("addBtn").addEventListener("click",()=>$("purchaseDialog").showModal());
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.goto)));
document.body.addEventListener("click",e=>{const b=e.target.closest("[data-delete]");if(b)removePurchase(b.dataset.delete)});
function updatePreview(){const a=Number($("amount").value||0),n=Number($("installments").value||1);$("installmentPreview").textContent=`${n} parcela(s) de ${brl(a/n)}${n>1?" (valor aproximado)":""}`;}
$("amount").addEventListener("input",updatePreview);$("installments").addEventListener("change",updatePreview);
$("date").value=dateOnly(new Date());
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
if(initFirebase()){getRedirectResult(auth).catch(()=>{});onAuthStateChanged(auth,async user=>{currentUser=user;$("loginView").classList.toggle("hidden",!!user);$("appView").classList.toggle("hidden",!user);$("bottomNav").classList.toggle("hidden",!user);$("logoutBtn").classList.toggle("hidden",!user);if(user)try{await loadData()}catch(e){showToast("Erro ao carregar dados: "+e.message)}})}
