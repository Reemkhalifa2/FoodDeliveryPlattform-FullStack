// ==============================================================================================
//                              APP JS (shared across all pages)
// ==============================================================================================

const restaurantContainer = document.getElementById("restaurantContainer");
const loading             = document.getElementById("loading");
const message              = document.getElementById("errorMessage");
const searchInput          = document.getElementById("searchInput");

let allRestaurants = [];
let searchTimeout;

// ================================
// UI State Changers (shared)
// ================================
function showLoadingSkeletons(container, msgEl = message) {
    if (!container) return;
    container.innerHTML = "";

    let skeletonHTML = "";
    for (let i = 0; i < 8; i++) {
        skeletonHTML += `<div class="card skeleton-card"></div>`;
    }
    container.innerHTML = skeletonHTML;
}

function showEmptyState(text = "No restaurants match your search.", container = restaurantContainer) {
    if (!container) return;
    container.innerHTML = `
        <div class="card skeleton-card">
            <img src="images/empty-icon.png" alt="No results" class="empty-icon" onerror="this.style.display='none'">
            <p class="empty-text">${text}</p>
        </div>
    `;
}

function showErrorBanner(retryFunctionText, container = restaurantContainer, msgEl = message) {
    if (container) container.innerHTML = "";
    if (!msgEl) return;
    msgEl.innerHTML = `
        <div class="error-banner">
            <span>Failed to load</span>
            <button class="retry-btn" onclick="${retryFunctionText}">Retry</button>
        </div>
    `;
}

// ==============================================================================================
//                              RESTAURANT LISTING PAGE (index.html)
// ==============================================================================================

async function getRestaurant() {
    showLoadingSkeletons(restaurantContainer);

    try {
        allRestaurants = await api("/restaurants");

        if (!allRestaurants || allRestaurants.length === 0) {
            showEmptyState("No restaurants available at the moment.");
            return;
        }

        displayRestaurants(allRestaurants);
    } catch (error) {
        console.error(error);
        showErrorBanner("getRestaurant()");
    }
}

function displayRestaurants(restaurants) {
    if (!restaurantContainer) return;
    restaurantContainer.innerHTML = "";
    if (message) message.innerHTML = "";

    if (!restaurants || restaurants.length === 0) {
        showEmptyState();
        return;
    }

    let cardsHTML = "";
    restaurants.forEach(rest => {
        cardsHTML += `
        <div class="card">
            <div class="card-image">
                <span class="${rest.acceptingOrders ? 'badge-open' : 'badge-close'}">
                    ${rest.acceptingOrders ? "Open" : "Paused"}
                </span>
            </div>
            <div class="card-body">
                <div class="title-row">
                    <p class="title">${rest.name}</p>
                    <div class="rating">
                        <img src="images/star.png" class="star-icon">
                        <span>4.6</span>
                    </div>
                </div>
                <span class="badge-category">${rest.cuisineType}</span>
                <div class="stats-row">
                    <div>
                        <p class="stat-label">Delivery</p>
                        <p class="stat-value">${rest.deliveryFee} OMR</p>
                    </div>
                    <div>
                        <p class="stat-label">Minimum</p>
                        <p class="stat-value">${rest.minOrderAmount} OMR</p>
                    </div>
                </div>
                <button
                    class="${rest.acceptingOrders ? "btn-menu" : "btn-close"}"
                    data-id="${rest.id}">
                    ${rest.acceptingOrders ? "View Menu" : "Paused"}
                </button>
            </div>
        </div>
        `;
    });

    restaurantContainer.innerHTML = cardsHTML;
}

// Navigate to menu page when a "View Menu" button is clicked.
// Guarded: restaurantContainer only exists on index.html.
if (restaurantContainer) {
    restaurantContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-menu");
        if (!btn) return;

        const restId = btn.dataset.id;
        window.location.href = `menu.html?restaurantId=${restId}`;
    });
}

// Cuisine filter chips — only present on index.html
const chips = document.querySelectorAll(".chip");

