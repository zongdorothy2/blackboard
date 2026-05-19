var h = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;

// Firebase web configuration
var firebaseConfig = {
  apiKey: "AIzaSyBMUMdFRyuY4TtPX_1QRzUaADCEeaHwa1s",
  authDomain: "classbonuspoints.firebaseapp.com",
  projectId: "classbonuspoints",
  storageBucket: "classbonuspoints.firebasestorage.app",
  messagingSenderId: "258366947766",
  appId: "1:258366947766:web:bdbc1e9fccafd82c678117",
  measurementId: "G-6Q4QTKMNBZ"
};

// Initialize Firebase App
if (window.firebase && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var getTodayStr = function() {
  var d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

var isPinyinReady = function() {
  if (window.pinyinPro && typeof window.pinyinPro.pinyin === "function") return true;
  if (window.pinyinPro && window.pinyinPro.default && typeof window.pinyinPro.default.pinyin === "function") return true;
  return false;
};

var parseZhuyin = function(str) {
  if (!str) return { chars: [], tone: "", type: "" };
  var light = "\u02D9", tones = ["\u02CA", "\u02C7", "\u02CB"];
  var charsStr = str, tone = "", type = "";
  if (str.indexOf(light) >= 0) { charsStr = str.replace(light, ""); tone = light; type = "light"; }
  else { for (var i = 0; i < tones.length; i++) { if (str.indexOf(tones[i]) >= 0) { charsStr = str.replace(tones[i], ""); tone = tones[i]; type = "standard"; break; } } }
  return { chars: Array.from(charsStr.trim()), tone: tone, type: type };
};

/*
 * Build ONE character cell with Zhuyin annotation.
 * The hanzi occupies a fixed width (fs px) and is text-align:center.
 * The zhuyin track has a fixed reserved width, so every cell is identical
 * in width → hanzi column is perfectly aligned across all cells.
 */
var buildCharHTML = function(char, zy, fs, zyScale, zySpacing, zySqueeze) {
  if (!char) return "";
  var zySize = Math.round(fs * zyScale);
  var zyW    = Math.round(zySize * 2.4);   // reserved width for zhuyin track

  if (!zy) {
    // No zhuyin – reserve blank space so column stays aligned
    return '<div style="display:flex;align-items:center;flex-shrink:0;">'
      + '<div style="font-size:' + fs + 'px;line-height:1;font-weight:900;width:' + fs + 'px;text-align:center;">' + char + '</div>'
      + '<div style="width:' + zyW + 'px;"></div>'
      + '</div>';
  }

  var p = parseZhuyin(zy);
  var slots = p.chars.length + (p.type === "light" ? 1 : 0);
  var gap = Math.max(0.4, slots > 1 ? zySpacing - (slots - 1) * zySqueeze : zySpacing);
  var cells = [];
  if (p.type === "light") cells.push('<div class="bb-zy-light" style="height:' + gap.toFixed(2) + 'em;">' + p.tone + '</div>');
  for (var i = 0; i < p.chars.length; i++) {
    var tm = (i === p.chars.length - 1 && p.type === "standard") ? '<div class="bb-zy-tone">' + p.tone + '</div>' : "";
    cells.push('<div class="bb-zy-char" style="height:' + gap.toFixed(2) + 'em;">' + p.chars[i] + tm + '</div>');
  }

  return '<div style="display:flex;align-items:center;flex-shrink:0;">'
    + '<div style="font-size:' + fs + 'px;line-height:1;font-weight:900;width:' + fs + 'px;text-align:center;">' + char + '</div>'
    + '<div class="bb-zhuyin-track" style="font-size:' + zySize + 'px;width:' + zyW + 'px;margin-left:2px;">' + cells.join("") + '</div>'
    + '</div>';
};

/* ─── Constants ─── */
var DAY_NAMES = ["日","一","二","三","四","五","六"];
var CN_NUM = ["","一","二","三","四","五","六","七","八","九","十","十一","十二",
  "十三","十四","十五","十六","十七","十八","十九","二十",
  "二十一","二十二","二十三","二十四","二十五","二十六","二十七","二十八","二十九","三十","三十一"];
var DEFAULT_HOMEWORK = "一、國語第八課生字\n二、數學習作\n三、明天穿運動服";

/* Build full blackboard HTML */
var buildBoard = function(dateStr, hw, fs, cellHMult, zyScale, zySpacing, zySqueeze, colGapMult, overrides) {
  var d = new Date(dateStr + "T00:00:00");
  var month = d.getMonth() + 1, day = d.getDate(), dow = d.getDay();
  var zySize = Math.round(fs * zyScale);
  var zyW    = Math.round(zySize * 2.4);
  var cellH  = Math.round(fs * cellHMult);
  var colW   = fs + zyW + 4;                        // exactly fits char+zhuyin
  var colGap = Math.round(fs * colGapMult);

  var makeCell = function(inner) {
    return '<div style="height:' + cellH + 'px;display:flex;align-items:center;justify-content:flex-start;">' + inner + '</div>';
  };

  var makeCol = function(items, borderRight) {
    var br = borderRight ? "border-right:2px dashed rgba(255,248,220,0.18);" : "";
    var s = '<div style="display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0;margin-right:' + colGap + 'px;' + br + '">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.gap) { s += '<div style="height:' + Math.round(cellH * 0.3) + 'px;"></div>'; continue; }
      if (it.vdash) {
        /* Vertical range dash: centered exactly relative to Chinese characters, smaller size & reduced vertical gap */
        var dashFs = Math.round(fs * 0.55);
        var dashH = Math.round(cellH * 0.55);
        s += '<div style="height:' + dashH + 'px;display:flex;align-items:center;justify-content:flex-start;">'
          + '<div style="display:flex;align-items:center;flex-shrink:0;">'
          + '<div style="font-size:' + dashFs + 'px;line-height:1;font-weight:700;width:' + fs + 'px;text-align:center;">︱</div>'
          + '<div style="width:' + zyW + 'px;"></div></div></div>';
      } else if (it.alpha) {
        /* Use SAME structure as Chinese: fs-wide slot + empty zyW placeholder.
           This places alpha at the identical horizontal position as hanzi. */
        var maxAlphaFs = Math.round(fs * 1.15);
        var fitFs = Math.round(fs * 0.95 / Math.max(1, it.alpha.length));
        var alphaFs = Math.min(maxAlphaFs, Math.max(fitFs, Math.round(fs * 0.7)));
        s += makeCell(
          '<div style="display:flex;align-items:center;flex-shrink:0;">'
          + '<div style="font-size:' + alphaFs + 'px;line-height:1;font-weight:800;width:' + fs + 'px;text-align:center;font-family:Arial,Helvetica,sans-serif;">'
          + it.alpha
          + '</div><div style="width:' + zyW + 'px;"></div></div>'
        );
      } else {
        s += makeCell(buildCharHTML(it.ch, it.zy, fs, zyScale, zySpacing, zySqueeze));
      }
    }
    s += '</div>';
    return s;
  };

  var ci = function(ch) {
    var zy = (overrides && overrides[ch] !== undefined) ? overrides[ch] : getZhuyinForChar(ch);
    return { ch: ch, zy: zy };
  };

  // Build cols: index 0 = date (rightmost), then homework lines
  var cols = [];

  var dateItems = [];
  Array.from(CN_NUM[month] || String(month)).forEach(function(c) { dateItems.push(ci(c)); });
  dateItems.push(ci("月"));
  Array.from(CN_NUM[day] || String(day)).forEach(function(c) { dateItems.push(ci(c)); });
  dateItems.push(ci("日"));
  dateItems.push({ gap: true });
  dateItems.push(ci("星")); dateItems.push(ci("期")); dateItems.push(ci(DAY_NAMES[dow]));
  cols.push(makeCol(dateItems, true));

  var lines = hw.split("\n");
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim();
    if (!line) continue;
    var lItems = [], lChars = Array.from(line);
    for (var lc = 0; lc < lChars.length; lc++) {
      var ch = lChars[lc];
      if (ch === "-" || ch === "~" || ch === "～" || ch === "至") {
        lItems.push({ vdash: true });
      } else if (/[a-zA-Z0-9.%]/.test(ch)) {
        var run = ch;
        while (lc + 1 < lChars.length && /[a-zA-Z0-9.%]/.test(lChars[lc + 1])) { lc++; run += lChars[lc]; }
        lItems.push({ alpha: run });
      } else { lItems.push(ci(ch)); }
    }
    cols.push(makeCol(lItems, false));
  }

  // Reverse: date appears rightmost, lines go left→right
  cols.reverse();

  return '<div style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-end;height:100%;overflow:hidden;font-family:\'Noto Sans TC\',serif;">'
    + cols.join("") + '</div>';
};

