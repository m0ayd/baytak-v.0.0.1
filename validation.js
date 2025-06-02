// validation.js
const { z } = require('zod');

// --- Schemas ---

// Authentication Schemas
const authSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').trim().min(1, 'Email is required'),
    password: z.string().trim().min(6, 'Password must be at least 6 characters long'),
  })
});

const registerSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, 'Username is required and must be at least 3 characters long'),
    email: z.string().trim().email('Invalid email format').min(1, 'Email is required'),
    password: z.string().trim().min(6, 'Password must be at least 6 characters long'),
    // phone is optional and nullable, transforms empty string to null
    phone: z.string()
      .transform(val => (typeof val === 'string' ? val.trim() : val))
      .optional().nullable()
      .refine(val => {
        if (val === null || val === undefined || val === '') return true; // Allow null, undefined, or empty string
        const phoneRegex = /^[0-9\+\s\-\(\)]*$/; // Basic phone number regex
        return phoneRegex.test(val);
      }, {
        message: "Invalid phone number format. Allowed characters: 0-9, +, -, (, ), spaces."
      }).transform(val => val === '' ? null : val), // Transform empty strings to null for consistency
  })
});

// Listing Schemas
const validOfferTypes = ['rent', 'sale'];
const validPropTypes = ['apartment', 'house', 'villa', 'land', 'commercial']; // Added 'commercial' as an example

const locationSchema = z.object({
  address: z.string().trim().min(1, 'Location address is required'),
  city: z.string().transform(val => (typeof val === 'string' ? val.trim() : val)).optional().nullable(),
  zipCode: z.string().transform(val => (typeof val === 'string' ? val.trim() : val)).optional().nullable(),
  country: z.string().transform(val => (typeof val === 'string' ? val.trim() : val)).optional().nullable(),
}).passthrough(); // passthrough allows unknown keys to be passed through (useful if you add coordinates later)

const newListingSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Title is required and must be at least 3 characters'),
    price: z.string().min(1, 'Price is required').refine(val => !isNaN(parseFloat(val)), { message: "Price must be a number" }).transform(parseFloat).refine(price => price >= 0, { message: "Price cannot be negative" }),
    description: z.string().trim().min(10, 'Description is required and must be at least 10 characters').max(1000, 'Description cannot exceed 1000 characters'),
    offerType: z.enum(validOfferTypes, { message: `Invalid offer type. Must be one of: ${validOfferTypes.join(', ')}` }),
    propertyType: z.enum(validPropTypes, { message: `Invalid property type. Must be one of: ${validPropTypes.join(', ')}` }),
    // Location can be a string or an object. If string, it's transformed to { address: string }.
    location: z.union([
      z.string().trim().min(1, 'Location is required').transform(val => ({ address: val })), // Transform string to object
      locationSchema
    ]),
    // Amenities can be an array of strings, a single string, undefined, or null. Transformed to an array of strings.
    amenities: z.union([z.array(z.string().trim().nonempty()), z.string().trim(), z.undefined(), z.null()]).transform(val => {
      if (Array.isArray(val)) return val.filter(a => a); // Filter out empty strings from array
      if (typeof val === 'string' && val.trim() !== '') return [val.trim()]; // Convert single string to array
      return []; // Default to empty array
    }).default([]), // Ensure it's always an array
    // Numbers fields are optional, transform empty string to 0, ensure non-negative
    bedrooms: z.string().refine(val => val === '' || !isNaN(parseInt(val, 10)), { message: "Bedrooms must be a number" }).transform(val => val === '' ? 0 : parseInt(val, 10)).refine(val => val >= 0, { message: "Bedrooms cannot be negative" }).optional().default('0').transform(val => parseInt(val, 10)),
    bathrooms: z.string().refine(val => val === '' || !isNaN(parseInt(val, 10)), { message: "Bathrooms must be a number" }).transform(val => val === '' ? 0 : parseInt(val, 10)).refine(val => val >= 0, { message: "Bathrooms cannot be negative" }).optional().default('0').transform(val => parseInt(val, 10)),
    area: z.string().refine(val => val === '' || !isNaN(parseFloat(val)), { message: "Area must be a number" }).transform(val => val === '' ? 0 : parseFloat(val)).refine(val => val >= 0, { message: "Area cannot be negative" }).optional().default('0').transform(val => parseFloat(val)),
  })
});

