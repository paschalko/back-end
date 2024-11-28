const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");

// Initialize express app
const app = express();

// Middleware
app.use(morgan("short"));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// MongoDB URI and Client Setup
const uri = "mongodb+srv://ibeanukosi:paschal@cluster0.ye24p.mongodb.net/";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Database variable
let database;

// Connect to the MongoDB database
async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        database = client.db("webstore"); // Replace with your database name
        startServer(); // Start server only after database is connected
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
}

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to our lesson store");
});

// Fetch lessons from MongoDB
app.get("/api/lessons", async (req, res) => {
    try {
        const lessonsCollection = database.collection("lessons");
        const lessons = await lessonsCollection.find({}).toArray();
        res.status(200).json(lessons);
    } catch (error) {
        console.error("Error fetching lessons:", error.message);
        res.status(500).json({ error: "Unable to fetch lessons" });
    }
});

// Handle POST request to save a new order and update availability
app.post("/api/order", async (req, res) => {
    try {
        const { order } = req.body; // Extract order data from the request body

        if (!order || !order.lessons || order.lessons.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }

        const ordersCollection = database.collection("orders");
        const lessonsCollection = database.collection("lessons");

        // Insert the order into the "orders" collection
        const result = await ordersCollection.insertOne(order);

        // Update lesson availability
        const updatePromises = order.lessons.map(async (lesson) => {
            const { id, quantity } = lesson;
            const updatedLesson = await lessonsCollection.findOneAndUpdate(
                { id }, // Match lesson by ID
                { $inc: { Available: -quantity } }, // Decrease availability
                { returnDocument: "after" } // Return the updated document
            );

            if (!updatedLesson.value || updatedLesson.value.Available < 0) {
                throw new Error(
                    `Insufficient availability for lesson with id: ${id}`
                );
            }
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        res.status(201).json({
            message: "Order placed successfully",
            orderId: result.insertedId, // Return the inserted order's ID
        });
    } catch (error) {
        console.error("Error placing order:", error.message);
        res.status(500).json({ error: "Unable to place order" });
    }
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send("Resource not found!");
});

// Function to start the server
function startServer() {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`App has started on port ${PORT}`);
    });
}

app.put("/api/lessons/:id", async (req, res) => {
    try {
        const { id } = req.params; // Extract lesson ID from the URL
        const { quantity } = req.body; // Extract the quantity to update

        if (!id || !quantity) {
            return res.status(400).json({ error: "Invalid data" });
        }

        const lessonsCollection = database.collection("lessons");
        const result = await lessonsCollection.findOneAndUpdate(
            { id }, // Match lesson by ID
            { $inc: { Available: -quantity } }, // Decrease availability
            { returnDocument: "after" } // Return the updated document
        );

        if (!result.value) {
            return res.status(404).json({ error: `Lesson with ID ${id} not found` });
        }

        res.status(200).json({
            message: "Lesson availability updated successfully",
            lesson: result.value,
        });
    } catch (error) {
        console.error("Error updating lesson availability:", error.message);
        res.status(500).json({ error: "Failed to update lesson availability" });
    }
});

// Start the database connection
connectToDatabase();
