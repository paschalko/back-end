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
// Handle PUT request to update lesson availability
const { ObjectId } = require("mongodb");

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

        // Insert the order into the "orders" collection
        const result = await ordersCollection.insertOne(order);

        res.status(201).json({
            message: "Order placed successfully",
            orderId: result.insertedId, // Return the inserted order's ID
        });
    } catch (error) {
        console.error("Error placing order:", error.message);
        res.status(500).json({ error: "Unable to place order" });
    }
});


// Handle PUT request to update lesson availability
app.put('/api/lessons/:id', async (req, res) => {
    const { id } = req.params;
    const { Available } = req.body; // Ensure this matches the request body key

    // Check if the Available value is a valid number
    if (typeof Available !== 'number' || Available < 0) {
        return res.status(400).json({ error: 'Invalid available spaces value. Must be a positive number.' });
    }

    try {
        const collection = database.collection('lessons'); // Use the global database variable

        // Update the document with the specified id
        const result = await collection.updateOne(
            { _id: new ObjectId(id) }, // Assuming 'id' is the MongoDB ObjectId
            { $set: { Available } } // Match the exact field name
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Document not found.' });
        }

        res.status(200).json({ message: 'Available spaces updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
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

// Start the database connection
connectToDatabase();
