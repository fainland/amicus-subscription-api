// Load environment variables from .env file in local development (Replit uses Secrets, Render uses Environment Variables)
// This line is primarily for local development using 'dotenv' package, not strictly needed in Replit/Render as they handle env vars.
// if (process.env.NODE_ENV !== 'production') {
//     require('dotenv').config();
// }

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors'); // Import the cors middleware

const app = express();
const port = process.env.PORT || 3000; // Replit/Render will set process.env.PORT

// --- Supabase Configuration ---
// These will come from environment variables set in Replit's Secrets or Render's Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure Supabase credentials are provided
if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_ANON_KEY not provided. Please set them in your hosting environment's secrets/environment variables.");
    process.exit(1); // Exit if critical environment variables are missing
}

// ----- TEMPORARY DEBUGGING CODE for Supabase Key (REMOVE IN PRODUCTION) -----
console.log("Supabase URL (from env):", supabaseUrl ? "Loaded" : "Not Loaded");
console.log("Supabase Key (from env):", supabaseKey ? "Loaded and has a value" : "Not Loaded or empty");
if (supabaseKey) {
    console.log("Supabase Key starts with:", supabaseKey.substring(0, 10) + "...");
    console.log("Supabase Key ends with:", "..." + supabaseKey.slice(-10));
    console.log("Supabase Key length:", supabaseKey.length);
}
// ----- END TEMPORARY DEBUGGING CODE -----

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Middleware ---
// Enable CORS for all routes - IMPORTANT for Wix integration
// In production, change 'origin' to your specific Wix domain for better security.
const corsOptions = {
    origin: '*', // For development, allow all. In production, change to 'https://your-wix-domain.com'
    methods: ['POST'], // Only allow POST requests
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));

app.use(express.json()); // Middleware to parse JSON request bodies

// --- Routes ---

// 1. Root/Health Check Route (Optional but good practice)
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Amicus Subscription API is running!' });
});

// 2. Subscription Endpoint - MODIFIED FOR TEST_ENTRIES TABLE
app.post('/subscribe', async (req, res) => {
    // Log the received request body for debugging
    console.log("Received request body:", req.body);

    // For this test, we are not using email/phone_number/subscription_type from the request body
    // as the target table 'test_entries' only has 'data_value'
    // We'll just create a simple entry for testing purposes.

    try {
        // Prepare the data to insert into the 'test_entries' table
        const insertData = {
            data_value: `Test entry from API at ${new Date().toISOString()}` // A simple string for the 'data_value' column
        };

        // Perform the insert operation into the 'test_entries' table
        const { data, error } = await supabase
            .from('test_entries') // <<< IMPORTANT: Changed table name to 'test_entries'
            .insert([insertData])
            .select(); // Use .select() to get back the inserted row if needed

        if (error) {
            // Log the full Supabase error object for debugging
            console.error('Full Supabase insert error object:', error);

            // Handle specific Supabase errors, e.g., unique constraint violation (less likely for 'test_entries' unless configured)
            if (error.code === '23505') { // PostgreSQL unique violation error code
                return res.status(409).json({ success: false, message: 'This entry already exists (unique constraint violation).' });
            }
            return res.status(500).json({ success: false, message: 'Failed to insert data due to a database error.', details: error.message });
        }

        console.log('New test entry added:', data);
        res.status(200).json({ success: true, message: 'Test entry successful!', data: data });

    } catch (err) {
        console.error('Server error during test entry insertion:', err);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred during test insertion.' });
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Amicus Subscription API listening on port ${port}`);
});