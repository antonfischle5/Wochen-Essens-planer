const DAYS = [
  { key: 'monday', label: 'Montag', short: 'Mo' },
  { key: 'tuesday', label: 'Dienstag', short: 'Di' },
  { key: 'wednesday', label: 'Mittwoch', short: 'Mi' },
  { key: 'thursday', label: 'Donnerstag', short: 'Do' },
  { key: 'friday', label: 'Freitag', short: 'Fr' },
  { key: 'saturday', label: 'Samstag', short: 'Sa' },
  { key: 'sunday', label: 'Sonntag', short: 'So' }
];

const STORAGE = {
  dishes: 'wochen-essensplaner:dishes:v1',
  plans: 'wochen-essensplaner:plans:v1',
  manual: 'wochen-essensplaner:manual-shopping:v1'
};

const DEFAULT_DISHES = [
  { name: 'Spaghetti Bolognese', allowedDays: DAYS.map(d => d.key), ingredients: [
    { name: 'Spaghetti', quantity: '500', unit: 'g' }, { name: 'Hackfleisch', quantity: '500', unit: 'g' }, { name: 'Passierte Tomaten', quantity: '500', unit: 'ml' }, { name: 'Zwiebel', quantity: '1', unit: 'Stk.' }
  ] },
  { name: 'Pizza', allowedDays: DAYS.map(d => d.key), ingredients: [
    { name: 'Pizzateig', quantity: '1', unit: 'Packung' }, { name: 'Tomatensoße', quantity: '200', unit: 'ml' }, { name: 'Käse', quantity: '200', unit: 'g' }
  ] },
  { name: 'Chicken Curry', allowedDays: DAYS.map(d => d.key), ingredients: [
    { name: 'Hähnchenbrust', quantity: '500', unit: 'g' }, { name: 'Kokosmilch', quantity: '400', unit: 'ml' }, { name: 'Curry', quantity: '2', unit: 'EL' }, { name: 'Reis', quantity: '300', unit: 'g' }
  ] },
  { name: 'Pfannkuchen', allowedDays: ['saturday', 'sunday'], ingredients: [
    { name: 'Mehl', quantity: '250', unit: 'g' }, { name: 'Milch', quantity: '500', unit: 'ml' }, { name: 'Eier', quantity: '3', unit: 'Stk.' }
  ] },
  { name: 'Ofenkartoffeln', allowedDays: ['friday', 'saturday', 'sunday'], ingredients: [
    { name: 'Kartoffeln', quantity: '1', unit: 'kg' }, { name: 'Kräuterquark', quantity: '500', unit: 'g' }
  ] },
  { name: 'Gemüse-Reis-Pfanne', allowedDays: DAYS.map(d => d.key), ingredients: [
    { name: 'Reis', quantity: '300', unit: 'g' }, { name: 'Gemüsemix', quantity: '500', unit: 'g' }, { name: 'Sojasoße', quantity: '4', unit: 'EL' }
  ] }
];

let dishes = load(STORAGE.dishes, null);
if (!Array.isArray(dishes) || dishes.length === 0) {
  dishes = DEFAULT_DISHES.map(d => ({ ...d, id: uid() }));
  save(STORAGE.dishes, dishes);
}

let plans = load(STORAGE.plans, {}) || {};
let manualItems = load(STORAGE.manual, {}) || {};
let editingDishId = null;

const $ = id => document.getElementById(id);

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date);
}

