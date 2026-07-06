import { useState, useMemo } from "react";

const FIXED_BILLS = [
  { id: 1,  name: "Rent",                  amount: 2640, day: 1,  category: "fixed" },
  { id: 2,  name: "United Refuah",         amount: 200,  day: 1,  category: "fixed" },
  { id: 3,  name: "Phone",                 amount: 40,   day: 1,  category: "fixed" },
  { id: 4,  name: "Hyundai Lease",         amount: 379,  day: 1,  category: "fixed" },
  { id: 5,  name: "Anshei (Tuition)",      amount: 1052, day: 5,  category: "fixed" },
  { id: 6,  name: "NJM Insurance",         amount: 388,  day: 11, category: "fixed" },
  { id: 7,  name: "Student Loan",          amount: 260,  day: 15, category: "fixed" },
  { id: 8,  name: "Pascack Valley Health", amount: 85,   day: 17, category: "fixed" },
  { id: 9,  name: "Northwestern Mutual",   amount: 580,  day: 20, category: "fixed" },
  { id: 10, name: "Verizon",               amount: 45,   day: 24, category: "fixed" },
  { id: 11, name: "Netflix",               amount: 8,    day: 28, category: "fixed" },
  { id: 12, name: "EZ Pass (est.)",        amount: 155,  day: 15, category: "utility" },
];

const VARIABLE_BILLS = [
  { id: 101, name: "Amazon Prime Visa",       day: 1,  category: "credit",  hint: "Automatic payment amount from Prime Visa email" },
  { id: 102, name: "PSEG",                    day: 6,  category: "utility", hint: "Current balance from PSEG paperless billing email" },
  { id: 103, name: "Bank of America",         day: 14, category: "credit",  hint: "AutoPay Amount from BofA scheduled payment email" },
  { id: 104, name: "Chase Freedom Unlimited", day: 26, category: "credit",  hint: "Automatic payment amount from Chase Freedom email" },
];

const CATEGORY_META = {
  fixed:   { label: "Fixed",       color: "#3B5BDB", bg: "#EDF2FF", icon: "🏠" },
  credit:  { label: "Credit Card", color: "#C92A2A", bg: "#FFF5F5", icon: "💳" },
  utility: { label: "Utility",     color: "#5C940D", bg: "#F4FCE3", icon: "⚡" },
  medical: { label: "Medical",     color: "#862E9C", bg: "#F8F0FC", icon: "🏥" },
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
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m) { return new Date(y, m, 1).getDay(); }
function totalFor(arr) { return arr.reduce((s, b) => s + (b.amount || 0), 0); }