const updateListingSchema = z.object({
  params: z.object({
    id: z.string().trim().min(5, 'Listing ID must be at least 5 characters long'),
  }),
  body: z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').optional(),
    price: z.string().refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)), { message: "Price must be a number" })
      .transform(val => val === '' || val === undefined ? undefined : parseFloat(val))
      .refine(price => price === undefined || price >= 0, { message: "Price cannot be negative" }).optional(),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000, 'Description cannot exceed 1000 characters').optional(),
    offerType: z.enum(validOfferTypes, { message: `Invalid offer type. Must be one of: ${validOfferTypes.join(', ')}` }).optional(),
    propertyType: z.enum(validPropTypes, { message: `Invalid property type. Must be one of: ${validPropTypes.join(', ')}` }).optional(),
    location: z.union([
      z.string().trim().min(1, 'Location address is required').transform(val => ({ address: val })), // Transform string to object
      locationSchema
    ]).optional(),
    amenities: z.union([z.array(z.string().trim().nonempty()), z.literal(''), z.undefined(), z.null()]).transform(val => {
      if (Array.isArray(val)) return val.filter(a => a);
      if (val === '' || val === null) return []; // Transform empty string or null to empty array
      if (typeof val === 'string' && val.trim() !== '') return [val.trim()];
      return undefined; // If undefined, leave as undefined for optional
    }).optional(),
    bedrooms: z.string().refine(val => val === '' || val === undefined || !isNaN(parseInt(val, 10)), { message: "Bedrooms must be a number" })
      .transform(val => val === '' || val === undefined ? undefined : parseInt(val, 10))
      .refine(val => val === undefined || val >= 0, { message: "Bedrooms cannot be negative" }).optional(),
    bathrooms: z.string().refine(val => val === '' || val === undefined || !isNaN(parseInt(val, 10)), { message: "Bathrooms must be a number" })
      .transform(val => val === '' || val === undefined ? undefined : parseInt(val, 10))
      .refine(val => val === undefined || val >= 0, { message: "Bathrooms cannot be negative" }).optional(),
    area: z.string().refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)), { message: "Area must be a number" })
      .transform(val => val === '' || val === undefined ? undefined : parseFloat(val))
      .refine(val => val === undefined || val >= 0, { message: "Area cannot be negative" }).optional(),
    // imageUrls will be handled by Multer if new files are uploaded, but frontend might send current URLs in body.
    imageUrls: z.array(z.string().url('Must be a valid URL')).optional(), // Allow an array of existing image URLs
  })
});

const listingsQuerySchema = z.object({
  query: z.object({
    offerType: z.enum([...validOfferTypes, 'all'], { message: `Invalid offer type. Must be one of: ${[...validOfferTypes, 'all'].join(', ')}` }).optional().transform(val => val === 'all' ? undefined : val), // Transform 'all' to undefined
    propertyType: z.enum([...validPropTypes, 'all'], { message: `Invalid property type. Must be one of: ${[...validPropTypes, 'all'].join(', ')}` }).optional().transform(val => val === 'all' ? undefined : val), // Transform 'all' to undefined
    location: z.string().trim().optional(),
    minPrice: z.string().refine(val => val === '' || !isNaN(parseFloat(val)), { message: "minPrice must be a number" }).transform(val => val === '' ? undefined : parseFloat(val)).refine(price => price === undefined || price >= 0, { message: "minPrice cannot be negative" }).optional(),
    maxPrice: z.string().refine(val => val === '' || !isNaN(parseFloat(val)), { message: "maxPrice must be a number" }).transform(val => val === '' ? undefined : parseFloat(val)).refine(price => price === undefined || price >= 0, { message: "maxPrice cannot be negative" }).optional(),
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'price', 'updatedAt'], { message: "Invalid sortBy field. Must be 'createdAt', 'price', or 'updatedAt'" }).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc'], { message: "Invalid sortOrder. Must be 'asc' or 'desc'" }).optional().default('desc'),
  }).partial() // All query parameters are optional
});

const batchListingsQuerySchema = z.object({
  query: z.object({
    // IDs should be a comma-separated string, transformed into an array of strings
    ids: z.string().min(1, 'ids query parameter is required').transform(val => {
      const idArray = val.split(',').map(id => id.trim()).filter(id => id.length > 0);
      return idArray;
    }).refine(val => val.length > 0, { message: 'ids parameter must contain at least one valid listing ID.' }),
  })
});

// --- Middleware ---
const validateRequest = (schema) => (req, res, next) => {
  try {
    // Attempt to parse and validate relevant parts of the request
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      const error = parsed.error;
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'), // e.g., 'body.email', 'query.page'
        message: err.message,
        code: err.code,
        // Include expected/received only if helpful for debugging, not for production client
        // expected: err.expected,
        // received: err.received,
      }));

      console.warn("Validation Error:", formattedErrors);

      // Create a custom error object that can be caught by centralized error handler
      const validationError = new Error('Validation failed');
      validationError.status = 400; // HTTP 400 Bad Request
      validationError.errors = formattedErrors; // Attach detailed errors
      validationError.isZodError = true; // Custom flag to identify Zod errors

      return next(validationError); // Pass error to Express error handling middleware
    }

    // If validation successful, replace original request objects with parsed data
    // This injects transformed/defaulted values from Zod back into req.body/query/params
    if (parsed.data.body) req.body = parsed.data.body;
    if (parsed.data.query) req.query = parsed.data.query;
    if (parsed.data.params) req.params = parsed.data.params;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    // Catch any unexpected errors within the validation middleware itself
    console.error("Internal Validation Middleware Error:", error);
    next(error); // Pass internal errors to centralized error handler
  }
};

module.exports = {
  validateRequest,
  schemas: {
    authSchema,
    registerSchema,
    newListingSchema,
    updateListingSchema,
    listingsQuerySchema,
    batchListingsQuerySchema,
  }
};