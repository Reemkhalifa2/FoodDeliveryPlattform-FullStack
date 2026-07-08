// ==============================================================================================
//                              Resturant JS
// ==============================================================================================

const restaurantContainer = document.getElementById("container");
const loading = document.getElementById("loading");
const message = document.getElementById("errorMessage");
const searchInput = document.getElementById("searchInput");

let allRestaurants = [];
let searchTimeout;

// ================================
// UI State Changers
// ================================

// Renders 6-8 animated placeholder skeletons
function showLoadingSkeletons() {
    message.textContent = "";
    restaurantContainer.innerHTML = "";
    
    let skeletonHTML = "";
    for (let i = 0; i < 8; i++) {
        skeletonHTML += `
            <div class="card skeleton-card">
            </div>
        `;
    }
    restaurantContainer.innerHTML = skeletonHTML;
}

function showEmptyState(text = "No restaurants match your search.") {
    restaurantContainer.innerHTML = `
        <div class="card skeleton-card">
            <img src="images/empty-icon.png" alt="No results" class="empty-icon" onerror="this.style.display='none'">
            <p class="empty-text">${text}</p>
        </div>
    `;
}

function showErrorBanner(retryFunctionText) {
    restaurantContainer.innerHTML = ""; // Clear skeletons
    message.innerHTML = `
        <div class="error-banner">
            <span>Failed to load</span>
            <button class="retry-btn" onclick="${retryFunctionText}">
                Retry
            </button>
        </div>
    `;
}

// ================================
// Fetch All Restaurants
// ================================

async function getRestaurant() {
    showLoadingSkeletons();

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

// ================================
// Display Restaurants
// ================================
function displayRestaurants(restaurants) {
    // Clear skeletons/previous content
    restaurantContainer.innerHTML = ""; 
    message.innerHTML = "";

    if (!restaurants || restaurants.length === 0) {
        showEmptyState();
        return;
    }

    // Build HTML string entirely first to optimize DOM performance
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
                <span class="badge-category">
                    ${rest.cuisineType}
                </span>
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

// ================================
// Cuisine Filter (Backend)
// ================================
const chips = document.querySelectorAll(".chip");

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
                restaurants = await api(
                    `/restaurants/cuisine/${encodeURIComponent(cuisine)}`
                );
            }

            displayRestaurants(restaurants);
        } catch (error) {
            console.error(error);
            showErrorBanner(`document.querySelector('.chip--active').click()`);
        }
    });
});

// ================================
// Search (Backend + 300ms Debounce)
// ================================
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
            const page = await api(
                `/restaurants/search?keyword=${encodeURIComponent(keyword)}&page=0&size=10`
            );

            // Handle backend page structures safely
            const results = page.content || page; 
            displayRestaurants(results);
        } catch (error) {
            console.error(error);
            showErrorBanner(`searchInput.dispatchEvent(new Event('input'))`);
        }
    }, 300);
});

// ================================
// Initial Load
// ================================
getRestaurant();




// ==============================================================================================
//                              Resturant JS
// ==============================================================================================


// ==============================================================================================
//                               Menu JS
// ==============================================================================================

// ================================
// Navigate to Menu Page
// ================================

// View Menu
restaurantContainer.addEventListener("click", (event) => {

    if (event.target.classList.contains("btn-menu")) {

        const restaurantId = event.target.dataset.id;

        window.location.href = `Menu.html?id=${restaurantId}`;

    }

});


const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get('id');
async function loadRestaurantMenu() {
    if (!restaurantId) {
        console.error("No restaurant ID provided in the URL!");
        return;
    }

    try {
        const menuItems = await api(`/restaurants/${id}/menu`);
        console.log(menuItems);

        const combos = await api(`/restaurants/${id}/combos`);
        console.log(combos);
        
        // Now you can run your displayMenu(menuData) logic here!
    } catch (error) {
        showErrorBanner("Failed to load menu");
        console.error("Failed to load menu:", error);
    }
}


