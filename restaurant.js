const restaurantContainer = document. getElementById("container");
const loding = document.getElementById("loading");
const message= document.getElementById("errorMessage");

async function getRestarunt() {
    loding.style.display = "flex";
    message.textContent = "";
    restaurantContainer.innerHTML= "";

    try {

        const res = await fetch(
            "http://localhost:8080/api/restaurants"
        );

        if (!res.ok)
        {
            throw new Error ("Faile to load");
        }

        const restaurants = await res.json();


        loading.style.display = "none";

        //Empty Error
        if (restaurants.length === 0){
            message.textContent= "No resturant found";

            return;
        }

        restaurants.forEach (rest =>{

            restaurantContainer.innerHTML +=`
                <div class = "card">
                <h3>${rest.name}</h3>

                <p>${rest.description} </p>

                </div>
            `;
        });

    } catch (error){
        // Hide loading
        loadong.style.display = "none";

        // show friendly error
        message.textContent= "please try again";

        console.error(error);
    }
}

getRestarunt();