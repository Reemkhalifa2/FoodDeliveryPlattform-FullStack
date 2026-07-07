// app.js — Restaurant Browse page logic

import { api, ApiError } from './api.js';
import { createStateRenderer, runWithState, skeletonCards, emptyState, errorBanner } from './state.js';

const listEl = document.getElementById('restaurantList');
const searchInput = document.getElementById('searchInput');
const filterRow = document.getElementById('cuisineFilters');

let activeCuisine = '';
let debounceTimer = null;

// ---- Renderer wired to the three UI states ----
const renderer = createStateRenderer(listEl, {
  loading: () => skeletonCards(6),
  ready: (restaurants) => renderRestaurants(restaurants),
  error: (msg, retry) => errorBanner(msg),
});

// ---- DTO -> card markup ----
function restaurantCard(r) {
  const isOpen = r.acceptingOrders;
  const rating = r.averageRating != null
    ? `<span class="r-card__rating">⭐ ${r.averageRating.toFixed(1)}</span>`
    : '';

  return `
    <div class="card r-card">
      <div class="r-card__image">
        <span class="badge ${isOpen ? 'badge--open' : 'badge--paused'}">
          ${isOpen ? 'Open' : 'Paused'}
        </span>
      </div>
      <div class="r-card__body">
        <div class="r-card__title-row">
          <span class="r-card__title">${escapeHtml(r.name)}</span>
          ${rating}
        </div>
        <span class="badge badge--cuisine">${escapeHtml(r.cuisineType)}</span>
        <div class="r-card__meta">
          <div>
            <p class="r-card__meta-label">Delivery</p>
            <p class="r-card__meta-value">${Number(r.deliveryFee).toFixed(3)} OMR</p>
          </div>
          <div>
            <p class="r-card__meta-label">Min order</p>
            <p class="r-card__meta-value">${Number(r.minOrderAmount).toFixed(3)} OMR</p>
          </div>
        </div>
        <a href="menu.html?restaurantId=${r.id}">
          <button class="btn btn--primary btn--block" ${isOpen ? '' : 'disabled'}>
            View Menu
          </button>
        </a>
      </div>
    </div>`;
}

function renderRestaurants(restaurants) {
  if (!restaurants || restaurants.length === 0) {
    return emptyState('No restaurants match your search');
  }
  return `<div class="restaurant-grid">${restaurants.map(restaurantCard).join('')}</div>`;
}

function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Data loading ----
function loadRestaurants({ cuisine = '', search = '' } = {}) {
  runWithState(renderer, async () => {
    let path = '/restaurants';
    if (cuisine) path = `/restaurants/cuisine/${encodeURIComponent(cuisine)}`;
    else if (search) path = `/restaurants/search?name=${encodeURIComponent(search)}`;

    return api(path);
  });
}

// ---- Search input (debounced) ----
searchInput.addEventListener('input', (e) => {
  const value = e.target.value.trim();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadRestaurants({ cuisine: activeCuisine, search: value });
  }, 300);
});

// ---- Cuisine chips ----
filterRow.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  filterRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
  chip.classList.add('chip--active');

  activeCuisine = chip.dataset.cuisine;
  loadRestaurants({ cuisine: activeCuisine, search: searchInput.value.trim() });
});

// ---- Initial load ----
loadRestaurants();