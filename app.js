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
            <h3 class="menu-card__name ${!item.isAvailable ? "unavailable-name" : ""}">
                ${item.comboName}
            </h3>
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
//                               CHECKOUT  
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
            console.log("Checking cart item mapping:", item);
            orderItems.push({
                menuItemId:Number(item.menuItemId),
                quantity: Number(item.qty),
                specialInstructions: ""
            });
        }

        
        // Send all items in one request
        console.log(orderItems)

        await api(
            `/orders/${orderId}/items`,
            {
                method: "POST",
                body: orderItems
            }
        );

        // FIX: Corrected template literal from {orderId} to ${orderId}
        await api(
            `/deliveries/order/${orderId}/assign-auto`, {
                method: "POST",
            }
        );

        // Confirm Order
        
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
//                               ORDER PAGE  
// ==============================================================================================
// 1. Parse URL parameters to get the current order ID
const orderParams = new URLSearchParams(window.location.search);
const orderId = orderParams.get("orderId");

// 2. Global State Variables
let order = null;
let timeline = [];
let eta = null;

let pollInterval = null;
let countdownInterval = null;

// 3. DOM Elements Selector
const orderNumberNode = document.getElementById("orderNumber");
const restaurantNameNode = document.getElementById("restaurantName");
const countdownNode = document.getElementById("countdown");

const pendingNode = document.getElementById("pending");
const preparingNode = document.getElementById("preparing");
const readyNode = document.getElementById("ready");
const deliveredNode = document.getElementById("delivered");

const pendingTimeNode = document.getElementById("pendingTime");
const preparingTimeNode = document.getElementById("preparingTime");
const readyTimeNode = document.getElementById("readyTime");
const deliveredTimeNode = document.getElementById("deliveredTime");

const orderItemsNode = document.getElementById("orderItems");
const totalNode = document.getElementById("total");

const driverNameNode = document.getElementById("driverName");
const vehicleNode = document.getElementById("vehicle");
const driverStatusNode = document.getElementById("driverStatus");

/**
 * Main function to fetch all required order data from the API
 */
async function loadOrder() {
    if (!orderId) {
        console.error("No orderId found in the URL parameter.");
        return;
    }

    try {
        const [orderData, timelineData, etaData] = await Promise.all([
            api(`/orders/${orderId}`),
            api(`/orders/${orderId}/timeline`),
            api(`/orders/${orderId}/eta`)
        ]);

        order = orderData;
        console.log(order);
        timeline = timelineData;
        eta = etaData;
        console.log(eta);


        renderOrder();

        if (!pollInterval) {
            pollInterval = setInterval(loadOrder, 10000);
        }

    } catch (error) {
        console.error("Error loading order tracking data:", error);
    }
}

/**
 * Main coordinator function to update the dashboard UI components
 */
function renderOrder() {
    // Basic Details
    console.log(`${order.orderCode}`);
    orderNumberNode.textContent = `${order.orderCode}`;
    restaurantNameNode.textContent = `${order.restaurant}`;

    // Item Layout & Calculations
    renderItems();
    renderTotal();

    // Timeline Progression Tracker
    renderTimeline();

    // Driver Block Details
    renderDriver();

    // Visual Countdown Engine
    startCountdown();
}

/**
 * Clears and populates item rows to match the strict CSS design structure
 */
function renderItems() {
    orderItemsNode.innerHTML = "";
console.log("Order items:", order.orderItems);
    if (!order.orderItems || order.orderItems.length === 0) return;

    order.orderItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-row";

        div.innerHTML = `
            <span>${item.name } ×${item.quantity}</span>
            <span>${parseFloat(item.unitPrice).toFixed(3)}</span>
        `;

        orderItemsNode.appendChild(div);
    });
}

/**
 * Updates the order aggregate total pricing view
 */
function renderTotal() {
    const amount = parseFloat(order.totalPrice || order.totalAmount).toFixed(3);
    totalNode.textContent = `${amount} OMR`;
}

/**
 * Evaluates the status workflow engine, applies structural CSS state variations 
 * ('completed', 'current'), and injects the corresponding time stamp data.
 */
