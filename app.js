// Мини-приложение «Бригада Блеск»: калькулятор уборки внутри Telegram.
// Выбор клиента уходит боту через Telegram.WebApp.sendData, итог бот пересчитывает сам.
import { calculate } from "./calc.js";

const tg = window.Telegram?.WebApp;
const inTelegram = Boolean(tg && tg.platform && tg.platform !== "unknown");
const $ = (id) => document.getElementById(id);
const NBSP = " ";
const money = (n) => n.toLocaleString("ru-RU").replace(/\s/g, NBSP) + NBSP + "₽";

// Иконки одного стиля: контур 1.75, 24×24, цвет из currentColor.
const svg = (paths) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICON = {
  sparkles: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  spray: svg('<path d="M8 11h6v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M9 11V8h4v3"/><path d="M13 8h2.5l2 2"/><path d="M19 4h.01M21 7h.01M19 7h.01"/>'),
  roller: svg('<rect x="3" y="4" width="14" height="5" rx="1.5"/><path d="M17 6.5h2.5V12H11v3"/><rect x="9.5" y="15" width="3" height="6" rx="1"/>'),
  window: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M4 12h16"/>'),
  sofa: svg('<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z"/><path d="M5 17v2M19 17v2"/>'),
  rug: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  brush: svg('<path d="M9.5 14.5 3 21"/><path d="M14 4l6 6-7.5 7.5a2 2 0 0 1-2.8 0L6.5 14.3a2 2 0 0 1 0-2.8z"/>'),
};
const ICON_RULES = [["ремонт", "roller"], ["генерал", "sparkles"], ["поддерж", "spray"], ["окон", "window"], ["окн", "window"], ["мебел", "sofa"], ["ковр", "rug"]];
const iconFor = (name) => ICON[(ICON_RULES.find(([key]) => name.toLowerCase().includes(key)) || ["", "brush"])[1]];
const CHECK = svg('<path d="M5 12l4 4 10-10"/>').replace('width="22" height="22"', 'width="14" height="14"').replace('stroke-width="1.75"', 'stroke-width="2.5"');
const CHEVRON = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
const MINUS = svg('<path d="M6 12h12"/>');
const PLUS = svg('<path d="M12 6v12M6 12h12"/>');

const state = { room: null, serviceId: null, area: 50, addons: {}, open: new Set() };
let catalog;

function haptic() { tg?.HapticFeedback?.selectionChanged(); }
function servicesForRoom() { return catalog.services.filter((s) => s.room === state.room); }
function currentService() { return catalog.services.find((s) => s.id === state.serviceId); }
function groupsOf(service) { return (service?.addon_groups || []).map((id) => catalog.addon_groups.find((g) => g.id === id)).filter(Boolean); }

function selectService(id) {
  state.serviceId = id;
  state.addons = {};
  const first = groupsOf(currentService())[0];
  state.open = new Set(first ? [String(first.id)] : []);
}

function renderRooms() {
  $("rooms").replaceChildren(...catalog.rooms.map((room) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = room;
    b.className = room === state.room ? "on" : "";
    b.setAttribute("aria-pressed", room === state.room);
    b.onclick = () => { state.room = room; selectService(servicesForRoom()[0]?.id ?? null); haptic(); renderAll(); };
    return b;
  }));
}

function renderServices() {
  $("services").replaceChildren(...servicesForRoom().map((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "service" + (s.id === state.serviceId ? " on" : "");
    b.setAttribute("aria-pressed", s.id === state.serviceId);
    const price = s.price_per_m2 != null ? `${money(s.price_per_m2)} за${NBSP}м²` : "по позициям";
    b.innerHTML = `<span class="icon">${iconFor(s.name)}</span><span class="check">${CHECK}</span><span class="name"></span><span class="price">${price}</span>`;
    b.querySelector(".name").textContent = s.short || s.name;
    b.onclick = () => { selectService(s.id); haptic(); renderAll(); };
    return b;
  }));
}

function renderArea() {
  const service = currentService();
  const block = $("areaBlock");
  block.hidden = !service || service.price_per_m2 == null;
  if (block.hidden) return;
  const range = $("areaRange");
  $("areaNum").value = state.area;
  range.value = Math.min(Number(range.max), Math.max(Number(range.min), state.area));
  range.style.setProperty("--p", ((range.value - range.min) / (range.max - range.min)) * 100 + "%");
  $("areaHint").textContent = `${money(service.price_per_m2)} за${NBSP}м² · ${service.name}`;
}

function stepper(item) {
  const wrap = document.createElement("div");
  wrap.className = "stepper";
  const n = state.addons[item.id] || 0;
  wrap.innerHTML = `<button type="button" aria-label="меньше">${MINUS}</button><span class="n" aria-live="polite">${n}</span><button type="button" aria-label="больше">${PLUS}</button>`;
  const [minus, , plus] = wrap.children;
  minus.disabled = n === 0;
  minus.onclick = () => setAddon(item.id, Math.max(0, n - 1));
  plus.onclick = () => setAddon(item.id, Math.min(50, n + 1));
  return wrap;
}