function getWeekRange() {
  const monday = getMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDate(monday)} – ${formatDate(sunday)}`;
}

function canUseDish(dish, dayKey) {
  return Array.isArray(dish.allowedDays) && dish.allowedDays.includes(dayKey);
}

function generatePlan() {
  const result = {};
  let remaining = [...dishes];

  for (const day of DAYS) {
    const eligible = dishes.filter(d => canUseDish(d, day.key));
    const unused = eligible.filter(d => remaining.some(r => r.id === d.id));
    const pool = unused.length ? unused : eligible;
    if (!pool.length) {
      result[day.key] = null;
      continue;
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    result[day.key] = picked.id;
    remaining = remaining.filter(d => d.id !== picked.id);
  }
  return result;
}

function ensureCurrentPlan() {
  const weekKey = getWeekKey();
  if (!plans[weekKey]) {
    plans[weekKey] = generatePlan();
    save(STORAGE.plans, plans);
  }
  return plans[weekKey];
}

function regeneratePlan() {
  plans[getWeekKey()] = generatePlan();
  save(STORAGE.plans, plans);
  renderAll();
}

function dishForId(id) {
  return dishes.find(d => d.id === id);
}

function ingredientSummary(dish) {
  if (!dish || !dish.ingredients?.length) return 'Keine Zutaten hinterlegt';
  return dish.ingredients.slice(0, 3).map(i => `${i.name}${i.quantity ? ` · ${i.quantity}${i.unit ? ` ${i.unit}` : ''}` : ''}`).join(' · ') + (dish.ingredients.length > 3 ? ' …' : '');
}

function renderPlan() {
  $('weekTitle').textContent = `Woche ${getWeekKey().split('-W')[1]}`;
  $('weekRange').textContent = getWeekRange();
  const plan = ensureCurrentPlan();
  $('planList').innerHTML = DAYS.map((day, index) => {
    const dish = dishForId(plan[day.key]);
    return `<article class="day-card">
      <div class="day-number">${day.short}</div>
      <div>
        <div class="day-name">${day.label}</div>
        <h3>${dish ? escapeHTML(dish.name) : '<span class="empty-dish">Kein passendes Gericht</span>'}</h3>
        <p>${dish ? escapeHTML(ingredientSummary(dish)) : 'Füge ein Gericht für diesen Tag hinzu.'}</p>
      </div>
      <div class="dish-emoji">${['🍝','🍕','🍛','🥗','🌮','🥞','🍲'][index]}</div>
    </article>`;
  }).join('');
}

function renderDishes() {
  const list = $('dishList');
  if (!dishes.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽️</div><p>Noch keine Gerichte. Erstelle dein erstes Gericht.</p><button class="primary-btn" data-empty-add>Gericht hinzufügen</button></div>`;
    list.querySelector('[data-empty-add]').addEventListener('click', () => openDishDialog());
    return;
  }

  list.innerHTML = dishes.map(dish => {
    const allDays = dish.allowedDays.length === DAYS.length;
    const daysText = allDays ? 'Jeden Tag' : dish.allowedDays.map(key => DAYS.find(d => d.key === key)?.short).join(', ');
    return `<article class="dish-card">
      <div class="dish-card-top">
        <div><h3>${escapeHTML(dish.name)}</h3><p>${dish.ingredients.length} ${dish.ingredients.length === 1 ? 'Zutat' : 'Zutaten'}</p></div>
        <div class="dish-actions">
          <button class="small-icon" data-edit="${dish.id}" aria-label="Bearbeiten">✎</button>
          <button class="small-icon delete" data-delete="${dish.id}" aria-label="Löschen">⌫</button>
        </div>
      </div>
      <div class="tags"><span class="tag">${escapeHTML(daysText || 'Kein Tag')}</span></div>
      <p class="ingredient-preview">${escapeHTML(ingredientSummary(dish))}</p>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openDishDialog(btn.dataset.edit)));
  list.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteDish(btn.dataset.delete)));
}

function aggregateShopping() {
  const plan = ensureCurrentPlan();
  const map = new Map();
  DAYS.forEach(day => {
    const dish = dishForId(plan[day.key]);
    dish?.ingredients?.forEach(item => {
      const name = item.name.trim();
      if (!name) return;
      const unit = (item.unit || '').trim();
      const key = `${name.toLocaleLowerCase('de-DE')}|${unit.toLocaleLowerCase('de-DE')}`;
      const old = map.get(key);
      const numeric = Number.parseFloat(String(item.quantity).replace(',', '.'));
      if (old && Number.isFinite(numeric) && Number.isFinite(old.numeric)) {
        old.numeric += numeric;
        old.quantity = formatQuantity(old.numeric);
      } else if (!old) {
        map.set(key, { id: key, name, unit, quantity: item.quantity || '', numeric: Number.isFinite(numeric) ? numeric : null });
      }
    });
  });
  return [...map.values()];
}

function formatQuantity(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

function renderShopping() {
  const autoItems = aggregateShopping();
  const week = getWeekKey();
  const manual = Array.isArray(manualItems[week]) ? manualItems[week] : [];

  $('autoShoppingList').innerHTML = autoItems.length ? autoItems.map(item => shoppingHTML(item, false)).join('') : emptyShopping('Keine Zutaten gefunden.');
  $('manualShoppingList').innerHTML = manual.length ? manual.map(item => shoppingHTML(item, true)).join('') : emptyShopping('Hier kannst du eigene Artikel hinzufügen.');

  const all = [...manual];
  const done = all.filter(i => i.checked).length;
  const total = autoItems.length + all.length;
  $('shoppingProgress').textContent = `${done} von ${total} eigenen Artikeln erledigt`;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $('progressRing').textContent = `${percent}%`;

  document.querySelectorAll('[data-shopping-check]').forEach(input => input.addEventListener('change', () => toggleManual(input.dataset.shoppingCheck)));
  document.querySelectorAll('[data-shopping-delete]').forEach(btn => btn.addEventListener('click', () => deleteManual(btn.dataset.shoppingDelete)));
}

function shoppingHTML(item, manual) {
  const checked = manual && item.checked;
  return `<div class="shopping-item ${checked ? 'checked' : ''}">
    ${manual ? `<input class="shopping-check" type="checkbox" ${checked ? 'checked' : ''} data-shopping-check="${item.id}" aria-label="${escapeHTML(item.name)} erledigt">` : '<span class="shopping-check" aria-hidden="true"></span>'}
    <div class="shopping-content"><span class="shopping-name">${escapeHTML(item.name)}</span><span class="shopping-qty">${escapeHTML([item.quantity, item.unit].filter(Boolean).join(' ')) || 'Menge nach Bedarf'}</span></div>
    ${manual ? `<button class="delete-shopping" data-shopping-delete="${item.id}" aria-label="Artikel löschen">×</button>` : ''}
  </div>`;
}

function emptyShopping(text) { return `<div class="empty-state"><p>${text}</p></div>`; }

function toggleManual(id) {
  const week = getWeekKey();
  manualItems[week] = (manualItems[week] || []).map(i => i.id === id ? { ...i, checked: !i.checked } : i);
  save(STORAGE.manual, manualItems);
  renderShopping();
}

function deleteManual(id) {
  const week = getWeekKey();
  manualItems[week] = (manualItems[week] || []).filter(i => i.id !== id);
  save(STORAGE.manual, manualItems);
  renderShopping();
}

function addManualItem(event) {
  event.preventDefault();
  const name = $('shoppingName').value.trim();
  if (!name) return;
  const week = getWeekKey();
  manualItems[week] = manualItems[week] || [];
  manualItems[week].push({ id: uid(), name, quantity: $('shoppingQty').value.trim(), unit: '', checked: false });
  save(STORAGE.manual, manualItems);
  event.target.reset();
  renderShopping();
}

function openDishDialog(id = null) {
  editingDishId = id;
  const dish = id ? dishForId(id) : null;
  $('dialogTitle').textContent = dish ? 'Gericht bearbeiten' : 'Neues Gericht';
  $('dishName').value = dish?.name || '';
  renderIngredientRows(dish?.ingredients || [{ name: '', quantity: '', unit: '' }]);
  renderDayGrid(dish?.allowedDays || DAYS.map(d => d.key));
  $('dishDialog').showModal();
}

function closeDishDialog() { $('dishDialog').close(); }

function renderIngredientRows(ingredients) {
  $('ingredientRows').innerHTML = ingredients.map((item, index) => `<div class="ingredient-row">
    <input data-ing-name value="${escapeAttr(item.name)}" placeholder="Zutat">
    <input data-ing-qty value="${escapeAttr(item.quantity)}" placeholder="Menge">
    <input data-ing-unit value="${escapeAttr(item.unit)}" placeholder="Einheit">
    <button type="button" class="remove-ingredient" data-remove-ing="${index}" aria-label="Zutat entfernen">×</button>
  </div>`).join('');
  $('ingredientRows').querySelectorAll('[data-remove-ing]').forEach(btn => btn.addEventListener('click', () => {
    const rows = readIngredientRows();
    rows.splice(Number(btn.dataset.removeIng), 1);
    renderIngredientRows(rows.length ? rows : [{ name: '', quantity: '', unit: '' }]);
  }));
}

function readIngredientRows() {
  return [...$('ingredientRows').querySelectorAll('.ingredient-row')].map(row => ({
    name: row.querySelector('[data-ing-name]').value.trim(),
    quantity: row.querySelector('[data-ing-qty]').value.trim(),
    unit: row.querySelector('[data-ing-unit]').value.trim()
  })).filter(i => i.name);
}

function renderDayGrid(selected) {
  $('dayGrid').innerHTML = DAYS.map(day => `<label class="day-option"><input type="checkbox" value="${day.key}" ${selected.includes(day.key) ? 'checked' : ''}><span>${day.short}</span></label>`).join('');
}

function selectAllDays() {
  $('dayGrid').querySelectorAll('input').forEach(input => input.checked = true);
}

function saveDish(event) {
  event.preventDefault();
  const name = $('dishName').value.trim();
  const ingredients = readIngredientRows();
  const allowedDays = [...$('dayGrid').querySelectorAll('input:checked')].map(input => input.value);
  if (!name) return;
  if (!allowedDays.length) { alert('Bitte wähle mindestens einen Tag aus.'); return; }

  const data = { name, ingredients, allowedDays };
  if (editingDishId) {
    dishes = dishes.map(d => d.id === editingDishId ? { ...d, ...data } : d);
  } else {
    dishes.push({ id: uid(), ...data });
  }
  save(STORAGE.dishes, dishes);
  closeDishDialog();
  plans = {};
  save(STORAGE.plans, plans);
  renderAll();
}

function deleteDish(id) {
  const dish = dishForId(id);
  if (!dish || !confirm(`„${dish.name}“ wirklich löschen?`)) return;
  dishes = dishes.filter(d => d.id !== id);
  Object.keys(plans).forEach(week => {
    Object.keys(plans[week]).forEach(day => { if (plans[week][day] === id) plans[week][day] = null; });
  });
  save(STORAGE.dishes, dishes);
  save(STORAGE.plans, plans);
  renderAll();
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function escapeAttr(value = '') { return escapeHTML(value); }

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderPlan();
  renderDishes();
  renderShopping();
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
$('shufflePlan').addEventListener('click', regeneratePlan);
$('shuffleTop').addEventListener('click', regeneratePlan);
$('addDishBtn').addEventListener('click', () => openDishDialog());
$('addIngredientBtn').addEventListener('click', () => {
  const rows = readIngredientRows();
  rows.push({ name: '', quantity: '', unit: '' });
  renderIngredientRows(rows);
});
$('allDaysBtn').addEventListener('click', selectAllDays);
$('closeDialog').addEventListener('click', closeDishDialog);
$('cancelDish').addEventListener('click', closeDishDialog);
$('dishForm').addEventListener('submit', saveDish);
$('shoppingForm').addEventListener('submit', addManualItem);
$('dishDialog').addEventListener('click', event => { if (event.target === $('dishDialog')) closeDishDialog(); });

renderAll();
