import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Megaphone, Trophy, CalendarDays, LogOut, Plus, Trash2, Lock,
  User, Users, Search, ChevronRight, RefreshCw, AlertCircle,
  ShieldCheck, Sparkles, Store, Clock, Minus, Coins, Wallet
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/* ---------------------------------------------------------
   TEMA
--------------------------------------------------------- */
const T = {
  paper: "#FAF7EF",
  paperDeep: "#F0EAD9",
  card: "#FFFFFF",
  ink: "#1E2723",
  inkSoft: "#6B7570",
  line: "#DED4BC",
  teal: "#0E6B58",
  tealDeep: "#0A4C40",
  tealSoft: "#E3EEEA",
  amber: "#D98A2B",
  amberSoft: "#F7E7C9",
  red: "#B0472C",
  redSoft: "#F6DFD8",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
.f-display{font-family:'Fraunces',Georgia,serif;}
.f-body{font-family:'Inter',system-ui,sans-serif;}
.f-mono{font-family:'IBM Plex Mono',monospace;}
::selection{background:${T.amberSoft};}
input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;}
.scrollbar-thin::-webkit-scrollbar{height:8px;width:8px;}
.scrollbar-thin::-webkit-scrollbar-thumb{background:${T.line};border-radius:8px;}
`;

const TOTAL_DAYS = 7;

/* ---------------------------------------------------------
   YARDIMCILAR
--------------------------------------------------------- */
const keyOf = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const participantKeyOf = (name, surname, city) =>
  `${keyOf(`${name} ${surname}`)}::${keyOf(city)}`;
const weightOf = (c) => {
  const w = Number(c?.weight);
  return Number.isFinite(w) && w > 0 ? w : 1;
};
const titleCase = (s) =>
  (s || "").trim().replace(/\s+/g, " ").split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("tr") + w.slice(1).toLocaleLowerCase("tr") : w))
    .join(" ");

function dayEarned(scoring, pKey, day) {
  const dayScores = (scoring.scores?.[pKey] || {})[day] || {};
  return (scoring.criteria || []).reduce(
    (sum, c) => sum + (Number(dayScores[c.id]) || 0) * weightOf(c),
    0
  );
}
function totalEarned(scoring, pKey) {
  let sum = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) sum += dayEarned(scoring, pKey, d);
  return sum;
}
function totalSpent(market, pKey) {
  return (market.purchases || [])
    .filter((t) => t.participantKey === pKey)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}
function balanceOf(scoring, market, pKey) {
  return totalEarned(scoring, pKey) - totalSpent(market, pKey);
}

async function hashPassword(pass) {
  const data = new TextEncoder().encode(pass);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadJSON(key, fallback) {
  try {
    const snap = await getDoc(doc(db, "app", key));
    return snap.exists() ? snap.data().value : fallback;
  } catch {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await setDoc(doc(db, "app", key), { value });
    return true;
  } catch {
    return false;
  }
}
function subscribeJSON(key, fallback, onChange) {
  return onSnapshot(
    doc(db, "app", key),
    (snap) => onChange(snap.exists() ? snap.data().value : fallback),
    () => onChange(fallback)
  );
}

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString("tr-TR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dayInfo(startDate) {
  if (!startDate) return { label: "Başlangıç tarihi henüz belirlenmedi", index: 0 };
  const start = new Date(startDate + "T00:00:00");
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((todayMid - start) / 86400000) + 1;
  if (diff < 1) return { label: `Program ${1 - diff} gün sonra başlıyor`, index: 0 };
  if (diff > TOTAL_DAYS) return { label: "Program tamamlandı", index: TOTAL_DAYS + 1 };
  return { label: `${diff}. gün / ${TOTAL_DAYS}`, index: diff };
}

/* ---------------------------------------------------------
   KÜÇÜK UI PARÇALARI
--------------------------------------------------------- */
function DayRibbon({ startDate }) {
  const info = dayInfo(startDate);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
          const n = i + 1;
          const active = info.index === n;
          const passed = info.index > n;
          return (
            <div
              key={n}
              title={`${n}. gün`}
              style={{
                background: active ? T.amber : passed ? T.teal : T.paperDeep,
                borderColor: active ? T.amber : passed ? T.teal : T.line,
              }}
              className="h-2.5 flex-1 rounded-full border transition-colors"
            />
          );
        })}
      </div>
      <span className="f-mono text-[11px] tracking-wide" style={{ color: T.inkSoft }}>
        {info.label.toUpperCase()}
      </span>
    </div>
  );
}

function Pill({ children, tone = "teal" }) {
  const map = {
    teal: { bg: T.tealSoft, fg: T.tealDeep },
    amber: { bg: T.amberSoft, fg: "#8A5A16" },
    red: { bg: T.redSoft, fg: T.red },
  };
  const c = map[tone];
  return (
    <span
      className="f-mono text-[11px] px-2 py-0.5 rounded-full tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm f-body font-medium transition-all"
      style={{
        background: active ? T.tealDeep : "transparent",
        color: active ? "#fff" : T.inkSoft,
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: T.card, border: `1px solid ${T.line}` }}
    >
      {children}
    </div>
  );
}

function TextInput(props) {
  const hasCustomWidth = /(^|\s)w-\S/.test(props.className || "");
  return (
    <input
      {...props}
      className={`f-body ${hasCustomWidth ? "" : "w-full"} px-3 py-2 rounded-lg border outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(14,107,88,0.15)] ${props.className || ""}`}
      style={{ borderColor: T.line, background: T.paper, color: T.ink, ...(props.style || {}) }}
    />
  );
}

function Button({ children, onClick, variant = "primary", type = "button", disabled, className = "" }) {
  const styles = {
    primary: { background: T.tealDeep, color: "#fff" },
    amber: { background: T.amber, color: "#fff" },
    ghost: { background: "transparent", color: T.inkSoft, border: `1px solid ${T.line}` },
    danger: { background: T.redSoft, color: T.red },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`f-body text-sm font-medium px-4 py-2 rounded-lg transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------
   ANA UYGULAMA