if (chips.length > 0) {
    chips.forEach(chip => {
        chip.addEventListener("click", async () => {
            chips.forEach(c => c.classList.remove("chip--active"));
            chip.classList.add("chip--active");

            const cuisine = chip.dataset.cuisine;
            showLoadingSkeletons();

            try {
                let restaurants;
                if (cuisine === "All") {
                    restaurants = await api("/restaurants");
                } else {
                    restaurants = await api(`/restaurants/cuisine/${encodeURIComponent(cuisine)}`);
                }
                displayRestaurants(restaurants);
            } catch (error) {
                console.error(error);
                showErrorBanner(`document.querySelector('.chip--active').click()`);
            }
        });
    });
}

// Search — only present on index.html
if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(async () => {
            const keyword = searchInput.value.trim();

            if (keyword === "") {
                displayRestaurants(allRestaurants);
                return;
            }

            showLoadingSkeletons();

            try {
                const page = await api(`/restaurants/search?keyword=${encodeURIComponent(keyword)}&page=0&size=10`);
                const results = page.content || page;
                displayRestaurants(results);
            } catch (error) {
                console.error(error);
                showErrorBanner(`searchInput.dispatchEvent(new Event('input'))`);
            }
        }, 300);
    });
}

// ==============================================================================================
//                              MENU PAGE 
// ==============================================================================================

const menuContainer    = document.getElementById("menuContainer");
const restaurantInfo   = document.getElementById("restaurantInfo");
const categoryChipsRow = document.getElementById("categoryChips");
const comboContainer = document.getElementById("comboContainer")
const params       = new URLSearchParams(window.location.search);
const restaurantId = params.get("restaurantId");
const minordernotice = document.getElementById("min-order-notice")
let allMenuItems = [];
let allComboMeals = []
let cart = [];


async function getMenuItems() {
    if (!restaurantId) {
        showErrorBanner("getMenuItems()", menuContainer, message);
        console.error("Missing restaurantId in URL query string.");
        return;
    }

    showLoadingSkeletons(menuContainer);

    try {
        allMenuItems = await api(`/restaurants/${restaurantId}/menu`);
        allComboMeals = await api(`/restaurants/${restaurantId}/combos`);
        restaurantProfile = await api(`/restaurants/${restaurantId}`);

        displayRestaurantHeader(restaurantProfile);

        if ((!allMenuItems || allMenuItems.length === 0) ) {
            showEmptyState("This restaurant has no menu items yet.", menuContainer);
            return;
        }

        updateUI();
    } catch (error) {
        console.error(error);
        showErrorBanner("getMenuItems()", menuContainer, message);
    }
}
function displayRestaurantHeader(profile) {
    if (!restaurantInfo || !profile) return;
    showLoadingSkeletons(restaurantInfo);

    // Gracefully handle properties if any happen to be missing from the payload
    const name =  profile.name ;
    const cuisine = profile.cuisine || "International";
    const deliveryTime = profile.deliveryTime || "25-35 min";
    const minOrder = profile.minOrderAmount ? `${Number(profile.minOrderAmount).toFixed(3)} OMR` : "0.000 OMR";

    restaurantInfo.innerHTML = `
        <button class="back-btn" onclick="history.back()">←</button>
        <div class="restaurant-header__meta">
            <h1 class="restaurant-header__title">${name}</h1>
            <div class="restaurant-header__details">
                <span>${cuisine}</span> • 
                <span>${deliveryTime}</span>
            </div>
            
        </div>
    `;
    minordernotice.innerHTML=`
    <div class="restaurant-header__min-order">
                Min. Order: <strong>${minOrder}</strong>
            </div>
    `
}

function updateUI() {
    displayMenuItems(allMenuItems);
    displayComboMeals(allComboMeals)
    displayCart();
}

// ===============================
// MENU BUTTON CLICK
// ===============================
if (menuContainer) {
    menuContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        console.log(btn);
        const id = Number(btn.dataset.id);
        if (btn.classList.contains("add-btn")) {
            const item = allMenuItems.find(item => item.id === id);
            if (item) addToCart(item);
        }

        if (btn.classList.contains("plus")) increaseQuantity(id);
        if (btn.classList.contains("minus")) decreaseQuantity(id);

        updateUI();
    });
}

