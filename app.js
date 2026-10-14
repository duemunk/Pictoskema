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
      { icon: "🥪", label: "Madpakke" },
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
      { picture: "pictures/tom-madkasse.svg", label: "Madpakke" },
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
      { icon: "👚", label: "Nattøj" },
      { icon: "🦷", label: "Børste tænder" },
      { icon: "🚽", label: "Toilet" }
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

// Stars are kept across days: one for every pictogram done, taken back when it is undone.
var STARS_STORAGE = "pictoskema-stars";

function loadStars() {
  try { return parseInt(localStorage.getItem(STARS_STORAGE), 10) || 0; } catch (e) { return 0; }
}

function addStars(change) {
  var stars = Math.max(0, loadStars() + change);
  try { localStorage.setItem(STARS_STORAGE, String(stars)); } catch (e) {}
  showStars(change > 0);
}

// A short rising fanfare, synthesized so there is no sound file. iOS only allows audio that
// starts from a tap, so the context is created on the first tap.
var audio = null;
var FANFARE_IN_HZ = [523.25, 659.25, 783.99, 1046.5];
var NOTE_IN_SECONDS = 0.09;

function playFanfare() {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!audio && AudioContext) audio = new AudioContext();
  if (!audio) return;
  if (audio.resume) audio.resume();
  var start = audio.currentTime + 0.02;
  FANFARE_IN_HZ.forEach(function (frequency, index) {
    var isLast = index === FANFARE_IN_HZ.length - 1;
    var at = start + index * NOTE_IN_SECONDS;
    var length = isLast ? 0.45 : NOTE_IN_SECONDS * 1.4;
    var oscillator = audio.createOscillator();
    var gain = audio.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + length + 0.05);
  });
}

function showStars(pop) {
  var counter = document.getElementById("stars");
  counter.textContent = "⭐ " + loadStars();
  if (!pop) return;
  counter.className = "stars";
  void counter.offsetWidth;
  counter.className = "stars pop";
}

function currentPeriodId() {
  var hour = new Date().getHours();
  var current = PERIODS[0].id;
  PERIODS.forEach(function (period) { if (hour >= period.startsAtHour) current = period.id; });
  return current;
}

var openPeriodId = null;

function pictureFor(item) {
  return item.picture ? '<img src="' + item.picture + '" alt="">' : item.icon;
}

function render() {
  var frames = document.getElementById("frames");
  frames.innerHTML = "";
  var open = PERIODS.filter(function (period) { return period.id === openPeriodId; })[0];
  if (open) renderPeriod(frames, open);
  else renderOverview(frames);
  showStars(false);
}

function renderOverview(frames) {
  var done = loadDone();
  var nowId = currentPeriodId();
  frames.className = "frames";
  PERIODS.forEach(function (period) {
    var doneCount = period.tasks.filter(function (task) { return done.keys[period.id + "-" + task.label]; }).length;
    var button = document.createElement("button");
    button.className = "period" + (period.id === nowId ? " now" : "");
    button.style.background = period.color;
    button.innerHTML = '<span class="period-icon">' + period.icon + "</span>" +
      '<span class="period-title">' + period.title + "</span>" +
      '<span class="period-progress">⭐ ' + doneCount + " / " + period.tasks.length + "</span>";
    button.addEventListener("click", function () {
      openPeriodId = period.id;
      render();
    });
    frames.appendChild(button);
  });
}

function renderPeriod(frames, period) {
  var done = loadDone();
  frames.className = "frames open";
  var frame = document.createElement("section");
  frame.className = "frame";
  frame.style.background = period.color;
  var head = document.createElement("div");
  head.className = "frame-head";
  head.innerHTML = '<span class="frame-icon">' + period.icon + "</span>" +
    '<span class="frame-title">' + period.title + "</span>";
  var back = document.createElement("button");
  back.className = "small-button back";
  back.textContent = "⬅️ Tilbage";
  back.addEventListener("click", function () {
    openPeriodId = null;
    render();
  });
  head.insertBefore(back, head.firstChild);
  frame.appendChild(head);
  var tasks = document.createElement("div");
  tasks.className = "tasks";
  period.tasks.forEach(function (task) {
    var key = period.id + "-" + task.label;
    var button = document.createElement("button");
    button.className = "task" + (done.keys[key] ? " done" : "");
    button.innerHTML = '<span class="task-icon">' + pictureFor(task) + "</span>" +
      '<span class="task-label">' + task.label + "</span>";
    button.addEventListener("click", function () {
      var latest = loadDone();
      latest.keys[key] = !latest.keys[key];
      saveDone(latest);
      button.className = "task" + (latest.keys[key] ? " done" : "");
      if (latest.keys[key]) playFanfare();
      addStars(latest.keys[key] ? 1 : -1);
    });
    tasks.appendChild(button);
  });
  frame.appendChild(tasks);
  frames.appendChild(frame);
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
