// server.js (Refactored for Firebase Firestore, Auth, Images, Static Serving, SPA Routing)

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWT
const multer = require('multer'); // For handling multipart/form-data (image uploads)
const { Storage } = require('@google-cloud/storage'); // For interacting with Firebase Storage
const path = require('path'); // *** REQUIRED for file path operations ***
const { v4: uuidv4 } = require('uuid'); // For generating unique filenames
// NEW: Import Zod validation schemas and middleware
const { validateRequest, schemas } = require('./validation');


require('dotenv').config();
console.log("Attempting to use Firebase Storage Bucket:", process.env.FIREBASE_STORAGE_BUCKET);

// --- Initialize Firebase Admin ---
// CRITICAL: Ensure 'firebase-service-account-key.json' is SECURE and NOT committed.
try {
    const serviceAccount = require('./firebase-service-account-key.json'); // Adjust path if needed

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log('Firebase Admin SDK Initialized successfully!');

} catch (error) {
    console.error('Firebase Admin SDK Initialization Error:', error);
    console.error("--------------------------------------------------------------------");
    console.error(">>> Ensure 'firebase-service-account-key.json' exists, is valid, and SECURE.");
    console.error(">>> Ensure FIREBASE_STORAGE_BUCKET is set in your .env file.");
    console.error("--------------------------------------------------------------------");
    process.exit(1); // Exit if Firebase initialization fails
}

// --- Firebase Services ---
const db = admin.firestore(); // Firestore Database
const bucket = admin.storage().bucket(); // Firebase Storage Bucket
const FieldValue = admin.firestore.FieldValue; // For server timestamps

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
// MODIFIED: Restrict CORS to specific origins in production
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://your-frontend-domain.com']; // REPLACE with your actual frontend domain(s)

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow headers
    credentials: true // If your frontend sends cookies/auth headers
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Multer Configuration (for Image Uploads) ---
const storage = multer.memoryStorage(); // Using memory storage

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        // Use an Error object to pass messages through Multer's error handling
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit per file
    fileFilter: fileFilter
});

// --- Helper Function for Image Upload to Firebase Storage ---
async function uploadImageToStorage(file) {
    if (!file) return null;

    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    const blob = bucket.file(`listing-images/${uniqueFilename}`); // Store in a folder

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
        resumable: false, // For smaller files, resumable is not needed
    });

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error("Blob stream error:", err);
            reject(`Error uploading file: ${err.message}`);
        });

        blobStream.on('finish', async () => {
            try {
                // Make the file publicly accessible
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                console.log(`File uploaded successfully: ${publicUrl}`);
                resolve(publicUrl);
            } catch (makePublicError) {
                 console.error("Error making file public:", makePublicError);
                 reject(`Error making file public: ${makePublicError.message}`);
            }
        });

        blobStream.end(file.buffer);
    });
}


// --- Authentication Middleware ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (token == null) {
        console.log('Auth Middleware: No token provided.');
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Auth Middleware: Invalid token.', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired.' });
            }
            return res.status(403).json({ message: 'Invalid token.' });
        }
        console.log('Auth Middleware: Token verified for user ID:', user.id);
        req.user = user; // Add user payload (e.g., { id: userId, email: email }) to request object
        next();
    });
};


// --- Authentication Routes ---

// POST /api/auth/register
// MODIFIED: Apply Zod validation
app.post('/api/auth/register', validateRequest(schemas.registerSchema), async (req, res, next) => {
    console.log('Received POST /api/auth/register with body:', req.body);
    try {
        // Zod validation already parsed and cleaned req.body
        const { username, email, password, phone } = req.body;

        // Email uniqueness check
        const existingUser = await db.collection('users').where('email', '==', email.toLowerCase()).get();
        if (!existingUser.empty) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUserRef = await db.collection('users').add({
            username: username,
            email: email.toLowerCase(),
            passwordHash: passwordHash,
            phone: phone || null, // Will be null if not provided or empty string after Zod transform
            createdAt: FieldValue.serverTimestamp(),
            // NEW: Add fullname and avatarUrl fields to user document
            fullname: null, // Can be updated later
            avatarUrl: null, // Can be updated later
        });

        console.log(`User registered successfully: ${email} (ID: ${newUserRef.id})`);

        res.status(201).json({
            message: 'User registered successfully.',
            userId: newUserRef.id,
            email: email.toLowerCase(),
            username: username,
            phone: phone || null // Include phone in response
        });

    } catch (error) {
        console.error('Registration Error:', error);
        next(error); // Pass to centralized error handler
    }
});