if (comboContainer) {
    comboContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        console.log(btn);
        const id = Number(btn.dataset.id);
        if (btn.classList.contains("add-btn")) {
            const item = allMenuItems.find(item => item.id === id);
            if (item) addToCart(item);
        }

        if (btn.classList.contains("plus")) increaseQuantity(id);
        if (btn.classList.contains("minus")) decreaseQuantity(id);

        updateUI();
    });
}

// ===============================
// ADD TO CART
// ===============================
function addToCart(item) {
    console.log("ADDING:", item);

    const existingItem = cart.find(
        cartItem => cartItem.menuItemId === item.id
    );

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            qty: 1
        });
    }

    console.log("CART:", cart);
}

function increaseQuantity(id) {
    const item = cart.find(item => item.menuItemId === id);
    if (item) item.qty++;
}

function decreaseQuantity(id) {
    const item = cart.find(item => item.menuItemId === id);
    if (!item) return;

    item.qty--;

    if (item.qty <= 0) {
        cart = cart.filter(item => item.menuItemId !== id);
    }
}

function getQuantity(id) {
    const item = cart.find(item => item.menuItemId === id);
    return item ? item.qty : 0;
}


function displayMenuItems(items) {
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    if (message) message.innerHTML = "";

    if (!items || items.length === 0) {
        showEmptyState(undefined, menuContainer);
        return;
    }

    let cardsHTML = "";

    items.forEach(item => {
        const qty = getQuantity(item.id);

        cardsHTML += `
        <div class="menu-card__body">
    <div class="menu-card__top">
        <h3 class="menu-card__name ${!item.isAvailable ? "unavailable-name" : ""}">
            ${item.name}
        </h3>
        <span class="menu-card__price">${item.price.toFixed(3)} OMR</span>
    </div>

    <p class="menu-card__description">${item.description || ""}</p>

    <div class="menu-card__footer">
        <span class="badge-category">${item.category || ""}</span>
        ${item.calories ? `<span class="menu-card__calories">🔥 ${item.calories} cal</span>` : ""}
    </div>

    ${
        !item.isAvailable
            ? `<button class="add-btn" disabled>Sold Out</button>`
            : qty === 0
                ? `<button class="add-btn" data-id="${item.id}">Add</button>`
                : `
                    <div class="quantity-controls">
                        <button class="minus" data-id="${item.id}">-</button>
                        <span>${qty}</span>
                        <button class="plus" data-id="${item.id}">+</button>
                    </div>
                `
    }
</div>
        `;
    });

    menuContainer.innerHTML = cardsHTML;
}


function displayComboMeals(items) {
    if (!comboContainer) return;
    comboContainer.innerHTML = "";
    if (message) message.innerHTML = "";

    if (!items || items.length === 0) {
        showEmptyState(undefined, menuContainer);
        return;
    }

    let cardsHTML = "";

    items.forEach(item => {
        const qty = getQuantity(item.id);

        cardsHTML += `
        <div class="menu-card">
            <div class="menu-card__image-wrapper">
                ${!item.isAvailable ? `<div class="menu-card__unavailable">Unavailable</div>` : ""}
            </div>
            <div class="menu-card__body">
                <div class="menu-card__top">
                    <h3 class="menu-card__name">${item.comboName}</h3>
                    <span class="menu-card__price">${item.totalPrice.toFixed(3)} OMR</span>
                </div>
                <p class="menu-card__description">${item.description || ""}</p>
                ${
                    !item.isAvailable
                        ? `<button class="add-btn" disabled>Unavailable</button>`
                        : qty === 0
                            ? `<button class="add-btn" data-id="${item.id}">Add</button>`
                            : `
                            <div class="quantity-controls">
                                <button class="minus" data-id="${item.id}">-</button>
                                <span>${qty}</span>
                                <button class="plus" data-id="${item.id}">+</button>
                            </div>
                            `
                }
            </div>
        </div>
        `;
    });

    comboContainer.innerHTML = cardsHTML;
}

