// Erweiterung: Auch automatisch erzeugte Zutaten können abgehakt werden.
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
  document.querySelectorAll('[data-auto-shopping-check]').forEach(input => {
    input.addEventListener('change', () => toggleAutoShopping(input.dataset.autoShoppingCheck));
  });
};

renderShopping();