function renderTimeline() {
    const status = order.status.toUpperCase();

    // Reset helper to clear existing style variations cleanly before fresh rendering cycle
    const steps = [pendingNode, preparingNode, readyNode, deliveredNode];
    steps.forEach(step => step.classList.remove("completed", "current"));

    // Extract dynamic milestone times from timeline data payload safely
    const times = {
        PENDING: "--",
        PREPARING: "--",
        READY: "--",
        DELIVERED: "--"
    };

    if (Array.isArray(timeline)) {
        timeline.forEach(event => {
            if (times.hasOwnProperty(event.status.toUpperCase())) {
                times[event.status.toUpperCase()] = event.time; // Format expected: 'HH:MM'
            }
        });
    }

    // Assign text nodes inside timeline steps safely
    pendingTimeNode.textContent = times.PENDING;
    preparingTimeNode.textContent = times.PREPARING;
    readyTimeNode.textContent = times.READY;
    deliveredTimeNode.textContent = times.DELIVERED;

    // Linear Progression State Engine matching design workflow criteria
    if (status === "PENDING") {
        pendingNode.classList.add("current");
    } else if (status === "PREPARING") {
        pendingNode.classList.add("completed");
        preparingNode.classList.add("current");
    } else if (status === "READY") {
        pendingNode.classList.add("completed");
        preparingNode.classList.add("completed");
        readyNode.classList.add("current");
    } else if (status === "DELIVERED") {
        pendingNode.classList.add("completed");
        preparingNode.classList.add("completed");
        readyNode.classList.add("completed");
        deliveredNode.classList.add("current");
        
        // Stop real-time polling cycles once order delivery cycle closes fully
        clearInterval(pollInterval);
        clearInterval(countdownInterval);
        countdownNode.textContent = "00:00";
    }
}

/**
 * Populates Driver profile configurations safely onto dashboard elements
 */
async function renderDriver() {

    try {
        const delivery = await api(`/deliveries/order/${order.id}`);
        console.log(delivery);
        const driver = delivery.responseDTO;

        if (driver) {
            driverNameNode.textContent =
                driver.firstName || "Unknown Driver";

            vehicleNode.textContent =
                driver.vehiclePlate || "A-12345";

            driverStatusNode.textContent =
                `Status: ${order.status}`;

        } else {
            driverNameNode.textContent = "Assigning...";
            vehicleNode.textContent = "Finding nearby driver";
            driverStatusNode.textContent =
                `Status: ${order.status}`;
        }

    } catch (error) {
        console.error("Error loading driver:", error);

        driverNameNode.textContent = "Assigning...";
        vehicleNode.textContent = "Finding nearby driver";
        driverStatusNode.textContent =
            `Status: ${order.status}`;
    }
}

/**
 * Initializes and loops a real-time tracking standard countdown mechanism (MM:SS)
 */
function startCountdown() {
    clearInterval(countdownInterval);

    if (!eta || order.status.toUpperCase() === "DELIVERED") {
        if (order.status.toUpperCase() === "DELIVERED") {
            countdownNode.textContent = "Delivered";
        } else {
            countdownNode.textContent = "-- ";
        }
        return;
    }

    let remainingMinutes = parseInt(eta, 10);

    function updateDisplay() {

        if (remainingMinutes <= 0) {
            clearInterval(countdownInterval);
            countdownNode.textContent = "Arriving soon";
            return;
        }

        countdownNode.textContent = `${remainingMinutes} min`;

        remainingMinutes--;
    }

    updateDisplay();

    countdownInterval = setInterval(updateDisplay, 60000); // update every minute
}

// 4. Initial Trigger Setup
// 4. Initial Trigger Setup
document.addEventListener("DOMContentLoaded", () => {
    // ONLY run tracking logic if an orderId is actually present in the URL
    if (orderId) {
        loadOrder();
    } else {
        console.log("On index/home page: Tracking logic skipped.");
    }
});
// ==============================================================================================
//                              Admin Dashboard Page
// ==============================================================================================
/* ==========================================================
   Top Loyal Customers
========================================================== */

const loyaltyPanel = document.getElementById("loyalty-panel");

