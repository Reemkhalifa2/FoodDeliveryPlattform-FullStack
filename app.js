const restaurantContainer = document.getElementById("container");
const loading = document.getElementById("loading");
const message = document.getElementById("errorMessage");

async function getRestarunt() {

    loading.style.display = "flex";
    message.textContent = "";
    restaurantContainer.innerHTML = "";

    try {

        const restaurants = await api("/restaurants");

        loading.style.display = "none";

        if (restaurants.length === 0) {
            message.textContent = "No restaurants found";
            return;
        }

        restaurants.forEach(rest => {

            restaurantContainer.innerHTML += `
                 <div class="card" id="card">
            <div class="card-image">
                <span class="badge ${rest.acceptingOrders ? 'badge-open' : 'badge-closed'}">
                    ${rest.acceptOrder ? 'Open' : 'Closed'}
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

                <span class="badge-category">${rest.cuisineType}</span>

                <div class="stats-row">
                    <div>
                        <p class="stat-label">Delivery</p>
                        <p class="stat-value">${rest.deliveryFee}</p>
                    </div>
                    <div>
                        <p class="stat-label">Min</p>
                        <p class="stat-value">${rest.minOrderAmount}</p>
                    </div>
                </div>

                <button class="btn-menu" id="menu">View Menu</button>
            </div>
        </div>
            `;
        });

    } catch (error) {

        loading.style.display = "none";
        message.textContent = error.message;

        console.error(error);
    }
}

getRestarunt();