--------------------------------------------------------- */
export default function App() {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState({ organizers: [], participants: [] });
  const [announcements, setAnnouncements] = useState([]);
  const [program, setProgram] = useState({ startDate: "", schedule: {} });
  const [scoring, setScoring] = useState({ criteria: [], scores: {} });
  const [market, setMarket] = useState({ products: [], purchases: [] });

  const [view, setView] = useState("landing"); // landing | participant | organizer
  const [entryMode, setEntryMode] = useState(null); // 'participant' | 'organizer' | null
  const [currentUser, setCurrentUser] = useState(null); // {type,name,key}
  const [tab, setTab] = useState("duyurular");

  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    const [p, a, prog, sc, mk] = await Promise.all([
      loadJSON("people", { organizers: [], participants: [] }),
      loadJSON("announcements", []),
      loadJSON("program", { startDate: "", schedule: {} }),
      loadJSON("scoring", { criteria: [], scores: {} }),
      loadJSON("market", { products: [], purchases: [] }),
    ]);
    setPeople(p);
    setAnnouncements(a);
    setProgram(prog);
    setScoring(sc);
    setMarket(mk);
  }, []);

  useEffect(() => {
    const loadedFlags = { people: false, announcements: false, program: false, scoring: false, market: false };
    const markLoaded = (k) => {
      loadedFlags[k] = true;
      if (Object.values(loadedFlags).every(Boolean)) setReady(true);
    };

    const unsubscribers = [
      subscribeJSON("people", { organizers: [], participants: [] }, (v) => {
        setPeople(v);
        markLoaded("people");
      }),
      subscribeJSON("announcements", [], (v) => {
        setAnnouncements(v);
        markLoaded("announcements");
      }),
      subscribeJSON("program", { startDate: "", schedule: {} }, (v) => {
        setProgram(v);
        markLoaded("program");
      }),
      subscribeJSON("scoring", { criteria: [], scores: {} }, (v) => {
        setScoring(v);
        markLoaded("scoring");
      }),
      subscribeJSON("market", { products: [], purchases: [] }, (v) => {
        setMarket(v);
        markLoaded("market");
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setView("landing");
    setEntryMode(null);
    setTab("duyurular");
    setErrorMsg("");
  };

  if (!ready) {
    return (
      <div className="min-h-[400px] flex items-center justify-center f-body" style={{ color: T.inkSoft }}>
        <style>{FONTS}</style>
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-[600px] w-full" style={{ background: T.paper }}>
      <style>{FONTS}</style>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} style={{ color: T.amber }} />
              <span className="f-mono text-[11px] tracking-widest" style={{ color: T.inkSoft }}>
                YAZ KAMPI
              </span>
            </div>
            <h1 className="f-display text-3xl sm:text-4xl" style={{ color: T.ink }}>
              Program Panosu
            </h1>
          </div>
          <div className="w-full sm:w-64">
            <DayRibbon startDate={program.startDate} />
          </div>
        </header>

        {view === "landing" && (
          <Landing
            entryMode={entryMode}
            setEntryMode={setEntryMode}
            people={people}
            setPeople={setPeople}
            setCurrentUser={setCurrentUser}
            setView={setView}
            errorMsg={errorMsg}
            setErrorMsg={setErrorMsg}
          />
        )}

        {view !== "landing" && currentUser && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center f-display text-sm"
                  style={{
                    background: currentUser.type === "organizer" ? T.tealDeep : T.amber,
                    color: "#fff",
                  }}
                >
                  {currentUser.name.trim()[0]?.toLocaleUpperCase("tr") || "?"}
                </div>
                <div>
                  <div className="f-body text-sm font-semibold" style={{ color: T.ink }}>
                    {currentUser.name}
                  </div>
                  <Pill tone={currentUser.type === "organizer" ? "teal" : "amber"}>
                    {currentUser.type === "organizer" ? "ORGANİZATÖR" : "KATILIMCI"}
                  </Pill>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser.type === "organizer" && (
                  <button
                    onClick={refresh}
                    title="Verileri yenile"
                    className="p-2 rounded-lg transition-opacity"
                    style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
                  >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  </button>
                )}
                <Button variant="ghost" onClick={logout}>
                  <LogOut size={15} /> Çıkış yap
                </Button>
              </div>
            </div>

            <nav className="flex flex-wrap gap-1 mb-5 p-1 rounded-2xl" style={{ background: T.paperDeep }}>
              <TabButton active={tab === "duyurular"} onClick={() => setTab("duyurular")} icon={Megaphone} label="Duyurular" />
              <TabButton active={tab === "program"} onClick={() => setTab("program")} icon={CalendarDays} label="Program" />
              <TabButton
                active={tab === "puanlar"}
                onClick={() => setTab("puanlar")}
                icon={Trophy}
                label={currentUser.type === "organizer" ? "Puanlar" : "Puanlarım"}
              />
              <TabButton active={tab === "nurbakkal"} onClick={() => setTab("nurbakkal")} icon={Store} label="Nur Bakkal" />
              {currentUser.type === "organizer" && (
                <TabButton active={tab === "organizatorler"} onClick={() => setTab("organizatorler")} icon={Users} label="Organizatörler" />
              )}
            </nav>

            {tab === "duyurular" && (
              <Duyurular
                currentUser={currentUser}
                announcements={announcements}
                setAnnouncements={setAnnouncements}
              />
            )}
            {tab === "puanlar" && currentUser.type === "organizer" && (
              <PuanTablosuOrganizer
                people={people}
                setPeople={setPeople}
                scoring={scoring}
                setScoring={setScoring}
                market={market}
              />
            )}
            {tab === "puanlar" && currentUser.type === "participant" && (
              <PuanlarimKatilimci currentUser={currentUser} scoring={scoring} market={market} />
            )}
            {tab === "program" && (
              <ProgramSekmesi
                currentUser={currentUser}
                program={program}
                setProgram={setProgram}
              />
            )}
            {tab === "nurbakkal" && (
              <NurBakkal
                currentUser={currentUser}
                people={people}
                market={market}
                setMarket={setMarket}
                scoring={scoring}
              />
            )}
            {tab === "organizatorler" && currentUser.type === "organizer" && (
              <OrganizatorYonetimi
                currentUser={currentUser}
                people={people}
                setPeople={setPeople}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   GİRİŞ EKRANI
--------------------------------------------------------- */
function Landing({ entryMode, setEntryMode, people, setPeople, setCurrentUser, setView, errorMsg, setErrorMsg }) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [city, setCity] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgPass, setOrgPass] = useState("");
  const [orgPassConfirm, setOrgPassConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const needsSetup = people.organizers.length === 0;

  const enterAsParticipant = async () => {
    setErrorMsg("");
    if (!name.trim() || !surname.trim() || !city.trim()) {
      setErrorMsg("Lütfen ad, soyad ve şehir gir.");
      return;
    }
    setBusy(true);
    const k = participantKeyOf(name, surname, city);
    const found = people.participants.find((p) => p.key === k);
    if (!found) {
      setErrorMsg("Bilgileriniz listede yok, lütfen bir organizatörle iletişime geçin.");
      setBusy(false);
      return;
    }
    setCurrentUser({ type: "participant", name: found.display, key: found.key });
    setView("participant");
    setBusy(false);
  };

  const createFirstOrganizer = async () => {
    setErrorMsg("");
    if (!orgName.trim() || !orgPass) {
      setErrorMsg("Ad ve şifre gerekli.");
      return;
    }
    if (orgPass !== orgPassConfirm) {
      setErrorMsg("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    const full = titleCase(orgName);
    const hashed = await hashPassword(orgPass);
    const updated = {
      ...people,
      organizers: [...people.organizers, { key: keyOf(full), display: full, password: hashed }],
    };
    setPeople(updated);
    await saveJSON("people", updated);
    setCurrentUser({ type: "organizer", name: full, key: keyOf(full) });
    setView("organizer");
    setBusy(false);
  };

  const loginAsOrganizer = async () => {
    setErrorMsg("");
    const k = keyOf(orgName);
    const found = people.organizers.find((o) => o.key === k);
    const hashed = await hashPassword(orgPass);
    if (!found || found.password !== hashed) {
      setErrorMsg("Ad veya şifre hatalı.");
      return;
    }
    setCurrentUser({ type: "organizer", name: found.display, key: found.key });
    setView("organizer");
  };

  if (!entryMode) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <button
          onClick={() => setEntryMode("participant")}
          className="text-left p-6 rounded-2xl transition-transform hover:-translate-y-0.5"
          style={{ background: T.card, border: `1px solid ${T.line}` }}
        >
          <User size={22} style={{ color: T.amber }} />
          <div className="f-display text-xl mt-3" style={{ color: T.ink }}>Katılımcıyım</div>
          <p className="f-body text-sm mt-1" style={{ color: T.inkSoft }}>
            Ad ve soyadınla giriş yap, duyuruları ve kendi puanlarını gör.
          </p>
          <div className="flex items-center gap-1 mt-4 f-body text-sm font-medium" style={{ color: T.amber }}>
            Devam et <ChevronRight size={16} />
          </div>
        </button>
        <button
          onClick={() => setEntryMode("organizer")}
          className="text-left p-6 rounded-2xl transition-transform hover:-translate-y-0.5"
          style={{ background: T.card, border: `1px solid ${T.line}` }}
        >
          <ShieldCheck size={22} style={{ color: T.teal }} />
          <div className="f-display text-xl mt-3" style={{ color: T.ink }}>Organizatörüm</div>
          <p className="f-body text-sm mt-1" style={{ color: T.inkSoft }}>
            Duyuru paylaş, puan ver ve program içeriğini düzenle.
          </p>
          <div className="flex items-center gap-1 mt-4 f-body text-sm font-medium" style={{ color: T.teal }}>
            Devam et <ChevronRight size={16} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-4">
      <Card>
        <button
          onClick={() => { setEntryMode(null); setErrorMsg(""); }}
          className="f-body text-xs mb-4"
          style={{ color: T.inkSoft }}
        >
          ← Geri
        </button>

        {entryMode === "participant" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} style={{ color: T.amber }} />
              <h2 className="f-display text-xl" style={{ color: T.ink }}>Katılımcı Girişi</h2>
            </div>
            <div className="space-y-3">
              <TextInput placeholder="Adın" value={name} onChange={(e) => setName(e.target.value)} />
              <TextInput placeholder="Soyadın" value={surname} onChange={(e) => setSurname(e.target.value)} />
              <TextInput
                placeholder="Şehir"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enterAsParticipant()}
              />
              {errorMsg && <ErrorText msg={errorMsg} />}
              <Button variant="amber" className="w-full" onClick={enterAsParticipant} disabled={busy}>
                Giriş yap
              </Button>
            </div>
          </>
        )}

        {entryMode === "organizer" && needsSetup && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} style={{ color: T.teal }} />
              <h2 className="f-display text-xl" style={{ color: T.ink }}>İlk Organizatör Hesabı</h2>
            </div>
            <p className="f-body text-xs mb-4" style={{ color: T.inkSoft }}>
              Henüz organizatör tanımlanmamış. İlk hesabı sen oluştur; sonrasında diğer organizatörleri panelden ekleyebilirsin.
            </p>
            <div className="space-y-3">
              <TextInput placeholder="Ad Soyad" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <TextInput type="password" placeholder="Şifre belirle" value={orgPass} onChange={(e) => setOrgPass(e.target.value)} />
              <TextInput type="password" placeholder="Şifreyi tekrar gir" value={orgPassConfirm} onChange={(e) => setOrgPassConfirm(e.target.value)} />
              {errorMsg && <ErrorText msg={errorMsg} />}
              <Button className="w-full" onClick={createFirstOrganizer} disabled={busy}>
                Hesabı oluştur ve giriş yap
              </Button>
            </div>
          </>
        )}

        {entryMode === "organizer" && !needsSetup && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} style={{ color: T.teal }} />
              <h2 className="f-display text-xl" style={{ color: T.ink }}>Organizatör Girişi</h2>
            </div>
            <div className="space-y-3">
              <TextInput placeholder="Ad Soyad" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <TextInput type="password" placeholder="Şifre" value={orgPass}
                onChange={(e) => setOrgPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loginAsOrganizer()}
              />
              {errorMsg && <ErrorText msg={errorMsg} />}
              <Button className="w-full" onClick={loginAsOrganizer}>Giriş yap</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function ErrorText({ msg }) {
  return (
    <div className="flex items-center gap-1.5 f-body text-xs" style={{ color: T.red }}>
      <AlertCircle size={13} /> {msg}
    </div>
  );
}

/* ---------------------------------------------------------
   DUYURULAR
--------------------------------------------------------- */
function Duyurular({ currentUser, announcements, setAnnouncements }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const isOrganizer = currentUser.type === "organizer";

  const publish = async () => {
    if (!title.trim() || !body.trim()) return;
    const entry = {
      id: Date.now().toString(),
      title: title.trim(),
      body: body.trim(),
      author: currentUser.name,
      ts: Date.now(),
    };
    const updated = [entry, ...announcements];
    setAnnouncements(updated);
    await saveJSON("announcements", updated);
    setTitle("");
    setBody("");
  };

  const remove = async (id) => {
    const updated = announcements.filter((a) => a.id !== id);
    setAnnouncements(updated);
    await saveJSON("announcements", updated);
  };

  return (
    <div className="space-y-4">
      {isOrganizer && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={17} style={{ color: T.teal }} />
            <h3 className="f-display text-lg" style={{ color: T.ink }}>Yeni duyuru</h3>
          </div>
          <div className="space-y-2">
            <TextInput placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              placeholder="Duyuru metni…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="f-body w-full px-3 py-2 rounded-lg border outline-none resize-none focus:shadow-[0_0_0_3px_rgba(14,107,88,0.15)]"
              style={{ borderColor: T.line, background: T.paper, color: T.ink }}
            />
            <div className="flex justify-end">
              <Button onClick={publish}><Plus size={15} /> Yayınla</Button>
            </div>
          </div>
        </Card>
      )}

      {announcements.length === 0 && (
        <EmptyState text="Henüz duyuru paylaşılmadı." />
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="f-display text-lg" style={{ color: T.ink }}>{a.title}</h4>
                <p className="f-body text-sm mt-1 whitespace-pre-wrap" style={{ color: T.inkSoft }}>{a.body}</p>
                <div className="f-mono text-[11px] mt-3" style={{ color: T.inkSoft }}>
                  {a.author} · {fmtDate(a.ts)}
                </div>
              </div>
              {isOrganizer && (
                <button onClick={() => remove(a.id)} style={{ color: T.inkSoft }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="rounded-2xl p-8 text-center f-body text-sm"
      style={{ border: `1px dashed ${T.line}`, color: T.inkSoft }}
    >
      {text}
    </div>
  );
}

/* ---------------------------------------------------------
   PUAN TABLOSU — ORGANİZATÖR
--------------------------------------------------------- */
function PuanTablosuOrganizer({ people, setPeople, scoring, setScoring, market }) {
  const [newCriteria, setNewCriteria] = useState("");
  const [newWeight, setNewWeight] = useState("1");
  const [newName, setNewName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newCity, setNewCity] = useState("");
  const [addErr, setAddErr] = useState("");
  const [search, setSearch] = useState("");
  const [day, setDay] = useState(1);

  const addCriteria = async () => {
    if (!newCriteria.trim()) return;
    const c = { id: Date.now().toString(), name: newCriteria.trim(), weight: weightOf({ weight: newWeight }) };
    const updated = { ...scoring, criteria: [...scoring.criteria, c] };
    setScoring(updated);
    await saveJSON("scoring", updated);
    setNewCriteria("");
    setNewWeight("1");
  };

  const removeCriteria = async (id) => {
    const updated = { ...scoring, criteria: scoring.criteria.filter((c) => c.id !== id) };
    setScoring(updated);
    await saveJSON("scoring", updated);
  };

  const addParticipant = async () => {
    setAddErr("");
    if (!newName.trim() || !newSurname.trim() || !newCity.trim()) {
      setAddErr("Ad, soyad ve şehir gerekli.");
      return;
    }
    const display = titleCase(`${newName} ${newSurname}`);
    const city = titleCase(newCity);
    const k = participantKeyOf(newName, newSurname, newCity);
    if (people.participants.some((p) => p.key === k)) {
      setAddErr("Bu kişi (ad, soyad ve şehir ile) zaten ekli.");
      return;
    }
    const updated = { ...people, participants: [...people.participants, { key: k, display, city }] };
    setPeople(updated);
    await saveJSON("people", updated);
    setNewName("");
    setNewSurname("");
    setNewCity("");
  };

  const removeParticipant = async (key) => {
    const updated = { ...people, participants: people.participants.filter((p) => p.key !== key) };
    setPeople(updated);
    await saveJSON("people", updated);
  };

  const setScore = async (pKey, d, cId, value) => {
    const num = value === "" ? undefined : Number(value);
    const nextScores = { ...scoring.scores };
    nextScores[pKey] = { ...(nextScores[pKey] || {}) };
    nextScores[pKey][d] = { ...(nextScores[pKey][d] || {}) };
    if (num === undefined || Number.isNaN(num)) {
      delete nextScores[pKey][d][cId];
    } else {
      nextScores[pKey][d][cId] = num;
    }
    const updated = { ...scoring, scores: nextScores };
    setScoring(updated);
    await saveJSON("scoring", updated);
  };

  const filteredParticipants = useMemo(() => {
    const q = keyOf(search);
    return people.participants
      .filter((p) => !q || keyOf(`${p.display} ${p.city || ""}`).includes(q))
      .sort((a, b) => a.display.localeCompare(b.display, "tr"));
  }, [people.participants, search]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={17} style={{ color: T.teal }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Puanlama kriterleri</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {scoring.criteria.length === 0 && (
            <span className="f-body text-sm" style={{ color: T.inkSoft }}>Henüz kriter eklenmedi.</span>
          )}
          {scoring.criteria.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 f-body text-sm px-3 py-1.5 rounded-full"
              style={{ background: T.tealSoft, color: T.tealDeep }}
            >
              {c.name} <span className="f-mono text-xs" style={{ color: T.inkSoft }}>(x{weightOf(c)})</span>
              <button onClick={() => removeCriteria(c.id)}>
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput
            placeholder="Yeni kriter (ör. Takım çalışması)"
            value={newCriteria}
            onChange={(e) => setNewCriteria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriteria()}
          />
          <TextInput
            type="number"
            step="0.1"
            title="Ağırlık / çarpan"
            placeholder="Ağırlık"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriteria()}
            className="w-24"
          />
          <Button onClick={addCriteria}><Plus size={15} /> Ekle</Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users size={17} style={{ color: T.teal }} />
            <h3 className="f-display text-lg" style={{ color: T.ink }}>Katılımcı puanları</h3>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.inkSoft }} />
              <TextInput
                placeholder="Katılımcı ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-44"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <TextInput
            placeholder="Ad"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          />
          <TextInput
            placeholder="Soyad"
            value={newSurname}
            onChange={(e) => setNewSurname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          />
          <TextInput
            placeholder="Şehir"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          />
          <Button variant="ghost" onClick={addParticipant} className="shrink-0"><Plus size={15} /> Katılımcı ekle</Button>
        </div>
        <div className="mb-4">{addErr && <ErrorText msg={addErr} />}</div>

        <div className="flex items-center gap-2 mb-4">
          <span className="f-body text-sm" style={{ color: T.ink }}>Gün:</span>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
              const d = i + 1;
              const active = day === d;
              return (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className="f-mono text-xs w-8 h-8 rounded-lg transition-colors"
                  style={{
                    background: active ? T.tealDeep : T.paperDeep,
                    color: active ? "#fff" : T.inkSoft,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {scoring.criteria.length === 0 ? (
          <EmptyState text="Puan girebilmek için önce en az bir kriter ekle." />
        ) : filteredParticipants.length === 0 ? (
          <EmptyState text="Henüz katılımcı yok. Katılımcılar giriş yaptıkça burada listelenir." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin rounded-xl" style={{ border: `1px solid ${T.line}` }}>
            <table className="w-full text-sm f-body min-w-[520px]">
              <thead>
                <tr style={{ background: T.paperDeep }}>
                  <th className="text-left px-3 py-2.5 sticky left-0" style={{ background: T.paperDeep, color: T.ink }}>
                    Katılımcı
                  </th>
                  <th className="px-2 py-2.5"></th>
                  {scoring.criteria.map((c) => (
                    <th key={c.id} className="text-center px-3 py-2.5 f-mono text-xs" style={{ color: T.inkSoft }}>
                      {c.name} (x{weightOf(c)})
                    </th>
                  ))}
                  <th className="text-center px-3 py-2.5 f-mono text-xs" style={{ color: T.amber }}>{day}. gün</th>
                  <th className="text-center px-3 py-2.5 f-mono text-xs" style={{ color: T.teal }}>Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p, idx) => {
                  const rowScores = (scoring.scores[p.key] || {})[day] || {};
                  const dayTotal = dayEarned(scoring, p.key, day);
                  const balance = balanceOf(scoring, market, p.key);
                  return (
                    <tr key={p.key} style={{ borderTop: `1px solid ${T.line}`, background: idx % 2 ? T.paper : T.card }}>
                      <td className="px-3 py-2 sticky left-0 font-medium" style={{ background: idx % 2 ? T.paper : T.card, color: T.ink }}>
                        {p.display}
                        {p.city && (
                          <span className="f-mono text-xs ml-1.5" style={{ color: T.inkSoft }}>· {p.city}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeParticipant(p.key)} style={{ color: T.inkSoft }} title="Katılımcıyı sil">
                          <Trash2 size={14} />
                        </button>
                      </td>
                      {scoring.criteria.map((c) => (
                        <td key={c.id} className="px-2 py-1.5 text-center">
                          <input
                            key={`${p.key}-${day}-${c.id}`}
                            type="number"
                            defaultValue={rowScores[c.id] ?? ""}
                            onBlur={(e) => setScore(p.key, day, c.id, e.target.value)}
                            className="f-mono w-16 text-center px-1 py-1 rounded-md border outline-none focus:shadow-[0_0_0_3px_rgba(14,107,88,0.15)]"
                            style={{ borderColor: T.line, background: T.paper, color: T.ink }}
                          />
                        </td>
                      ))}
                      <td className="text-center f-mono font-semibold" style={{ color: T.amber }}>{dayTotal}</td>
                      <td className="text-center f-mono font-semibold" style={{ color: T.teal }}>{balance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   PUANLARIM — KATILIMCI
--------------------------------------------------------- */
function PuanlarimKatilimci({ currentUser, scoring, market }) {
  const balance = balanceOf(scoring, market, currentUser.key);
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => ({
    day: d,
    earned: dayEarned(scoring, currentUser.key, d),
  }));
  const myPurchases = (market.purchases || [])
    .filter((t) => t.participantKey === currentUser.key)
    .sort((a, b) => b.ts - a.ts);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={17} style={{ color: T.amber }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Güncel bakiyen</h3>
        </div>
        <div className="f-mono text-3xl font-bold" style={{ color: T.tealDeep }}>{balance}</div>
      </Card>

      {scoring.criteria.length === 0 ? (
        <EmptyState text="Organizatörler henüz puanlama kriteri belirlemedi." />
      ) : (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={17} style={{ color: T.amber }} />
            <h3 className="f-display text-lg" style={{ color: T.ink }}>Günlere göre kazanılan puan</h3>
          </div>
          <div className="divide-y" style={{ borderColor: T.line }}>
            {days.map(({ day, earned }) => (
              <div key={day} className="flex items-center justify-between py-2.5">
                <span className="f-body text-sm" style={{ color: T.ink }}>{day}. gün</span>
                <span className="f-mono text-sm font-semibold" style={{ color: T.teal }}>{earned}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {myPurchases.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Store size={17} style={{ color: T.teal }} />
            <h3 className="f-display text-lg" style={{ color: T.ink }}>Nur Bakkal alışverişlerin</h3>
          </div>
          <div className="divide-y" style={{ borderColor: T.line }}>
            {myPurchases.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="f-body text-sm" style={{ color: T.ink }}>{t.note || "—"}</div>
                  <div className="f-mono text-[11px]" style={{ color: T.inkSoft }}>{fmtDate(t.ts)}</div>
                </div>
                <span className="f-mono text-sm font-semibold" style={{ color: T.red }}>-{t.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   PROGRAM
--------------------------------------------------------- */
function ProgramSekmesi({ currentUser, program, setProgram }) {
  const isOrganizer = currentUser.type === "organizer";

  const setStartDate = async (val) => {
    const updated = { ...program, startDate: val };
    setProgram(updated);
    await saveJSON("program", updated);
  };

  const rowsOf = (day) => (program.schedule && program.schedule[day]) || [];

  const persistSchedule = async (schedule) => {
    await saveJSON("program", { ...program, schedule });
  };

  const addRow = async (day) => {
    const row = { id: Date.now().toString(), saat: "", icerik: "" };
    const schedule = { ...(program.schedule || {}) };
    schedule[day] = [...(schedule[day] || []), row];
    setProgram({ ...program, schedule });
    await persistSchedule(schedule);
  };

  const removeRow = async (day, rowId) => {
    const schedule = { ...(program.schedule || {}) };
    schedule[day] = (schedule[day] || []).filter((r) => r.id !== rowId);
    setProgram({ ...program, schedule });
    await persistSchedule(schedule);
  };

  const updateRowField = async (day, rowId, field, value) => {
    const schedule = { ...(program.schedule || {}) };
    schedule[day] = (schedule[day] || []).map((r) => (r.id === rowId ? { ...r, [field]: value } : r));
    setProgram({ ...program, schedule });
    await persistSchedule(schedule);
  };

  return (
    <div className="space-y-4">
      {isOrganizer && (
        <Card>
          <div className="flex items-center gap-3">
            <CalendarDays size={17} style={{ color: T.teal }} />
            <label className="f-body text-sm" style={{ color: T.ink }}>Programın başlangıç tarihi:</label>
            <input
              type="date"
              value={program.startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="f-mono px-3 py-1.5 rounded-lg border outline-none"
              style={{ borderColor: T.line, background: T.paper, color: T.ink }}
            />
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
          const day = i + 1;
          const rows = [...rowsOf(day)].sort((a, b) => {
            if (!a.saat) return 1;
            if (!b.saat) return -1;
            return a.saat.localeCompare(b.saat);
          });
          return (
            <Card key={day}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="f-mono text-xs px-2 py-1 rounded-lg"
                    style={{ background: T.tealSoft, color: T.tealDeep }}
                  >
                    {String(day).padStart(2, "0")}
                  </span>
                  <h4 className="f-display text-lg" style={{ color: T.ink }}>{day}. Gün</h4>
                </div>
                {isOrganizer && (
                  <Button variant="ghost" onClick={() => addRow(day)}>
                    <Plus size={14} /> Satır ekle
                  </Button>
                )}
              </div>

              {rows.length === 0 ? (
                <EmptyState text="Bu güne henüz program eklenmedi." />
              ) : isOrganizer ? (
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <TextInput
                        defaultValue={r.saat}
                        placeholder="Saat"
                        onBlur={(e) => updateRowField(day, r.id, "saat", e.target.value)}
                        className="w-24 f-mono shrink-0"
                      />
                      <TextInput
                        defaultValue={r.icerik}
                        placeholder="İçerik"
                        onBlur={(e) => updateRowField(day, r.id, "icerik", e.target.value)}
                        className="flex-1"
                      />
                      <button onClick={() => removeRow(day, r.id)} style={{ color: T.inkSoft }} title="Satırı sil">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: T.line }}>
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 py-2.5">
                      <span className="f-mono text-sm shrink-0 w-16 flex items-center gap-1" style={{ color: T.teal }}>
                        <Clock size={13} /> {r.saat || "—"}
                      </span>
                      <span className="f-body text-sm" style={{ color: T.ink }}>{r.icerik}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   NUR BAKKAL
--------------------------------------------------------- */
function NurBakkal({ currentUser, people, market, setMarket, scoring }) {
  if (currentUser.type === "organizer") {
    return <NurBakkalOrganizer people={people} market={market} setMarket={setMarket} />;
  }
  return <NurBakkalKatilimci currentUser={currentUser} market={market} scoring={scoring} />;
}

function NurBakkalOrganizer({ people, market, setMarket }) {
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const persistMarket = async (updated) => {
    setMarket(updated);
    await saveJSON("market", updated);
  };

  const addProduct = async () => {
    if (!newProductName.trim() || newProductPrice === "") return;
    const product = { id: Date.now().toString(), name: newProductName.trim(), price: Number(newProductPrice) || 0 };
    await persistMarket({ ...market, products: [...market.products, product] });
    setNewProductName("");
    setNewProductPrice("");
  };

  const updateProductField = async (id, field, value) => {
    const products = market.products.map((p) =>
      p.id === id ? { ...p, [field]: field === "price" ? Number(value) || 0 : value } : p
    );
    await persistMarket({ ...market, products });
  };

  const removeProduct = async (id) => {
    await persistMarket({ ...market, products: market.products.filter((p) => p.id !== id) });
  };

  const filteredParticipants = useMemo(() => {
    const q = keyOf(search);
    return people.participants
      .filter((p) => !q || keyOf(`${p.display} ${p.city || ""}`).includes(q))
      .sort((a, b) => a.display.localeCompare(b.display, "tr"));
  }, [people.participants, search]);

  const selectedParticipant = people.participants.find((p) => p.key === selectedKey);

  const submitPurchase = async () => {
    setErr("");
    if (!selectedKey) {
      setErr("Lütfen bir katılımcı seç.");
      return;
    }
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      setErr("Geçerli bir puan miktarı gir.");
      return;
    }
    const entry = {
      id: Date.now().toString(),
      participantKey: selectedKey,
      amount: num,
      note: note.trim(),
      ts: Date.now(),
    };
    await persistMarket({ ...market, purchases: [entry, ...market.purchases] });
    setSelectedKey("");
    setSearch("");
    setAmount("");
    setNote("");
  };

  const removePurchase = async (id) => {
    await persistMarket({ ...market, purchases: market.purchases.filter((t) => t.id !== id) });
  };

  const participantName = (key) => {
    const p = people.participants.find((pp) => pp.key === key);
    return p ? `${p.display}${p.city ? ` · ${p.city}` : ""}` : "Bilinmeyen katılımcı";
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Store size={17} style={{ color: T.teal }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Ürün kataloğu</h3>
        </div>
        <div className="space-y-2 mb-3">
          {market.products.length === 0 && (
            <span className="f-body text-sm" style={{ color: T.inkSoft }}>Henüz ürün eklenmedi.</span>
          )}
          {market.products.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <TextInput
                defaultValue={p.name}
                placeholder="Ürün adı"
                onBlur={(e) => updateProductField(p.id, "name", e.target.value)}
                className="flex-1"
              />
              <TextInput
                type="number"
                defaultValue={p.price}
                placeholder="Puan"
                onBlur={(e) => updateProductField(p.id, "price", e.target.value)}
                className="w-24 f-mono"
              />
              <button onClick={() => removeProduct(p.id)} style={{ color: T.inkSoft }} title="Ürünü sil">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput
            placeholder="Yeni ürün adı"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
          />
          <TextInput
            type="number"
            placeholder="Puan"
            value={newProductPrice}
            onChange={(e) => setNewProductPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
            className="w-24"
          />
          <Button onClick={addProduct}><Plus size={15} /> Ekle</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Coins size={17} style={{ color: T.amber }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Puan düş (satın alma)</h3>
        </div>
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.inkSoft }} />
            <TextInput
              placeholder="Katılımcı ara…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedKey(""); }}
              className="pl-8"
            />
          </div>
          {search && !selectedKey && (
            <div className="rounded-lg overflow-hidden scrollbar-thin max-h-40 overflow-y-auto" style={{ border: `1px solid ${T.line}` }}>
              {filteredParticipants.length === 0 ? (
                <div className="f-body text-sm px-3 py-2" style={{ color: T.inkSoft }}>Katılımcı bulunamadı.</div>
              ) : (
                filteredParticipants.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setSelectedKey(p.key); setSearch(`${p.display}${p.city ? ` · ${p.city}` : ""}`); }}
                    className="w-full text-left f-body text-sm px-3 py-2 block"
                    style={{ color: T.ink }}
                  >
                    {p.display} {p.city && <span className="f-mono text-xs" style={{ color: T.inkSoft }}>· {p.city}</span>}
                  </button>
                ))
              )}
            </div>
          )}
          {selectedParticipant && (
            <Pill tone="teal">
              {selectedParticipant.display}{selectedParticipant.city ? ` · ${selectedParticipant.city}` : ""} seçildi
            </Pill>
          )}
          <div className="flex gap-2">
            <TextInput
              type="number"
              placeholder="Düşülecek puan"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-40 f-mono"
            />
            <TextInput placeholder="Not (ör. hangi ürün)" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
          </div>
          {err && <ErrorText msg={err} />}
          <div className="flex justify-end">
            <Button variant="amber" onClick={submitPurchase}><Minus size={15} /> Puan düş</Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="f-display text-lg mb-3" style={{ color: T.ink }}>Son işlemler</h3>
        {market.purchases.length === 0 ? (
          <EmptyState text="Henüz işlem yok." />
        ) : (
          <div className="space-y-2">
            {market.purchases.slice(0, 30).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: `1px solid ${T.line}` }}>
                <div>
                  <div className="f-body text-sm" style={{ color: T.ink }}>{participantName(t.participantKey)}</div>
                  <div className="f-mono text-[11px]" style={{ color: T.inkSoft }}>
                    {t.note ? `${t.note} · ` : ""}{fmtDate(t.ts)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="f-mono text-sm font-semibold" style={{ color: T.red }}>-{t.amount}</span>
                  <button onClick={() => removePurchase(t.id)} style={{ color: T.inkSoft }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function NurBakkalKatilimci({ currentUser, market, scoring }) {
  const balance = balanceOf(scoring, market, currentUser.key);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={17} style={{ color: T.amber }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Puan bakiyen</h3>
        </div>
        <div className="f-mono text-3xl font-bold" style={{ color: T.tealDeep }}>{balance}</div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Store size={17} style={{ color: T.teal }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Ürün kataloğu</h3>
        </div>
        {market.products.length === 0 ? (
          <EmptyState text="Henüz ürün eklenmedi." />
        ) : (
          <div className="divide-y" style={{ borderColor: T.line }}>
            {market.products.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <span className="f-body text-sm" style={{ color: T.ink }}>{p.name}</span>
                <span className="f-mono text-sm font-semibold" style={{ color: T.teal }}>{p.price} puan</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   ORGANİZATÖR YÖNETİMİ
--------------------------------------------------------- */
function OrganizatorYonetimi({ currentUser, people, setPeople }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const addOrganizer = async () => {
    setErr("");
    if (!name.trim() || !pass) {
      setErr("Ad ve şifre gerekli.");
      return;
    }
    const full = titleCase(name);
    const k = keyOf(full);
    if (people.organizers.some((o) => o.key === k)) {
      setErr("Bu isimde bir organizatör zaten var.");
      return;
    }
    const hashed = await hashPassword(pass);
    const updated = { ...people, organizers: [...people.organizers, { key: k, display: full, password: hashed }] };
    setPeople(updated);
    await saveJSON("people", updated);
    setName("");
    setPass("");
  };

  const removeOrganizer = async (key) => {
    if (people.organizers.length <= 1) {
      setErr("Son organizatör hesabı silinemez.");
      return;
    }
    const updated = { ...people, organizers: people.organizers.filter((o) => o.key !== key) };
    setPeople(updated);
    await saveJSON("people", updated);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Users size={17} style={{ color: T.teal }} />
          <h3 className="f-display text-lg" style={{ color: T.ink }}>Yeni organizatör ekle</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextInput placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput type="password" placeholder="Şifre" value={pass} onChange={(e) => setPass(e.target.value)} />
          <Button onClick={addOrganizer}><Plus size={15} /> Ekle</Button>
        </div>
        {err && <div className="mt-2"><ErrorText msg={err} /></div>}
      </Card>

      <Card>
        <h3 className="f-display text-lg mb-3" style={{ color: T.ink }}>Mevcut organizatörler</h3>
        <div className="space-y-2">
          {people.organizers.map((o) => (
            <div key={o.key} className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${T.line}` }}>
              <div className="flex items-center gap-2 f-body text-sm" style={{ color: T.ink }}>
                {o.display}
                {o.key === currentUser.key && <Pill tone="teal">SEN</Pill>}
              </div>
              <button onClick={() => removeOrganizer(o.key)} style={{ color: T.inkSoft }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