function checkMinimumOrder() {

    const placeOrderBtn = document.querySelector(".place-order-btn");

    if (!placeOrderBtn) return;


    const subtotal = cart.reduce(
        (sum, item) => sum + (item.unitPrice * item.qty),
        0
    );


    const minimumOrder = Number(
        restaurantProfile?.minOrderAmount || 0
    );


    if (subtotal < minimumOrder) {

        placeOrderBtn.disabled = true;
        placeOrderBtn.title =
            `Minimum order is ${minimumOrder.toFixed(3)} OMR`;

    } else {

        placeOrderBtn.disabled = false;

        placeOrderBtn.title = "";
        

    }

}
function displayCart() {
    const cartItemsContainer = document.getElementById("cart-items-container"); 
    const cartCount = document.getElementById("cart-count");

    if (!cartItemsContainer) return;

    if (cartCount) {
        cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    } else {
        cartItemsContainer.innerHTML = "";

        cart.forEach(item => {
            cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <h4>${item.name}</h4>
                <p>${item.qty} × ${item.unitPrice.toFixed(3)} OMR</p>
            </div>
            `;
        });
    }

    updateTotals();
    checkMinimumOrder();
}


function updateTotals() {
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.unitPrice * item.qty;
    });

    const deliveryFee = cart.length > 0 ? 0.5 : 0; // matches your HTML's default 0.500 OMR
    document.getElementById("subtotal").textContent = `${subtotal.toFixed(3)} OMR`;
    document.getElementById("delivery-fee").textContent = `${deliveryFee.toFixed(3)} OMR`; // was "deliveryFee"
    document.getElementById("total-price").textContent = `${(subtotal + deliveryFee).toFixed(3)} OMR`; // was "total"
}


if (restaurantContainer && searchInput) {
    getRestaurant();
} else if (menuContainer) {
    // We're on menu.html
    getMenuItems();
}



// ==============================================================================================
//                              ORDER PAGE 
// ==============================================================================================


const placeOrderBtn = document.querySelector(".place-order-btn");

if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", checkout);
}

async function checkout() {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }


    try {

        const customerId = Number(2);
        // Create Order
        const order = await api(
            `/orders/customer/${customerId}/restaurant/${restaurantId}`,
            {
                method: "POST"
            }
        );

        const orderId = order.id;

        // Build List
        const orderItems = [];

        for (const item of cart) {

            orderItems.push({
                menuItemId: item.menuItemId,
                quantity: item.qty,
                specialInstructions: ""
            });

        }
        console.log(orderItems);

        //  Send all items in one request
        await api(
            `/orders/${orderId}/items`,
            {
                method: "POST",
                body: orderItems
            }
        );

        //  Confirm Order
        await api(
            `/orders/${orderId}/confirm`,
            {
                method: "PUT"
            }
        );

        // Redirect
        window.location.href = `track.html?orderId=${orderId}`;

    } catch (error) {

        console.error(error);
        alert(error.message);

    }

}


// ==============================================================================================
//                              Admin Dashboard Page
// ==============================================================================================
 
const CONFIG = { BASE_URL: "",
     RESTAURANT_ID: 1,
     FIELDS: {
        summary: {
            orders: "totalOrders",
            revenue: "totalRevenue",
            average: "averageOrder",
            cancelRate: "cancellationRate",
            hours: "busiestHours",   
        },
        customer: {
            name: "name",
            points: "loyaltyPoints",
        },
        driver: {
            name: "name",
            completed: "completedOrders",
            rating: "rating",
        },
    },
};
 
// ============================================================
// Helper functions (admin dashboard)
// ============================================================
async function fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Request failed (${res.status}): ${url}`);
    }
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text; 
    }
}
 
function formatDate(date) {
    // yyyy-MM-dd
    return date.toISOString().split("T")[0];
}
 
function showAdminError(msg) {
    const box = document.getElementById("errorMessage");
    if (!box) return;
    box.textContent = msg;
    box.classList.remove("hidden");
}
 
function hideAdminError() {
    const box = document.getElementById("errorMessage");
    if (!box) return;
    box.classList.add("hidden");
    box.textContent = "";
}
 
function get(obj, path, fallback = 0) {
    return obj && obj[path] !== undefined ? obj[path] : fallback;
}
 
// ============================================================
// Render the top summary cards 
// ============================================================
function renderSummaryCards(summary) {
    const f = CONFIG.FIELDS.summary;
 
    document.getElementById("ordersCount").textContent =
        get(summary, f.orders, 0);
 
    document.getElementById("revenue").textContent =
        `${get(summary, f.revenue, 0)} OMR`;
 
    document.getElementById("averageOrder").textContent =
        `${get(summary, f.average, 0)} OMR`;
 
    document.getElementById("cancelRate").textContent =
        `${get(summary, f.cancelRate, 0)}%`;
}
 