async function loadTopLoyalCustomers() {
    try {
        loyaltyPanel.innerHTML = `
            <div class="loading">
                Loading top loyal customers...
            </div>
        `;

        // Uses your existing api() helper
        const customers = await api("/reports/customers/top-loyalty");

        if (!customers || customers.length === 0) {
            loyaltyPanel.innerHTML = `
                <div class="empty-state">
                    <p>No loyal customers found.</p>
                </div>
            `;
            return;
        }

        loyaltyPanel.innerHTML = `
            <div class="loyalty-list">
                ${customers.map((customer, index) => `
                    <div class="loyalty-card">
                        <div class="loyalty-rank">
                            #${index + 1}
                        </div>

                        <div class="loyalty-info">
                            <h4>${customer.firstName}</h4>
                            <p>${customer.email}</p>
                        </div>

                        <div class="loyalty-stats">
                            

                            <div class="stat">
                                <span class="label">Points</span>
                                <span class="value">${customer.loyaltyPoints}</span>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (err) {
        console.error("Failed to load top loyal customers:", err);

        loyaltyPanel.innerHTML = `
            <div class="error-state">
                Failed to load loyal customers.
            </div>
        `;
    }
}

/* ==========================================================
   Dashboard Initialization
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    loadTopLoyalCustomers();
});


/* ==========================================================
   Driver Leaderboard
========================================================== */

const driverPanel = document.getElementById("driver-panel");

async function loadDriverLeaderboard() {
    if (!driverPanel) return;

    try {
        driverPanel.innerHTML = `
            <p>Loading driver leaderboard...</p>
        `;

        const response = await fetch("http://localhost:8080/api/reports/drivers/leaderboard");

        if (!response.ok) {
            throw new Error("Failed to load driver leaderboard");
        }

        const drivers = await response.json();

        if (!drivers || drivers.length === 0) {
            driverPanel.innerHTML = `
                <p>No driver data available.</p>
            `;
            return;
        }

        driverPanel.innerHTML = `
            <div class="driver-list">
                ${drivers.map((driver, index) => `
                    <div class="driver-card">
                        <div class="driver-rank">
                            #${index + 1}
                        </div>

                        <div class="driver-info">
                            <h4>${driver.firstName}</h4>
                        </div>

                        <div class="driver-stats">
                          
                          
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (error) {
        console.error("Failed to load driver leaderboard:", error);

        driverPanel.innerHTML = `
            <p>Unable to load driver leaderboard.</p>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDriverLeaderboard();
});

async function loadRestaurantRevenue() {
    const revenueElement = document.getElementById("restaurant-revenue");

    if (!revenueElement) return;

    try {
        revenueElement.innerHTML = "Loading...";

        const today = new Date().toISOString().split("T")[0];

        const response = await fetch(
            `http://localhost:8080/api/reports/revenue/restaurant/1?date=${"2026-07-09"}`
        );

        if (!response.ok) {
            throw new Error("Failed to load revenue");
        }

        const revenue = await response.text();

        revenueElement.innerHTML = `
            ${Number(revenue).toFixed(3)}
        `;

    } catch (error) {
        console.error("Failed to load restaurant revenue:", error);

        revenueElement.innerHTML = `
            N/A
        `;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadRestaurantRevenue();
});


/* ==========================================================
   Order Cancellation Rate
========================================================== */

const cancellationElement = document.getElementById("cancellation-rate");


async function loadCancellationRate() {

    if (!cancellationElement) return;

    try {
        cancellationElement.innerHTML = "Loading...";

        const fromDate = "2026-06-27";
        const toDate = "2027-06-28";

        const response = await fetch(
            `http://localhost:8080/api/reports/orders/cancellation-rate?from=${fromDate}&to=${toDate}`
        );

        if (!response.ok) {
            throw new Error("Failed to load cancellation rate");
        }

        const rate = await response.text();

        cancellationElement.innerHTML = `
            ${Number(rate).toFixed(3)}%
        `;

    } catch (error) {
        console.error("Failed to load cancellation rate:", error);

        cancellationElement.innerHTML = "N/A";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadCancellationRate();
});

/* ==========================================================
   Total Orders For Restaurant
========================================================== */

const totalOrdersElement = document.getElementById("restaurant-total-orders");


async function loadRestaurantTotalOrders() {

    if (!totalOrdersElement) return;

    try {
        totalOrdersElement.innerHTML = "Loading...";

        const response = await fetch(
            "http://localhost:8080/api/reports/orders/count/restaurant/1"
        );

        if (!response.ok) {
            throw new Error("Failed to load total orders");
        }

        const totalOrders = await response.text();

        totalOrdersElement.innerHTML = Number(totalOrders).toFixed(3);

    } catch (error) {
        console.error("Failed to load total restaurant orders:", error);

        totalOrdersElement.innerHTML = "N/A";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadRestaurantTotalOrders();
});