// POST /api/auth/login
// MODIFIED: Apply Zod validation
app.post('/api/auth/login', validateRequest(schemas.authSchema), async (req, res, next) => {
    console.log('Received POST /api/auth/login with body:', req.body);
    try {
        // Zod validation already parsed and cleaned req.body
        const { email, password } = req.body;

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

        if (snapshot.empty) {
             console.log(`Login attempt failed: User not found - ${email}`);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        const isMatch = await bcrypt.compare(password, userData.passwordHash);

        if (!isMatch) {
            console.log(`Login attempt failed: Incorrect password - ${email}`);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = { id: userId, email: userData.email };
        // MODIFIED: Increased JWT expiration to 7 days
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token now expires in 7 days
        );

        console.log(`User logged in successfully: ${email} (ID: ${userId})`);

        res.status(200).json({
            message: 'Login successful.',
            token: token,
            user: {
                id: userId,
                email: userData.email,
                username: userData.username,
                // NEW: Include phone and fullname in user data on login
                phone: userData.phone || null,
                fullname: userData.fullname || null,
                avatarUrl: userData.avatarUrl || null,
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        next(error); // Pass to centralized error handler
    }
});

// GET /api/users/me - Get current user's profile
// Keep verifyToken here
app.get('/api/users/me', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userRef = db.collection('users').doc(userId);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const userData = docSnap.data();
        res.json({
            id: docSnap.id,
            username: userData.username,
            email: userData.email,
            fullname: userData.fullname || null,
            phone: userData.phone || null,
            avatarUrl: userData.avatarUrl || null,
            createdAt: userData.createdAt // Make sure createdAt is being returned if needed
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/users/me/offers - Get offers posted by current user
// Keep verifyToken here
app.get('/api/users/me/offers', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const listingsRef = db.collection('listings');
        // This query specifically requires an index on userId and createdAt if not already created.
        // The error message from previous attempts confirms this: "The query requires an index. You can create it here: ..."
        const snapshot = await listingsRef.where('userId', '==', userId).orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            console.log(`No offers found for user ${userId}.`);
            return res.json([]);
        }

        const userListings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Found ${userListings.length} offers for user ${userId}.`);
        res.json(userListings);
    } catch (error) {
        console.error('Error fetching user offers:', error);
        // The specific error '9 FAILED_PRECONDITION: The query requires an index.'
        // will be caught by the centralized error handler below if not handled here.
        next(error); // Pass to centralized error handler
    }
});


// --- API Routes for Listings (Firestore Implementation) ---

// GET all Listings
// MODIFIED: Apply Zod validation for query parameters
app.get('/api/listings', validateRequest(schemas.listingsQuerySchema), async (req, res, next) => {
    console.log('Received GET request to /api/listings (Firestore) with query:', req.query);
    try {
        // Use the validated and defaulted query parameters
        const { offerType, propertyType, location, minPrice, maxPrice, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        let query = db.collection('listings');

        // Flags to track inequality filters
        let inequalityFieldUsed = null;

        // Apply Filters
        if (offerType) query = query.where('offerType', '==', offerType);
        if (propertyType) query = query.where('propertyType', '==', propertyType);

        if (minPrice !== undefined) {
            query = query.where('price', '>=', minPrice);
            inequalityFieldUsed = 'price';
        }
        if (maxPrice !== undefined) {
            query = query.where('price', '<=', maxPrice);
            inequalityFieldUsed = 'price';
        }

        // Search by location address (starts with)
        if (location) {
            if (inequalityFieldUsed && inequalityFieldUsed !== 'location.address') {
                console.warn("Firestore Query Warning: Combining location search with another inequality filter will likely fail without a composite index.");
            }
            query = query.where('location.address', '>=', location)
                         .where('location.address', '<=', location + '\uf8ff');
            inequalityFieldUsed = 'location.address';
        }

        // Basic Search by title (starts with)
        if (search) {
            if (inequalityFieldUsed && inequalityFieldUsed !== 'title') {
                console.warn("Firestore Query Warning: Combining title search with another inequality filter will likely fail without a composite index.");
            }
            query = query.where('title', '>=', search)
                         .where('title', '<=', search + '\uf8ff');
            inequalityFieldUsed = 'title';
        }

        console.log(`Sorting by ${sortBy} ${sortOrder}`);

        // --- IMPORTANT: Firestore OrderBy Logic ---
        // Firestore limitation: If you have an inequality filter (`<`, `<=`, `>`, `>=`) on a field,
        // your first `orderBy` must be on that same field.
        if (inequalityFieldUsed) {
            query = query.orderBy(inequalityFieldUsed, inequalityFieldUsed === sortBy ? sortOrder : 'asc');
            if (inequalityFieldUsed !== sortBy) {
                query = query.orderBy(sortBy, sortOrder);
            }
        } else {
            // No inequality filter, just order by the requested sortBy field
            query = query.orderBy(sortBy, sortOrder);
        }

        // Always add a secondary sort by document ID to ensure consistent results
        query = query.orderBy(admin.firestore.FieldPath.documentId(), 'asc');

        const snapshot = await query.get();

        if (snapshot.empty) {
            console.log('No matching listings found.');
            return res.json([]);
        }

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(listings);

    } catch (err) {
        console.error('Error fetching listings (Firestore):', err);
        if (err.code === 'failed-precondition' && err.message.includes('The query requires an index')) {
            console.error("Firestore query requires an index. Check Firebase console errors for link.");
            return res.status(400).json({ 
                message: 'This filter/sort combination requires a database index. Please create it in Firebase Console.', 
                code: 'INDEX_REQUIRED', 
                details: err.message 
            });
        }
        next(err);
    }
});

// GET a specific Listing by ID
app.get('/api/listings/:id', async (req, res, next) => {
    const listingId = req.params.id;
    console.log(`Received GET request to /api/listings/${listingId} (Firestore)`);
    try {
        if (!listingId || typeof listingId !== 'string' || listingId.length < 5) {
             return res.status(400).json({ message: 'Invalid listing ID format.' });
        }

        const docRef = db.collection('listings').doc(listingId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('Listing not found for ID:', listingId);
            return res.status(404).json({ message: 'Listing not found' });
        }

        console.log('Listing found:', docSnap.data()?.title);
        res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
        console.error(`Error fetching listing ${listingId} (Firestore):`, err);
        next(err);
    }
});


// POST a new Listing (Offer)
app.post('/api/offers', verifyToken, upload.array('images', 5), validateRequest(schemas.newListingSchema), async (req, res, next) => {
    console.log('Received POST request to /api/offers (Firestore)');
    console.log('User ID from token:', req.user.id);
    console.log('Request Body (after Zod):', req.body);
    console.log('Request Files:', req.files);

    try {
        const userId = req.user.id; // User ID from verified JWT

        // Destructure and use validated data from req.body
        const {
            title, price, description, offerType, propertyType, location,
            amenities, bedrooms, bathrooms, area
        } = req.body; // These are already transformed by Zod

        // Handle Image Uploads
        let imageUrls = [];
        if (req.files && req.files.length > 0) { // Check if files exist before uploading
            console.log(`Uploading ${req.files.length} image(s)...`);
            try {
                 imageUrls = await Promise.all(req.files.map(file => uploadImageToStorage(file)));
                 imageUrls = imageUrls.filter(url => url !== null); // Filter out any failed uploads
                 console.log("Uploaded image URLs:", imageUrls);
            } catch (uploadError) {
                console.error("Error during image upload:", uploadError);
                // Important: Let the main error handler deal with this.
                // Multer already handles some file errors.
                return next(new Error(`Image upload failed: ${uploadError.message || uploadError}`));
            }
        }

        // Prepare data for Firestore
        const newListingData = {
            userId: userId, // Link to user
            title: title, //
            price: price, //
            description: description, //
            offerType: offerType, //
            propertyType: propertyType, //
            location: location, // Location is now an object or string from Zod
            bedrooms: bedrooms, //
            bathrooms: bathrooms, //
            squareFeet: area, // Map 'area' to 'squareFeet'
            features: amenities, // Store amenities as 'features' (transformed by Zod)
            imageUrls: imageUrls, //
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // Add the document to Firestore
        const docRef = await db.collection('listings').add(newListingData);
        console.log('Listing saved successfully with ID:', docRef.id);

        // Fetch the created document to return complete data
        const createdDoc = await docRef.get();
        res.status(201).json({ id: createdDoc.id, ...createdDoc.data() });

    } catch (error) {
        console.error('Error creating listing (Firestore):', error);
        next(error); // Pass to centralized error handler
    }
});

// PUT (Update) a specific Listing by ID
app.put('/api/listings/:id', verifyToken, upload.array('images', 5), validateRequest(schemas.updateListingSchema), async (req, res, next) => {
    // Zod validation already parsed and cleaned req.params and req.body
    const listingId = req.params.id;
    const userId = req.user.id;
    console.log(`Received PUT request to /api/listings/${listingId} by User ${userId}`);
    console.log('Request Body (after Zod):', req.body);
    console.log('Request Files:', req.files);

    try {
        const docRef = db.collection('listings').doc(listingId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        const listingData = docSnap.data();

        // Authorization check: Ensure user owns the listing
        if (listingData.userId !== userId) {
            console.warn(`Authorization Failed: User ${userId} attempted update on listing ${listingId} owned by ${listingData.userId}`);
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update this listing.' });
        }

        // Prepare update data using validated and transformed body fields
        const updateData = {};
        const { title, price, description, offerType, propertyType, location, amenities, bedrooms, bathrooms, area, imageUrls: newImageUrlsArray } = req.body;

        if (title !== undefined) updateData.title = title; //
        if (price !== undefined) updateData.price = price; //
        if (description !== undefined) updateData.description = description; //
        if (offerType !== undefined) updateData.offerType = offerType; //
        if (propertyType !== undefined) updateData.propertyType = propertyType; //
        if (location !== undefined) updateData.location = location; //
        if (amenities !== undefined) updateData.features = amenities; // Zod transforms amenities to features
        if (bedrooms !== undefined) updateData.bedrooms = bedrooms; //
        if (bathrooms !== undefined) updateData.bathrooms = bathrooms; //
        if (area !== undefined) updateData.squareFeet = area; // Map 'area' to 'squareFeet'

        // Handle new image uploads
        if (req.files && req.files.length > 0) { //
             console.log(`Updating images for listing ${listingId}...`); //
             try {
                 // TODO: Option to delete old images (more complex: need to query existing image URLs and delete from bucket)
                 // For now, new uploads will replace existing ones entirely or append.
                 // If you want to append, you'd fetch current listingData.imageUrls and concat.
                 // Zod schema now allows imageUrls array, so just use what Multer uploaded.
                 const newlyUploadedUrls = await Promise.all(req.files.map(file => uploadImageToStorage(file)));
                 updateData.imageUrls = newlyUploadedUrls.filter(url => url !== null);
                 console.log("Newly uploaded image URLs:", updateData.imageUrls);
             } catch (uploadError) {
                 console.error("Error during image upload for update:", uploadError);
                 return next(new Error(`Failed to upload images for update: ${uploadError.message || uploadError}`));
             }
         } else if (newImageUrlsArray !== undefined) { //
             // If no files are uploaded but imageUrls array is sent via body (e.g., from frontend removing images)
             updateData.imageUrls = newImageUrlsArray; //
         }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        updateData.updatedAt = FieldValue.serverTimestamp(); // Update timestamp

        await docRef.update(updateData);

        const updatedDocSnap = await docRef.get();

        console.log('Listing updated successfully:', listingId);
        res.json({ id: updatedDocSnap.id, ...updatedDocSnap.data() });

    } catch (error) {
        console.error(`Error updating listing ${listingId}:`, error);
        next(error);
    }
});

// DELETE a specific Listing by ID
app.delete('/api/listings/:id', verifyToken, async (req, res, next) => {
    const listingId = req.params.id;
    const userId = req.user.id;
    console.log(`Received DELETE request to /api/listings/${listingId} by User ${userId}`);

    try {
         if (!listingId || typeof listingId !== 'string' || listingId.length < 5) {
            return res.status(400).json({ message: 'Invalid listing ID format.' });
        }

        const docRef = db.collection('listings').doc(listingId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
             console.log(`Listing ${listingId} not found for deletion, returning success.`);
             return res.status(200).json({ message: 'Listing deleted successfully (or did not exist).' });
        }

        const listingData = docSnap.data();

        if (listingData.userId !== userId) {
            console.warn(`Authorization Failed: User ${userId} attempted delete on listing ${listingId} owned by ${listingData.userId}`);
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this listing.' });
        }

        // Optional: Delete associated images from Firebase Storage
        if (listingData.imageUrls && listingData.imageUrls.length > 0) {
            console.log(`Deleting images associated with listing ${listingId}...`);
            const deletePromises = listingData.imageUrls
                .filter(url => url && url.includes(bucket.name))
                .map(async (url) => {
                    try {
                        const urlParts = url.split(`${bucket.name}/`);
                        if (urlParts.length > 1) {
                             const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
                             console.log(`Attempting to delete blob: ${filePath}`);
                             await bucket.file(filePath).delete({ ignoreNotFound: true });
                             console.log(`Deleted image: ${filePath}`);
                         }
                    } catch (imgDeleteError) {
                        console.error(`Failed to delete image ${url}:`, imgDeleteError.message);
                    }
                });
            await Promise.all(deletePromises);
        }

        // Perform the Firestore document delete
        await docRef.delete();

        console.log('Listing deleted successfully from Firestore:', listingId);
        res.status(200).json({ message: 'Listing deleted successfully' });

    } catch (err) {
        console.error(`Error deleting listing ${listingId}:`, err);
        next(err);
    }
});


// Optimized endpoint: Fetch listings by IDs
app.get('/api/listings/batch', validateRequest(schemas.batchListingsQuerySchema), async (req, res, next) => {
    try {
        // Zod validation already parsed req.query.ids into an array
        const ids = req.query.ids;

        if (ids.length === 0) {
            return res.status(400).json({ message: 'No valid IDs provided.' });
        }
         if (ids.length > 30) { // Firestore 'in' query limit (currently 30 as of last check)
            return res.status(400).json({ message: 'Cannot fetch more than 30 listings at once.' });
        }


        const listingsRef = db.collection('listings');
        // Use FieldPath.documentId() for querying by ID
        const snapshot = await listingsRef.where(admin.firestore.FieldPath.documentId(), 'in', ids).get();

        if (snapshot.empty) {
            return res.json([]); // Return empty array if none of the IDs matched
        }

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings by batch:', error);
        next(error); // Pass to centralized error handler
    }
});


// --- Basic Root Route (for testing API is running) ---
// app.get('/', (req, res) => {
//     res.send('Baytak API (Firestore, Auth, Images) is running!');
// });
// NOTE: The SPA catch-all ('*') below now handles the root route '/' by serving index.html


// *** NEW: Catch-all route for SPA - Should be AFTER all API routes ***
// Handles requests not matched by static files or API routes, serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});


// --- Centralized Error Handling Middleware ---
// Catches errors passed via next(err) and unhandled route errors
// *** This should be the LAST app.use() call before app.listen() ***
app.use((err, req, res, next) => {
    console.error("--- Unhandled Error ---");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Route:", req.method, req.originalUrl);
    if (req.body && Object.keys(req.body).length > 0) {
        // Avoid logging raw passwords if present
        const { password, ...safeBody } = req.body;
        if (password) safeBody.password = '********';
        console.error("Request Body (Sanitized):", safeBody);
    }
    console.error("Error Stack:", err.stack || err);
    console.error("--- End Unhandled Error ---");

    let statusCode = err.status || err.statusCode || 500;
    let message = 'An unexpected error occurred on the server.';

    // Custom error handling for Zod validation errors
    if (err.isZodError && Array.isArray(err.errors)) {
        statusCode = 400; // Bad Request for validation errors
        message = 'Validation failed';
        // You can choose to send all validation errors or just the first one
        return res.status(statusCode).json({
            message: message,
            errors: err.errors // Send detailed validation errors to frontend
        });
    } else if (err instanceof multer.MulterError) {
        statusCode = 400;
        message = `File upload error: ${err.message} (${err.field || ''})`;
    } else if (err.message.includes('Not an image')) { // Custom message from fileFilter
         statusCode = 400;
         message = err.message;
    } else if (err.code === 'permission-denied' || err.code === 'PERMISSION_DENIED') { // Firestore permission errors
        statusCode = 403;
        message = "Permission denied. You do not have access to this resource.";
    } else if (err.code === 'unauthenticated' || err.code === 'UNAUTHENTICATED') { // Firebase/JWT unauthenticated errors
        statusCode = 401;
        message = "Authentication required. Please log in.";
    } else if (err.code === 'failed-precondition' && err.message.includes('The query requires an index')) { // Firestore index errors
        statusCode = 400;
        message = "A database index is required for this query. Please create it in Firebase Console.";
    }
    else if (statusCode < 500) { // Client errors (4xx)
        message = err.message || 'Bad Request.';
    } else if (process.env.NODE_ENV !== 'production') {
        // In development, send more detailed error for 5xx errors
        message = err.message || 'Internal Server Error';
    } else {
        // In production, for 5xx errors, send a generic message
        message = 'An internal server error occurred.';
    }


    // Ensure response headers aren't already sent to prevent crashes
    if (res.headersSent) {
        console.error("Headers already sent, cannot send error response.");
        return next(err); // Pass it on, though likely can't be handled
    }

    res.status(statusCode).json({
        message: message,
        // Include stack trace or error details only in development
        ...(process.env.NODE_ENV !== 'production' && { errorType: err.name, errorCode: err.code, stack: err.stack })
    });
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server (Firestore, Auth, Images) listening on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`Ensure FIREBASE_STORAGE_BUCKET is set to: ${process.env.FIREBASE_STORAGE_BUCKET}`);
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'YOUR_REALLY_STRONG_RANDOM_JWT_SECRET_KEY_HERE') {
        console.warn("!!! WARNING: JWT_SECRET is not set or is using the default placeholder in .env. Please set a strong secret! !!!");
    }
});