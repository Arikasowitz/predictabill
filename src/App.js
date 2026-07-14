import { useState, useMemo, useEffect, useCallback } from "react";

const APP_PASSWORD = "$KasowitzFam";
const SHEET_ID = "1kES2NceZjJX-kAaOH9KivOn78RL9NoCp-DlhF4Me8WU";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
// Will be replaced with your Apps Script URL after setup:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxv0IOw6t1cC2G2nNxaPGvzwqVE3pFxXnXpM5dHYQYwWX-abUEvID14pSXQCUhQz4-2sg/exec";

const FIXED_BILLS = [
  { id: 1,  name: "Rent",                  amount: 2640, day: 1,  category: "fixed",   recurring: true },
  { id: 2,  name: "United Refuah",         amount: 200,  day: 1,  category: "fixed",   recurring: true },
  { id: 3,  name: "Phone",                 amount: 40,   day: 1,  category: "fixed",   recurring: true },
  { id: 4,  name: "Hyundai Lease",         amount: 379,  day: 1,  category: "fixed",   recurring: true },
  { id: 5,  name: "Anshei (Tuition)",      amount: 1052, day: 5,  category: "fixed",   recurring: true },
  { id: 6,  name: "NJM Insurance",         amount: 388,  day: 11, category: "fixed",   recurring: true },
  { id: 7,  name: "Student Loan",          amount: 260,  day: 15, category: "fixed",   recurring: true },
  { id: 8,  name: "Pascack Valley Health", amount: 85,   day: 17, category: "medical", recurring: true },
  { id: 9,  name: "Northwestern Mutual",   amount: 580,  day: 20, category: "fixed",   recurring: true },
  { id: 10, name: "Verizon",               amount: 45,   day: 24, category: "fixed",   recurring: true },
  { id: 11, name: "Netflix",               amount: 8,    day: 28, category: "fixed",   recurring: true },
  { id: 12, name: "EZ Pass (est.)",        amount: 155,  day: 15, category: "utility", recurring: true },
];

const VARIABLE_BILLS = [
  { id: 101, name: "Amazon Prime Visa",       day: 1,  category: "credit",  recurring: true, hint: "Automatic payment amount from Prime Visa email" },
  { id: 102, name: "PSEG",                    day: 6,  category: "utility", recurring: true, hint: "Current balance from PSEG paperless billing email" },
  { id: 103, name: "Bank of America",         day: 14, category: "credit",  recurring: true, hint: "AutoPay Amount from BofA scheduled payment email" },
  { id: 104, name: "Chase Freedom Unlimited", day: 26, category: "credit",  recurring: true, hint: "Automatic payment amount from Chase Freedom email" },
];

const CATEGORY_META = {
  fixed:       { label: "Fixed",        color: "#3B5BDB", bg: "#EDF2FF", icon: "🏠" },
  credit:      { label: "Credit Card",  color: "#C92A2A", bg: "#FFF5F5", icon: "💳" },
  utility:     { label: "Utility",      color: "#5C940D", bg: "#F4FCE3", icon: "⚡" },
  medical:     { label: "Medical",      color: "#862E9C", bg: "#F8F0FC", icon: "🏥" },
  cardcovered: { label: "Paid by Card", color: "#888",    bg: "#F5F5F5", icon: "🔗" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TODAY = new Date();

function fmt(n) {
  if (!n && n !== 0) return "—";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function ordinal(n) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function firstDay(y, m) { return new Date(y, m, 1).getDay(); }
function totalFor(arr) { return arr.filter(b => b.category !== "cardcovered").reduce((s,b) => s+(b.amount||0), 0); }
function cardCoveredTotal(arr) { return arr.filter(b => b.category === "cardcovered").reduce((s,b) => s+(b.amount||0), 0); }
function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d) ? raw : d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}
function isCurrentMonth(y, m) { return y === TODAY.getFullYear() && m === TODAY.getMonth(); }

// ─── SHEET READ ───────────────────────────────────────────────────────────────
async function fetchSheetData() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1);
  const bills = {};
  rows.forEach(row => {
    const cols = []; let cur = "", inQ = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch==='"'){inQ=!inQ;}
      else if (ch===","&&!inQ){cols.push(cur.trim());cur="";}
      else{cur+=ch;}
    }
    cols.push(cur.trim());
    const name = cols[0];
    const amount = parseFloat((cols[1]||"").replace(/,/g,"")) || 0;
    const lastUpdated = cols[3] || "";
    if (name) bills[name] = { amount, lastUpdated };
  });
  return bills;
}