// ============================================================
// Render the "Busiest Hours" bar chart
// ============================================================
function renderBusiestHours(hoursData) {
    const container = document.getElementById("hoursChart");
    container.innerHTML = "";
 
    if (!Array.isArray(hoursData) || hoursData.length === 0) {
        container.innerHTML = `<p class="empty-state">No data available for this day</p>`;
        return;
    }
 
    const maxCount = Math.max(...hoursData.map((h) => h.count || 0));
 
    const chartRow = document.createElement("div");
    chartRow.style.display = "flex";
    chartRow.style.alignItems = "flex-end";
    chartRow.style.gap = "12px";
    chartRow.style.height = "220px";
 
    hoursData.forEach((h) => {
        const col = document.createElement("div");
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.alignItems = "center";
        col.style.justifyContent = "flex-end";
        col.style.height = "100%";
 
        const barHeight = maxCount > 0 ? (h.count / maxCount) * 180 : 0;
 
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = `${barHeight}px`;
 
        const label = document.createElement("span");
        label.textContent = h.hour;
        label.style.marginTop = "6px";
        label.style.fontSize = "var(--fs-cap)";
        label.style.color = "var(--muted)";
 
        col.appendChild(bar);
        col.appendChild(label);
        chartRow.appendChild(col);
    });
 
    container.appendChild(chartRow);
}
 
// ============================================================
// Render the top loyalty customers list
// ============================================================
function renderCustomers(customers) {
    const f = CONFIG.FIELDS.customer;
    const container = document.getElementById("customersList");
    container.innerHTML = "";
 
    if (!Array.isArray(customers) || customers.length === 0) {
        container.innerHTML = `<p class="empty-state">No customers found</p>`;
        return;
    }
 
    customers.forEach((c) => {
        const row = document.createElement("div");
        row.className = "customer";
        row.innerHTML = `
            <span class="customer-name">${get(c, f.name, "—")}</span>
            <span class="customer-points">${get(c, f.points, 0)} pts</span>
        `;
        container.appendChild(row);
    });
}
 
// ============================================================
// Render the driver leaderboard table
// ============================================================
function renderDrivers(drivers) {
    const f = CONFIG.FIELDS.driver;
    const tbody = document.getElementById("driverTable");
    tbody.innerHTML = "";
 
    if (!Array.isArray(drivers) || drivers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">No drivers found</td></tr>`;
        return;
    }
 
    drivers.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${get(d, f.name, "—")}</td>
            <td>${get(d, f.completed, 0)}</td>
            <td>⭐ ${get(d, f.rating, 0)}</td>
        `;
        tbody.appendChild(tr);
    });
}
 
// ============================================================
// Load all dashboard data for a given date
// ============================================================
async function loadDashboard(dateStr) {
    hideAdminError();
 
    try {
        const [summary, customers, drivers] = await Promise.all([
            fetchData(
                `${CONFIG.BASE_URL}/api/reports/platform/daily-summary?date=${dateStr}`
            ),
            fetchData(`${CONFIG.BASE_URL}/api/reports/customers/top-loyalty`),
            fetchData(`${CONFIG.BASE_URL}/api/reports/drivers/leaderboard`),
        ]);
 
        renderSummaryCards(summary);
        renderBusiestHours(get(summary, CONFIG.FIELDS.summary.hours, []));
        renderCustomers(customers);
        renderDrivers(drivers);
    } catch (err) {
        console.error(err);
        showAdminError(
            "Could not load dashboard data. Make sure the server is running and the URL is correct."
        );
    }
}
 
// ============================================================
// Entry point (admin dashboard)
// ============================================================
function initAdminDashboard() {
    const dateInput = document.getElementById("reportDate");
 
    if (!dateInput) return;
    const today = formatDate(new Date());
    
    dateInput.value = today;
 
    loadDashboard(today);
 
    dateInput.addEventListener("change", (e) => {
        if (e.target.value) {
            loadDashboard(e.target.value);
        }
    });
}
 
document.addEventListener("DOMContentLoaded", initAdminDashboard);