function m2Input(item) {
  const label = document.createElement("label");
  label.className = "m2";
  const input = document.createElement("input");
  input.type = "number"; input.inputMode = "decimal"; input.min = "0"; input.max = "500";
  input.value = state.addons[item.id] || ""; input.placeholder = "0";
  input.setAttribute("aria-label", `${item.name}, м²`);
  input.onchange = () => setAddon(item.id, Math.min(500, Math.max(0, Number(input.value) || 0)));
  const unit = document.createElement("span");
  unit.className = "unit"; unit.textContent = "м²";
  label.append(input, unit);
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
  const groups = groupsOf(service);
  $("addonsBlock").hidden = groups.length === 0;
  // У услуг без цены за м² эти позиции и есть сама работа, а не «дополнительно».
  $("addonsTitle").textContent = service && service.price_per_m2 == null ? "Что нужно сделать" : "Дополнительно";
  $("addons").replaceChildren(...groups.map((g) => {
    const details = document.createElement("details");
    details.className = "group";
    details.open = state.open.has(String(g.id));
    details.ontoggle = () => { details.open ? state.open.add(String(g.id)) : state.open.delete(String(g.id)); };
    const chosen = g.items.filter((i) => state.addons[i.id] > 0).length;
    const from = Math.min(...g.items.map((i) => i.price));
    const summary = document.createElement("summary");
    summary.innerHTML = `<span class="title"></span>${chosen ? `<span class="count">${chosen}</span>` : `<span class="from">от ${money(from)}</span>`}${CHEVRON}`;
    summary.querySelector(".title").textContent = g.title;
    details.append(summary);
    for (const item of g.items) {
      const row = document.createElement("div");
      row.className = "item";
      const info = document.createElement("div");
      info.innerHTML = `<div class="iname"></div><div class="price">${money(item.price)} ${item.unit === "m2" ? `за${NBSP}м²` : "за шт."}</div>`;
      info.querySelector(".iname").textContent = item.name;
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

function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

function renderTotals() {
  const service = currentService();
  const area = service?.price_per_m2 != null ? state.area : 0;
  const quote = calculate(catalog, state.serviceId, area, state.addons);
  const min = catalog.min_order_rub || 0;
  $("total").textContent = money(quote.total);
  $("minHint").hidden = !(quote.subtotal > 0 && quote.subtotal < min);
  $("minHint").textContent = `Минимальный заказ ${money(min)}`;
  const lines = quote.lines.map((l) => {
    const qty = l.unit === "м²" ? `, ${l.qty}${NBSP}м²` : ` ×${NBSP}${l.qty}`;
    return `<div class="line"><span>${escapeHtml(l.name + qty)}</span><span>${money(l.total)}</span></div>`;
  });
  if (quote.topUp > 0) lines.push(`<div class="line note"><span>До минимального заказа</span><span>+${money(quote.topUp)}</span></div>`);
  if (lines.length) lines.push(`<div class="line total"><span>Итого</span><span>${money(quote.total)}</span></div>`);
  $("breakdown").innerHTML = lines.length
    ? `<h2 class="inline">Ваш расчёт</h2>${lines.join("")}`
    : `<h2 class="inline">Ваш расчёт</h2><p class="empty">Выберите услугу и отметьте, что нужно сделать.</p>`;
  const ready = quote.subtotal > 0;
  if (inTelegram) {
    tg.MainButton.setParams({ text: ready ? `Выбрать дату · ${money(quote.total)}` : "Выберите, что нужно сделать", is_active: ready, is_visible: true });
  } else {
    $("fallbackBtn").hidden = false;
    $("fallbackBtn").disabled = !ready;
  }
}

function renderAll() { renderRooms(); renderServices(); renderArea(); renderAddons(); renderTotals(); }

function submit() {
  const data = JSON.stringify(payload());
  if (inTelegram) { tg.sendData(data); return; }
  alert("Вне Telegram расчёт не отправляется. В боте сюда придёт:\n" + data);
}

function applyTheme(scheme) { document.documentElement.dataset.theme = scheme === "dark" ? "dark" : "light"; }

async function init() {
  catalog = await (await fetch("catalog.json", { cache: "no-cache" })).json();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--accent", catalog.brand.accent);
  rootStyle.setProperty("--brand-dark", catalog.brand.dark);
  $("bizName").textContent = catalog.business.name;
  document.title = `${catalog.business.name} · расчёт уборки`;
  state.room = catalog.rooms[0];
  selectService(servicesForRoom()[0]?.id ?? null);

  const setArea = (v) => { state.area = Math.min(2000, Math.max(1, Math.round(Number(v) || 1))); renderArea(); renderTotals(); };
  $("areaRange").oninput = (e) => setArea(e.target.value);
  $("areaNum").onchange = (e) => setArea(e.target.value);
  $("fallbackBtn").onclick = submit;
  $("promoLink").onclick = () => { $("promoBox").hidden = false; $("promoLink").hidden = true; $("promo").focus(); };

  if (inTelegram) {
    document.documentElement.dataset.tg = "1";
    applyTheme(tg.colorScheme);
    tg.onEvent("themeChanged", () => applyTheme(tg.colorScheme));
    tg.ready(); tg.expand();
    tg.setHeaderColor?.(catalog.brand.accent);
    tg.MainButton.setParams({ color: catalog.brand.dark, text_color: "#FFFFFF" });
    tg.MainButton.onClick(submit);
  } else {
    const media = matchMedia("(prefers-color-scheme: dark)");
    applyTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", (e) => applyTheme(e.matches ? "dark" : "light"));
  }
  renderAll();
}

init();
