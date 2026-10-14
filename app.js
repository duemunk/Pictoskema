// Plain ES2017 for iOS 12 Safari on an original iPad Air. No modules, no build step.
// Emoji must be Unicode 11 or older (iOS 12).
var PERIODS = [
  {
    id: "morgen",
    title: "Morgen",
    icon: "🌅",
    color: "#ffe3a3",
    startsAtHour: 0,
    tasks: [
      { icon: "🛏️", label: "Stå op" },
      { icon: "🚽", label: "Toilet" },
      { icon: "👕", label: "Tøj på" },
      { icon: "🥣", label: "Morgenmad" },
      { icon: "🦷", label: "Børste tænder" },
      { icon: "🎒", label: "Taske" }
    ]
  },
  {
    id: "efter-skole",
    title: "Efter skole",
    icon: "🏫",
    color: "#c8eac0",
    startsAtHour: 12,
    tasks: [
      { icon: "🍎", label: "Mellemmad" },
      { icon: "📚", label: "Lektier" },
      { icon: "🧸", label: "Leg" },
      { icon: "🌳", label: "Udenfor" }
    ]
  },
  {
    id: "aften",
    title: "Aften",
    icon: "🌙",
    color: "#c9d4f5",
    startsAtHour: 17,
    tasks: [
      { icon: "🍽️", label: "Aftensmad" },
      { icon: "🛁", label: "Bad" },
      { icon: "👚", label: "Nattøj" },
      { icon: "🦷", label: "Børste tænder" },
      { icon: "📖", label: "Godnathistorie" },
      { icon: "😴", label: "Sove" }
    ]
  }
];

var DONE_STORAGE = "pictoskema-done";

function today() {
  var now = new Date();
  return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
}

// Ticks reset every day.
function loadDone() {
  try {
    var saved = JSON.parse(localStorage.getItem(DONE_STORAGE));
    if (saved && saved.day === today()) return saved;
  } catch (e) {}
  return { day: today(), keys: {} };
}

function saveDone(done) {
  try { localStorage.setItem(DONE_STORAGE, JSON.stringify(done)); } catch (e) {}
}

function currentPeriodId() {
  var hour = new Date().getHours();
  var current = PERIODS[0].id;
  PERIODS.forEach(function (period) { if (hour >= period.startsAtHour) current = period.id; });
  return current;
}

function render() {
  var done = loadDone();
  var frames = document.getElementById("frames");
  var nowId = currentPeriodId();
  frames.innerHTML = "";
  PERIODS.forEach(function (period) {
    var frame = document.createElement("section");
    frame.className = "frame" + (period.id === nowId ? " now" : "");
    frame.style.background = period.color;
    frame.innerHTML =
      '<div class="frame-head"><span class="frame-icon">' + period.icon + "</span>" +
      '<span class="frame-title">' + period.title + "</span></div>";
    var tasks = document.createElement("div");
    tasks.className = "tasks";
    period.tasks.forEach(function (task, index) {
      var key = period.id + "-" + index;
      var button = document.createElement("button");
      button.className = "task" + (done.keys[key] ? " done" : "");
      button.innerHTML = '<span class="task-icon">' + task.icon + "</span>" +
        '<span class="task-label">' + task.label + "</span>";
      button.addEventListener("click", function () {
        var latest = loadDone();
        latest.keys[key] = !latest.keys[key];
        saveDone(latest);
        button.className = "task" + (latest.keys[key] ? " done" : "");
      });
      tasks.appendChild(button);
    });
    frame.appendChild(tasks);
    frames.appendChild(frame);
  });
}

render();

// --- Personal details ---------------------------------------------------------------------
// Anything personal is encrypted in sealed.json (see tools/seal.mjs). With the 6-digit code
// the key is derived once and remembered on this device; without it nothing personal shows.
var KEY_STORAGE = "pictoskema-key";
var CHECK_TEXT = "pictoskema";
var sealed = null;

function fromBase64(text) {
  var raw = atob(text);
  var bytes = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function toBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var raw = "";
  for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return btoa(raw);
}

function storedKey() {
  try { return localStorage.getItem(KEY_STORAGE); } catch (e) { return null; }
}

function importKey(bits) {
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["decrypt"]);
}

function decrypt(key, box) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(box.iv) }, key, fromBase64(box.data))
    .then(function (plain) { return new TextDecoder().decode(plain); });
}

function deriveBits(code) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(code), { name: "PBKDF2" }, false, ["deriveBits"])
    .then(function (base) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(sealed.salt), iterations: sealed.iterations }, base, 256);
    });
}

function showPrivate() {
  var saved = storedKey();
  document.getElementById("unlock").textContent = saved ? "🔓" : "🔑 Kode";
  if (!saved || !sealed || !window.crypto || !crypto.subtle) return;
  importKey(fromBase64(saved)).then(function (key) {
    var elements = document.querySelectorAll("[data-private]");
    Array.prototype.forEach.call(elements, function (element) {
      var box = sealed.values[element.getAttribute("data-private")];
      if (!box) return;
      decrypt(key, box).then(function (text) { element.textContent = text; }).catch(function () {});
    });
  });
}

var request = new XMLHttpRequest();
request.open("GET", "sealed.json?" + Date.now());
request.onload = function () {
  try { sealed = JSON.parse(request.responseText); } catch (e) { sealed = null; }
  showPrivate();
};
request.send();

var panel = document.getElementById("code-panel");
var input = document.getElementById("code");
var message = document.getElementById("code-message");
document.getElementById("unlock").addEventListener("click", function () {
  if (storedKey()) {
    if (confirm("Skjul de personlige oplysninger igen på denne iPad?")) {
      try { localStorage.removeItem(KEY_STORAGE); } catch (e) {}
      location.reload();
    }
    return;
  }
  panel.style.display = panel.style.display === "block" ? "none" : "block";
  message.textContent = "";
  if (panel.style.display === "block") input.focus();
});
document.getElementById("code-ok").addEventListener("click", function () {
  var code = input.value.replace(/[^0-9]/g, "");
  if (code.length !== 6) { message.textContent = "Koden har 6 cifre"; return; }
  if (!sealed || !window.crypto || !crypto.subtle) { message.textContent = "Det virker ikke på denne enhed"; return; }
  message.textContent = "Tjekker…";
  var bits;
  deriveBits(code).then(function (result) {
    bits = result;
    return importKey(bits);
  }).then(function (key) {
    return decrypt(key, sealed.check);
  }).then(function (check) {
    if (check !== CHECK_TEXT) throw new Error("wrong");
    try { localStorage.setItem(KEY_STORAGE, toBase64(bits)); } catch (e) {}
    panel.style.display = "none";
    input.value = "";
    showPrivate();
  }).catch(function () {
    message.textContent = "Forkert kode";
  });
});

// --- Updates ------------------------------------------------------------------------------
// The home-screen app has no reload button: offer one, and reload after time in the background.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function () {});
}

function reloadFresh() { location.replace("./?v=" + Date.now()); }
document.getElementById("refresh").addEventListener("click", reloadFresh);
var hiddenAt = 0;
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) reloadFresh();
});
setInterval(function () {
  if (loadDone().day !== today()) render();
}, 60 * 1000);