async function fetchOverrides() {
  if (SCRIPT_URL === "PASTE_SCRIPT_URL_HERE") return {};
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getOverrides`);
    const data = await res.json();
    return data || {};
  } catch(e) { return {}; }
}

async function saveOverride(key, value) {
  if (SCRIPT_URL === "PASTE_SCRIPT_URL_HERE") return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "setOverride", key, value }),
    });
  } catch(e) {}
}

// ─── CATEGORY ICON WITH CARD BADGE ───────────────────────────────────────────
function CategoryIcon({ bill, size=38 }) {
  const baseCat = bill.baseCategory || bill.category;
  const m = CATEGORY_META[baseCat] || CATEGORY_META.fixed;
  const isCovered = bill.category === "cardcovered";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:8, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.47, opacity:isCovered?0.75:1 }}>
        {m.icon}
      </div>
      {isCovered && (
        <div style={{ position:"absolute", bottom:-2, right:-2, background:"#777", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, border:"1.5px solid #fff", color:"#fff", fontWeight:900 }}>
          🔗
        </div>
      )}
    </div>
  );
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);
  function attempt() {
    if (val === APP_PASSWORD) { onUnlock(); }
    else { setError(true); setVal(""); }
  }
  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:36, width:"100%", maxWidth:340, boxShadow:"0 8px 40px rgba(0,0,0,0.10)", textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#3B5BDB", marginBottom:6 }}>PredictaBill</div>
        <div style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>Welcome back</div>
        <div style={{ fontSize:13, color:"#888", marginBottom:28 }}>Enter your password to continue</div>
        <input type="password" placeholder="Password" value={val}
          onChange={e => { setVal(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key==="Enter") attempt(); }}
          style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:error?"2px solid #C92A2A":"2px solid #e0e0e0", fontSize:16, marginBottom:10, boxSizing:"border-box", outline:"none" }}
          autoFocus />
        {error && <div style={{ color:"#C92A2A", fontSize:12, fontWeight:700, marginBottom:10 }}>Incorrect password. Try again.</div>}
        <button onClick={attempt} style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"#3B5BDB", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", marginTop:4 }}>Unlock</button>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function UpdateModal({ bill, onSave, onClose }) {
  const [val, setVal] = useState(bill.amount ? String(bill.amount) : "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:340, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#888", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Edit Amount</div>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:6 }}>{bill.name}</div>
        {bill.hint && <div style={{ fontSize:12, color:"#888", background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, lineHeight:1.5 }}>📧 {bill.hint}</div>}
        {!bill.variable && <div style={{ fontSize:12, color:"#5C940D", background:"#F4FCE3", borderRadius:8, padding:"8px 12px", marginBottom:16 }}>This change will sync across all your devices.</div>}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
          <span style={{ fontSize:20, fontWeight:700 }}>$</span>
          <input type="number" placeholder="0.00" value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter"&&val) onSave(parseFloat(val)); }}
            autoFocus style={{ flex:1, padding:"10px 12px", borderRadius:8, border:"2px solid #3B5BDB", fontSize:18, fontWeight:700 }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
          <button onClick={() => { if (val) onSave(parseFloat(val)); }} style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function EditCategoryModal({ bill, onSave, onClose }) {
  const [cat, setCat] = useState(bill.category);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:340, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#888", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Edit Category</div>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:20 }}>{bill.name}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <button key={k} onClick={() => setCat(k)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10, border:cat===k?`2px solid ${v.color}`:"2px solid #eee", background:cat===k?v.bg:"#fff", cursor:"pointer", textAlign:"left" }}>
              <span style={{ fontSize:20 }}>{v.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:cat===k?v.color:"#333" }}>{v.label}</div>
                {k==="cardcovered" && <div style={{ fontSize:11, color:"#999", marginTop:1 }}>Shown on calendar but excluded from totals</div>}
              </div>
              {cat===k && <span style={{ color:v.color, fontWeight:900 }}>✓</span>}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
          <button onClick={() => onSave(cat)} style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function AddBillModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:"", amount:"", day:1, category:"fixed", recurring:true, paidByCard:"" });
  function set(k, v) { setForm(f => ({...f,[k]:v})); }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:18, fontWeight:900, marginBottom:20 }}>Add Bill</div>
        {[["Bill Name","name","text"],["Amount ($)","amount","number"],["Day of Month","day","number"]].map(([label,key,type]) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, type==="number"?parseFloat(e.target.value):e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14 }}>
            {Object.entries(CATEGORY_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:8 }}>Frequency</label>
          <div style={{ display:"flex", gap:10 }}>
            {[["Recurring",true],["One-time",false]].map(([label,val]) => (
              <button key={String(val)} onClick={() => set("recurring",val)} style={{ flex:1, padding:"10px", borderRadius:8, border:form.recurring===val?"2px solid #3B5BDB":"2px solid #eee", background:form.recurring===val?"#EDF2FF":"#fff", color:form.recurring===val?"#3B5BDB":"#555", fontWeight:700, fontSize:13, cursor:"pointer" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>Paid by credit card? (optional)</label>
          <input type="text" placeholder="e.g. Chase Freedom, BofA..." value={form.paidByCard} onChange={e => set("paidByCard", e.target.value)}
            style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" }} />
          <div style={{ fontSize:11, color:"#888", marginTop:4 }}>If filled in, bill will be marked Paid by Card and excluded from total.</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600 }}>Cancel</button>
          <button onClick={() => {
            if (form.name && form.amount) {
              const category = form.paidByCard ? "cardcovered" : form.category;
              onSave({ ...form, amount:parseFloat(form.amount), id:Date.now(), category, baseCategory:form.category, variable:false });
            }
          }} style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800 }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── SUMMARY STRIP ────────────────────────────────────────────────────────────
function SummaryStrip({ allBills }) {
  const total = totalFor(allBills);
  const covered = cardCoveredTotal(allBills);
  const pending = allBills.filter(b => b.variable && !b.amount && b.category !== "cardcovered").length;
  return (
    <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"stretch" }}>
      <div style={{ flex:"2 1 120px", background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"10px 14px" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>
          Total Outgoing {covered>0 && <span style={{ color:"#bbb" }}>· {fmt(covered)} via card excl.</span>}
        </div>
        <div style={{ fontSize:16, fontWeight:900, color:"#C92A2A" }}>{fmt(total)}</div>
      </div>
      {pending > 0 && (
        <div style={{ flex:"1 1 80px", background:"#FFF9F0", border:"1px solid #FFE8CC", borderRadius:10, padding:"10px 14px" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#E67700", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Needs Update</div>
          <div style={{ fontSize:16, fontWeight:900, color:"#E67700" }}>{pending} bill{pending!==1?"s":""}</div>
        </div>
      )}
    </div>
  );
}

// ─── WEEK SUMMARY ─────────────────────────────────────────────────────────────
function WeekSummary({ allBills }) {
  const weeks = [[],[],[],[]];
  allBills.filter(b => b.category!=="cardcovered").forEach(b => {
    weeks[Math.min(Math.floor((b.day-1)/7),3)].push(b);
  });
  return (
    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
      {["1–7","8–14","15–21","22–31"].map((l,i) => (
        <div key={i} style={{ flex:1, background:"#fff", borderRadius:10, padding:"8px 6px", textAlign:"center", border:"1px solid #eee" }}>
          <div style={{ fontSize:9, color:"#aaa", fontWeight:700, marginBottom:2 }}>{l}</div>
          <div style={{ fontSize:13, fontWeight:900 }}>{fmt(totalFor(weeks[i]))}</div>
          <div style={{ fontSize:9, color:"#ccc", marginTop:1 }}>{weeks[i].length}x</div>
        </div>
      ))}
    </div>
  );
}

// ─── DAY DETAIL PANEL ─────────────────────────────────────────────────────────
function DayDetail({ day, month, year, bills, sheetData, onUpdateVariable, onEditCategory, onClose }) {
  if (!day || !bills.length) return null;
  const covered = cardCoveredTotal(bills);
  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e0e0e0", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", background:"#f8f9ff", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:800, fontSize:15 }}>{MONTHS[month]} {ordinal(day)}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontWeight:900, fontSize:14, color:"#C92A2A" }}>{fmt(totalFor(bills))} due</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#aaa", padding:0, lineHeight:1 }}>×</button>
        </div>
      </div>
      {bills.map(b => {
        const m = CATEGORY_META[b.baseCategory||b.category]||CATEGORY_META.fixed;
        const isCovered = b.category==="cardcovered";
        const lastUpdated = sheetData?.[b.name]?.lastUpdated;
        return (
          <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", borderBottom:"1px solid #f5f5f5", opacity:isCovered?0.7:1 }}>
            <CategoryIcon bill={b} size={34} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>
                {b.name}
                {!b.recurring && <span style={{ marginLeft:6, fontSize:9, color:"#E67700", fontWeight:700, background:"#FFF9F0", padding:"1px 4px", borderRadius:3 }}>One-time</span>}
                {isCovered && <span style={{ marginLeft:6, fontSize:9, color:"#888", fontWeight:600 }}>via card</span>}
              </div>
              <div style={{ fontSize:10, color:"#aaa", marginTop:1 }}>
                {m.label}{lastUpdated&&<span style={{ marginLeft:6, color:"#5C940D" }}>· {formatDate(lastUpdated)}</span>}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              {b.variable && !b.amount && !isCovered ? (
                <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontWeight:700, fontSize:11, cursor:"pointer" }}>Update</button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ fontWeight:900, fontSize:14, color:isCovered?"#999":"#1a1a1a" }}>{fmt(b.amount)}</div>
                  <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:5, padding:"3px 6px", fontSize:10, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>
                </div>
              )}
              <button onClick={() => onEditCategory(b)} style={{ background:"none", border:"none", cursor:"pointer", padding:"2px", fontSize:13, opacity:0.35 }}>🏷</button>
            </div>
          </div>
        );
      })}
      {covered>0 && (
        <div style={{ padding:"8px 16px", background:"#f8f8f8", fontSize:10, color:"#bbb" }}>
          🔗 {fmt(covered)} paid by card, not counted in total
        </div>
      )}
    </div>
  );
}

// ─── PRINTABLE CALENDAR ───────────────────────────────────────────────────────
function CalendarPrintPage({ allBills, year, month, onDone }) {
  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => { if (!map[b.day]) map[b.day]=[]; map[b.day].push(b); });
    return map;
  }, [allBills]);
  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length%7!==0) cells.push(null);
  const monthName = MONTHS[month];
  const fileName = `PredictaBill-${monthName}-${year}`;
  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:2000, overflow:"auto" }}>
      <div className="no-print" style={{ position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
        <button onClick={onDone} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Done</button>
        <div style={{ fontSize:12, color:"#888" }}>{fileName}</div>
        <button onClick={() => { document.title=fileName; window.print(); }} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🖨 Print / PDF</button>
      </div>
      <style>{`@media print{.no-print{display:none!important;}@page{size:11in 8.5in;margin:0.35in;}}`}</style>
      <div style={{ padding:"20px", maxWidth:1050, margin:"0 auto", fontFamily:"-apple-system,sans-serif", color:"#1a1a1a" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", borderBottom:"3px solid #1a1a1a", paddingBottom:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:900, color:"#3B5BDB" }}>PredictaBill</div>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:"-0.5px" }}>{monthName} {year}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#C92A2A" }}>Total: {fmt(totalFor(allBills))}</div>
            <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>🔗 = paid by card, excluded</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1.5, border:"1.5px solid #ccc", background:"#ccc", borderRadius:6, overflow:"hidden" }}>
          {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d => (
            <div key={d} style={{ background:"#1a1a1a", padding:"7px 4px", textAlign:"center", fontSize:10, fontWeight:700, color:"#fff", letterSpacing:"0.04em" }}>{d}</div>
          ))}
          {cells.map((d,i) => {
            const dayBills = d?(billsByDay[d]||[]):[];
            const dayTotal = totalFor(dayBills);
            const todayFlag = d===TODAY.getDate()&&month===TODAY.getMonth()&&year===TODAY.getFullYear();
            return (
              <div key={i} style={{ background:todayFlag?"#f0f4ff":"#fff", minHeight:100, padding:"5px 6px", borderLeft:todayFlag?"2px solid #3B5BDB":"none" }}>
                {d && (
                  <div>
                    <div style={{ fontWeight:todayFlag?900:600, fontSize:12, color:todayFlag?"#3B5BDB":"#333", marginBottom:4 }}>{d}</div>
                    {dayBills.map(b => {
                      const isCovered = b.category==="cardcovered";
                      const m = CATEGORY_META[b.baseCategory||b.category]||CATEGORY_META.fixed;
                      return (
                        <div key={b.id} style={{ fontSize:9.5, fontWeight:600, marginBottom:2, color:m.color, display:"flex", alignItems:"baseline", gap:3, opacity:isCovered?0.5:1 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:m.color, display:"inline-block", flexShrink:0 }} />
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"85%" }}>
                            {isCovered?"🔗 ":""}{b.name.split(" ").slice(0,2).join(" ")} {b.amount?fmt(b.amount):"TBD"}
                          </span>
                        </div>
                      );
                    })}
                    {dayTotal>0 && <div style={{ fontSize:9, fontWeight:900, borderTop:"1px solid #eee", marginTop:3, paddingTop:2, color:"#C92A2A", textAlign:"right" }}>{fmt(dayTotal)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:14, marginTop:12, flexWrap:"wrap" }}>
          {Object.entries(CATEGORY_META).map(([k,v]) => (
            <span key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:v.color }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:v.color, display:"inline-block" }} />{v.label}
            </span>
          ))}
        </div>
        <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {["Week 1 · 1–7","Week 2 · 8–14","Week 3 · 15–21","Week 4 · 22–31"].map((l,i) => {
            const w = allBills.filter(b=>b.category!=="cardcovered"&&Math.min(Math.floor((b.day-1)/7),3)===i);
            return (
              <div key={i} style={{ border:"1px solid #eee", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"#888", marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:900 }}>{fmt(totalFor(w))}</div>
                <div style={{ fontSize:9, color:"#aaa", marginTop:1 }}>{w.length} payment{w.length!==1?"s":""}</div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop:"1px solid #eee", marginTop:12, paddingTop:8, display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa" }}>
          <span>PredictaBill · {monthName} {year} · Forward-looking forecast</span>
          <span>Printed {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── PRINTABLE LIST ───────────────────────────────────────────────────────────
function ListPrintPage({ allBills, year, month, onDone }) {
  const sorted = [...allBills].sort((a,b)=>a.day-b.day);
  const total = totalFor(sorted);
  const covered = cardCoveredTotal(sorted);
  const weeks = [[],[],[],[]];
  sorted.filter(b=>b.category!=="cardcovered").forEach(b=>{weeks[Math.min(Math.floor((b.day-1)/7),3)].push(b);});
  const monthName = MONTHS[month];
  const fileName = `PredictaBill-${monthName}-${year}-List`;
  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:2000, overflow:"auto" }}>
      <div className="no-print" style={{ position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
        <button onClick={onDone} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Done</button>
        <div style={{ fontSize:12, color:"#888" }}>{fileName}</div>
        <button onClick={() => { document.title=fileName; window.print(); }} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🖨 Print / PDF</button>
      </div>
      <style>{`@media print{.no-print{display:none!important;}@page{size:8.5in 11in;margin:0.6in;}}`}</style>
      <div style={{ padding:"24px", maxWidth:760, margin:"0 auto", fontFamily:"Georgia,serif", color:"#1a1a1a", fontSize:13, lineHeight:1.6 }}>
        <div style={{ borderBottom:"3px solid #1a1a1a", paddingBottom:12, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:900, color:"#3B5BDB", marginBottom:2 }}>PredictaBill</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-1px" }}>{monthName} {year}</div>
          <div style={{ fontSize:11, color:"#777", marginTop:2 }}>Monthly Cash Flow Forecast · Outgoing payments only</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
          {[["Total Outgoing",fmt(total),"#C92A2A"],["Fixed",fmt(totalFor(sorted.filter(b=>b.category!=="credit"&&b.category!=="cardcovered"))),"#3B5BDB"],["Credit Cards",fmt(totalFor(sorted.filter(b=>b.category==="credit"))),"#C92A2A"],["Paid by Card",covered>0?fmt(covered)+" excl.":"—","#888"]].map(([l,v,c])=>(
            <div key={l} style={{ border:"1px solid #ddd", borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"#888", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:900, color:c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
          {["Week 1 · 1–7","Week 2 · 8–14","Week 3 · 15–21","Week 4 · 22–31"].map((l,i)=>(
            <div key={i} style={{ border:"1px solid #ddd", borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"#888", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:900 }}>{fmt(totalFor(weeks[i]))}</div>
              <div style={{ fontSize:9, color:"#aaa", marginTop:1 }}>{weeks[i].length} payment{weeks[i].length!==1?"s":""}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, marginBottom:6 }}>All Bills · Chronological</div>
        {sorted.map(b => {
          const isCovered = b.category==="cardcovered";
          const m = CATEGORY_META[b.baseCategory||b.category]||CATEGORY_META.fixed;
          return (
            <div key={b.id} style={{ display:"flex", padding:"6px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center", gap:8, opacity:isCovered?0.5:1 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:m.color, display:"inline-block", flexShrink:0 }} />
              <div style={{ width:44, fontSize:11, fontWeight:800, flexShrink:0, color:m.color }}>{ordinal(b.day)}</div>
              <div style={{ flex:1, fontWeight:600, fontSize:12 }}>
                {isCovered?"🔗 ":""}{b.name}
                {!b.recurring&&<span style={{ marginLeft:6, fontSize:9, color:"#E67700", fontWeight:700 }}>(one-time)</span>}
                {b.variable&&!b.amount&&<span style={{ marginLeft:4, fontSize:9, color:"#E67700" }}>est.</span>}
              </div>
              <div style={{ fontWeight:800, fontSize:13, flexShrink:0, color:isCovered?"#999":"#1a1a1a" }}>
                {b.amount?fmt(b.amount):<span style={{ color:"#E67700", fontSize:10 }}>TBD</span>}
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderTop:"2px solid #1a1a1a", marginTop:4, fontWeight:900, fontSize:14 }}>
          <span>TOTAL (excl. paid by card)</span><span>{fmt(total)}</span>
        </div>
        {covered>0&&<div style={{ fontSize:10, color:"#999", paddingTop:4 }}>🔗 {fmt(covered)} card-covered items shown for reference, excluded from total</div>}
        <div style={{ borderTop:"1px solid #eee", marginTop:20, paddingTop:8, display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa" }}>
          <span>PredictaBill · {monthName} {year}</span>
          <span>Printed {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ allBills, year, month, onUpdateVariable, onEditCategory, sheetData }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => { if (!map[b.day]) map[b.day]=[]; map[b.day].push(b); });
    return map;
  }, [allBills]);

  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length%7!==0) cells.push(null);

  const isTodayCell = d => d===TODAY.getDate()&&isCurrentMonth(year,month);
  const isPast = d => new Date(year,month,d) < new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  const estimated = allBills.filter(b=>b.variable&&!b.amount&&b.category!=="cardcovered");
  const selectedBills = selectedDay?(billsByDay[selectedDay]||[]):[];

  const grid = (
    <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
      <div style={{ minWidth:340 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, borderRadius:10, overflow:"hidden", border:"1px solid #e0e0e0", background:"#e0e0e0" }}>
          {["S","M","T","W","T","F","S"].map((d,i) => (
            <div key={i} style={{ background:"#f5f5f5", padding:"6px 0", textAlign:"center", fontSize:11, fontWeight:700, color:"#666" }}>{d}</div>
          ))}
          {cells.map((d,i) => {
            if (!d) return <div key={i} style={{ background:"#fafafa", minHeight:78 }} />;
            const dayBills = billsByDay[d]||[];
            const dayTotal = totalFor(dayBills);
            const selected = selectedDay===d;
            const hasUnknown = dayBills.filter(b=>b.category!=="cardcovered").some(b=>b.variable&&!b.amount);
            return (
              <div key={d} onClick={() => setSelectedDay(selected?null:d)}
                style={{ background:selected?"#EDF2FF":"#fff", minHeight:78, padding:"5px 4px", cursor:dayBills.length?"pointer":"default", borderLeft:selected?"3px solid #3B5BDB":"3px solid transparent", opacity:isPast(d)?0.5:1 }}>
                <div style={{ fontSize:11, fontWeight:isTodayCell(d)?900:500, color:isTodayCell(d)?"#fff":"#333", background:isTodayCell(d)?"#3B5BDB":"transparent", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:3 }}>{d}</div>
                {dayBills.slice(0,2).map(b => {
                  const m = CATEGORY_META[b.baseCategory||b.category]||CATEGORY_META.fixed;
                  const isCovered = b.category==="cardcovered";
                  return (
                    <div key={b.id} style={{ background:m.bg, color:m.color, borderRadius:3, padding:"1px 4px", marginBottom:2, fontSize:9, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", opacity:isCovered?0.6:1 }}>
                      {isCovered?"🔗 ":""}{b.variable&&!b.amount?"?":""}{b.name.split(" ")[0]} {b.amount?fmt(b.amount):""}
                    </div>
                  );
                })}
                {dayBills.length>2&&<div style={{ fontSize:8, color:"#aaa" }}>+{dayBills.length-2}</div>}
                {dayTotal>0&&<div style={{ fontSize:9, fontWeight:900, color:hasUnknown?"#E67700":"#333", textAlign:"right" }}>{fmt(dayTotal)}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const detail = selectedDay && selectedBills.length > 0 && (
    <DayDetail day={selectedDay} month={month} year={year} bills={selectedBills} sheetData={sheetData} onUpdateVariable={onUpdateVariable} onEditCategory={onEditCategory} onClose={() => setSelectedDay(null)} />
  );

  return (
    <div>
      <SummaryStrip allBills={allBills} />
      {estimated.length>0 && (
        <div style={{ background:"#FFF9F0", border:"1px solid #FFE8CC", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#E67700", marginBottom:6 }}>Tap to update variable bills:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {estimated.map(b => (
              <button key={b.id} onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"6px 12px", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ {b.name}</button>
            ))}
          </div>
        </div>
      )}
      {sheetData&&Object.keys(sheetData).length>0&&(
        <div style={{ background:"#F4FCE3", border:"1px solid #C5E8A0", borderRadius:10, padding:"8px 14px", marginBottom:12, fontSize:11, color:"#5C940D", fontWeight:600 }}>
          ● Auto-updated: {Object.entries(sheetData).filter(([,v])=>v.amount).map(([k,v])=>`${k} ${fmt(v.amount)}`).join(" · ")}
        </div>
      )}
      {isDesktop && selectedDay && selectedBills.length>0 ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14, alignItems:"start" }}>
          <div>{grid}</div>
          <div style={{ position:"sticky", top:14 }}>{detail}</div>
        </div>
      ) : (
        <div>{grid}{selectedDay&&selectedBills.length>0&&<div style={{ marginTop:10 }}>{detail}</div>}</div>
      )}
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ allBills, year, month, onUpdateVariable, onEditCategory, sheetData }) {
  const [reviewMode, setReviewMode] = useState(false);
  const sorted = [...allBills].sort((a,b)=>a.day-b.day);
  const isCurMonth = isCurrentMonth(year,month);
  const todayDate = TODAY.getDate();
  const upcoming = sorted.filter(b=>!isCurMonth||b.day>=todayDate);
  const past = sorted.filter(b=>isCurMonth&&b.day<todayDate);

  function BillRow({ b }) {
    const m = CATEGORY_META[b.baseCategory||b.category]||CATEGORY_META.fixed;
    const isCovered = b.category==="cardcovered";
    const needsUpdate = b.variable&&!b.amount&&!isCovered;
    const lastUpdated = sheetData?.[b.name]?.lastUpdated;
    if (reviewMode) {
      return (
        <div style={{ display:"flex", padding:"8px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center", gap:8, opacity:isCovered?0.5:1 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:m.color, display:"inline-block", flexShrink:0 }} />
          <div style={{ width:40, fontWeight:800, fontSize:13, flexShrink:0 }}>{b.day}</div>
          <div style={{ flex:1, fontWeight:600, fontSize:14 }}>
            {isCovered?"🔗 ":""}{b.name}
            {!b.recurring&&<span style={{ marginLeft:6, fontSize:10, color:"#E67700", fontWeight:700 }}>1x</span>}
          </div>
          <div style={{ fontWeight:900, fontSize:15, color:isCovered?"#999":"#1a1a1a" }}>
            {b.amount?fmt(b.amount):<span style={{ fontSize:11, color:"#E67700" }}>TBD</span>}
          </div>
        </div>
      );
    }
    return (
      <div style={{ background:"#fff", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10, border:`1px solid ${needsUpdate?"#FFE8CC":"#eee"}`, opacity:isCovered?0.75:1 }}>
        <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:16, color:isCovered?"#999":"#1a1a1a", lineHeight:1 }}>{b.day}</div>
          <div style={{ fontSize:9, fontWeight:700, color:"#bbb", textTransform:"uppercase" }}>{MONTHS[month].slice(0,3)}</div>
        </div>
        <CategoryIcon bill={b} size={34} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>
            {b.name}
            {!b.recurring&&<span style={{ marginLeft:6, fontSize:9, color:"#E67700", fontWeight:700, background:"#FFF9F0", padding:"1px 4px", borderRadius:3 }}>One-time</span>}
            {isCovered&&<span style={{ marginLeft:6, fontSize:9, color:"#888", fontWeight:600 }}>via card</span>}
          </div>
          <div style={{ fontSize:10, color:"#aaa", marginTop:1 }}>
            {isCovered?"Paid by card · excluded":m.label}
            {lastUpdated&&!isCovered&&<span style={{ marginLeft:6, color:"#5C940D" }}>· {formatDate(lastUpdated)}</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {needsUpdate ? (
            <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"6px 10px", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Add</button>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ fontWeight:900, fontSize:14, color:isCovered?"#999":"#1a1a1a" }}>{fmt(b.amount)}</div>
              <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:5, padding:"3px 6px", fontSize:10, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>
            </div>
          )}
          <button onClick={() => onEditCategory(b)} style={{ background:"none", border:"none", cursor:"pointer", padding:"2px", fontSize:13, opacity:0.35 }}>🏷</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SummaryStrip allBills={allBills} />
      <WeekSummary allBills={allBills} />
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        <div style={{ display:"flex", background:"#f0f0f0", borderRadius:8, padding:3, gap:2 }}>
          {[["Edit",false],["Review",true]].map(([label,mode]) => (
            <button key={label} onClick={() => setReviewMode(mode)} style={{ padding:"6px 14px", borderRadius:6, border:"none", background:reviewMode===mode?"#fff":"transparent", fontWeight:reviewMode===mode?700:500, fontSize:12, cursor:"pointer", color:reviewMode===mode?"#3B5BDB":"#666", boxShadow:reviewMode===mode?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>{label}</button>
          ))}
        </div>
      </div>
      {reviewMode ? (
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #eee", padding:"14px 16px" }}>
          {sorted.map(b => <BillRow key={b.id} b={b} />)}
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"2px solid #1a1a1a", marginTop:4, fontWeight:900, fontSize:15 }}>
            <span>TOTAL</span><span>{fmt(totalFor(sorted))}</span>
          </div>
        </div>
      ) : (
        <div>
          {upcoming.length>0&&(
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{isCurMonth?"Upcoming":"All Bills"}</div>
              {upcoming.map(b=><BillRow key={b.id} b={b}/>)}
            </div>
          )}
          {past.length>0&&(
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.08em", margin:"16px 0 10px" }}>Already Passed</div>
              {past.map(b=><BillRow key={b.id} b={b}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth());
  const [view, setView] = useState("calendar");
  const [printMode, setPrintMode] = useState(null);

  const [variableAmounts, setVariableAmounts] = useState({});
  const [fixedOverrides, setFixedOverrides] = useState({});
  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [extraBills, setExtraBills] = useState([]);
  const [overridesLoaded, setOverridesLoaded] = useState(false);

  const [updatingBill, setUpdatingBill] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sheetData, setSheetData] = useState({});
  const [sheetStatus, setSheetStatus] = useState("loading");

  const monthKey = `${year}-${month}`;
  const onCurrentMonth = isCurrentMonth(year, month);
  const isFuture = new Date(year,month,1) > new Date(TODAY.getFullYear(),TODAY.getMonth(),1);

  // Load overrides from Google Sheet on unlock
  useEffect(() => {
    if (!unlocked) return;
    fetchSheetData().then(data => { setSheetData(data); setSheetStatus("ok"); }).catch(()=>setSheetStatus("error"));
    fetchOverrides().then(overrides => {
      if (overrides.fixedOverrides) setFixedOverrides(overrides.fixedOverrides);
      if (overrides.categoryOverrides) setCategoryOverrides(overrides.categoryOverrides);
      if (overrides.extraBills) setExtraBills(overrides.extraBills);
      if (overrides.variableAmounts) setVariableAmounts(overrides.variableAmounts);
      setOverridesLoaded(true);
    });
  }, [unlocked]);

  // Fallback: also save to localStorage
  useEffect(() => {
    if (!overridesLoaded) return;
    const data = { variableAmounts, fixedOverrides, categoryOverrides, extraBills };
    try { localStorage.setItem("predictabill_v2", JSON.stringify(data)); } catch(e) {}
    saveOverride("all", data);
  }, [variableAmounts, fixedOverrides, categoryOverrides, extraBills, overridesLoaded]);

  const allBills = useMemo(() => {
    const fixed = FIXED_BILLS.map(b => ({
      ...b, variable:false,
      amount: fixedOverrides[b.id]??b.amount,
      category: categoryOverrides[b.id]??b.category,
      baseCategory: b.category,
    }));
    const variable = VARIABLE_BILLS.map(b => {
      const sheetAmount = sheetData[b.name]?.amount;
      const manualAmount = variableAmounts[`${monthKey}-${b.id}`];
      return { ...b, variable:true, amount:manualAmount||sheetAmount||0, category:categoryOverrides[b.id]??b.category, baseCategory:b.category };
    });
    const extra = extraBills.filter(b=>b.recurring||b.monthKey===monthKey).map(b=>({...b,variable:false}));
    return [...fixed,...variable,...extra];
  }, [variableAmounts,fixedOverrides,categoryOverrides,extraBills,monthKey,sheetData]);

  function saveAmount(bill, amount) {
    if (!bill.variable) { setFixedOverrides(f=>({...f,[bill.id]:amount})); }
    else { setVariableAmounts(v=>({...v,[`${monthKey}-${bill.id}`]:amount})); }
    setUpdatingBill(null);
  }
  function saveCategory(bill, newCat) {
    setCategoryOverrides(c=>({...c,[bill.id]:newCat}));
    setEditingCategory(null);
  }
  function addExtraBill(bill) {
    setExtraBills(bs=>[...bs,{...bill,monthKey}]);
    setShowAddModal(false);
  }
  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  function goToday() { setMonth(TODAY.getMonth()); setYear(TODAY.getFullYear()); }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  if (printMode==="calendar") return <CalendarPrintPage allBills={allBills} year={year} month={month} onDone={()=>setPrintMode(null)} />;
  if (printMode==="list") return <ListPrintPage allBills={allBills} year={year} month={month} onDone={()=>setPrintMode(null)} />;

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F8", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {updatingBill && <UpdateModal bill={updatingBill} onSave={amt=>saveAmount(updatingBill,amt)} onClose={()=>setUpdatingBill(null)} />}
      {editingCategory && <EditCategoryModal bill={editingCategory} onSave={cat=>saveCategory(editingCategory,cat)} onClose={()=>setEditingCategory(null)} />}
      {showAddModal && <AddBillModal onSave={addExtraBill} onClose={()=>setShowAddModal(false)} />}

      {/* Logo bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"0 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ padding:"12px 0", fontWeight:900, fontSize:18, letterSpacing:"-0.5px" }}>
          <span style={{ color:"#3B5BDB" }}>Predict</span>aBill
        </div>
        <div style={{ fontSize:10, color:"#aaa" }}>
          {sheetStatus==="ok"&&<span style={{ color:"#5C940D", fontWeight:700 }}>● Live</span>}
          {sheetStatus==="loading"&&<span>Syncing…</span>}
          {sheetStatus==="error"&&<span style={{ color:"#E67700", fontWeight:700 }}>⚠ Offline</span>}
        </div>
      </div>

      {/* Month nav */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
        <button onClick={prevMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>←</button>
        <div style={{ fontWeight:900, fontSize:16, letterSpacing:"-0.3px", minWidth:160, textAlign:"center" }}>{MONTHS[month]} {year}</div>
        <button onClick={nextMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>→</button>
        {!onCurrentMonth && (
          <button onClick={goToday} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#3B5BDB", fontWeight:700, padding:"4px 6px", textDecoration:"underline" }}>
            Back to today
          </button>
        )}
      </div>

      {/* Action bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"8px 14px", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", background:"#f0f0f0", borderRadius:8, padding:3, gap:2 }}>
          {[["calendar","Calendar"],["list","List"]].map(([id,label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:view===id?"#fff":"transparent", fontWeight:view===id?700:500, fontSize:13, cursor:"pointer", color:view===id?"#3B5BDB":"#666", boxShadow:view===id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{label}</button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        <button onClick={() => setShowAddModal(true)} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Add</button>
        <button onClick={() => setPrintMode(view==="calendar"?"calendar":"list")} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"7px 12px", fontWeight:700, fontSize:13, cursor:"pointer", color:"#333", display:"flex", alignItems:"center", gap:5 }}>
          <span>🖨</span><span style={{ fontSize:12 }}>Print</span>
        </button>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"14px 12px" }}>
        {view==="calendar"&&<CalendarView allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} onEditCategory={setEditingCategory} sheetData={sheetData} />}
        {view==="list"&&<ListView allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} onEditCategory={setEditingCategory} sheetData={sheetData} />}
      </div>
    </div>
  );
}
