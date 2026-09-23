// Мини-приложение «Бригада Блеск»: калькулятор уборки внутри Telegram.
// Выбор клиента уходит боту через Telegram.WebApp.sendData, итог бот пересчитывает сам.
import { calculate } from "./calc.js";

const tg = window.Telegram?.WebApp;
const inTelegram = Boolean(tg && tg.initData !== undefined && tg.platform && tg.platform !== "unknown");
const $ = (id) => document.getElementById(id);
const money = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₽";

const ICONS = [["ремонт", "🛠"], ["генерал", "✨"], ["поддерж", "🧹"], ["окон", "🪟"], ["окн", "🪟"], ["мебел", "🛋"], ["ковр", "🧶"]];
const iconFor = (name) => (ICONS.find(([key]) => name.toLowerCase().includes(key)) || ["", "🧽"])[1];

const state = { room: null, serviceId: null, area: 50, addons: {} };
let catalog;

function haptic() { tg?.HapticFeedback?.selectionChanged(); }

function servicesForRoom() { return catalog.services.filter((s) => s.room === state.room); }
function currentService() { return catalog.services.find((s) => s.id === state.serviceId); }

function renderRooms() {
  $("rooms").replaceChildren(...catalog.rooms.map((room) => {
    const b = document.createElement("button");
    b.textContent = room;
    b.className = room === state.room ? "on" : "";
    b.onclick = () => { state.room = room; state.serviceId = servicesForRoom()[0]?.id ?? null; state.addons = {}; haptic(); renderAll(); };
    return b;
  }));
}

function renderServices() {
  $("services").replaceChildren(...servicesForRoom().map((s) => {
    const b = document.createElement("button");
    b.className = "service" + (s.id === state.serviceId ? " on" : "");
    const price = s.price_per_m2 != null ? `${money(s.price_per_m2)} за м²` : "по позициям";
    b.innerHTML = `<span class="icon">${iconFor(s.name)}</span><span class="name"></span><span class="price">${price}</span>`;
    b.querySelector(".name").textContent = s.short || s.name;
    b.onclick = () => { state.serviceId = s.id; state.addons = {}; haptic(); renderAll(); };
    return b;
  }));
}

function renderArea() {
  const service = currentService();
  const block = $("areaBlock");
  block.hidden = !service || service.price_per_m2 == null;
  if (block.hidden) return;
  $("areaNum").value = state.area;
  $("areaRange").value = Math.min(300, Math.max(10, state.area));
  $("areaHint").textContent = `${money(service.price_per_m2)} за м² · ${service.name}`;
}

function stepper(item) {
  const wrap = document.createElement("div");
  wrap.className = "stepper";
  const n = state.addons[item.id] || 0;
  wrap.innerHTML = `<button aria-label="меньше">−</button><span class="n">${n}</span><button aria-label="больше">+</button>`;
  const [minus, , plus] = wrap.children;
  minus.disabled = n === 0;
  minus.onclick = () => { setAddon(item.id, Math.max(0, n - 1)); };
  plus.onclick = () => { setAddon(item.id, Math.min(50, n + 1)); };
  return wrap;
}

function m2Input(item) {
  const label = document.createElement("label");
  label.className = "m2";
  const input = document.createElement("input");
  input.type = "number"; input.inputMode = "decimal"; input.min = "0"; input.max = "500";
  input.value = state.addons[item.id] || "";
  input.placeholder = "0";
  input.onchange = () => setAddon(item.id, Math.min(500, Math.max(0, Number(input.value) || 0)));
  label.append(input, " м²");
  return label;
}

function setAddon(id, qty) {
  if (qty > 0) state.addons[id] = qty; else delete state.addons[id];
  haptic();
  renderAddons();
  renderTotals();
}