const APP_PASSWORD = "PredictaBill2024";

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
    <div style={{
      minHeight:"100vh", background:"#F2F4F8",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding:16,
    }}>
      <div style={{ background:"#fff", borderRadius:16, padding:36, width:"100%", maxWidth:340, boxShadow:"0 8px 40px rgba(0,0,0,0.10)", textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#3B5BDB", letterSpacing:"-0.3px", marginBottom:6 }}>
          <span style={{ color:"#3B5BDB" }}>Predict</span>aBill
        </div>
        <div style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>Welcome back</div>
        <div style={{ fontSize:13, color:"#888", marginBottom:28 }}>Enter your password to continue</div>
        <input
          type="password"
          placeholder="Password"
          value={val}
          onChange={e => { setVal(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width:"100%", padding:"12px 14px", borderRadius:10,
            border: error ? "2px solid #C92A2A" : "2px solid #e0e0e0",
            fontSize:16, marginBottom:10, boxSizing:"border-box",
            outline:"none",
          }}
          autoFocus
        />
        {error && <div style={{ color:"#C92A2A", fontSize:12, fontWeight:700, marginBottom:10 }}>Incorrect password. Try again.</div>}
        <button onClick={attempt} style={{
          width:"100%", padding:"12px", borderRadius:10, border:"none",
          background:"#3B5BDB", color:"#fff", fontWeight:800, fontSize:15,
          cursor:"pointer", marginTop:4,
        }}>Unlock</button>
      </div>
    </div>
  );
}


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
            This change will apply to all future months.
          </div>
        )}
        <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:6 }}>
          {isFixed ? "New monthly amount" : "Amount leaving your account this month"}
        </label>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
          <span style={{ fontSize:20, fontWeight:700, color:"#333" }}>$</span>
          <input type="number" placeholder="0.00" value={val} onChange={e => setVal(e.target.value)} autoFocus
            style={{ flex:1, padding:"10px 12px", borderRadius:8, border:"2px solid #3B5BDB", fontSize:18, fontWeight:700 }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600, fontSize:14 }}>Cancel</button>
          <button onClick={() => { if (val) onSave(parseFloat(val)); }} style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function AddBillModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:"", amount:"", day:1, category:"medical" });
  function set(k,v) { setForm(f => ({...f,[k]:v})); }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:340, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:18, fontWeight:900, marginBottom:20 }}>Add Bill</div>
        {[["Bill Name","name","text"],["Amount ($)","amount","number"],["Day of Month","day","number"]].map(([label,key,type]) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, type==="number" ? parseFloat(e.target.value) : e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:14 }}>
            {Object.entries(CATEGORY_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid #ddd", background:"#f8f8f8", cursor:"pointer", fontWeight:600 }}>Cancel</button>
          <button onClick={() => { if(form.name && form.amount) onSave({...form, amount:parseFloat(form.amount), id:Date.now()}); }}
            style={{ flex:1, padding:10, borderRadius:8, border:"none", background:"#3B5BDB", color:"#fff", cursor:"pointer", fontWeight:800 }}>Add</button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ allBills, year, month, onUpdateVariable }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => { if (!map[b.day]) map[b.day] = []; map[b.day].push(b); });
    return map;
  }, [allBills]);

  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const isToday = d => d===TODAY.getDate() && month===TODAY.getMonth() && year===TODAY.getFullYear();
  const isPast = d => new Date(year,month,d) < new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  const totalMonth = totalFor(allBills);
  const estimated = allBills.filter(b => b.variable && !b.amount);

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[
          ["Total Outgoing", fmt(totalMonth), "#C92A2A"],
          ["Confirmed", fmt(totalFor(allBills.filter(b => !b.variable || b.amount))), "#3B5BDB"],
          ["Needs Update", estimated.length + " bill" + (estimated.length!==1?"s":""), "#E67700"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ flex:"1 1 120px", background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:900, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {estimated.length > 0 && (
        <div style={{ background:"#FFF9F0", border:"1px solid #FFE8CC", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#E67700", marginBottom:8 }}>⚡ Tap to update this month's variable bills:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {estimated.map(b => (
              <button key={b.id} onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                + {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, borderRadius:10, overflow:"hidden", border:"1px solid #e0e0e0", background:"#e0e0e0" }}>
        {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} style={{ background:"#f5f5f5", padding:"6px 0", textAlign:"center", fontSize:11, fontWeight:700, color:"#666" }}>{d}</div>
        ))}
        {cells.map((d,i) => {
          if (!d) return <div key={i} style={{ background:"#fafafa", minHeight:80 }} />;
          const dayBills = billsByDay[d] || [];
          const dayTotal = totalFor(dayBills);
          const selected = selectedDay === d;
          const hasUnknown = dayBills.some(b => b.variable && !b.amount);

          return (
            <div key={d} onClick={() => setSelectedDay(selected ? null : d)}
              style={{
                background: selected ? "#EDF2FF" : "#fff",
                minHeight:80, padding:"5px 4px",
                cursor: dayBills.length ? "pointer" : "default",
                borderLeft: selected ? "3px solid #3B5BDB" : "3px solid transparent",
                opacity: isPast(d) ? 0.5 : 1,
              }}>
              <div style={{
                fontSize:11, fontWeight: isToday(d) ? 900 : 500,
                color: isToday(d) ? "#fff" : "#333",
                background: isToday(d) ? "#3B5BDB" : "transparent",
                borderRadius:"50%", width:20, height:20,
                display:"flex", alignItems:"center", justifyContent:"center",
                marginBottom:3,
              }}>{d}</div>
              {dayBills.slice(0,2).map(b => {
                const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
                return (
                  <div key={b.id} style={{
                    background:m.bg, color:m.color,
                    borderRadius:3, padding:"1px 4px", marginBottom:2,
                    fontSize:9, fontWeight:700,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>
                    {b.variable && !b.amount ? "?" : ""}{b.name.split(" ")[0]} {b.amount ? fmt(b.amount) : ""}
                  </div>
                );
              })}
              {dayBills.length > 2 && <div style={{ fontSize:8, color:"#aaa" }}>+{dayBills.length-2}</div>}
              {dayTotal > 0 && (
                <div style={{ fontSize:9, fontWeight:900, color: hasUnknown ? "#E67700" : "#333", textAlign:"right" }}>
                  {fmt(dayTotal)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop:12, background:"#fff", borderRadius:10, border:"1px solid #e0e0e0", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:"#f8f9ff", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontWeight:800, fontSize:15 }}>{MONTHS[month]} {ordinal(selectedDay)}</div>
            <div style={{ fontWeight:900, fontSize:15, color:"#C92A2A" }}>{fmt(totalFor(billsByDay[selectedDay]||[]))} due</div>
          </div>
          {(billsByDay[selectedDay]||[]).map(b => {
            const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
            return (
              <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid #f5f5f5" }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{b.name}</div>
                  <div style={{ fontSize:11, color:"#888" }}>{m.label}</div>
                </div>
                {b.variable && !b.amount ? (
                  <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontWeight:700, fontSize:12, cursor:"pointer" }}>Update</button>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontWeight:900, fontSize:16 }}>{fmt(b.amount)}</div>
                    <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListView({ allBills, year, month, onUpdateVariable }) {
  const sorted = [...allBills].sort((a,b) => a.day - b.day);
  const isCurrentMonth = month===TODAY.getMonth() && year===TODAY.getFullYear();
  const todayDate = TODAY.getDate();
  const upcoming = sorted.filter(b => !isCurrentMonth || b.day >= todayDate);
  const past = sorted.filter(b => isCurrentMonth && b.day < todayDate);

  function BillCard({ b }) {
    const m = CATEGORY_META[b.category] || CATEGORY_META.fixed;
    const needsUpdate = b.variable && !b.amount;
    return (
      <div style={{ background:"#fff", borderRadius:10, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12, border:`1px solid ${needsUpdate ? "#FFE8CC" : "#eee"}` }}>
        <div style={{ width:46, textAlign:"center", flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:18, color:"#1a1a1a", lineHeight:1 }}>{b.day}</div>
          <div style={{ fontSize:9, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.03em" }}>{MONTHS[month].slice(0,3)}</div>
        </div>
        <div style={{ width:40, height:40, borderRadius:8, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{m.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{b.name}</div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{m.label}</div>
        </div>
        {needsUpdate ? (
          <button onClick={() => onUpdateVariable(b)} style={{ background:"#E67700", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Add</button>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontWeight:900, fontSize:16 }}>{fmt(b.amount)}</div>
            <button onClick={() => onUpdateVariable(b)} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer", color:"#888", fontWeight:600 }}>Edit</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <div style={{ flex:1, background:"#FFF5F5", borderRadius:10, padding:"14px 16px", border:"1px solid #FFE3E3" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#C92A2A", textTransform:"uppercase", letterSpacing:"0.06em" }}>Total This Month</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#C92A2A", marginTop:4 }}>{fmt(totalFor(allBills))}</div>
        </div>
        <div style={{ flex:1, background:"#FFF9F0", borderRadius:10, padding:"14px 16px", border:"1px solid #FFE8CC" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#E67700", textTransform:"uppercase", letterSpacing:"0.06em" }}>Still Needed</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#E67700", marginTop:4 }}>
            {allBills.filter(b=>b.variable&&!b.amount).length} updates
          </div>
        </div>
      </div>
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:800, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            {isCurrentMonth ? "Upcoming" : "All Bills"}
          </div>
          {upcoming.map(b => <BillCard key={b.id} b={b} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:800, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.08em", margin:"20px 0 10px" }}>Already Passed</div>
          {past.map(b => <BillCard key={b.id} b={b} />)}
        </>
      )}
    </div>
  );
}

function CalendarPrintPage({ allBills, year, month, onDone }) {
  const billsByDay = useMemo(() => {
    const map = {};
    allBills.forEach(b => { if (!map[b.day]) map[b.day] = []; map[b.day].push(b); });
    return map;
  }, [allBills]);

  const days = daysInMonth(year, month);
  const offset = firstDay(year, month);
  const cells = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const totalMonth = totalFor(allBills);

  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:2000, overflow:"auto" }}>
      <div className="no-print" style={{
        position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee",
        padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10,
      }}>
        <button onClick={onDone} style={{ background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Done</button>
        <button onClick={() => window.print()} style={{ background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🖨 Print / Save PDF</button>
      </div>

      <style>{`
        @media print {
          .no-print { display:none !important; }
          @page { size: 11in 8.5in; margin: 0.4in; }
        }
      `}</style>

      <div style={{ padding:"16px", maxWidth:1000, margin:"0 auto", fontFamily:"-apple-system, sans-serif", color:"#1a1a1a" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", borderBottom:"3px solid #1a1a1a", paddingBottom:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:900, color:"#3B5BDB" }}>PredictaBill</div>
            <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.5px" }}>{MONTHS[month]} {year}</div>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#C92A2A" }}>Total: {fmt(totalMonth)}</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, border:"1px solid #ccc", background:"#ccc" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ background:"#f5f5f5", padding:"6px 4px", textAlign:"center", fontSize:11, fontWeight:700, color:"#555" }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            const dayBills = d ? (billsByDay[d] || []) : [];
            const dayTotal = totalFor(dayBills);
            return (
              <div key={i} style={{ background:"#fff", minHeight:95, padding:"4px 5px", fontSize:9.5 }}>
                {d && (
                  <>
                    <div style={{ fontWeight:700, fontSize:11, marginBottom:3 }}>{d}</div>
                    {dayBills.map(b => (
                      <div key={b.id} style={{
                        fontSize:9, fontWeight:600, marginBottom:1.5,
                        color: CATEGORY_META[b.category]?.color || "#333",
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      }}>
                        {b.name.split(" ").slice(0,2).join(" ")} {b.amount ? fmt(b.amount) : "TBD"}
                      </div>
                    ))}
                    {dayTotal > 0 && (
                      <div style={{ fontSize:9, fontWeight:900, borderTop:"1px solid #eee", marginTop:2, paddingTop:1 }}>
                        {fmt(dayTotal)}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:16, marginTop:14, fontSize:10 }}>
          {Object.entries(CATEGORY_META).map(([k,v]) => (
            <span key={k} style={{ display:"flex", alignItems:"center", gap:4, fontWeight:700, color:v.color }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:v.color, display:"inline-block" }} />{v.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportView({ allBills, year, month }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [calendarPrint, setCalendarPrint] = useState(false);
  const sorted = [...allBills].sort((a,b) => a.day - b.day);
  const total = totalFor(sorted);
  const weeks = [[],[],[],[]];
  sorted.forEach(b => { weeks[Math.min(Math.floor((b.day-1)/7),3)].push(b); });

  const byCategory = {};
  sorted.forEach(b => {
    if (!byCategory[b.category]) byCategory[b.category] = [];
    byCategory[b.category].push(b);
  });

  if (calendarPrint) {
    return <CalendarPrintPage allBills={allBills} year={year} month={month} onDone={() => setCalendarPrint(false)} />;
  }

  if (fullScreen) {
    return (
      <div style={{
        position:"fixed", inset:0, background:"#fff", zIndex:2000,
        overflow:"auto", fontFamily:"-apple-system, Georgia, serif",
      }}>
        <div className="no-print" style={{
          position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee",
          padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center",
          zIndex:10,
        }}>
          <button onClick={() => setFullScreen(false)} style={{
            background:"#f0f0f0", border:"none", borderRadius:8, padding:"8px 16px",
            fontWeight:700, fontSize:13, cursor:"pointer",
          }}>← Done</button>
          <button onClick={() => window.print()} style={{
            background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8,
            padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer",
          }}>🖨 Print / Save PDF</button>
        </div>

        <style>{`
          @media print {
            .no-print { display:none !important; }
            body { padding:0; }
          }
        `}</style>

        <div style={{ padding:"24px 20px", maxWidth:800, margin:"0 auto", color:"#1a1a1a", fontSize:13, lineHeight:1.5 }}>
          <div style={{ borderBottom:"3px solid #1a1a1a", paddingBottom:14, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:900, color:"#3B5BDB", letterSpacing:"-0.3px", marginBottom:4 }}>PredictaBill</div>
            <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:"-1px", margin:0 }}>{MONTHS[month]} {year}</h1>
            <div style={{ fontSize:12, color:"#777", marginTop:3 }}>Monthly Cash Flow Forecast · Outgoing payments only</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
            <div style={{ border:"1px solid #ddd", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#888", marginBottom:4 }}>Total Outgoing</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#C92A2A" }}>{fmt(total)}</div>
            </div>
            <div style={{ border:"1px solid #ddd", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#888", marginBottom:4 }}>Fixed Bills</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#3B5BDB" }}>{fmt(totalFor(sorted.filter(b=>b.category!=="credit")))}</div>
            </div>
            <div style={{ border:"1px solid #ddd", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#888", marginBottom:4 }}>Credit Cards</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#C92A2A" }}>{fmt(totalFor(sorted.filter(b=>b.category==="credit")))}</div>
            </div>
            <div style={{ border:"1px solid #ddd", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#888", marginBottom:4 }}>Payments</div>
              <div style={{ fontSize:22, fontWeight:900 }}>{sorted.length}</div>
            </div>
          </div>

          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, margin:"20px 0 12px" }}>Week by Week</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:8 }}>
            {["Week 1 · 1-7","Week 2 · 8-14","Week 3 · 15-21","Week 4 · 22-31"].map((l,i) => (
              <div key={i} style={{ border:"1px solid #ddd", borderRadius:8, padding:12 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#888", marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:20, fontWeight:900 }}>{fmt(totalFor(weeks[i]))}</div>
                <div style={{ fontSize:10, color:"#999", marginTop:2 }}>{weeks[i].length} payment{weeks[i].length!==1?"s":""}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, margin:"20px 0 12px" }}>By Category</div>
          {Object.entries(byCategory).map(([cat, bills]) => (
            <div key={cat}>
              <div style={{ fontSize:11, fontWeight:700, padding:"10px 0 4px", borderBottom:"1px solid #eee", marginBottom:4, color: CATEGORY_META[cat]?.color || "#333" }}>
                {CATEGORY_META[cat]?.label || cat} · {fmt(totalFor(bills))}
              </div>
              {bills.map(b => (
                <div key={b.id} style={{ display:"flex", padding:"7px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center", gap:8 }}>
                  <div style={{ width:50, color:"#777", fontSize:11, flexShrink:0, fontWeight:700 }}>{ordinal(b.day)}</div>
                  <div style={{ flex:1, fontWeight:600 }}>{b.name}{b.variable && !b.amount && <span style={{ color:"#E67700", fontSize:10, fontWeight:700 }}> ~ est</span>}</div>
                  <div style={{ fontWeight:800, fontSize:13, textAlign:"right", flexShrink:0 }}>{b.amount ? fmt(b.amount) : <span style={{ color:"#E67700", fontSize:10, fontWeight:700 }}>TBD</span>}</div>
                </div>
              ))}
            </div>
          ))}

          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:5, margin:"20px 0 12px" }}>All Bills, Chronological</div>
          {sorted.map(b => (
            <div key={b.id} style={{ display:"flex", padding:"7px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center", gap:8 }}>
              <div style={{ width:50, fontSize:11, fontWeight:800, flexShrink:0, color: CATEGORY_META[b.category]?.color || "#333" }}>{ordinal(b.day)}</div>
              <div style={{ flex:1, fontWeight:600 }}>{b.name}{b.variable && !b.amount && <span style={{ color:"#E67700", fontSize:10, fontWeight:700 }}> ~ est</span>}</div>
              <div style={{ fontWeight:800, fontSize:13, textAlign:"right", flexShrink:0 }}>{b.amount ? fmt(b.amount) : <span style={{ color:"#E67700", fontSize:10, fontWeight:700 }}>TBD</span>}</div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:"2px solid #1a1a1a", marginTop:6, fontWeight:900, fontSize:15 }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>

          <div style={{ borderTop:"1px solid #ddd", marginTop:24, paddingTop:10, fontSize:10, color:"#aaa", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
            <span>PredictaBill · {MONTHS[month]} {year} · Forward-looking forecast</span>
            <span>~ est = estimated · TBD = awaiting statement</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background:"#f8f9ff", border:"1px solid #e0e8ff", borderRadius:12, padding:"20px", marginBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>Monthly Forecast Report</div>
        <div style={{ fontSize:13, color:"#666", marginBottom:16, lineHeight:1.6 }}>
          Two printable formats. The list breaks bills down by category and week. The calendar shows the month visually, like the whiteboard you're used to.
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={() => setFullScreen(true)} style={{
            background:"#3B5BDB", color:"#fff", border:"none", borderRadius:10,
            padding:"14px 24px", fontWeight:800, fontSize:15, cursor:"pointer", flex:"1 1 140px", maxWidth:220,
          }}>
            📄 List Report
          </button>
          <button onClick={() => setCalendarPrint(true)} style={{
            background:"#fff", color:"#3B5BDB", border:"2px solid #3B5BDB", borderRadius:10,
            padding:"14px 24px", fontWeight:800, fontSize:15, cursor:"pointer", flex:"1 1 140px", maxWidth:220,
          }}>
            📅 Calendar Grid
          </button>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
        <div style={{ padding:"16px 18px", borderBottom:"1px solid #f0f0f0" }}>
          <div style={{ fontSize:11, fontWeight:900, color:"#3B5BDB", letterSpacing:"0.04em" }}>PREDICTABILL</div>
          <div style={{ fontSize:20, fontWeight:900, marginTop:2 }}>{MONTHS[month]} {year} Preview</div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", borderBottom:"1px solid #f0f0f0" }}>
          {[["Total Outgoing",fmt(total),"#C92A2A"],["Fixed",fmt(totalFor(sorted.filter(b=>b.category!=="credit"))),"#3B5BDB"],["Credit Cards",fmt(totalFor(sorted.filter(b=>b.category==="credit"))),"#C92A2A"]].map(([l,v,c])=>(
            <div key={l} style={{ flex:"1 1 100px", padding:"14px 16px", borderRight:"1px solid #f0f0f0" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Week by Week</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["1-7","8-14","15-21","22-31"].map((l,i)=>(
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

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth());
  const [view, setView] = useState("calendar");
  const [variableAmounts, setVariableAmounts] = useState({});
  const [fixedOverrides, setFixedOverrides] = useState({});
  const [extraBills, setExtraBills] = useState([]);
  const [updatingBill, setUpdatingBill] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const monthKey = `${year}-${month}`;

  const allBills = useMemo(() => {
    const fixed = FIXED_BILLS.map(b => ({ ...b, variable: false, amount: fixedOverrides[b.id] ?? b.amount }));
    const variable = VARIABLE_BILLS.map(b => ({
      ...b, variable: true,
      amount: variableAmounts[`${monthKey}-${b.id}`] || 0,
    }));
    const extra = extraBills.filter(b => b.monthKey === monthKey).map(b => ({ ...b, variable: false }));
    return [...fixed, ...variable, ...extra];
  }, [variableAmounts, fixedOverrides, extraBills, monthKey]);

  function saveVariableAmount(bill, amount) {
    if (!bill.variable) {
      setFixedOverrides(f => ({ ...f, [bill.id]: amount }));
    } else {
      setVariableAmounts(v => ({ ...v, [`${monthKey}-${bill.id}`]: amount }));
    }
    setUpdatingBill(null);
  }

  function addExtraBill(bill) {
    setExtraBills(bs => [...bs, { ...bill, monthKey }]);
    setShowAddModal(false);
  }

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const tabs = [
    { id:"calendar", label:"📅 Calendar" },
    { id:"list",     label:"📋 List" },
    { id:"report",   label:"📄 Report" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F8", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}
      {unlocked && (<>
      {updatingBill && <UpdateModal bill={updatingBill} onSave={amt => saveVariableAmount(updatingBill, amt)} onClose={() => setUpdatingBill(null)} />}
      {showAddModal && <AddBillModal onSave={addExtraBill} onClose={() => setShowAddModal(false)} />}

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"0 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ padding:"14px 0", fontWeight:900, fontSize:20, letterSpacing:"-0.5px", flexShrink:0 }}>
          <span style={{ color:"#3B5BDB" }}>Predict</span>aBill
        </div>
        <div style={{ display:"flex", gap:2, flex:1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              background: view===t.id ? "#EDF2FF" : "transparent",
              color: view===t.id ? "#3B5BDB" : "#666",
              border:"none", padding:"10px 12px", cursor:"pointer",
              fontWeight: view===t.id ? 800 : 500, fontSize:13, borderRadius:6,
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)} style={{
          background:"#3B5BDB", color:"#fff", border:"none", borderRadius:8,
          padding:"8px 14px", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0,
        }}>+ Add</button>
      </div>

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={prevMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>←</button>
        <div style={{ fontWeight:900, fontSize:16, letterSpacing:"-0.3px", flex:1 }}>{MONTHS[month]} {year}</div>
        <button onClick={() => { setMonth(TODAY.getMonth()); setYear(TODAY.getFullYear()); }}
          style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, color:"#3B5BDB", fontWeight:700 }}>Today</button>
        <button onClick={nextMonth} style={{ background:"none", border:"1px solid #ddd", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:14 }}>→</button>
      </div>

      <div style={{ maxWidth:920, margin:"0 auto", padding:"16px 12px" }}>
        {view==="calendar" && <CalendarView allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} />}
        {view==="list"     && <ListView     allBills={allBills} year={year} month={month} onUpdateVariable={setUpdatingBill} />}
        {view==="report"   && <ReportView   allBills={allBills} year={year} month={month} />}
      </div>
    </>)}
    </div>
  );
}
