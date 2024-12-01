const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const path = require('path');


// Initialize express app
const app = express();

// Middleware
app.use(morgan("short"));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "Front-end")));

 // Serve static files

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

// Search route
app.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: "Search query is required." });
        }

        // Create a regex for case-insensitive matching for text fields
        const regex = new RegExp(query, 'i');  

        // Initialize the search query
        const searchQuery = {
            $or: [
                { subject: { $regex: regex } }, // Case-insensitive search for subject
                { location: { $regex: regex } } // Case-insensitive search for location
            ]
        };

        // Check if the query is a valid number for price or spaces
        const priceQuery = parseFloat(query);
        const spacesQuery = parseInt(query);

        if (!isNaN(priceQuery)) {
            searchQuery.$or.push({ price: priceQuery }); // Match exact price
        }

        if (!isNaN(spacesQuery)) {
            searchQuery.$or.push({ spaces: spacesQuery }); // Match exact spaces
        }

        // Execute the query and retrieve the results
        const lessonsCollection = database.collection('lessons');
        const results = await lessonsCollection.find(searchQuery).toArray();
        
        res.json(results); // Return the results as JSON
    } catch (error) {
        console.error("Error during search:", error);
        res.status(500).json({ message: "An error occurred during search!" });
    }
});


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

//me
// Handle POST request to save a new order and update availability
app.post("/api/order", async (req, res) => {
    try {
        console.log("Received order payload:", req.body);

        const { order } = req.body;

        if (!order || !order.lessons || order.lessons.length === 0) {
            console.log("Invalid order data:", req.body);
            return res.status(400).json({ error: "Invalid order data" });
        }

        const ordersCollection = database.collection("orders");
        const lessonsCollection = database.collection("lessons");

        const result = await ordersCollection.insertOne(order);

        for (const lesson of order.lessons) {
            await lessonsCollection.updateOne(
                { _id: new ObjectId(lesson.id) },
                { $inc: { Available: -lesson.quantity } }
            );
        }

        res.status(201).json({
            message: "Order placed successfully",
            orderId: result.insertedId,
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


app.get('/search', async (req, res) => {
    try {
      
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: "Search query is required." });
        }

        // Case-insensitive search across multiple fields (subject, location, price, spaces)
        const regex = new RegExp(query, 'i');  // Regular expression for case-insensitive matching

        const searchQuery = {
            $or: [
                { subject: { $regex: regex } },
                { location: { $regex: regex } },
            ]
        };

        const priceQuery = parseFloat(query);
        const spacesQuery = parseInt(query);

        // Search by price or spaces if the query is a number
        if (!isNaN(priceQuery)) {
            searchQuery.$or.push({ price: priceQuery });
        }

        if (!isNaN(spacesQuery)) {
            searchQuery.$or.push({ Available: spacesQuery });
        }

        // Execute search query and return the results
        const lessonsCollection = database.collection('lessons');
        const results = await lessonsCollection.find(searchQuery).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error during search:", error);
        res.status(500).json({ message: "An error occurred during search!" });
    }
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send("Resource not f jkdklm;lm;lldbdvgsfrsmakound!!");
});

// Function to start the serverbb
function startServer() {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`App has started on port ${PORT}`);
    });
}


// Start the database connection
connectToDatabase();