function renderAddons() {
  const service = currentService();
  const groups = (service?.addon_groups || []).map((id) => catalog.addon_groups.find((g) => g.id === id)).filter(Boolean);
  $("addonsBlock").hidden = groups.length === 0;
  const opened = new Set([...document.querySelectorAll("details.group[open]")].map((d) => d.dataset.id));
  $("addons").replaceChildren(...groups.map((g, index) => {
    const details = document.createElement("details");
    details.className = "group";
    details.dataset.id = g.id;
    const chosen = g.items.filter((i) => state.addons[i.id] > 0).length;
    details.open = opened.size ? opened.has(String(g.id)) : index === 0 && !service.price_per_m2;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span></span><span class="count">${chosen ? "выбрано " + chosen : "›"}</span>`;
    summary.firstChild.textContent = g.title;
    details.append(summary);
    for (const item of g.items) {
      const row = document.createElement("div");
      row.className = "item";
      const info = document.createElement("div");
      info.innerHTML = `<div></div><div class="price">${money(item.price)} ${item.unit === "m2" ? "за м²" : "за шт."}</div>`;
      info.firstChild.textContent = item.name;
      row.append(info, item.unit === "count" ? stepper(item) : m2Input(item));
      details.append(row);
    }
    return details;
  }));
}

function payload() {
  const service = currentService();
  return {
    v: 1, room: state.room, service_id: state.serviceId,
    area_m2: service?.price_per_m2 != null ? state.area : null,
    addons: state.addons, promo: $("promo").value.trim() || null,
  };
}

function renderTotals() {
  const service = currentService();
  const area = service?.price_per_m2 != null ? state.area : 0;
  const quote = calculate(catalog, state.serviceId, area, state.addons);
  $("total").textContent = money(quote.total);
  const lines = quote.lines.map((l) => {
    const qty = l.unit === "м²" ? `, ${l.qty} м²` : l.qty > 1 ? ` × ${l.qty}` : "";
    return `<div class="line"><span>${escapeHtml(l.name + qty)}</span><span>${money(l.total)}</span></div>`;
  });
  if (quote.topUp > 0) lines.push(`<div class="line note"><span>До минимального заказа</span><span>+${money(quote.topUp)}</span></div>`);
  $("breakdown").innerHTML = lines.length ? `<h2 class="inline">Ваш расчёт</h2>${lines.join("")}` : `<p class="muted">Выберите услугу и дополнительные работы.</p>`;
  const ready = quote.subtotal > 0;
  if (inTelegram) {
    tg.MainButton.setText(ready ? `Выбрать дату · ${money(quote.total)}` : "Выберите услугу");
    ready ? tg.MainButton.enable() : tg.MainButton.disable();
    tg.MainButton.show();
  } else {
    $("fallbackBtn").hidden = false;
    $("fallbackBtn").disabled = !ready;
  }
}

function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

function renderAll() { renderRooms(); renderServices(); renderArea(); renderAddons(); renderTotals(); }

function submit() {
  const data = JSON.stringify(payload());
  if (inTelegram) { tg.sendData(data); return; }
  alert("Вне Telegram расчёт не отправляется. В боте сюда придёт:\n" + data);
}

async function init() {
  catalog = await (await fetch("catalog.json", { cache: "no-cache" })).json();
  document.documentElement.style.setProperty("--accent", catalog.brand.accent);
  document.documentElement.style.setProperty("--accent-dark", catalog.brand.dark);
  $("bizName").textContent = catalog.business.name;
  document.title = `${catalog.business.name} · расчёт уборки`;
  state.room = catalog.rooms[0];
  state.serviceId = servicesForRoom()[0]?.id ?? null;
  const setArea = (v) => { state.area = Math.min(2000, Math.max(1, Math.round(Number(v) || 1))); renderArea(); renderTotals(); };
  $("areaRange").oninput = (e) => setArea(e.target.value);
  $("areaNum").onchange = (e) => setArea(e.target.value);
  $("fallbackBtn").onclick = submit;
  if (inTelegram) {
    document.documentElement.dataset.tg = "1";
    tg.ready(); tg.expand();
    tg.MainButton.color = catalog.brand.accent;
    tg.MainButton.onClick(submit);
  }
  renderAll();
}

init();
