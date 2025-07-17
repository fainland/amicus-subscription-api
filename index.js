const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors'); // Import the cors middleware

const app = express();
const port = process.env.PORT || 3000; // Replit will set process.env.PORT

// --- Supabase Configuration ---
// These will come from environment variables set in Replit's Secrets (see Step 4)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure Supabase credentials are provided
if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_ANON_KEY not provided. Please set them in Replit Secrets.");
    process.exit(1); // Exit if critical environment variables are missing
}

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

// 2. Subscription Endpoint
app.post('/subscribe', async (req, res) => {
    const { email, phone_number, subscription_type } = req.body;

    // --- Input Validation ---
    if (!email && !phone_number) {
        return res.status(400).json({ success: false, message: 'Email or Phone Number is required.' });
    }
    if (!subscription_type || !['email', 'sms', 'both'].includes(subscription_type)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing subscription_type. Must be "email", "sms", or "both".' });
    }

    // Basic email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Basic phone number validation (adjust regex for specific international formats if needed)
    // This regex allows digits, spaces, hyphens, parentheses, and a leading plus sign for international
    if (phone_number && !/^\+?[0-9\s-()]+$/.test(phone_number)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
    }

    try {
        // Prepare the data to insert
        const insertData = { subscription_type };
        if (email) insertData.email = email;
        if (phone_number) insertData.phone_number = phone_number;
        insertData.is_active = true; // Default to active

        const { data, error } = await supabase
            .from('subscriptions')
            .insert([insertData])
            .select(); // Use .select() to get back the inserted row if needed

        if (error) {
            // Handle specific Supabase errors, e.g., unique constraint violation
            if (error.code === '23505') { // PostgreSQL unique violation error code
                return res.status(409).json({ success: false, message: 'This email or phone number is already subscribed.' });
            }
            console.error('Supabase insert error:', error);
            return res.status(500).json({ success: false, message: 'Failed to subscribe due to a database error.', details: error.message });
        }

        console.log('New subscription added:', data);
        res.status(200).json({ success: true, message: 'Subscription successful!', data: data });

    } catch (err) {
        console.error('Server error during subscription:', err);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Amicus Subscription API listening on port ${port}`);
});