const restaurantContainer = document.getElementById("container");
const loading = document.getElementById("loading");
const message = document.getElementById("errorMessage");
const searchInput = document.getElementById("searchInput");

let allRestaurants = [];
let searchTimeout;

// ================================
// Fetch All Restaurants
// ================================
async function getRestaurant() {

    loading.style.display = "flex";
    message.textContent = "";
    restaurantContainer.innerHTML = "";

    try {

        allRestaurants = await api("/restaurants");

        loading.style.display = "none";

        if (allRestaurants.length === 0) {
            message.textContent = "No restaurants found.";
            return;
        }

        displayRestaurants(allRestaurants);

    } catch (error) {

        // Hide Loading
        loding.style.display = "none";

        // Error Banner
        message.innerHTML = `
            <div class="error-banner">
                <span>Failed to load restaurants.</span>

                <button class="retry-btn" onclick="getRestarunt()">
                    Retry
                </button>
            </div>
        `;

        console.error(error);
    }
}

// ================================
// Display Restaurants
// ================================
function displayRestaurants(restaurants) {

    restaurantContainer.innerHTML = "";

    if (restaurants.length === 0) {

        restaurantContainer.innerHTML =
            "<p class='empty-message'>No restaurants found.</p>";

        return;
    }

    restaurants.forEach(rest => {

        restaurantContainer.innerHTML += `
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
}

// ================================
// Cuisine Filter (Backend)
// ================================
const chips = document.querySelectorAll(".chip");

chips.forEach(chip => {

    chip.addEventListener("click", async () => {

        chips.forEach(c =>
            c.classList.remove("chip--active")
        );

        chip.classList.add("chip--active");

        const cuisine = chip.dataset.cuisine;

        loading.style.display = "flex";

        try {

            let restaurants;

            if (cuisine === "All") {

                restaurants = await api("/restaurants");

            } else {

                restaurants = await api(
                    `/restaurants/cuisine/${encodeURIComponent(cuisine)}`
                );

            }

            loading.style.display = "none";

            displayRestaurants(restaurants);

        } catch (error) {

            loading.style.display = "none";
            message.textContent = error.message;
        }

    });

});

// ================================
// Search (Backend + 300ms Debounce)
// ================================
// ================================
// Search (Backend + 300ms Debounce)
// ================================
searchInput.addEventListener("input", () => {

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {

        const keyword = searchInput.value.trim();

        try {

            if (keyword === "") {
                displayRestaurants(allRestaurants);
                return;
            }

            const page = await api(
                `/restaurants/search?keyword=${encodeURIComponent(keyword)}&page=0&size=10`
            );

            displayRestaurants(page.content);

        } catch (error) {

            console.error(error);
            message.textContent = error.message;

        }

    }, 300);

});

// ================================
// Initial Load
// ================================
getRestaurant();