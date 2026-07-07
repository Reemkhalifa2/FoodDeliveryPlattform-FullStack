const restaurantContainer = document.getElementById("container");
const loading = document.getElementById("loading");
const message = document.getElementById("errorMessage");

let allRestaurants = [];

// ================================
// Fetch Restaurants
// ================================
async function getRestaurant() {

    loading.style.display = "flex";
    message.textContent = "";
    restaurantContainer.innerHTML = "";

    try {

        allRestaurants = await api("/restaurants");

        loading.style.display = "none";

        if (!allRestaurants || allRestaurants.length === 0) {
            message.textContent = "No restaurants found.";
            return;
        }

        displayRestaurants(allRestaurants);

    } catch (error) {

        loading.style.display = "none";
        message.textContent = error.message || "Failed to load restaurants.";

        console.error(error);
    }
}

// ================================
// Display Restaurants
// ================================
function displayRestaurants(restaurants) {

    restaurantContainer.innerHTML = "";

    restaurants.forEach(rest => {

        restaurantContainer.innerHTML += `
            <div class="card">

                <div class="card-image">

                    <span class="badge ${
                        rest.acceptingOrders ? "badge-open" : "badge-closed"
                    }">
                        ${rest.acceptingOrders ? "Open" : "Closed"}
                    </span>

                </div>

                <div class="card-body">

                    <div class="title-row">
                        <p class="title">${rest.name}</p>

                        <div class="rating">
                            <img src="images/star.png" alt="star" class="star-icon">
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

                    <button class="btn-menu" data-id="${rest.id}">
                        View Menu
                    </button>

                </div>

            </div>
        `;
    });

    if (restaurants.length === 0) {
        restaurantContainer.innerHTML =
            "<p class='empty-message'>No restaurants match this cuisine.</p>";
    }
}

// ================================
// Cuisine Filter
// ================================
const chips = document.querySelectorAll(".chip");

chips.forEach(chip => {

    chip.addEventListener("click", () => {

        chips.forEach(c => c.classList.remove("chip--active"));

        chip.classList.add("chip--active");

        const cuisine = chip.dataset.cuisine;

        if (cuisine === "All") {

            displayRestaurants(allRestaurants);

        } else {

            const filteredRestaurants = allRestaurants.filter(rest =>
                rest.cuisineType === cuisine
            );

            displayRestaurants(filteredRestaurants);
        }

    });

});

// ================================
// Initial Load
// ================================
getRestaurant();