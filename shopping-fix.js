// Erweiterung: Automatische Zutaten abhaken + Fortschrittsanzeige korrekt aktualisieren.
const AUTO_CHECK_STORAGE = 'wochen-essensplaner:auto-shopping-checked:v1';
let autoChecked = load(AUTO_CHECK_STORAGE, {}) || {};

function autoShoppingKey(item) {
  return `${getWeekKey()}::${item.id}`;
}

function toggleAutoShopping(id) {
  const key = `${getWeekKey()}::${id}`;
  autoChecked[key] = !autoChecked[key];
  save(AUTO_CHECK_STORAGE, autoChecked);
  renderShopping();
}

function shoppingHTML(item, manual) {
  const checked = manual ? !!item.checked : !!autoChecked[autoShoppingKey(item)];
  return `<div class="shopping-item ${checked ? 'checked' : ''}">
    <input class="shopping-check" type="checkbox" ${checked ? 'checked' : ''}
      ${manual ? `data-shopping-check="${escapeAttr(item.id)}"` : `data-auto-shopping-check="${escapeAttr(item.id)}"`}
      aria-label="${escapeHTML(item.name)} erledigt">
    <div class="shopping-content">
      <span class="shopping-name">${escapeHTML(item.name)}</span>
      <span class="shopping-qty">${escapeHTML([item.quantity, item.unit].filter(Boolean).join(' ')) || 'Menge nach Bedarf'}</span>
    </div>
    ${manual ? `<button class="delete-shopping" data-shopping-delete="${escapeAttr(item.id)}" aria-label="Artikel löschen">×</button>` : ''}
  </div>`;
}

const originalRenderShopping = renderShopping;
renderShopping = function () {
  originalRenderShopping();

  // Fortschritt nach dem ursprünglichen Rendern mit den automatisch
  // erzeugten Zutaten neu berechnen.
  const autoItems = aggregateShopping();
  const week = getWeekKey();
  const manual = Array.isArray(manualItems[week]) ? manualItems[week] : [];
  const autoDone = autoItems.filter(item => !!autoChecked[autoShoppingKey(item)]).length;
  const manualDone = manual.filter(item => !!item.checked).length;
  const total = autoItems.length + manual.length;
  const done = autoDone + manualDone;
  const percent = total ? Math.round((done / total) * 100) : 0;

  $('shoppingProgress').textContent = `${done} von ${total} Artikeln erledigt`;
  $('progressRing').textContent = `${percent}%`;

  document.querySelectorAll('[data-auto-shopping-check]').forEach(input => {
    input.addEventListener('change', () => toggleAutoShopping(input.dataset.autoShoppingCheck));
  });
};

renderShopping();
