
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Food menu stored in an array of objects
const menu = [
    { id: 1, name: "Veg Burger", price: 99, category: "Burger" },
    { id: 2, name: "Cheese Pizza", price: 199, category: "Pizza" },
    { id: 3, name: "French Fries", price: 79, category: "Snacks" },
    { id: 4, name: "Pasta", price: 149, category: "Pasta" },
    { id: 5, name: "Veg Sandwich", price: 89, category: "Snacks" },
    { id: 6, name: "Cold Coffee", price: 69, category: "Drinks" }
];

// Orders are stored in memory for this practical
const orders = [];
let nextOrderId = 1;

// GET: Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET: Return food menu as JSON
app.get("/api/menu", (req, res) => {
    res.json({
        success: true,
        menu: menu
    });
});

// GET: Return placed orders
app.get("/api/orders", (req, res) => {
    res.json({
        success: true,
        count: orders.length,
        orders: orders
    });
});

// POST: Validate and place an order
app.post("/api/orders", (req, res) => {
    const { customerName, mobile, address, items } = req.body;
    const errors = [];

    // Validate customer name
    if (
        typeof customerName !== "string" ||
        customerName.trim().length < 2 ||
        customerName.trim().length > 60 ||
        !/^[a-zA-Z ]+$/.test(customerName.trim())
    ) {
        errors.push("Enter a valid name using 2–60 letters and spaces.");
    }

    // Validate mobile number
    if (
        typeof mobile !== "string" ||
        !/^[6-9]\d{9}$/.test(mobile)
    ) {
        errors.push("Enter a valid 10-digit Indian mobile number.");
    }

    // Validate delivery address
    if (
        typeof address !== "string" ||
        address.trim().length < 10 ||
        address.trim().length > 200
    ) {
        errors.push("Address must contain 10–200 characters.");
    }

    // Validate cart
    if (!Array.isArray(items) || items.length === 0) {
        errors.push("Your cart is empty. Add food items first.");
    } else if (items.length > menu.length) {
        errors.push("Too many different items in the order.");
    }

    let orderItems = [];
    let total = 0;

    // Check item IDs and quantities using server-side menu prices
    if (Array.isArray(items) && items.length > 0) {
        const seenIds = new Set();

        for (const item of items) {
            if (
                !item ||
                !Number.isSafeInteger(item.id) ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 20
            ) {
                errors.push("Each item needs a valid ID and quantity from 1 to 20.");
                break;
            }

            if (seenIds.has(item.id)) {
                errors.push("Duplicate food items are not allowed in the cart data.");
                break;
            }

            seenIds.add(item.id);

            const food = menu.find(food => food.id === item.id);

            if (!food) {
                errors.push(`Food item ID ${item.id} does not exist.`);
                break;
            }

            const subtotal = food.price * item.quantity;

            orderItems.push({
                id: food.id,
                name: food.name,
                price: food.price,
                quantity: item.quantity,
                subtotal: subtotal
            });

            total += subtotal;
        }
    }

    // Return validation errors
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Please correct the following errors.",
            errors: errors
        });
    }

    // Create the order on the server
    const order = {
        orderId: nextOrderId++,
        customerName: customerName.trim(),
        mobile: mobile,
        address: address.trim(),
        items: orderItems,
        total: total,
        status: "Confirmed",
        createdAt: new Date().toISOString()
    };

    orders.push(order);

    return res.status(201).json({
        success: true,
        message: "Your order has been placed successfully!",
        order: order
    });
});

// Handle unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`FoodieHub server running at http://localhost:${PORT}`);
});