function displayMenu(menuItems) {

    menuContainer.innerHTML = "";

    if (menuItems.length === 0) {
        menuContainer.innerHTML = "<p>No menu items found</p>";
        return;
    }

    menuItems.forEach(item => {

        menuContainer.innerHTML += `

        <div class="menu-card">

            <h3>${item.name}</h3>

            <p>${item.description ?? ""}</p>

            <strong>
                ${item.price} OMR
            </strong>

            <button 
                class="btn-menu add-cart"
                data-id="${item.id}">
                Add
            </button>

        </div>

        `;
    });


    // Use the class here
    document.querySelectorAll(".add-cart").forEach(button => {

        button.addEventListener("click", () => {

            const itemId = button.dataset.id;

            console.log("Add item:", itemId);

            // call your add to cart function here
            // addToCart(itemId);

        });

    });
}
// ========================================================
// Cart Management System
// ========================================================

let cart = [];

// Add item to cart
function addToCart(id, name, price) {


    const existingItem = cart.find(
        item => item.id === id
    );

    if (existingItem) {
        existingItem.quantity += 1;

    } else {
        cart.push({

            id: id,
            name: name,
            price: price,
            quantity: 1

        });
    }


    updateCartUI();

}

// Increase / Decrease quantity
function changeQuantity(id, action) {
    const item = cart.find(
        item => item.id === id
    );
    if (!item) return;
    if (action === "increase") {
        item.quantity += 1;
    }
    if (action === "decrease") {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            cart = cart.filter(
                item => item.id !== id
            );
        }

    }

    updateCartUI();
}

// Remove item
function removeItem(id) {
    cart = cart.filter(
        item => item.id !== id
    );

    updateCartUI();
}

// Update Cart UI
function updateCartUI() {
    const cartItems =
        document.getElementById("cartItems");
    let subtotal = 0;
    const deliveryFee = 0.500;
    if (cartItems) {
        cartItems.innerHTML = "";
        if (cart.length === 0) {
            cartItems.innerHTML = `

                <p class="empty-cart">
                    Your cart is empty.
                </p>

            `;
        } else {

            cart.forEach(item => {

                subtotal +=
                item.price * item.quantity;

                cartItems.innerHTML += `
                <div class="cart-item">
                    <div>
                        <p class="cart-item-name">
                            ${item.name}
                        </p>
                        <p class="cart-item-price">
                            ${(item.price * item.quantity).toFixed(3)} OMR
                        </p>
                    </div>

                    <div class="quantity-control">

                        <button 
                        onclick="changeQuantity(${item.id}, 'decrease')">
                            -
                        </button>


                        <span>
                            ${item.quantity}
                        </span>

                        <button 
                        onclick="changeQuantity(${item.id}, 'increase')">
                            +
                        </button>

                    </div>

                </div>

                `;

            });

        }


    } else {

        cart.forEach(item => {
            subtotal += item.price * item.quantity;

        });

    }




function displayCombos(combos){


    comboContainer.innerHTML = "";


    combos.forEach(combo => {


        comboContainer.innerHTML += `


        <div class="menu-card">


            <h3>
                ${combo.name}
            </h3>


            <p>
                ${combo.description ?? ""}
            </p>


            <strong>
                ${combo.price} OMR
            </strong>


        </div>


        `;


    });


}



loadRestaurantMenu();

    const total =
    subtotal > 0
    ? subtotal + deliveryFee
    : 0;

    const subtotalElement =
    document.getElementById("subtotal");

    const deliveryElement =
    document.getElementById("deliveryFee");


    const totalElement =
    document.getElementById("total");


    if (subtotalElement) {


        subtotalElement.innerText =
        subtotal.toFixed(3) + " OMR";


    }



    if (deliveryElement) {


        deliveryElement.innerText =
        (subtotal > 0 ? deliveryFee : 0)
        .toFixed(3) + " OMR";


    }



    if (totalElement) {


        totalElement.innerText =
        total.toFixed(3) + " OMR";


    }


}
