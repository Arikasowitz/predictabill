import { useState, useMemo, useEffect } from "react";

const APP_PASSWORD = "$KasowitzFam";
const SHEET_ID = "1kES2NceZjJX-kAaOH9KivOn78RL9NoCp-DlhF4Me8WU";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

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
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m) { return new Date(y, m, 1).getDay(); }
function totalFor(arr) { return arr.filter(b => b.category !== "cardcovered").reduce((s, b) => s + (b.amount || 0), 0); }
function cardCoveredTotal(arr) { return arr.filter(b => b.category === "cardcovered").reduce((s, b) => s + (b.amount || 0), 0); }

function formatSheetDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function fetchSheetData() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1);
  const data = {};
  rows.forEach(row => {
    const cols = row.split(",").map(c => c.replace(/^"|"$/g, "").trim());
    const name = cols[0];
    const amount = parseFloat(cols[1]?.replace(/,/g, "")) || 0;
    const lastUpdated = cols[3] || "";
    if (name) data[name] = { amount, lastUpdated };
  });
  return data;
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);

  function attempt() {
    if (val === APP_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setVal("");
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:36, width:"100%", maxWidth:340, boxShadow:"0 8px 40px rgba(0,0,0,0.10)", textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#3B5BDB", marginBottom:6 }}>PredictaBill</div>
        <div style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>Welcome back</div>
        <div style={{ fontSize:13, color:"#888", marginBottom:28 }}>Enter your password to continue</div>
        <input
          type="password" placeholder="Password" value={val}
          onChange={e => { setVal(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === "Enter") attempt(); }}
          style={{ width:"100%", padding:"12px 14px", borderRadius:10, border: error ? "2px solid #C92A2A" : "2px solid #e0e0e0", fontSize:16, marginBottom:10, boxSizing:"border-box", outline:"none" }}
          autoFocus
        />
        {error && <div style={{ color:"#C92A2A", fontSize:12, fontWeight:700, marginBottom:10 }}>Incorrect password. Try again.</div>}
        <button onClick={attempt} style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"#3B5BDB", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", marginTop:4 }}>
          Unlock
        </button>
      </div>
    </div>
  );
}

// ─── UPDATE AMOUNT MODAL ──────────────────────────────────────────────────────
function UpdateModal({ bill, onSave, onClose }) {
  const [val, setVal] = useState(bill.amount ? String(bill.amount) : "");
  const isFixed = !bill.variable;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:340, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#888", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {isFixed ? "Edit Fixed Bill" : "Update Amount"}
        </div>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:6 }}>{bill.name}</div>
        {bill.hint && (
          <div style={{ fontSize:12, color:"#888", background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:20, lineHeight:1.5 }}>
            📧 {bill.hint}
          </div>
        )}
        {isFixed && (
          <div style={{ fontSize:12, color:"#888", background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:20, lineHeight:1.5 }}>
            This change will apply going forward.
          </div>
        )}
        <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:6 }}>
          {isFixed ? "New monthly amount" : "Amount leaving your account this month"}
        </label>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
          <span style={{ fontSize:20, fontWeight:700 }}>$</span>
          <input
            type="number" placeholder="0.00" value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && val) onSave(parseFloat(val)); }}
            autoFocus
            style={{ flex:1, padding:"10px 12px", borderRadius:8, border:"2px solid #3B5BDB", fontSize:18, fontWeight:700 }}
          />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
          <button onClick={() => { if (val) onSave(parseFloat(val)); }} style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT CATEGORY MODAL ──────────────────────────────────────────────────────
function EditCategoryModal({ bill, onSave, onClose }) {
  const [cat, setCat] = useState(bill.category);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:340, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#888", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>Edit Category</div>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:20 }}>{bill.name}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <button key={k} onClick={() => setCat(k)} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 16px", borderRadius:10,
              border: cat === k ? `2px solid ${v.color}` : "2px solid #eee",
              background: cat === k ? v.bg : "#fff",
              cursor:"pointer", textAlign:"left",
            }}>
              <span style={{ fontSize:20 }}>{v.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color: cat === k ? v.color : "#333" }}>{v.label}</div>
                {k === "cardcovered" && (
                  <div style={{ fontSize:11, color:"#999", marginTop:1 }}>Shown on calendar but excluded from totals</div>
                )}
              </div>
              {cat === k && <span style={{ color:v.color, fontWeight:900 }}>✓</span>}
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