/* ─── Slider helper ─── */
function Slider(props) {
  return h("div", { style: { marginBottom: "14px" } },
    h("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "5px" } },
      h("span", { style: { fontSize: "12px", color: "#94a3b8", fontWeight: 600 } }, props.label),
      h("span", { style: { fontSize: "12px", color: "#38bdf8", fontWeight: 700,
        background: "rgba(56,189,248,0.1)", padding: "1px 8px", borderRadius: "6px" } }, props.display)
    ),
    h("input", {
      type: "range", min: props.min, max: props.max, step: props.step, value: props.value,
      onChange: function(e) { props.onChange(Number(e.target.value)); },
      style: { width: "100%", accentColor: "#38bdf8", cursor: "pointer" }
    })
  );
}

/* ─── Toggle Switch ─── */
function Toggle(props) {
  return h("button", {
    onClick: props.onChange,
    style: {
      position: "relative", display: "inline-flex", alignItems: "center",
      width: "52px", height: "28px", borderRadius: "14px", border: "none", cursor: "pointer",
      background: props.value ? "linear-gradient(135deg,#38bdf8,#0ea5e9)" : "rgba(51,65,85,0.8)",
      transition: "background 0.25s", flexShrink: 0, boxShadow: props.value ? "0 0 12px rgba(56,189,248,0.4)" : "none"
    }
  },
    h("span", {
      style: {
        position: "absolute", width: "20px", height: "20px", borderRadius: "10px",
        background: "#fff", top: "4px",
        left: props.value ? "28px" : "4px",
        transition: "left 0.25s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
      }
    })
  );
}

