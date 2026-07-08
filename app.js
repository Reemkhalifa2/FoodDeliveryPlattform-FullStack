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
        <div class="empty-state">
            <img src="images/empty-icon.png" alt="No results" class="empty-icon" onerror="this.style.display='none'">
            <p class="empty-text">${text}</p>
        </div>
    `;
}

function showErrorBanner(retryFunctionText) {
    restaurantContainer.innerHTML = ""; // Clear skeletons
    message.innerHTML = `
        <div class="error-banner">
            <span>Failed to load restaurants.</span>
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