// ─── ADD BILL MODAL ───────────────────────────────────────────────────────────
function AddBillModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:"", amount:"", day:1, category:"fixed", recurring:true, paidByCard:"" });

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:18, fontWeight:900, marginBottom:20 }}>Add Bill</div>

        {[["Bill Name","name","text"],["Amount ($)","amount","number"],["Day of Month","day","number"]].map(([label,key,type]) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>{label}</label>
            <input
              type={type} value={form[key]}
              onChange={e => set(key, type === "number" ? parseFloat(e.target.value) : e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" }}
            />
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
            {[["Recurring","true"],["One-time","false"]].map(([label, val]) => (
              <button key={val} onClick={() => set("recurring", val === "true")} style={{
                flex:1, padding:"10px", borderRadius:8,
                border: String(form.recurring) === val ? "2px solid #3B5BDB" : "2px solid #eee",
                background: String(form.recurring) === val ? "#EDF2FF" : "#fff",
                color: String(form.recurring) === val ? "#3B5BDB" : "#555",
                fontWeight:700, fontSize:13, cursor:"pointer",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>
            Paid by credit card? (optional)
          </label>
          <input
            type="text" placeholder="e.g. Chase Freedom, BofA..."
            value={form.paidByCard}
            onChange={e => set("paidByCard", e.target.value)}
            style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" }}
          />
          <div style={{ fontSize:11, color:"#888", marginTop:4 }}>
            If filled in, this bill will be marked as Paid by Card and excluded from your total.
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600 }}>Cancel</button>
          <button onClick={() => {
            if (form.name && form.amount) {
              const category = form.paidByCard ? "cardcovered" : form.category;
              onSave({ ...form, amount: parseFloat(form.amount), id: Date.now(), category, variable: false });
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
  const confirmed = totalFor(allBills.filter(b => !b.variable || b.amount));
  const pending = allBills.filter(b => b.variable && !b.amount && b.category !== "cardcovered").length;

  return (
    <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
      <div style={{ flex:"1 1 110px", background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"12px 16px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Total Outgoing</div>
        <div style={{ fontSize:18, fontWeight:900, color:"#C92A2A" }}>{fmt(total)}</div>
      </div>
      <div style={{ flex:"1 1 110px", background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"12px 16px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Confirmed</div>
        <div style={{ fontSize:18, fontWeight:900, color:"#3B5BDB" }}>{fmt(confirmed)}</div>
      </div>
      {covered > 0 && (
        <div style={{ flex:"1 1 110px", background:"#F5F5F5", border:"1px solid #e0e0e0", borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Paid by Card</div>
          <div style={{ fontSize:18, fontWeight:900, color:"#888" }}>{fmt(covered)}</div>
          <div style={{ fontSize:9, color:"#aaa", marginTop:2 }}>not counted above</div>
        </div>
      )}
      <div style={{ flex:"1 1 110px", background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"12px 16px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Needs Update</div>
        <div style={{ fontSize:18, fontWeight:900, color: pending > 0 ? "#E67700" : "#5C940D" }}>
          {pending > 0 ? pending + " bill" + (pending !== 1 ? "s" : "") : "All set ✓"}
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ allBills, year, month, onUpdateVariable, onEditCategory, sheetData }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => {
      if (!map[b.day]) map[b.day] = [];
      map[b.day].push(b);
    });
    return map;
  }, [allBills]);

  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isToday = d => d === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
  const isPast = d => new Date(year, month, d) < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const estimated = allBills.filter(b => b.variable && !b.amount && b.category !== "cardcovered");

  return (
    <div>
      <SummaryStrip allBills={allBills} />

      {estimated.length > 0 && (
        <div style={{ background:"#FFF9F0", border:"1px solid #FFE8CC", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#E67700", marginBottom:8 }}>Tap to update this month's variable bills:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {estimated.map(b => (
              <button key={b.id} onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                + {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {sheetData && Object.keys(sheetData).length > 0 && (
        <div style={{ background:"#F4FCE3", border:"1px solid #C5E8A0", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#5C940D", fontWeight:600 }}>
          Auto-updated: {Object.entries(sheetData).filter(([,v]) => v.amount).map(([k, v]) => `${k} ${fmt(v.amount)}`).join(" · ")}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, borderRadius:10, overflow:"hidden", border:"1px solid #e0e0e0", background:"#e0e0e0" }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ background:"#f5f5f5", padding:"6px 0", textAlign:"center", fontSize:11, fontWeight:700, color:"#666" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ background:"#fafafa", minHeight:80 }} />;
          const dayBills = billsByDay[d] || [];
          const dayTotal = totalFor(dayBills);
          const selected = selectedDay === d;
          const hasUnknown = dayBills.filter(b => b.category !== "cardcovered").some(b => b.variable && !b.amount);

          return (
            <div key={d} onClick={() => setSelectedDay(selected ? null : d)}
              style={{ background: selected ? "#EDF2FF" : "#fff", minHeight:80, padding:"5px 4px", cursor: dayBills.length ? "pointer" : "default", borderLeft: selected ? "3px solid #3B5BDB" : "3px solid transparent", opacity: isPast(d) ? 0.5 : 1 }}>
              <div style={{ fontSize:11, fontWeight: isToday(d) ? 900 : 500, color: isToday(d) ? "#fff" : "#333", background: isToday(d) ? "#3B5BDB" : "transparent", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:3 }}>{d}</div>
              {dayBills.slice(0, 2).map(b => {
                const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
                const isCovered = b.category === "cardcovered";
                return (
                  <div key={b.id} style={{ background:m.bg, color:m.color, borderRadius:3, padding:"1px 4px", marginBottom:2, fontSize:9, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", opacity: isCovered ? 0.55 : 1 }}>
                    {isCovered ? "🔗 " : ""}{b.variable && !b.amount ? "?" : ""}{b.name.split(" ")[0]} {b.amount ? fmt(b.amount) : ""}
                    {!b.recurring && <span style={{ marginLeft:3, fontSize:8, opacity:0.7 }}>1x</span>}
                  </div>
                );
              })}
              {dayBills.length > 2 && <div style={{ fontSize:8, color:"#aaa" }}>+{dayBills.length - 2}</div>}
              {dayTotal > 0 && <div style={{ fontSize:9, fontWeight:900, color: hasUnknown ? "#E67700" : "#333", textAlign:"right" }}>{fmt(dayTotal)}</div>}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop:12, background:"#fff", borderRadius:10, border:"1px solid #e0e0e0", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:"#f8f9ff", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontWeight:800, fontSize:15 }}>{MONTHS[month]} {ordinal(selectedDay)}</div>
            <div style={{ fontWeight:900, fontSize:15, color:"#C92A2A" }}>{fmt(totalFor(billsByDay[selectedDay] || []))} due</div>
          </div>
          {(billsByDay[selectedDay] || []).map(b => {
            const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
            const isCovered = b.category === "cardcovered";
            const lastUpdated = sheetData?.[b.name]?.lastUpdated;
            return (
              <div key={b.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:"1px solid #f5f5f5", opacity: isCovered ? 0.65 : 1 }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>
                    {b.name}
                    {!b.recurring && <span style={{ marginLeft:6, fontSize:10, color:"#E67700", fontWeight:700, background:"#FFF9F0", padding:"1px 5px", borderRadius:4 }}>One-time</span>}
                    {isCovered && <span style={{ marginLeft:6, fontSize:10, color:"#888", fontWeight:600 }}>via card</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#888" }}>
                    {m.label}
                    {lastUpdated && <span style={{ marginLeft:8, color:"#5C940D" }}>· Updated {formatSheetDate(lastUpdated)}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {b.variable && !b.amount && !isCovered ? (
                    <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontWeight:700, fontSize:12, cursor:"pointer" }}>Update</button>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ fontWeight:900, fontSize:16, color: isCovered ? "#999" : "#1a1a1a" }}>{fmt(b.amount)}</div>
                      {!isCovered && <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>}
                    </div>
                  )}
                  <button onClick={() => onEditCategory(b)} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", fontSize:15, opacity:0.45 }} title="Change category">🏷</button>
                </div>
              </div>
            );
          })}
          {cardCoveredTotal(billsByDay[selectedDay] || []) > 0 && (
            <div style={{ padding:"10px 16px", background:"#f8f8f8", fontSize:11, color:"#999" }}>
              🔗 {fmt(cardCoveredTotal(billsByDay[selectedDay] || []))} paid by card, not counted in total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ allBills, year, month, onUpdateVariable, onEditCategory, sheetData }) {
  const sorted = [...allBills].sort((a, b) => a.day - b.day);
  const isCurrentMonth = month === TODAY.getMonth() && year === TODAY.getFullYear();
  const todayDate = TODAY.getDate();
  const upcoming = sorted.filter(b => !isCurrentMonth || b.day >= todayDate);
  const past = sorted.filter(b => isCurrentMonth && b.day < todayDate);

  function BillCard({ b }) {
    const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
    const needsUpdate = b.variable && !b.amount && b.category !== "cardcovered";
    const isCovered = b.category === "cardcovered";
    const lastUpdated = sheetData?.[b.name]?.lastUpdated;

    return (
      <div style={{ background:"#fff", borderRadius:10, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12, border:`1px solid ${needsUpdate ? "#FFE8CC" : "#eee"}`, opacity: isCovered ? 0.65 : 1 }}>
        <div style={{ width:46, textAlign:"center", flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:18, color: isCovered ? "#999" : "#1a1a1a", lineHeight:1 }}>{b.day}</div>
          <div style={{ fontSize:9, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.03em" }}>{MONTHS[month].slice(0, 3)}</div>
        </div>
        <div style={{ width:38, height:38, borderRadius:8, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>
            {b.name}
            {!b.recurring && <span style={{ marginLeft:6, fontSize:10, color:"#E67700", fontWeight:700, background:"#FFF9F0", padding:"1px 5px", borderRadius:4 }}>One-time</span>}
            {isCovered && <span style={{ marginLeft:6, fontSize:10, color:"#888", fontWeight:600 }}>via card</span>}
          </div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
            {isCovered ? "Paid by card · not counted in total" : m.label}
            {lastUpdated && !isCovered && <span style={{ marginLeft:6, color:"#5C940D" }}>· Updated {formatSheetDate(lastUpdated)}</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {needsUpdate ? (
            <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Add</button>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ fontWeight:900, fontSize:16, color: isCovered ? "#999" : "#1a1a1a" }}>{fmt(b.amount)}</div>
              {!isCovered && <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>}
            </div>
          )}
          <button onClick={() => onEditCategory(b)} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", fontSize:15, opacity:0.45 }} title="Change category">🏷</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SummaryStrip allBills={allBills} />
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            {isCurrentMonth ? "Upcoming" : "All Bills"}
          </div>
          {upcoming.map(b => <BillCard key={b.id} b={b} />)}
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.08em", margin:"20px 0 10px" }}>Already Passed</div>
          {past.map(b => <BillCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR PRINT ───────────────────────────────────────────────────────────
function CalendarPrintPage({ allBills, year, month, onDone }) {
  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => { if (!map[b.day]) map[b.day] = []; map[b.day].push(b); });
    return map;
  }, [allBills]);

  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:2000, overflow:"auto" }}>
      <div className="no-print" style={{ position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
        <button onClick={onDone} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Done</button>
        <button onClick={() => window.print()} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Print / Save PDF</button>
      </div>
      <style>{`@media print { .no-print { display:none !important; } @page { size: 11in 8.5in; margin: 0.4in; } }`}</style>
      <div style={{ padding:"16px", maxWidth:1000, margin:"0 auto", fontFamily:"-apple-system, sans-serif", color:"#1a1a1a" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", borderBottom:"3px solid #1a1a1a", paddingBottom:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:900, color:"#3B5BDB" }}>PredictaBill</div>
            <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.5px" }}>{MONTHS[month]} {year}</div>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#C92A2A" }}>Total: {fmt(totalFor(allBills))}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, border:"1px solid #ccc", background:"#ccc" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ background:"#f5f5f5", padding:"6px 4px", textAlign:"center", fontSize:11, fontWeight:700, color:"#555" }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            const dayBills = d ? (billsByDay[d] || []) : [];
            const dayTotal = totalFor(dayBills);
            return (
              <div key={i} style={{ background:"#fff", minHeight:95, padding:"4px 5px" }}>
                {d && (
                  <div>
                    <div style={{ fontWeight:700, fontSize:11, marginBottom:3 }}>{d}</div>
                    {dayBills.map(b => {
                      const isCovered = b.category === "cardcovered";
                      return (
                        <div key={b.id} style={{ fontSize:9, fontWeight:600, marginBottom:1.5, color: CATEGORY_META[b.category]?.color || "#333", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", opacity: isCovered ? 0.5 : 1 }}>
                          {isCovered ? "🔗 " : ""}{b.name.split(" ").slice(0, 2).join(" ")} {b.amount ? fmt(b.amount) : "TBD"}
                          {!b.recurring ? " (1x)" : ""}
                        </div>
                      );
                    })}
                    {dayTotal > 0 && <div style={{ fontSize:9, fontWeight:900, borderTop:"1px solid #eee", marginTop:2, paddingTop:1 }}>{fmt(dayTotal)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:14, marginTop:14, fontSize:10, flexWrap:"wrap" }}>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <span key={k} style={{ display:"flex", alignItems:"center", gap:4, fontWeight:700, color:v.color }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:v.color, display:"inline-block" }} />{v.label}
            </span>
          ))}
          <span style={{ color:"#999" }}>· 1x = one-time expense · 🔗 = paid by card, excluded from total</span>
        </div>
      </div>
    </div>
  );
}

// ─── LIST REPORT ──────────────────────────────────────────────────────────────
function ListReportPage({ allBills, year, month, onDone }) {
  const sorted = [...allBills].sort((a, b) => a.day - b.day);
  const total = totalFor(sorted);
  const covered = cardCoveredTotal(sorted);
  const weeks = [[], [], [], []];
  sorted.filter(b => b.category !== "cardcovered").forEach(b => {
    weeks[Math.min(Math.floor((b.day - 1) / 7), 3)].push(b);
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:2000, overflow:"auto" }}>
      <div className="no-print" style={{ position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
        <button onClick={onDone} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Done</button>
        <button onClick={() => window.print()} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Print / Save PDF</button>
      </div>
      <style>{`@media print { .no-print { display:none !important; } @page { size: 8.5in 11in; margin: 0.65in; } }`}</style>
      <div style={{ padding:"24px 20px", maxWidth:800, margin:"0 auto", color:"#1a1a1a", fontSize:13, lineHeight:1.5, fontFamily:"-apple-system, Georgia, serif" }}>
        <div style={{ borderBottom:"3px solid #1a1a1a", paddingBottom:14, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:900, color:"#3B5BDB", marginBottom:4 }}>PredictaBill</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-1px" }}>{MONTHS[month]} {year}</div>
          <div style={{ fontSize:12, color:"#777", marginTop:3 }}>Monthly Cash Flow Forecast · Outgoing payments only</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:24 }}>
          {[
            ["Total Outgoing", fmt(total), "#C92A2A"],
            ["Fixed Bills", fmt(totalFor(sorted.filter(b => b.category !== "credit" && b.category !== "cardcovered"))), "#3B5BDB"],
            ["Credit Cards", fmt(totalFor(sorted.filter(b => b.category === "credit"))), "#C92A2A"],
            ["Paid by Card", fmt(covered) + " excl.", "#888"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ border:"1px solid #ddd", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#888", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:900, color:c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, margin:"20px 0 12px" }}>Week by Week</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:8 }}>
          {["Week 1 · 1-7","Week 2 · 8-14","Week 3 · 15-21","Week 4 · 22-31"].map((l, i) => (
            <div key={i} style={{ border:"1px solid #ddd", borderRadius:8, padding:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#888", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:900 }}>{fmt(totalFor(weeks[i]))}</div>
              <div style={{ fontSize:10, color:"#999", marginTop:2 }}>{weeks[i].length} payment{weeks[i].length !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, margin:"20px 0 12px" }}>All Bills, Chronological</div>
        {sorted.map(b => {
          const isCovered = b.category === "cardcovered";
          return (
            <div key={b.id} style={{ display:"flex", padding:"7px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center", gap:8, opacity: isCovered ? 0.5 : 1 }}>
              <div style={{ width:50, fontSize:11, fontWeight:800, flexShrink:0, color: CATEGORY_META[b.category]?.color || "#333" }}>{ordinal(b.day)}</div>
              <div style={{ flex:1, fontWeight:600 }}>
                {isCovered ? "🔗 " : ""}{b.name}
                {!b.recurring && <span style={{ marginLeft:6, fontSize:10, color:"#E67700", fontWeight:700 }}>(one-time)</span>}
                {b.variable && !b.amount && <span style={{ color:"#E67700", fontSize:10, fontWeight:700 }}> est</span>}
              </div>
              <div style={{ fontWeight:800, fontSize:13, flexShrink:0, color: isCovered ? "#999" : "#1a1a1a" }}>
                {b.amount ? fmt(b.amount) : <span style={{ color:"#E67700", fontSize:10 }}>TBD</span>}
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:"2px solid #1a1a1a", marginTop:6, fontWeight:900, fontSize:15 }}>
          <span>TOTAL (excl. paid by card)</span><span>{fmt(total)}</span>
        </div>
        {covered > 0 && (
          <div style={{ fontSize:11, color:"#999", paddingTop:6 }}>🔗 {fmt(covered)} in card-covered items shown for reference only, not included in total</div>
        )}
        <div style={{ borderTop:"1px solid #ddd", marginTop:24, paddingTop:10, fontSize:10, color:"#aaa", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <span>PredictaBill · {MONTHS[month]} {year}</span>
          <span>🔗 = paid by card, excluded · 1x = one-time expense</span>
        </div>
      </div>
    </div>
  );
}

// ─── REPORT VIEW ──────────────────────────────────────────────────────────────
function ReportView({ allBills, year, month }) {
  const [showList, setShowList] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const sorted = [...allBills].sort((a, b) => a.day - b.day);
  const total = totalFor(sorted);
  const weeks = [[], [], [], []];
  sorted.filter(b => b.category !== "cardcovered").forEach(b => {
    weeks[Math.min(Math.floor((b.day - 1) / 7), 3)].push(b);
  });

  if (showList) return <ListReportPage allBills={allBills} year={year} month={month} onDone={() => setShowList(false)} />;
  if (showCalendar) return <CalendarPrintPage allBills={allBills} year={year} month={month} onDone={() => setShowCalendar(false)} />;

  return (
    <div>
      <div style={{ background:"#f8f9ff", border:"1px solid #e0e8ff", borderRadius:12, padding:"20px", marginBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>Monthly Forecast Report</div>
        <div style={{ fontSize:13, color:"#666", marginBottom:16, lineHeight:1.6 }}>
          Two printable formats. Opens full screen, then use your browser's print or share menu to save as PDF.
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={() => setShowList(true)} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:10, padding:"14px 24px", fontWeight:800, fontSize:15, cursor:"pointer", flex:"1 1 140px", maxWidth:220 }}>
            List Report
          </button>
          <button onClick={() => setShowCalendar(true)} style={{ background:"#fff", color:"#3B5BDB", border:"2px solid #3B5BDB", borderRadius:10, padding:"14px 24px", fontWeight:800, fontSize:15, cursor:"pointer", flex:"1 1 140px", maxWidth:220 }}>
            Calendar Grid
          </button>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
        <div style={{ padding:"16px 18px", borderBottom:"1px solid #f0f0f0" }}>
          <div style={{ fontSize:11, fontWeight:900, color:"#3B5BDB" }}>PREDICTABILL</div>
          <div style={{ fontSize:20, fontWeight:900, marginTop:2 }}>{MONTHS[month]} {year} Preview</div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", borderBottom:"1px solid #f0f0f0" }}>
          {[
            ["Total Outgoing", fmt(total), "#C92A2A"],
            ["Fixed", fmt(totalFor(sorted.filter(b => b.category !== "credit" && b.category !== "cardcovered"))), "#3B5BDB"],
            ["Credit Cards", fmt(totalFor(sorted.filter(b => b.category === "credit"))), "#C92A2A"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ flex:"1 1 100px", padding:"14px 16px", borderRight:"1px solid #f0f0f0" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Week by Week</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["1-7","8-14","15-21","22-31"].map((l, i) => (
              <div key={i} style={{ flex:"1 1 60px", background:"#f8f8f8", borderRadius:8, padding:"10px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:"#888", marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:15, fontWeight:900 }}>{fmt(totalFor(weeks[i]))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth());
  const [view, setView] = useState("calendar");
  const [variableAmounts, setVariableAmounts] = useState({});
  const [fixedOverrides, setFixedOverrides] = useState({});
  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [extraBills, setExtraBills] = useState([]);
  const [updatingBill, setUpdatingBill] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sheetData, setSheetData] = useState({});
  const [sheetStatus, setSheetStatus] = useState("loading");

  const monthKey = `${year}-${month}`;

  useEffect(() => {
    if (!unlocked) return;
    setSheetStatus("loading");
    fetchSheetData()
      .then(data => { setSheetData(data); setSheetStatus("ok"); })
      .catch(() => setSheetStatus("error"));
  }, [unlocked]);

  const allBills = useMemo(() => {
    const fixed = FIXED_BILLS.map(b => ({
      ...b,
      variable: false,
      amount: fixedOverrides[b.id] ?? b.amount,
      category: categoryOverrides[b.id] ?? b.category,
    }));
    const variable = VARIABLE_BILLS.map(b => {
      const sheetAmount = sheetData[b.name]?.amount;
      const manualAmount = variableAmounts[`${monthKey}-${b.id}`];
      return {
        ...b,
        variable: true,
        amount: manualAmount || sheetAmount || 0,
        category: categoryOverrides[b.id] ?? b.category,
      };
    });
    const extra = extraBills
      .filter(b => b.recurring || b.monthKey === monthKey)
      .map(b => ({ ...b, variable: false }));
    return [...fixed, ...variable, ...extra];
  }, [variableAmounts, fixedOverrides, categoryOverrides, extraBills, monthKey, sheetData]);

  function saveAmount(bill, amount) {
    if (!bill.variable) {
      setFixedOverrides(f => ({ ...f, [bill.id]: amount }));
    } else {
      setVariableAmounts(v => ({ ...v, [`${monthKey}-${bill.id}`]: amount }));
    }
    setUpdatingBill(null);
  }

  function saveCategory(bill, newCategory) {
    setCategoryOverrides(c => ({ ...c, [bill.id]: newCategory }));
    setEditingCategory(null);
  }

  function addExtraBill(bill) {
    setExtraBills(bs => [...bs, { ...bill, monthKey }]);
    setShowAddModal(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F8", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {updatingBill && <UpdateModal bill={updatingBill} onSave={amt => saveAmount(updatingBill, amt)} onClose={() => setUpdatingBill(null)} />}
      {editingCategory && <EditCategoryModal bill={editingCategory} onSave={cat => saveCategory(editingCategory, cat)} onClose={() => setEditingCategory(null)} />}
      {showAddModal && <AddBillModal onSave={addExtraBill} onClose={() => setShowAddModal(false)} />}

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"0 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ padding:"14px 0", fontWeight:900, fontSize:20, letterSpacing:"-0.5px", flexShrink:0 }}>
          <span style={{ color:"#3B5BDB" }}>Predict</span>aBill
        </div>
        <div style={{ display:"flex", gap:2, flex:1 }}>
          {[{ id:"calendar", label:"Calendar" },{ id:"list", label:"List" },{ id:"report", label:"Report" }].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{ background: view === t.id ? "#EDF2FF" : "transparent", color: view === t.id ? "#3B5BDB" : "#666", border:"none", padding:"10px 12px", cursor:"pointer", fontWeight: view === t.id ? 800 : 500, fontSize:13, borderRadius:6 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {sheetStatus === "ok"      && <span style={{ fontSize:11, color:"#5C940D", fontWeight:700 }}>● Live</span>}
          {sheetStatus === "loading" && <span style={{ fontSize:11, color:"#888" }}>Syncing...</span>}
          {sheetStatus === "error"   && <span style={{ fontSize:11, color:"#E67700", fontWeight:700 }}>⚠ Offline</span>}
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0 }}>
          + Add
        </button>
      </div>

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={prevMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>←</button>
        <div style={{ fontWeight:900, fontSize:16, letterSpacing:"-0.3px", flex:1 }}>{MONTHS[month]} {year}</div>
        <button onClick={() => { setMonth(TODAY.getMonth()); setYear(TODAY.getFullYear()); }} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, color:"#3B5BDB", fontWeight:700 }}>Today</button>
        <button onClick={nextMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>→</button>
      </div>

      <div style={{ maxWidth:920, margin:"0 auto", padding:"16px 12px" }}>
        {view === "calendar" && <CalendarView allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} onEditCategory={setEditingCategory} sheetData={sheetData} />}
        {view === "list"     && <ListView     allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} onEditCategory={setEditingCategory} sheetData={sheetData} />}
        {view === "report"   && <ReportView   allBills={allBills} year={year} month={month} />}
      </div>
    </div>
  );
}