/* ─── SVG decorations ─── */
var ChalkSVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;opacity:0.7"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#fff8dc"/></svg>';
var StarSVG = '<svg viewBox="0 0 24 24" fill="#fbbf24" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
var CalendarSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent);display:block;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
var PencilSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent);display:block;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>';
var ControlsSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px;color:var(--accent);display:block;"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>';
var LightbulbSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--accent);display:inline-block;vertical-align:middle;margin-right:5px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12 2.5 5.5 5.5 0 0 0 6.5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>';
var CheckSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:#047857;display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
var LoadingSVG = '<svg class="loading-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:#b45309;display:inline-block;vertical-align:middle;margin-right:4px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';

var CloudSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent);display:block;"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';

/* ─── React App ─── */
function App() {
  var bbRef  = useRef(null);
  var _d = useState(getTodayStr());    var curDate = _d[0], setDate = _d[1];
  var _f = useState(false);            var fullsc  = _f[0], setFullsc = _f[1];
  var _p = useState(isPinyinReady());  var pyReady = _p[0], setPyReady = _p[1];
  var _t = useState(0);               var tick    = _t[0], setTick = _t[1];
  var _bs = useState({ w: 900, h: 506 }); var boardSize = _bs[0], setBoardSize = _bs[1];
  var _cm = useState(false);           var customMode = _cm[0], setCustomMode = _cm[1];

  // Custom params
  var _fm = useState(1.0);    var fsMult    = _fm[0], setFsMult    = _fm[1];
  var _ch = useState(1.55);   var cellHMult = _ch[0], setCellHMult = _ch[1];
  var _zs = useState(0.35);   var zyScale   = _zs[0], setZyScale   = _zs[1];
  var _zp = useState(1.1);    var zySpacing = _zp[0], setZySpacing = _zp[1];
  var _zq = useState(0.1);    var zySqueeze = _zq[0], setZySqueeze = _zq[1];
  var _cg = useState(0.18);   var colGapMult= _cg[0], setColGapMult= _cg[1];

  var loadHW = function() {
    try { var s = localStorage.getItem("bb_hw2"); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
  };
  var _hw = useState(loadHW); var hwDb = _hw[0], setHwDb = _hw[1];
  useEffect(function() { localStorage.setItem("bb_hw2", JSON.stringify(hwDb)); }, [hwDb]);

  // Individual character overrides state
  var loadOverrides = function() {
    try { var s = localStorage.getItem("bb_char_overrides"); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
  };
  var _ov = useState(loadOverrides); var charOverrides = _ov[0], setCharOverrides = _ov[1];
  useEffect(function() { localStorage.setItem("bb_char_overrides", JSON.stringify(charOverrides)); }, [charOverrides]);

  var _som = useState(false); var showOverridesModal = _som[0], setShowOverridesModal = _som[1];

  // Firebase User & Sync Status States
  var _usr = useState(null); var user = _usr[0], setUser = _usr[1];
  var _syn = useState("idle"); var syncStatus = _syn[0], setSyncStatus = _syn[1]; // "idle", "syncing", "done", "error"

  var todayHW = hwDb[curDate] !== undefined ? hwDb[curDate] : DEFAULT_HOMEWORK;

  var measureBoard = function() {
    var el = bbRef.current; if (!el) return;
    setBoardSize({ w: Math.max(200, el.offsetWidth - 28), h: Math.max(100, el.offsetHeight - 28) });
  };

  // 1. Auth State change observer & First-time Cloud Firestore merge algorithm
  useEffect(function() {
    if (!window.firebase) return;
    return firebase.auth().onAuthStateChanged(function(u) {
      setUser(u);
      if (u) {
        setSyncStatus("syncing");
        var docRef = firebase.firestore().collection('teachers').doc(u.uid);
        docRef.get().then(function(doc) {
          var data = {};
          if (doc.exists) {
            data = doc.data() || {};
          }
          var remoteHW = data.homework || {};
          var remoteOverrides = data.charOverrides || {};

          // Retrieve existing local datasets
          var localHW = {};
          try { var s = localStorage.getItem("bb_hw2"); if (s) localHW = JSON.parse(s); } catch(e){}
          var localOverrides = {};
          try { var o = localStorage.getItem("bb_char_overrides"); if (o) localOverrides = JSON.parse(o); } catch(e){}

          var hasLocalHW = Object.keys(localHW).length > 0;
          var hasRemoteHW = Object.keys(remoteHW).length > 0;
          var hasLocalOv = Object.keys(localOverrides).length > 0;
          var hasRemoteOv = Object.keys(remoteOverrides).length > 0;

          // Merge: if local exists but remote is completely empty, back up local to Cloud Firestore
          var initialUpdate = {};
          if (hasLocalHW && !hasRemoteHW) {
            initialUpdate.homework = localHW;
            remoteHW = localHW;
          }
          if (hasLocalOv && !hasRemoteOv) {
            initialUpdate.charOverrides = localOverrides;
            remoteOverrides = localOverrides;
          }

          if (Object.keys(initialUpdate).length > 0) {
            docRef.set(initialUpdate, { merge: true }).catch(function(err){ console.error("Cloud merge error:", err); });
          }

          setHwDb(remoteHW);
          setCharOverrides(remoteOverrides);
          setSyncStatus("done");
        }).catch(function(err) {
          console.error("Cloud Firestore fetch error:", err);
          setSyncStatus("error");
        });
      } else {
        setSyncStatus("idle");
      }
    });
  }, []);

  // 2. Debounced background Cloud Firestore sync for homework changes
  useEffect(function() {
    if (!user || !window.firebase) return;
    setSyncStatus("syncing");
    var t = setTimeout(function() {
      var updateObj = { homework: {} };
      updateObj.homework[curDate] = todayHW;
      
      firebase.firestore().collection('teachers').doc(user.uid)
        .set(updateObj, { merge: true })
        .then(function() { setSyncStatus("done"); })
        .catch(function(err) { console.error("Sync error:", err); setSyncStatus("error"); });
    }, 1000);
    return function() { clearTimeout(t); };
  }, [todayHW, curDate, user]);

  // 3. Background Cloud Firestore sync for Bopomofo character overrides
  useEffect(function() {
    if (!user || !window.firebase) return;
    setSyncStatus("syncing");
    firebase.firestore().collection('teachers').doc(user.uid)
      .set({ charOverrides: charOverrides }, { merge: true })
      .then(function() { setSyncStatus("done"); })
      .catch(function(err) { console.error("Sync overrides error:", err); setSyncStatus("error"); });
  }, [charOverrides, user]);

  var handleLogin = function() {
    if (!window.firebase) return;
    var provider = new firebase.auth.GoogleAuthProvider();
    setSyncStatus("syncing");
    firebase.auth().signInWithPopup(provider).catch(function(error) {
      console.error("Google login failed:", error);
      setSyncStatus("error");
      alert("登入失敗: " + error.message);
    });
  };

  var handleLogout = function() {
    if (!window.firebase) return;
    if (confirm("確定要登出嗎？登出後將暫停雲端自動備份，但您當下的資料會安全保存在本機上。")) {
      firebase.auth().signOut().then(function() {
        setSyncStatus("idle");
      });
    }
  };

  useEffect(function() {
    var id = setTimeout(measureBoard, 80);
    window.addEventListener("resize", measureBoard);
    var ro = null;
    if (window.ResizeObserver && bbRef.current) { ro = new ResizeObserver(measureBoard); ro.observe(bbRef.current); }
    return function() { clearTimeout(id); window.removeEventListener("resize", measureBoard); if (ro) ro.disconnect(); };
  }, [fullsc]);

  useEffect(function() {
    var t = setInterval(function() { if (isPinyinReady()) { setPyReady(true); setTick(function(v){return v+1;}); clearInterval(t); } }, 400);
    return function() { clearInterval(t); };
  }, []);

  useEffect(function() {
    var fn = function() { setFullsc(!!document.fullscreenElement); };
    document.addEventListener("fullscreenchange", fn);
    document.addEventListener("webkitfullscreenchange", fn);
    return function() { document.removeEventListener("fullscreenchange", fn); document.removeEventListener("webkitfullscreenchange", fn); };
  }, []);

  var toggleFS = function() {
    var el = bbRef.current; if (!el) return;
    if (!document.fullscreenElement) { var fn = el.requestFullscreen || el.webkitRequestFullscreen; if (fn) fn.call(el); }
    else { var efn = document.exitFullscreen || document.webkitExitFullscreen; if (efn) efn.call(document); }
  };

  var navDate = function(delta) {
    var d = new Date(curDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDate(d.toISOString().split("T")[0]);
  };

  var updHW = function(txt) {
    setHwDb(function(p) { var n = JSON.parse(JSON.stringify(p)); n[curDate] = txt; return n; });
  };

  // Font size: proportional to board width × user multiplier
  var fs     = Math.round(boardSize.w / 1300 * 52 * fsMult);
  var pad    = Math.round(fs * 0.85);
  var innerH = boardSize.h - pad * 2;

  var boardHTML = useMemo(function() {
    if (!pyReady) return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,248,220,0.35);font-size:18px;font-family:serif;">注音引擎載入中...</div>';
    return buildBoard(curDate, todayHW, fs, cellHMult, zyScale, zySpacing, zySqueeze, colGapMult, charOverrides);
  }, [curDate, todayHW, pyReady, tick, fs, cellHMult, zyScale, zySpacing, zySqueeze, colGapMult, charOverrides]);

  var fmtDate = function(ds) {
    var d = new Date(ds + "T00:00:00");
    return d.getFullYear() + "/" + (d.getMonth()+1) + "/" + d.getDate() + " (" + DAY_NAMES[d.getDay()] + ")";
  };

  // Extract unique Chinese characters from current hw
  var uniqueChars = useMemo(function() {
    var set = new Set();
    Array.from(todayHW).forEach(function(ch) {
      if (/[\u4e00-\u9fa5]/.test(ch)) set.add(ch);
    });
    return Array.from(set);
  }, [todayHW]);

  // ─── Render ───
  return h("div", { className: "app-layout" },

    // ── Sidebar ──
    h("div", { className: "sidebar-scroll" },

      // Banner with AI image
      h("div", { className: "banner-card" },
        h("img", { src: "./classroom.png", alt: "教室插圖", className: "banner-img" }),
        h("div", { className: "banner-overlay" },
          h("div", { className: "banner-title" },
            h("span", { dangerouslySetInnerHTML: { __html: ChalkSVG } }),
            h("span", null, "班級黑板")
          ),
          h("div", { className: "banner-sub" }, "直式注音黑板 • 自動排版")
        )
      ),

      // Firebase Sync Panel
      h("div", { className: "panel" },
        h("div", { className: "panel-header" },
          h("div", { className: "panel-header-left" },
            h("span", { className: "panel-icon", dangerouslySetInnerHTML: { __html: CloudSVG } }),
            h("span", { className: "panel-title" }, "雲端同步備份")
          ),
          user && h("span", {
            className: "badge " + (syncStatus === "done" ? "badge-success" : syncStatus === "syncing" ? "badge-warning" : "badge-error"),
            style: { display: "inline-flex", alignItems: "center" }
          },
            syncStatus === "done" ? "✓ 雲端已同步"
            : syncStatus === "syncing" ? [h("span", { dangerouslySetInnerHTML: { __html: LoadingSVG } }), "正在上傳..."]
            : "⚠️ 同步失敗"
          )
        ),
        h("div", { className: "panel-body" },
          !user ? [
            h("p", { className: "hint-text", style: { display: "flex", alignItems: "flex-start", gap: "6px", margin: "0 0 10px 0", lineHeight: "1.5" } },
              h("span", { dangerouslySetInnerHTML: { __html: LightbulbSVG }, style: { flexShrink: 0, marginTop: "2px" } }),
              "登入 Google 教育或個人帳號，即可啟用自動雲端備份，多台電腦即時同步您的黑板與注音設定！"
            ),
            h("button", {
              onClick: handleLogin,
              className: "btn-primary",
              style: { width: "100%", background: "linear-gradient(135deg, #4285F4, #357AE8)", border: "none" }
            }, "🔑 使用 Google 帳號登入")
          ] : h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } },
              h("div", { style: { display: "flex", alignItems: "center", gap: "10px", minWidth: 0 } },
                user.photoURL ? h("img", {
                  src: user.photoURL,
                  alt: "頭像",
                  style: { width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }
                }) : h("div", {
                  style: {
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "var(--accent)", color: "#fff", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", flexShrink: 0
                  }
                }, user.displayName ? user.displayName.charAt(0) : "師"),
                h("div", { style: { minWidth: 0 } },
                  h("div", { style: { fontSize: "13px", fontWeight: "700", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, user.displayName || "教職員"),
                  h("div", { style: { fontSize: "11px", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, user.email)
                )
              ),
              h("button", {
                onClick: handleLogout,
                className: "btn-secondary",
                style: { padding: "6px 12px", fontSize: "11px", flexShrink: 0, background: "rgba(239, 68, 68, 0.08)", color: "#dc2626", borderColor: "rgba(239, 68, 68, 0.15)" },
                onMouseOver: function(e){ e.target.style.background = "rgba(239,68,68,0.15)"; },
                onMouseOut: function(e){ e.target.style.background = "rgba(239,68,68,0.08)"; }
              }, "登出")
            )
        )
      ),

      // Date picker
      h("div", { className: "panel" },
        h("div", { className: "panel-header" },
          h("div", { className: "panel-header-left" },
            h("span", { className: "panel-icon", dangerouslySetInnerHTML: { __html: CalendarSVG } }),
            h("span", { className: "panel-title" }, "今日日期")
          ),
          h("span", {
            className: "badge " + (pyReady ? "badge-success" : "badge-warning"),
            style: { display: "inline-flex", alignItems: "center" }
          },
            pyReady
              ? [h("span", { dangerouslySetInnerHTML: { __html: CheckSVG } }), "注音就緒"]
              : [h("span", { dangerouslySetInnerHTML: { __html: LoadingSVG } }), "載入中"]
          )
        ),
        h("div", { className: "panel-body" },
          h("div", { className: "date-picker-wrap" },
            h("button", { className: "date-nav-btn", onClick: function(){navDate(-1);} }, "◀"),
            h("input", { type: "date", value: curDate, onChange: function(e){setDate(e.target.value);}, style:{flex:1,minWidth:0} }),
            h("button", { className: "date-nav-btn", onClick: function(){navDate(1);} }, "▶")
          ),
          h("div", { className: "date-display" }, fmtDate(curDate))
        )
      ),

      // Content
      h("div", { className: "panel" },
        h("div", { className: "panel-header" },
          h("div", { className: "panel-header-left" },
            h("span", { className: "panel-icon", dangerouslySetInnerHTML: { __html: PencilSVG } }),
            h("span", { className: "panel-title" }, "黑板內容")
          ),
          h("button", {
            className: "btn-primary",
            style: { padding: "4px 10px", fontSize: "11px", height: "auto" },
            onClick: function() { setShowOverridesModal(true); }
          }, "進階注音修改")
        ),
        h("div", { className: "panel-body" },
          h("textarea", {
            className: "input-field", value: todayHW,
            onChange: function(e){updHW(e.target.value);},
            rows: 7, placeholder: "每行＝黑板上一直行（欄）"
          }),
          h("p", { className: "hint-text", style: { display: "flex", alignItems: "center" } },
            h("span", { dangerouslySetInnerHTML: { __html: LightbulbSVG } }),
            "換行即換欄，英數字自動橫排"
          )
        )
      ),

      // Custom mode
      h("div", { className: "panel" },
        h("div", { className: "panel-header" },
          h("div", { className: "panel-header-left" },
            h("span", { className: "panel-icon", dangerouslySetInnerHTML: { __html: ControlsSVG } }),
            h("div", null,
              h("div", { className: "panel-title" }, "自訂排版模式"),
              h("div", { className: "panel-sub" }, "調整字體、注音與間距")
            )
          ),
          h(Toggle, { value: customMode, onChange: function(){setCustomMode(function(v){return !v;});} })
        ),

        customMode && h("div", { className: "panel-body custom-panel" },
          // Divider
          h("div", { className: "custom-divider" },
            h("span", null, "中文"), h("div", { className: "divider-line" })
          ),
          h(Slider, { label: "字體大小", display: (fsMult * 100).toFixed(0) + "%",
            min: 0.5, max: 1.8, step: 0.05, value: fsMult, onChange: setFsMult }),
          h(Slider, { label: "行高 / 字間距", display: cellHMult.toFixed(2) + "×",
            min: 1.2, max: 2.8, step: 0.05, value: cellHMult, onChange: setCellHMult }),
          h(Slider, { label: "欄間距", display: (colGapMult * 100).toFixed(0) + "%",
            min: 0, max: 0.5, step: 0.02, value: colGapMult, onChange: setColGapMult }),

          h("div", { className: "custom-divider" },
            h("span", null, "注音"), h("div", { className: "divider-line" })
          ),
          h(Slider, { label: "注音字體大小", display: (zyScale * 100).toFixed(0) + "% 字",
            min: 0.22, max: 0.52, step: 0.01, value: zyScale, onChange: setZyScale }),
          h(Slider, { label: "注音符號間距", display: zySpacing.toFixed(2) + "em",
            min: 0.5, max: 1.5, step: 0.05, value: zySpacing, onChange: setZySpacing }),
          h(Slider, { label: "多符號擠壓量", display: zySqueeze.toFixed(2),
            min: 0, max: 0.3, step: 0.01, value: zySqueeze, onChange: setZySqueeze }),

          h("button", {
            className: "btn-reset",
            onClick: function() {
              setFsMult(1.0); setCellHMult(1.55); setZyScale(0.35);
              setZySpacing(1.1); setZySqueeze(0.1); setColGapMult(0.18);
            }
          }, "↺ 恢復預設值")
        )
      )
    ),

    // ── Blackboard ──
    h("div", { className: "board-wrap" },
      h("div", { ref: bbRef, className: "blackboard-bg", style: { width: "100%", aspectRatio: "16/9", position: "relative" } },
        h("button", { className: "btn-fullscreen", onClick: toggleFS },
          fullsc ? "✕ 退出" : "⛶ 全螢幕"),
        h("div", {
          style: {
            position: "absolute",
            top: pad + "px", left: pad + "px",
            right: pad + "px", bottom: pad + "px",
            overflow: "hidden"
          },
          dangerouslySetInnerHTML: { __html: boardHTML }
        })
      ),

      // Info bar below blackboard
      h("div", { className: "info-bar" },
        h("div", { className: "info-item" },
          h("span", { dangerouslySetInnerHTML: { __html: StarSVG } }),
          h("span", null, "字體 " + fs + "px")
        ),
        h("div", { className: "info-item" },
          h("span", { dangerouslySetInnerHTML: { __html: StarSVG } }),
          h("span", null, "注音 " + Math.round(fs * zyScale) + "px")
        ),
        h("div", { className: "info-item" },
          h("span", { dangerouslySetInnerHTML: { __html: StarSVG } }),
          h("span", null, boardSize.w + " × " + boardSize.h + " px")
        )
      )
    ),

    // ── Advanced Overrides Modal (Liquid Glass Overlay) ──
    showOverridesModal && h("div", { className: "modal-overlay" },
      h("div", { className: "modal-card" },
        h("div", { className: "modal-header" },
          h("div", null,
            h("div", { className: "modal-title" }, "🎯 進階中文字注音自訂"),
            h("div", { className: "modal-sub" }, "您可以為這篇黑板內容的每個漢字個別指定注音與聲調")
          ),
          h("button", { className: "btn-secondary", onClick: function(){ setShowOverridesModal(false); }, style: { padding: "4px 8px", fontSize: "12px" } }, "✕")
        ),
        h("div", { className: "modal-body" },
          uniqueChars.length === 0 ? h("div", { style: { textAlign: "center", color: "var(--text-dim)", padding: "24px 0" } }, "黑板內容中目前沒有中文字。")
          : h("div", { className: "overrides-grid" },
              uniqueChars.map(function(ch) {
                var currentVal = charOverrides[ch] !== undefined ? charOverrides[ch] : getZhuyinForChar(ch);
                return h("div", { key: ch, className: "override-item" },
                  h("span", { className: "override-char" }, ch),
                  h("input", {
                    type: "text", className: "override-input", value: currentVal,
                    placeholder: "無注音",
                    onChange: function(e) {
                      var val = e.target.value;
                      setCharOverrides(function(prev) {
                        var next = Object.assign({}, prev);
                        if (val.trim() === "") {
                          delete next[ch];
                        } else {
                          next[ch] = val.trim();
                        }
                        return next;
                      });
                    }
                  })
                );
              })
            )
        ),
        h("div", { className: "modal-footer" },
          h("button", {
            className: "btn-secondary",
            onClick: function() {
              if (confirm("確定要清除所有自訂的漢字注音嗎？")) {
                setCharOverrides({});
              }
            }
          }, "重設所有漢字"),
          h("button", { className: "btn-primary", onClick: function(){ setShowOverridesModal(false); } }, "✓ 完成設定")
        )
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
