
const menuDiv = document.getElementById("menu");
const menuCount = document.getElementById("menu-count");
const cartDiv = document.getElementById("cart-items");
const totalDiv = document.getElementById("cart-total");
const form = document.getElementById("checkout-form");
const messageDiv = document.getElementById("message");
const placeOrderButton = document.getElementById("place-order");
const ordersDiv = document.getElementById("orders-list");

let menu = [];
let cart = [];

const emojiByCategory = {
    Burger: "🍔",
    Pizza: "🍕",
    Snacks: "🍟",
    Pasta: "🍝",
    Drinks: "🥤"
};

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = "message " + type;
}

async function getJSON(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

// Load food menu from the Node.js server
async function loadMenu() {
    try {
        const data = await getJSON("/api/menu");

        menu = data.menu;
        menuCount.textContent = menu.length + " items";

        renderMenu();
    } catch (error) {
        menuDiv.textContent = "Unable to load the menu. Please refresh.";
        menuCount.textContent = "Menu unavailable";
    }
}

// Display food cards
function renderMenu() {
    menuDiv.replaceChildren();

    menu.forEach(food => {
        const card = document.createElement("article");
        card.className = "food-card";

        const emoji = document.createElement("div");
        emoji.className = "food-emoji";
        emoji.textContent = emojiByCategory[food.category] || "🍽️";

        const name = document.createElement("h3");
        name.textContent = food.name;

        const category = document.createElement("p");
        category.textContent = food.category;

        const bottom = document.createElement("div");
        bottom.className = "food-bottom";

        const price = document.createElement("span");
        price.className = "price";
        price.textContent = "₹" + food.price;

        const button = document.createElement("button");
        button.className = "add-btn";
        button.textContent = "Add +";
        button.addEventListener("click", () => addToCart(food.id));

        bottom.append(price, button);
        card.append(emoji, name, category, bottom);
        menuDiv.appendChild(card);
    });
}

// Add food to the cart
function addToCart(id) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        if (existingItem.quantity >= 20) {
            showMessage("Maximum quantity is 20 per food item.", "error");
            return;
        }

        existingItem.quantity++;
    } else {
        cart.push({ id: id, quantity: 1 });
    }

    renderCart();
    showMessage("Food added to your cart.", "success");
}

// Change quantity or remove food
function changeQuantity(id, change) {
    const item = cart.find(item => item.id === id);

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== id);
    } else if (item.quantity > 20) {
        item.quantity = 20;
        showMessage("Maximum quantity is 20.", "error");
    }

    renderCart();
}

// Display cart and calculate total
function renderCart() {
    cartDiv.replaceChildren();

    if (cart.length === 0) {
        cartDiv.textContent = "Your cart is empty.";
    }

    let total = 0;

    cart.forEach(item => {
        const food = menu.find(food => food.id === item.id);
        if (!food) return;

        const subtotal = food.price * item.quantity;
        total += subtotal;

        const row = document.createElement("div");
        row.className = "cart-row";

        const details = document.createElement("div");

        const name = document.createElement("div");
        name.className = "cart-name";
        name.textContent = food.name;

        const sub = document.createElement("div");
        sub.className = "cart-subtotal";
        sub.textContent = "₹" + food.price + " each · Subtotal ₹" + subtotal;

        details.append(name, sub);

        const controls = document.createElement("div");
        controls.className = "quantity-controls";

        const minus = document.createElement("button");
        minus.type = "button";
        minus.textContent = "−";
        minus.setAttribute("aria-label", "Decrease " + food.name);
        minus.addEventListener("click", () => changeQuantity(item.id, -1));

        const quantity = document.createElement("span");
        quantity.textContent = item.quantity;

        const plus = document.createElement("button");
        plus.type = "button";
        plus.textContent = "+";
        plus.setAttribute("aria-label", "Increase " + food.name);
        plus.addEventListener("click", () => changeQuantity(item.id, 1));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-btn";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + food.name);
        remove.addEventListener("click", () => {
            cart = cart.filter(cartItem => cartItem.id !== item.id);
            renderCart();
        });

        controls.append(minus, quantity, plus, remove);
        row.append(details, controls);
        cartDiv.appendChild(row);
    });

    totalDiv.textContent = "₹" + total;
}

// Send checkout data to Node.js for server-side validation
form.addEventListener("submit", async event => {
    event.preventDefault();

    if (cart.length === 0) {
        showMessage("Please add at least one food item.", "error");
        return;
    }

    const orderData = {
        customerName: document.getElementById("customerName").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        address: document.getElementById("address").value.trim(),
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        }))
    };

    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "Placing order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (!response.ok) {
            const errors = Array.isArray(data.errors)
                ? data.errors.join("\n")
                : data.message || "Order could not be placed.";

            showMessage(errors, "error");
            return;
        }

        showMessage(
            data.message + "\nOrder ID: " + data.order.orderId +
            "\nTotal: ₹" + data.order.total,
            "success"
        );

        cart = [];
        renderCart();
        form.reset();

        await loadOrders();
    } catch (error) {
        showMessage(
            "Could not connect to the server. Please try again.",
            "error"
        );
    } finally {
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = "Place Order";
    }
});

// Load recent orders from the server
async function loadOrders() {
    try {
        const data = await getJSON("/api/orders");
        ordersDiv.replaceChildren();

        if (data.orders.length === 0) {
            ordersDiv.textContent = "No orders placed yet.";
            return;
        }

        [...data.orders].reverse().forEach(order => {
            const card = document.createElement("article");
            card.className = "order-card";

            const heading = document.createElement("strong");
            heading.textContent = "Order #" + order.orderId + " — " + order.status;

            const customer = document.createElement("p");
            customer.textContent = "Customer: " + order.customerName;

            const items = document.createElement("p");
            items.textContent = "Items: " + order.items.map(
                item => item.name + " × " + item.quantity
            ).join(", ");

            const total = document.createElement("p");
            total.textContent = "Total: ₹" + order.total;

            card.append(heading, customer, items, total);
            ordersDiv.appendChild(card);
        });
    } catch (error) {
        ordersDiv.textContent = "Unable to load recent orders.";
    }
}

document.getElementById("refresh-orders").addEventListener("click", loadOrders);

loadMenu();
loadOrders();
renderCart();
