const restaurantContainer = document.getElementById("container");
const loding = document.getElementById("loading");
const message = document.getElementById("errorMessage");

async function getRestarunt() {

    // Show Loading
    loding.style.display = "flex";
    message.innerHTML = "";
    restaurantContainer.innerHTML = "";

    try {

        const res = await fetch("http://localhost:8080/api/restaurants");

        if (!res.ok) {
            throw new Error("Failed to load");
        }

        const restaurants = await res.json();

        // Hide Loading
        loding.style.display = "none";

        // No Results
        if (restaurants.length === 0) {

            message.className = "no-results";
            message.textContent = "No results found";

            return;
        }

        restaurants.forEach(rest => {

            restaurantContainer.innerHTML += `
                <div class="card">
                    <h3>${rest.name}</h3>
                    <p>${rest.description}</p>
                </div>
            `;

        });

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

getRestarunt();