// REMOVED: import statements for Firebase functions (because compat SDKs are loaded via script tags in index.html)
// import { initializeApp } from "firebase/app";
// import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // <-- Import Storage functions
// import { getAuth } from "firebase/auth"; // Import auth if needed client-side
// import { getFirestore } from "firebase/firestore"; // Import Firestore if needed client-side
// import { getAnalytics } from "firebase/analytics"; // Optional analytics

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAO430s30enyYJDpCoa1ayrAxKd7M2ef-0", // Use your actual key
    authDomain: "baytak-f12c3.firebaseapp.com",
    projectId: "baytak-f12c3",
    storageBucket: "baytak-f12c3.appspot.com", // Make sure this matches!
    messagingSenderId: "519025321070",
    appId: "1:519025321070:web:5c941fed2052bdf0d2327f",
    measurementId: "G-0DJ4H79RSH" // Optional
  };
  
  // Initialize Firebase using the compat library (global firebase object)
  // This will now work because the compat SDK script is loaded BEFORE this script
  firebase.initializeApp(firebaseConfig);
  const storage = firebase.storage(); // Use the compat storage instance
  
  // script.js (Complete Refactored Version for Firestore)
  
  document.addEventListener('DOMContentLoaded', () => {
      // --- Element References ---
      const listingsContainer = document.getElementById('listings-container');
      const listingDetailSection = document.getElementById('listing-detail');
      const homeSection = document.getElementById('home');
      const postOfferSection = document.getElementById('post-offer');
      const postOfferForm = document.getElementById('post-offer-form');
      const postOfferMessage = document.getElementById('post-offer-message');
      const descriptionInput = document.getElementById('offer-description');
      const descriptionCharCount = document.getElementById('description-char-count');
      const counterContainer = descriptionCharCount ? descriptionCharCount.parentElement : null;
      const favoritesSection = document.getElementById('favorites');
      const favoritesGrid = document.getElementById('favorites-grid');
      const noFavoritesMessage = favoritesSection ? favoritesSection.querySelector('.placeholder-text[data-i18n="noFavorites"]') : null;
      const sections = document.querySelectorAll('main > section.page-section'); // Target only page sections
      const loadingIndicator = null; // Replace with document.getElementById('your-loading-spinner-id') if you have one
      const sidebar = document.querySelector('.sidebar');
      const menuToggle = document.getElementById('menu-toggle');
      const closeMenuButton = document.getElementById('close-menu');
      const languageToggle = document.getElementById('language-toggle');
      const darkModeToggle = document.getElementById('darkModeToggle');
      const offerImagesInput = document.getElementById('offer-images');
      const postImagePreviewArea = document.getElementById('post-image-preview');
      const userAuthStatusDiv = document.getElementById('user-auth-status');
      const userGreetingSidebar = document.getElementById('user-greeting-sidebar');
      const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');
      const guestAuthLinksSidebar = document.getElementById('guest-auth-links-sidebar');
      const loginFormSection = document.getElementById('login-form-section');
      const registerFormSection = document.getElementById('register-form-section');
      const loginMessageSection = document.getElementById('login-message-section');
      const registerMessageSection = document.getElementById('register-message-section');
      const navUserLink = document.getElementById('nav-user-link');
      const displayUsernameElem = document.getElementById('display-username');
      const displayEmailElem = document.getElementById('editable-email');
      const displayPhoneElem = document.getElementById('editable-phone');
      const displayFullnameElem = document.getElementById('editable-fullname');
      const userProfileMessage = document.getElementById('user-profile-message');
  
      // Search/Filter Elements
      const searchInput = document.getElementById('search-input');
      const searchButton = document.getElementById('search-button');
      const filterToggle = document.getElementById('filter-toggle');
      const filterDropdown = document.getElementById('filter-dropdown-content');
      const applyFiltersBtn = document.getElementById('apply-filters-btn');
      const filterTypeSelect = document.getElementById('filter-type');
      const filterLocationInput = document.getElementById('filter-location');
      const filterPriceMinInput = document.getElementById('filter-price-min');
      const filterPriceMaxInput = document.getElementById('filter-price-max');
  
      // --- State ---
      let currentLanguage = localStorage.getItem('lang') || 'ar';
      let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
  
      // --- Favorites Logic ---
      function saveFavorites() {
          localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
      }
  
      function updateFavoriteButtonVisuals(button, listingId) {
          if (!button || !listingId) return;
          const icon = button.querySelector('i'); // Assuming Font Awesome <i> element
          const isActive = favorites.has(listingId);
  
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-label', isActive ? 'Remove from favorites' : 'Add to favorites');
  
          if (icon) {
              icon.classList.toggle('fas', isActive); // Solid heart if active
              icon.classList.toggle('far', !isActive); // Regular heart if not active
          }
          // Add logic for SVG if you switch later
      }
  
      function toggleFavorite(listingId, buttonElement) {
          if (!listingId) {
               console.error("toggleFavorite called with invalid listingId");
               return;
          }
          console.log(`Toggling favorite for: ${listingId}`);
          if (favorites.has(listingId)) {
              favorites.delete(listingId);
              console.log('Removed from favorites');
          } else {
              favorites.add(listingId);
              console.log('Added to favorites');
          }
          saveFavorites();
          updateFavoriteButtonVisuals(buttonElement, listingId);
  
          // Update other potential buttons for the same listing
          document.querySelectorAll(`.favorite-button[data-id="${listingId}"]`).forEach(btn => {
              if (btn !== buttonElement) {
                  updateFavoriteButtonVisuals(btn, listingId);
              }
          });
  
          // Refresh favorites view if active
          if (favoritesSection && favoritesSection.classList.contains('active-section')) {
              displayFavorites();
          }
      }
  
      // --- Listing Element Creation ---
      function createListingElement(listing) {
          if (!listing || !listing.id) {
              console.error("Cannot create listing element: Invalid listing data or missing ID.", listing);
              return null; // Return null if data is invalid
          }
  
          const div = document.createElement('div');
          div.className = 'property-card';
          div.dataset.id = listing.id; // Use Firestore ID
  
          // Use first image URL or fallback to local placeholder
          const imageUrl = listing.imageUrls?.[0] || '/images/placeholder.webp';
  
          div.innerHTML = `
              <div class="card-image-container">
                  <img src="${imageUrl}" alt="${listing.title || 'Property Image'}" class="card-image" onerror="this.onerror=null; this.src='/images/placeholder.webp';">
                  <button class="favorite-button" data-id="${listing.id}" aria-label="Add to favorites">
                       <i class="far fa-heart"></i>
                  </button>
              </div>
              <div class="card-content">
                  <h3 class="card-title">${listing.title || 'Untitled Property'}</h3>
                  <p class="card-price">Price: ${listing.price?.toLocaleString() || 'N/A'} AED</p>
                   <p class="card-type">${listing.propertyType || 'N/A'} for ${listing.offerType || 'N/A'}</p>
                   <p class="card-description">${(listing.description || 'No description available.').substring(0, 100)}${listing.description && listing.description.length > 100 ? '...' : ''}</p>
                   <a href="#listing-detail?id=${listing.id}" class="card-details-link" data-id="${listing.id}">View Details</a>
              </div>
          `;
  
          // Add onerror handler to image AFTER setting innerHTML
          const imgElement = div.querySelector('.card-image');
          if (imgElement) {
               imgElement.onerror = () => {
                    console.warn(`Failed to load image: ${imgElement.src}. Falling back to placeholder.`);
                    imgElement.src = '/images/placeholder.webp';
                    imgElement.onerror = null; // Prevent infinite loop if placeholder also fails
               };
          }
  
  
          const favButton = div.querySelector('.favorite-button');
          if (favButton) {
              updateFavoriteButtonVisuals(favButton, listing.id);
              favButton.addEventListener('click', (e) => {
                  e.stopPropagation();
                  toggleFavorite(listing.id, favButton);
              });
          }
  
          const detailsLink = div.querySelector('.card-details-link');
          if (detailsLink) {
              detailsLink.addEventListener('click', (e) => {
                  e.preventDefault();
                  const listingId = detailsLink.getAttribute('data-id');
                  if (listingId) {
                      const detailHash = `#listing-detail?id=${listingId}`;
                      history.pushState({ section: 'listing-detail', data: { listingId: listingId } }, "", detailHash);
                      showSection('listing-detail', { listingId: listingId });
                  } else {
                      console.error('Could not get listing ID from details link');
                  }
              });
          }
  
          div.addEventListener('click', (e) => {
              if (e.target.closest('.favorite-button') || e.target.closest('.card-details-link')) {
                  return;
              }
              const listingId = div.dataset.id;
              if (listingId) {
                  const detailHash = `#listing-detail?id=${listingId}`;
                  history.pushState({ section: 'listing-detail', data: { listingId: listingId } }, "", detailHash);
                  showSection('listing-detail', { listingId: listingId });
              }
          });
  
          return div;
      }
  
      // --- API Interaction Functions ---
  
      async function fetchListingsAPI(filters = {}) {
          const queryParams = new URLSearchParams();
          // Add filters to queryParams (same logic as before)
          if (filters.search) queryParams.append('search', filters.search);
          if (filters.offerType && filters.offerType !== 'all') queryParams.append('offerType', filters.offerType);
          if (filters.propertyType && filters.propertyType !== 'all') queryParams.append('propertyType', filters.propertyType);
          if (filters.location) queryParams.append('location', filters.location);
          if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
          if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
  
          const queryString = queryParams.toString();
          const apiUrl = `/api/listings${queryString ? '?' + queryString : ''}`;
          console.log("Fetching listings from:", apiUrl);
  
          const response = await fetch(apiUrl);
          if (!response.ok) {
              let errorMsg = `HTTP error! Status: ${response.status}`;
              try {
                  const errorData = await response.json();
                  errorMsg = errorData?.message || errorMsg;
                   console.error("API Error Response:", errorData);
              } catch (e) { /* Ignore parsing error */ }
              throw new Error(errorMsg); // Throw error to be caught by caller
          }
          return await response.json(); // Return parsed JSON data
      }
  
      async function fetchSingleListingAPI(listingId) {
           if (!listingId) throw new Error("Invalid Listing ID provided to fetchSingleListingAPI.");
           const apiUrl = `/api/listings/${listingId}`;
           console.log(`Fetching single listing from: ${apiUrl}`);
           const response = await fetch(apiUrl);
  
           if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                let errorData = null;
                try {
                    errorData = await response.json();
                    errorMsg = errorData?.message || errorMsg;
                    console.error("API Error Response:", errorData);
                } catch (e) { /* Ignore parsing error */ }
  
                if (response.status === 404) {
                    throw new Error("Listing not found"); // Specific error for 404
                } else {
                     throw new Error(errorMsg);
                }
           }
           return await response.json();
       }
  
  
      // --- Display Logic ---
  
      async function fetchAndDisplayListings(filters = {}) {
          if (!listingsContainer) return;
          listingsContainer.innerHTML = ''; // Clear previous
          showLoading(listingsContainer, true, 'loadingListings');
  
          try {
              const listings = await fetchListingsAPI(filters); // Use the API function
              showLoading(listingsContainer, false);
  
              if (!listings || listings.length === 0) {
                  listingsContainer.innerHTML = `<p class="placeholder-text" data-i18n="noListingsFound">No listings found matching your criteria.</p>`;
                  applyTranslations(currentLanguage);
              } else {
                  listings.forEach(listing => {
                      const listingElement = createListingElement(listing);
                      if (listingElement) {
                          listingsContainer.appendChild(listingElement);
                      }
                  });
              }
          } catch (error) {
              console.error('Error fetching/displaying listings:', error);
              showLoading(listingsContainer, false);
              listingsContainer.innerHTML = `<p class="error-message">Could not load listings: ${error.message}. Please try again later.</p>`;
          }
      }
  
       async function fetchAndDisplayListingDetail(listingId) {
          if (!listingDetailSection) return;
          listingDetailSection.innerHTML = ''; // Clear previous
          showLoading(listingDetailSection, true); // Show generic loading text
  
          try {
               const listing = await fetchSingleListingAPI(listingId); // Use the API function
               showLoading(listingDetailSection, false);
  
               if (!listing || !listing.id) {
                   throw new Error("Received invalid listing data from server.");
               }
  
               // --- Populate Detail View (HTML Structure) ---
               const mainImageUrl = listing.imageUrls?.[0] || '/images/placeholder.webp';
               const featuresListHtml = Array.isArray(listing.features) && listing.features.length > 0
                   ? `<ul id="detail-features-list">${listing.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}</ul>`
                   : '<p data-i18n="noFeaturesListed">No features listed.</p>';
  
               let locationString = 'Location not specified';
               if (listing.location) {
                   if (typeof listing.location === 'string') {
                       locationString = listing.location;
                   } else if (typeof listing.location === 'object' && listing.location.address) {
                       locationString = [listing.location.address, listing.location.city, listing.location.zipCode, listing.location.country]
                           .filter(Boolean).join(', ');
                   }
               }
  
               listingDetailSection.innerHTML = `
                   <button id="back-to-list" aria-label="Back to listings" class="btn btn-secondary btn-sm" style="margin-bottom: 15px;">← Back</button>
                   <div class="listing-detail-content">
                       <div class="listing-detail-header">
                           <h3 id="detail-title">${listing.title || 'Property Details'}</h3>
                           <span id="detail-price" class="detail-price">${listing.price ? listing.price.toLocaleString() + ' AED' : 'Price not available'}</span>
                           <button class="favorite-button detail-favorite-btn" data-id="${listing.id}" aria-label="Add to favorites">
                               <i class="far fa-heart"></i>
                           </button>
                       </div>
                       <div class="detail-image-carousel">
                           <div class="carousel-main-image">
                               <img id="carousel-main-img" src="${mainImageUrl}" alt="${listing.title || 'Main listing image'}" onerror="this.onerror=null; this.src='/images/placeholder.webp';">
                           </div>
                           <!-- Thumbnails later -->
                       </div>
                       <div class="detail-info-grid">
                           <div class="detail-block description-block">
                               <h4 data-i18n="detailDescLabel">Description</h4>
                               <p id="detail-description">${listing.description || 'No description provided.'}</p>
                           </div>
                           <div class="detail-block basic-info-block">
                               <h4 data-i18n="detailBasicInfoLabel">Basic Information</h4>
                               <p><strong>Type:</strong> ${listing.propertyType || 'N/A'} for ${listing.offerType || 'N/A'}</p>
                               <p><strong>Bedrooms:</strong> ${listing.bedrooms ?? 'N/A'}</p>
                               <p><strong>Bathrooms:</strong> ${listing.bathrooms ?? 'N/A'}</p>
                               <p><strong>Area:</strong> ${listing.squareFeet ? listing.squareFeet + ' m²' : 'N/A'}</p>
                           </div>
                           <div class="detail-block features-block">
                               <h4 data-i18n="detailFeaturesLabel">Features</h4>
                               ${featuresListHtml}
                           </div>
                           <div class="detail-block location-block">
                               <h4 data-i18n="detailLocationLabel">Location</h4>
                               <p id="detail-location">${locationString}</p>
                               <div class="map-placeholder" data-i18n="mapPlaceholder">Map Area Placeholder</div>
                           </div>
                           {/* Optional Seller Block */}
                       </div>
                   </div>`;
  
               // Add onerror handler to main image AFTER setting innerHTML
               const mainImgElement = listingDetailSection.querySelector('#carousel-main-img');
               if (mainImgElement) {
                   mainImgElement.onerror = () => {
                       console.warn(`Failed to load main detail image: ${mainImgElement.src}. Falling back to placeholder.`);
                       mainImgElement.src = '/images/placeholder.webp';
                       mainImgElement.onerror = null;
                   };
               }
  
  
               applyTranslations(currentLanguage); // Apply translations to static text
  
               // Add listeners for back and favorite buttons
               const backButton = listingDetailSection.querySelector('#back-to-list');
               if (backButton) {
                   backButton.addEventListener('click', () => history.back());
               }
               const favButtonDetail = listingDetailSection.querySelector('.detail-favorite-btn');
               if (favButtonDetail) {
                   updateFavoriteButtonVisuals(favButtonDetail, listing.id);
                   favButtonDetail.addEventListener('click', (e) => {
                       e.stopPropagation();
                       toggleFavorite(listing.id, favButtonDetail);
                   });
               }
  
          } catch (error) {
               console.error('Error fetching or displaying listing details:', error);
               showLoading(listingDetailSection, false);
               const errorMsg = error.message === "Listing not found"
                    ? '<p class="error-message" data-i18n="listingNotFound">Listing not found.</p>' // Use translation key if available
                    : `<p class="error-message">Could not load listing details: ${error.message}.</p>`;
               listingDetailSection.innerHTML = `${errorMsg}<button id="back-to-list" class="btn btn-secondary btn-sm">← Back</button>`;
               applyTranslations(currentLanguage); // Translate error message if key exists
               const backButton = listingDetailSection.querySelector('#back-to-list');
               if (backButton) { backButton.addEventListener('click', () => history.back()); }
          }
      }
  
      async function displayFavorites() {
          if (!favoritesGrid || !favoritesSection) return;
          favoritesGrid.innerHTML = '';
          showLoading(favoritesGrid, true, 'loadingListings'); // Reuse loading key maybe
          if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';
  
          const favoriteIds = Array.from(favorites);
          if (favoriteIds.length === 0) {
              showLoading(favoritesGrid, false);
              if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
              return;
          }
  
          try {
              // OPTIMIZATION: Ideally, fetch only favorite listings from backend
              // e.g., GET /api/listings?ids=id1,id2,id3
              // For now, fetch all and filter client-side (less efficient)
              // This might be slow if there are many listings and many favorites
              // A dedicated batch endpoint is better. Let's use the batch endpoint logic I added to the server.
  
              // Check if the batch endpoint exists and use it
              const batchApiUrl = '/api/listings/batch?ids=' + favoriteIds.join(',');
              const response = await fetch(batchApiUrl);
  
              let favoriteListings = [];
              if (response.ok) {
                   favoriteListings = await response.json();
                   console.log(`Fetched ${favoriteListings.length} favorite listings using batch endpoint.`);
              } else {
                  // Fallback to fetching all and filtering if batch endpoint fails or doesn't exist
                  console.warn(`Batch endpoint ${batchApiUrl} failed (${response.status}). Falling back to fetching all listings.`);
                  const allListings = await fetchListingsAPI(); // Fetch all
                  favoriteListings = allListings.filter(listing => favoriteIds.includes(listing.id));
              }
  
  
              showLoading(favoritesGrid, false);
  
              if (!favoriteListings || favoriteListings.length === 0) {
                   if (noFavoritesMessage) {
                       noFavoritesMessage.style.display = 'block';
                       // Re-apply translation in case it was hidden
                       applyTranslations(currentLanguage);
                   }
              } else {
                  favoriteListings.forEach(listing => {
                      const listingElement = createListingElement(listing);
                      if (listingElement) {
                          favoritesGrid.appendChild(listingElement);
                      }
                  });
              }
          } catch (error) {
              console.error('Error fetching/displaying favorites:', error);
              showLoading(favoritesGrid, false);
              favoritesGrid.innerHTML = `<p class="error-message">Could not load favorites: ${error.message}. Please try again later.</p>`;
               applyTranslations(currentLanguage); // Translate error message if key exists
          }
      }
  
  
      // --- Navigation ---
      async function displayUserProfile() {
          console.log("Attempting to display user profile...");
          if (!displayUsernameElem || !displayEmailElem || !displayPhoneElem || !displayFullnameElem || !userProfileMessage) {
              console.error("One or more user profile display elements not found.");
              return;
          }
  
          // Clear previous data and messages, show loading state
          displayUsernameElem.textContent = translations[currentLanguage]?.loadingListings || translations.en.loadingListings; // Re-use loading key
          displayEmailElem.textContent = translations[currentLanguage]?.loadingListings || translations.en.loadingListings;
          displayPhoneElem.textContent = translations[currentLanguage]?.loadingListings || translations.en.loadingListings;
          displayFullnameElem.textContent = translations[currentLanguage]?.loadingListings || translations.en.loadingListings;
          userProfileMessage.textContent = '';
          userProfileMessage.className = 'message-area'; // Reset class
          userProfileMessage.style.display = 'none';
  
  
          const token = localStorage.getItem('token');
          if (!token) {
              console.log("No token found, cannot display profile. Showing login message.");
              displayUsernameElem.textContent = '';
              displayEmailElem.textContent = '';
              displayPhoneElem.textContent = '';
              displayFullnameElem.textContent = '';
              // Show login required message
              userProfileMessage.textContent = translations[currentLanguage]?.loginRequiredProfile || translations.en.loginRequiredProfile;
              userProfileMessage.className = 'message-area error';
              userProfileMessage.style.display = 'block';
              // Hide managed offers list and show no offers message placeholder if they exist
               const managedOfferList = document.querySelector('.managed-offer-list');
               const noOffersMessage = document.getElementById('no-offers-message');
               if (managedOfferList) managedOfferList.style.display = 'none';
               if (noOffersMessage) noOffersMessage.style.display = 'block'; // Show no offers message placeholder
  
              return;
          }
  
          try {
              const response = await fetch('/api/users/me', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
  
              if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                  throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
              }
  
              const profileData = await response.json();
              console.log("Profile data received:", profileData);
  
              // Populate profile details
              displayUsernameElem.textContent = profileData.username || 'N/A';
              displayEmailElem.textContent = profileData.email || 'N/A';
              displayPhoneElem.textContent = profileData.phone || (translations[currentLanguage]?.phoneNotProvided || translations.en.phoneNotProvided || 'Not Provided'); // Added fallback
              displayFullnameElem.textContent = profileData.fullname || (translations[currentLanguage]?.fullnameNotProvided || translations.en.fullnameNotProvided || 'Not Provided'); // Added fallback
              userProfileMessage.textContent = '';
              userProfileMessage.style.display = 'none';
  
              // --- Fetch and Display User Offers ---
              await fetchAndDisplayUserOffers(token);
  
          } catch (error) {
              console.error('Error fetching user profile:', error);
              // Display error state
              displayUsernameElem.textContent = '-';
              displayEmailElem.textContent = '-';
              displayPhoneElem.textContent = '-';
              displayFullnameElem.textContent = '-';
              userProfileMessage.textContent = `${translations[currentLanguage]?.profileNotLoaded || translations.en.profileNotLoaded} ${error.message}`;
              userProfileMessage.className = 'message-area error';
              userProfileMessage.style.display = 'block';
               // Hide managed offers list and show no offers message placeholder
               const managedOfferList = document.querySelector('.managed-offer-list');
               const noOffersMessage = document.getElementById('no-offers-message');
               if (managedOfferList) managedOfferList.style.display = 'none';
               if (noOffersMessage) noOffersMessage.style.display = 'block'; // Show no offers message placeholder
          } finally {
               // Ensure translations are applied to any static placeholders or error messages
               applyTranslations(currentLanguage);
          }
      }
  
      async function fetchAndDisplayUserOffers(token) {
          const userOfferList = document.getElementById('user-offer-list');
          const noOffersMessage = document.getElementById('no-offers-message');
          const managedOfferListContainer = document.querySelector('.managed-offer-list'); // Container for the list and message
  
          if (!userOfferList || !noOffersMessage || !managedOfferListContainer) {
              console.error("User offers display elements not found.");
              return;
          }
  
          userOfferList.innerHTML = ''; // Clear previous offers
          noOffersMessage.style.display = 'none'; // Hide no offers message initially
          managedOfferListContainer.style.display = ''; // Ensure container is visible
  
  
          try {
              const response = await fetch('/api/users/me/offers', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
  
              if (!response.ok) {
                   const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                   throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
              }
  
              const userOffers = await response.json();
              console.log(`Fetched ${userOffers.length} user offers.`);
  
              if (userOffers.length === 0) {
                  noOffersMessage.style.display = 'block'; // Show no offers message
              } else {
                  userOffers.forEach(offer => {
                      const listItem = document.createElement('li');
                      listItem.dataset.offerId = offer.id; // Store offer ID
                      listItem.innerHTML = `
                           <span><i class="fas fa-tag"></i> ${offer.title || 'Untitled Offer'}</span>
                           <div class="offer-actions">
                               <button class="btn-icon edit-offer-btn" aria-label="${translations[currentLanguage]?.editOfferTooltip || translations.en.editOfferTooltip}" title="${translations[currentLanguage]?.editOfferTooltip || translations.en.editOfferTooltip}"><i class="fas fa-edit"></i></button>
                               <button class="btn-icon delete-offer-btn" aria-label="${translations[currentLanguage]?.deleteOfferTooltip || translations.en.deleteOfferTooltip}" title="${translations[currentLanguage]?.deleteOfferTooltip || translations.en.deleteOfferTooltip}"><i class="fas fa-trash-alt"></i></button>
                           </div>
                       `;
                      userOfferList.appendChild(listItem);
  
                      // Add listeners to action buttons (implement edit/delete logic)
                       const editButton = listItem.querySelector('.edit-offer-btn');
                       const deleteButton = listItem.querySelector('.delete-offer-btn');
  
                       editButton?.addEventListener('click', () => {
                           // TODO: Implement edit functionality (maybe a modal or navigate to edit form)
                           console.log('Edit button clicked for offer:', offer.id);
                           alert('Edit functionality not yet implemented.');
                       });
  
                       deleteButton?.addEventListener('click', () => {
                           // TODO: Implement delete functionality (with confirmation)
                           console.log('Delete button clicked for offer:', offer.id);
                           if (confirm('Are you sure you want to delete this offer?')) {
                               handleDeleteOffer(offer.id, listItem); // Pass listItem to remove it on success
                           }
                       });
                  });
              }
          } catch (error) {
              console.error('Error fetching user offers:', error);
               userOfferList.innerHTML = `<p class="error-message">Could not load your offers: ${error.message}.</p>`;
               noOffersMessage.style.display = 'none'; // Ensure no offers message is hidden if there's an error loading the list
               applyTranslations(currentLanguage); // Translate error message if key exists
          } finally {
               // Ensure translations are applied after content is loaded/failed
               applyTranslations(currentLanguage);
          }
      }
  
      async function handleDeleteOffer(offerId, listItemElement) {
          const token = localStorage.getItem('token');
           if (!token) {
               alert("You must be logged in to delete offers.");
               return;
           }
          try {
              const response = await fetch(`/api/listings/${offerId}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
              });
  
              if (!response.ok) {
                   const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                   throw new Error(errorData.message || `Failed to delete offer. Status: ${response.status}`);
              }
  
              // Success - Remove the list item
              if (listItemElement) {
                   listItemElement.remove();
                   console.log(`Offer ${offerId} deleted successfully from UI.`);
                   // Check if the list is now empty and show the no offers message
                   const userOfferList = document.getElementById('user-offer-list');
                   const noOffersMessage = document.getElementById('no-offers-message');
                   if (userOfferList && noOffersMessage && userOfferList.children.length === 0) {
                        noOffersMessage.style.display = 'block';
                   }
              }
  
               // Optionally display a success message on the user page
               const userProfileMessage = document.getElementById('user-profile-message');
               if (userProfileMessage) {
                   userProfileMessage.textContent = "Offer deleted successfully!";
                   userProfileMessage.className = 'message-area success';
                   userProfileMessage.style.display = 'block';
                   setTimeout(() => {
                       userProfileMessage.style.display = 'none';
                   }, 3000);
               }
  
  
          } catch (error) {
              console.error(`Error deleting offer ${offerId}:`, error);
               const userProfileMessage = document.getElementById('user-profile-message');
               if (userProfileMessage) {
                   userProfileMessage.textContent = `Failed to delete offer: ${error.message}`;
                   userProfileMessage.className = 'message-area error';
                   userProfileMessage.style.display = 'block';
               }
          } finally {
               applyTranslations(currentLanguage); // Ensure messages are translated
          }
      }
  
  
  
      function showSection(sectionId, data = null) {
          console.log(`Attempting to show section: ${sectionId}`, data);
          let sectionFound = false;
          sections.forEach(section => {
              if (section.id === sectionId) {
                  section.style.display = 'block';
                  section.classList.add('active-section');
                  sectionFound = true;
              } else {
                  section.style.display = 'none';
                  section.classList.remove('active-section');
              }
          });
  
          if (!sectionFound) {
              console.warn(`Section with ID '${sectionId}' not found. Defaulting to home.`);
              sectionId = 'home'; // Fallback
              history.replaceState({ section: 'home' }, "", `#home`);
              const homeEl = document.getElementById('home');
              if (homeEl) {
                  homeEl.style.display = 'block';
                  homeEl.classList.add('active-section');
              } else {
                  console.error("Default section 'home' also not found!");
                  return;
              }
          }
  
           // Update active state in sidebar nav
           navLinks.forEach(link => {
              const linkSectionId = link.getAttribute('href')?.substring(1);
               if (linkSectionId && linkSectionId === sectionId) {
                   link.classList.add('active');
               } else {
                   link.classList.remove('active');
               }
           });
  
  
          // Trigger actions based on section
          if (sectionId === 'home') {
              fetchAndDisplayListings();
          } else if (sectionId === 'listing-detail' && data?.listingId) {
              fetchAndDisplayListingDetail(data.listingId);
          } else if (sectionId === 'post-offer') {
              resetPostOfferForm();
          } else if (sectionId === 'favorites') {
              displayFavorites();
          } else if (sectionId === 'user-page') {
              // Authentication check and profile display moved into displayUserProfile
              displayUserProfile();
          }
          // Add other section logic (settings, about, contact, policy) here if needed
          // Auth sections ('login', 'register') are handled by showSection, but their forms
          // and messages are managed by the separate modal/section logic.
  
          window.scrollTo(0, 0);
      }
  
      // Sidebar/Menu Navigation Listeners
      const navLinks = document.querySelectorAll('.sidebar-nav a');
      navLinks.forEach(link => {
          link.addEventListener('click', (e) => {
              const targetHref = link.getAttribute('href');
              if (targetHref && targetHref.startsWith('#')) {
                  const targetSectionId = targetHref.substring(1);
                  const targetElement = document.getElementById(targetSectionId);
  
                  // Check if the target is a defined page section
                  const isPageSection = targetElement && targetElement.classList.contains('page-section');
  
                  // Check if it's an auth link (login/register)
                  const isAuthLink = targetSectionId === 'login' || targetSectionId === 'register';
  
  
                  if (isPageSection || isAuthLink) {
                      e.preventDefault();
                      // Close sidebar on mobile before navigating
                      if (sidebar && sidebar.classList.contains('open') && window.innerWidth < 993) {
                          sidebar.classList.remove('open');
                      }
  
                      // Handle login/register navigation differently if using a modal
                      // (Your HTML/CSS/JS seems to have BOTH modal login/register *and* section login/register)
                      // Assuming you want to use the SECTIONS for login/register now based on the latest HTML
                      // If you prefer modals, we need to revisit this part.
                      history.pushState({ section: targetSectionId }, "", `#${targetSectionId}`);
                      showSection(targetSectionId);
  
                  }
                  // Allow default for non-section links or external links
              }
          });
      });
  
      // Browser History Navigation (Back/Forward)
      window.addEventListener('popstate', (event) => {
          console.log("Popstate triggered:", event.state);
          const state = event.state;
          if (state && state.section) {
              showSection(state.section, state.data);
          } else {
              // Fallback for initial load or manual hash changes
              const hash = window.location.hash.substring(1);
              let targetSectionId = 'home';
              let targetData = null;
              if (hash.startsWith('listing-detail')) {
                  const urlParams = new URLSearchParams(hash.split('?')[1]);
                  const listingId = urlParams.get('id');
                  if (listingId) {
                      targetSectionId = 'listing-detail';
                      targetData = { listingId: listingId };
                  } else {
                       history.replaceState({ section: 'home' }, "", `#home`); // Correct invalid hash
                  }
              } else if (hash && document.getElementById(hash)?.classList.contains('page-section')) {
                  targetSectionId = hash;
              }
               // Ensure state is correctly set for the initial/fallback section
              history.replaceState({ section: targetSectionId, data: targetData }, "", `#${targetSectionId}${targetData?.listingId ? '?id='+targetData.listingId : ''}`);
              showSection(targetSectionId, targetData);
          }
      });
  
  
      // --- Post Offer Form ---
      function resetPostOfferForm() {
           if (postOfferForm) postOfferForm.reset();
           if (postOfferMessage) {
               postOfferMessage.textContent = '';
               postOfferMessage.className = 'message'; // Reset class
               postOfferMessage.style.display = 'none'; // Hide message area
           }
           // Reset char counter display
           if (descriptionInput && descriptionCharCount) {
               descriptionCharCount.textContent = descriptionInput.value.length; // Update based on reset value (usually 0)
               if (counterContainer) counterContainer.classList.remove('warn', 'limit');
           }
           // Reset image previews
           const imagePreviewArea = document.getElementById('post-image-preview');
           if (imagePreviewArea) imagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>'; // Show placeholder again
            applyTranslations(currentLanguage); // Translate placeholder
       }
  
      if (postOfferForm) {
          // Character Counter Logic
          if (descriptionInput && descriptionCharCount && counterContainer) {
              const maxLength = parseInt(descriptionInput.getAttribute('maxlength') || '1000', 10);
              descriptionInput.addEventListener('input', () => {
                  const currentLength = descriptionInput.value.length;
                  descriptionCharCount.textContent = currentLength;
                  counterContainer.classList.toggle('warn', currentLength > maxLength * 0.9 && currentLength <= maxLength);
                  counterContainer.classList.toggle('limit', currentLength > maxLength);
              });
              // Initialize counter on load
               descriptionCharCount.textContent = descriptionInput.value.length;
          }
  
          // Form Submission Handler
          postOfferForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              if (!postOfferMessage) return; // Should not happen but safety check
  
              const token = localStorage.getItem('token');
              if (!token) {
                  postOfferMessage.textContent = translations[currentLanguage]?.loginRequiredPost || translations.en.loginRequiredPost;
                  postOfferMessage.className = 'message-area error';
                  postOfferMessage.style.display = 'block';
                  applyTranslations(currentLanguage); // Translate message
                  setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                  }, 2000);
                  return;
              }
  
              // Basic client-side validation (check required fields in formData)
               const formData = new FormData(postOfferForm);
               let allRequiredFieldsFilled = true;
               const requiredFields = ['title', 'price', 'description', 'offerType', 'propertyType', 'location']; // Add more as needed
               for (const field of requiredFields) {
                   if (!formData.has(field) || formData.get(field).trim() === '') {
                       allRequiredFieldsFilled = false;
                       break;
                   }
               }
               // Specific check for radio buttons if needed, or rely on 'required' attribute
               const offerType = formData.get('offerType');
               if (!offerType) allRequiredFieldsFilled = false;
  
  
               if (!allRequiredFieldsFilled) {
                   postOfferMessage.textContent = translations[currentLanguage]?.fillRequiredFields || translations.en.fillRequiredFields;
                   postOfferMessage.className = 'message-area error';
                   postOfferMessage.style.display = 'block';
                   applyTranslations(currentLanguage);
                   return;
               }
  
  
              postOfferMessage.textContent = translations[currentLanguage]?.submittingOffer || translations.en.submittingOffer;
              postOfferMessage.className = 'message-area info';
              postOfferMessage.style.display = 'block'; // Show info message
               applyTranslations(currentLanguage); // Translate message
  
  
              const userId = JSON.parse(localStorage.getItem('userInfo'))?.id; // Get actual user ID from local storage
               if (!userId) {
                   console.error("User ID not found in local storage, but token exists.");
                   postOfferMessage.textContent = "User information missing. Please re-login.";
                   postOfferMessage.className = 'message-area error';
                   postOfferMessage.style.display = 'block';
                   applyTranslations(currentLanguage);
                   // Consider forcing logout and redirecting to login
                   localStorage.removeItem('token');
                   localStorage.removeItem('userInfo');
                   updateAuthUI();
                   setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                   }, 2000);
                   return;
               }
              // Add user ID to form data if your backend expects it this way
              // formData.append('userId', userId); // Your backend gets userId from the token, so likely not needed here
  
              try {
                  const files = offerImagesInput?.files;
                  if (files && files.length > 0) {
                      const uploadPromises = Array.from(files).map(file => uploadFileToFirebaseClientCompat(file, userId));
                      const uploadedUrls = await Promise.all(uploadPromises);
                      // Check for upload errors
                       const failedUploads = uploadedUrls.filter(url => url === null).length;
                       if (failedUploads > 0) {
                            throw new Error(`Failed to upload ${failedUploads} image(s).`);
                       }
                      // Append the list of URLs as a single JSON string
                      formData.append('imageUrls', JSON.stringify(uploadedUrls));
                  } else {
                      // Explicitly append an empty array or skip if no images
                      formData.append('imageUrls', JSON.stringify([]));
                  }
  
                  // Construct the body for the fetch request
                   // Note: fetch with FormData does not require 'Content-Type': 'multipart/form-data' header
                   // The browser sets it correctly, including the boundary.
                  const response = await fetch('/api/offers', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData, // Use FormData directly
                  });
  
                  const result = await response.json(); // Parse JSON response
  
                  if (response.ok) {
                      console.log('Offer submitted successfully:', result);
                      postOfferMessage.textContent = translations[currentLanguage]?.offerSuccess || translations.en.offerSuccess;
                      postOfferMessage.className = 'message-area success';
                      applyTranslations(currentLanguage);
                      resetPostOfferForm();
                      // Delay redirect slightly
                      setTimeout(() => {
                          history.pushState({ section: 'home' }, "", `#home`);
                          showSection('home', { navigatedFromSuccess: true }); // Pass data if needed
                      }, 1500); // Redirect after 1.5 seconds
                  } else {
                       console.error('Failed to post offer (Server Response):', result);
                      // Handle server-side validation errors or other API errors
                      let errorMessage = result?.message || `Failed to post offer. Server responded with status ${response.status}.`;
                      if (result?.errors && Array.isArray(result.errors)) {
                          // Display validation errors if provided by the backend (from Zod middleware)
                          const validationDetails = result.errors.map(e => `${e.field.split('.').pop() || 'Field'}: ${e.message}`).join(', ');
                          errorMessage += ` Details: ${validationDetails}`;
                      }
                      postOfferMessage.textContent = errorMessage;
                      postOfferMessage.className = 'message-area error';
                      postOfferMessage.style.display = 'block'; // Ensure message is visible
                      applyTranslations(currentLanguage); // Translate message
                  }
              } catch (error) {
                  console.error('Error submitting offer (Client-side or Network):', error);
                  postOfferMessage.textContent = translations[currentLanguage]?.offerFailNetwork || translations.en.offerFailNetwork; // Or a more specific error like `error.message`
                  postOfferMessage.className = 'message-area error';
                  postOfferMessage.style.display = 'block'; // Ensure message is visible
                  applyTranslations(currentLanguage); // Translate message
              }
          });
  
          if (offerImagesInput && postImagePreviewArea) {
              offerImagesInput.addEventListener('change', (event) => {
                  postImagePreviewArea.innerHTML = ''; // Clear previous previews
                  const files = event.target.files;
                  if (!files || files.length === 0) {
                      postImagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>';
                      applyTranslations(currentLanguage);
                      return;
                  }
                  if (files.length > 5) {
                      alert('You can only upload a maximum of 5 images.');
                      offerImagesInput.value = ''; // Clear the file input
                      postImagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>'; // Show placeholder again
                       applyTranslations(currentLanguage);
                      return;
                  }
                  Array.from(files).forEach(file => {
                      if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                              const img = document.createElement('img');
                              img.src = e.target.result;
                              img.alt = file.name;
                              img.style.height = '70px';
                              img.style.width = 'auto';
                              img.style.objectFit = 'cover';
                              img.style.margin = '5px';
                              img.style.borderRadius = '4px';
                              postImagePreviewArea.appendChild(img);
                          };
                          reader.readAsDataURL(file);
                      } else {
                           console.warn(`Skipping non-image file: ${file.name} (${file.type})`);
                           // Optionally provide feedback to the user that a file was skipped
                      }
                  });
              });
          }
      }
  
      // --- Search & Filter Listeners ---
      if (applyFiltersBtn) {
          applyFiltersBtn.addEventListener('click', () => {
              const filters = {
                  offerType: filterTypeSelect?.value,
                  location: filterLocationInput?.value.trim(),
                  minPrice: filterPriceMinInput?.value,
                  maxPrice: filterPriceMaxInput?.value,
                  propertyType: document.getElementById('filter-property-type')?.value, // Add if you have property type filter
                  // search: searchInput?.value.trim() // Optional: include search term - search is separate currently
              };
              // Remove empty filters
              Object.keys(filters).forEach(key => {
                  const value = filters[key];
                  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || value === 'all') {
                       delete filters[key];
                  }
              });
              console.log("Applying filters:", filters);
              fetchAndDisplayListings(filters); // Refetch with filters
              if (filterDropdown) filterDropdown.classList.remove('show'); // Close dropdown
          });
      }
  
      if (searchButton && searchInput) {
          const performSearch = () => {
               const searchTerm = searchInput.value.trim();
               console.log("Applying search:", searchTerm);
               // Your server handles search and filters in the same /api/listings endpoint
               // You should combine the search term with current filter values if the dropdown is open/applied
               // For simplicity now, this just applies the search term alone.
               // If you want search+filters, you need to read the filter dropdown values here too.
               fetchAndDisplayListings({ search: searchTerm }); // Refetch with search term
          };
          searchButton.addEventListener('click', performSearch);
          searchInput.addEventListener('keypress', (event) => {
              if (event.key === 'Enter') {
                  event.preventDefault();
                  performSearch();
              }
          });
      }
  
      // Filter Dropdown Toggle
      if (filterToggle && filterDropdown) {
          filterToggle.addEventListener('click', (e) => {
              e.stopPropagation();
              filterDropdown.classList.toggle('show');
          });
          // Close dropdown when clicking outside
          document.addEventListener('click', (e) => {
               // Ensure click is outside toggle button AND dropdown content
              if (filterDropdown.classList.contains('show') && !filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                  filterDropdown.classList.remove('show');
              }
          });
      }
  
  
      // --- UI Toggles (Menu, Dark Mode, Language) ---
      // Burger Menu
      if (menuToggle && sidebar) {
          menuToggle.addEventListener('click', (e) => {
              e.stopPropagation();
              sidebar.classList.toggle('open');
          });
      }
      if (closeMenuButton && sidebar) {
          closeMenuButton.addEventListener('click', () => sidebar.classList.remove('open'));
      }
      // Close sidebar on outside click (mobile)
       document.addEventListener('click', (event) => {
           if (sidebar?.classList.contains('open') &&
               !sidebar.contains(event.target) &&
               !menuToggle?.contains(event.target) &&
               window.innerWidth < 993) {
               sidebar.classList.remove('open');
           }
       });
  
      // Dark Mode
      if (darkModeToggle) {
           const applyDarkMode = (isDark) => {
               document.body.classList.toggle('dark', isDark);
               localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
               console.log(`Dark mode ${isDark ? 'enabled' : 'disabled'}`);
           };
           const savedDarkMode = localStorage.getItem('darkMode');
           // Check if window.matchMedia is supported
           const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
           let initialDarkModeState = savedDarkMode === 'enabled' || (savedDarkMode !== 'disabled' && prefersDark);
           darkModeToggle.checked = initialDarkModeState;
           applyDarkMode(initialDarkModeState);
           darkModeToggle.addEventListener('change', () => applyDarkMode(darkModeToggle.checked));
           // Optional: Listen for system preference changes
           if(window.matchMedia) { // Check for support before adding listener
               window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                   if (localStorage.getItem('darkMode') === null) { // Only apply if user hasn't manually toggled
                       darkModeToggle.checked = event.matches;
                       applyDarkMode(event.matches);
                   }
               });
           }
      } else { // Apply system preference if toggle is missing (basic fallback)
           if (localStorage.getItem('darkMode') !== 'disabled' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
               document.body.classList.add('dark');
           }
      }
  
      // Language
      const translations = {
           // Add EN and AR translations here as previously defined
           // ... (Include the full translations object from previous responses) ...
          en: {
              pageTitle: "Baytak - Your Home", navHome: "Home", navFavorites: "Favorites", navPostOffer: "Post Offer", navUser: "User Account", navSettings: "Settings", navAbout: "About Us", navContact: "Contact Us", navPolicy: "Use Policy", siteName: "Baytak", siteSubName: "Your Home", searchPlaceholder: "Search for a property...", filterBtn: "Filter", filterType: "Type:", filterAll: "All", filterRent: "Rent", filterSale: "Sale", filterLocation: "Location:", filterPrice: "Price:", applyFiltersBtn: "Apply Filters", allListingsTitle: "Available Properties", loadingListings: "Loading listings...", noListingsFound: "No listings found matching your criteria.", listingDetailPageTitle: "Property Details", detailBasicInfoLabel: "Basic Information", detailDescLabel: "Description", detailFeaturesLabel: "Features", noFeaturesListed: "No features listed.", detailLocationLabel: "Location", mapPlaceholder: "Map Area Placeholder", detailSellerLabel: "Seller Information", contactSellerBtn: "Contact Seller", postOfferPageTitle: "Post Your New Offer", offerTitleLabel: "Offer Title", offerTypeLabel: "Offer Type:", offerTypeRent: "Rent", offerTypeSale: "Sale", offerPriceLabel: "Price (AED)", offerDescLabel: "Detailed Description", offerLocationLabel: "Location/Address", offerPropTypeLabel: "Property Type:", propTypeApartment: "Apartment", propTypeHouse: "House", propTypeVilla: "Villa", propTypeLand: "Land", offerBedroomsLabel: "Bedrooms:", offerBathroomsLabel: "Bathrooms:", offerAreaLabel: "Area (m²):", offerAmenitiesLabel: "Additional Amenities:", amenityPool: "Pool", amenityGarage: "Garage", amenityGarden: "Garden", offerImagesLabel: "Choose Property Images", submitOfferBtn: "Submit Offer for Review", favoritesPageTitle: "Favorite Properties", noFavorites: "You haven't favorited any properties yet.", userPageTitle: "User Account", usernameLabel: "Username", contactInfoLabel: "Contact Information", offersLabel: "Your Offers", editOfferTooltip: "Edit Offer", deleteOfferTooltip: "Delete Offer", noUserOffers: "You haven't posted any offers yet.", settingsPageTitle: "Settings", languageLabel: "Language", langToggleText: "العربية", darkModeLabel: "Dark Mode", notificationsLabel: "Notifications", cookiesLabel: "Cookies", showNameLabel: "Show Name on Posts", showContactLabel: "Show Contact Info", showOldOffersLabel: "Show Old Offers", aboutTitle: "About Us", aboutSubTitle: "WHO ARE WE", aboutDesc1: "We specialize in providing the best properties for you. (Placeholder Text)", moaydName: "Moayd", moaydDesc: "Computer Engineering Student, Graphic Designer, Beginner Programmer, Ambitious, Passionate.", akramName: "Akram", akramDesc: "Student, Moayd's friend, figuring out his path. (Placeholder Text)", contactTitle: "Contact Us", contactSubTitle: "CONTACT US", contactDesc: "Reach out to us if you face any issues or to report bugs.", contactServer: "24/7 SERVER", contactNotice: "Please note that all calls are recorded.", policyTitle: "Use Policy", policySubTitle: "USE POLICY", policyDesc1: "Use this site at your own risk. We are not responsible for any issues. (Placeholder Text)", policyDesc2: "For legal matters, contact Akram. For financial matters, contact Moayd. (Placeholder Text)", listingNotFound: "Listing not found.", loginRequiredPost: "Please log in to post an offer.", submittingOffer: "Submitting offer...", offerSuccess: "Offer submitted successfully!", offerFailNetwork: "Network error. Please try again.", noImagesSelected: "No images selected.", loginTitle: "Login", registerTitle: "Register", emailLabel: "Email", passwordLabel: "Password", btnLoginAction: "Login", btnRegisterAction: "Register", passwordHint: "Minimum 6 characters", dontHaveAccount: "Don't have an account?", registerLink: "Register here", alreadyHaveAccount: "Already have an account?", loginLink: "Login here", welcome: "Welcome", btnLoginSidebar: "Login", btnRegisterSidebar: "Register", btnLogout: "Logout", offerFailGeneric: "Failed to submit offer.", fillRequiredFields: "Please fill in all required fields.", loginRequiredProfile: "Please log in to view your profile.", loggingIn: "Logging in...", loginSuccess: "Login successful!", loginFail: "Login failed", registering: "Registering...", registerSuccess: "Registration successful! Please login.", registerFail: "Registration failed",
               phoneNotProvided: "Not Provided", // Added missing keys
               fullnameNotProvided: "Not Provided", // Added missing keys
               profileNotLoaded: "Could not load profile." // Added missing key
          },
          ar: {
              pageTitle: "بيتك - منزلك", navHome: "الرئيسية", navFavorites: "المفضلة", navPostOffer: "انشر عرض", navUser: "حساب المستخدم", navSettings: "الإعدادات", navAbout: "من نحن", navContact: "تواصل معنا", navPolicy: "سياسة الاستخدام", siteName: "بيتك", siteSubName: "منزلك", searchPlaceholder: "ابحث عن عقار...", filterBtn: "فلترة", filterType: "النوع:", filterAll: "الكل", filterRent: "إيجار", filterSale: "بيع", filterLocation: "الموقع:", filterPrice: "السعر:", applyFiltersBtn: "تطبيق الفلاتر", allListingsTitle: "العقارات المتاحة", loadingListings: "جاري تحميل العروض...", noListingsFound: "لم يتم العثور على عروض تطابق بحثك.", listingDetailPageTitle: "تفاصيل العقار", detailBasicInfoLabel: "معلومات أساسية", detailDescLabel: "الوصف", detailFeaturesLabel: "المميزات", noFeaturesListed: "لا توجد مميزات مدرجة.", detailLocationLabel: "الموقع", mapPlaceholder: "منطقة الخريطة", detailSellerLabel: "معلومات البائع/المؤجر", contactSellerBtn: "تواصل مع البائع", postOfferPageTitle: "انشر عرضك الجديد", offerTitleLabel: "عنوان العرض", offerTypeLabel: "نوع العرض:", offerTypeRent: "إيجار", offerTypeSale: "بيع", offerPriceLabel: "السعر (درهم)", offerDescLabel: "الوصف التفصيلي", offerLocationLabel: "الموقع/العنوان", offerPropTypeLabel: "نوع العقار:", propTypeApartment: "شقة", propTypeHouse: "منزل", propTypeVilla: "فيلا", propTypeLand: "أرض", offerBedroomsLabel: "غرف نوم:", offerBathroomsLabel: "حمامات:", offerAreaLabel: "المساحة (م²):", offerAmenitiesLabel: "مرافق إضافية:", amenityPool: "مسبح", amenityGarage: "جراج", amenityGarden: "حديقة", offerImagesLabel: "اختر صور العقار", submitOfferBtn: "أرسل العرض للمراجعة", favoritesPageTitle: "العقارات المفضلة", noFavorites: "لم تقم بإضافة أي عقارات للمفضلة بعد.", userPageTitle: "حساب المستخدم", usernameLabel: "اسم المستخدم", contactInfoLabel: "معلومات التواصل", offersLabel: "عروضك", editOfferTooltip: "تعديل العرض", deleteOfferTooltip: "حذف العرض", noUserOffers: "لم تنشر أي عروض بعد.", settingsPageTitle: "الإعدادات", languageLabel: "اللغة", langToggleText: "English", darkModeLabel: "الوضع المظلم", notificationsLabel: "الاشعارات", cookiesLabel: "ملفات تعريف الارتباط (Cookies)", showNameLabel: "إظهار الاسم عند النشر", showContactLabel: "إظهار معلومات التواصل", showOldOffersLabel: "إظهار العروض القديمة", aboutTitle: "من نحن", aboutSubTitle: "من نحن", aboutDesc1: "متخصصين الهبد نفعل لك اي شي ووقفه التبجيله كاد شات جبت ان يكون مبرمجا.", moaydName: "مؤيد", moaydDesc: "طالب هندسة حاسوب, مصمم جرافيك, مبتدئ في عالم البرمجة, طموح, شغوف.", akramName: "اكرم", akramDesc: "طالب, يد بت عمو + صاحب مؤيد هو زاتو ما عارف نفسو بعمل شنو.", contactTitle: "تواصل معنا", contactSubTitle: "تواصل معنا", contactDesc: "تواصل معنا في حال واجهتك أي مشكلة في الموقع او للابلاغ عن ثغرات.", contactServer: "خدمة 24/7", contactNotice: "يرجى الملاحظة: يتم تسجيل جميع المكالمات.", policyTitle: "سياسة الاستخدام", policySubTitle: "سياسة الاستخدام", policyDesc1: "عاين الملخص بتاع الكلام ما عندك اي حاجة عندنا , تستعمل تطبيقنا او موقعنا تحت مسؤليتك نتسرق , تتنهب , مافي زول بشتغل بيك , مافي زول ماسكك من أضانك قال ليك استعمل موقعنا شافع انت ؟ يقولو ليك تعال شوف الموقع الفلاني طوالي تقوم تخش ؟ والله بليد كيف المهم الكلام دا واضح , شغل محاكم وبتاع دا ما بنفع معانا", policyDesc2: "القروش ماسكها مؤيد والمسائل القانونية عند اكرم يعني عندكم اي مشكلة امشو لي اكرم طوالي ما بقصر", listingNotFound: "العرض غير موجود.", loginRequiredPost: "يرجى تسجيل الدخول لنشر عرض.", submittingOffer: "جاري إرسال العرض...", offerSuccess: "تم إرسال العرض بنجاح!", offerFailNetwork: "خطأ في الشبكة. الرجاء المحاولة مرة أخرى.", noImagesSelected: "لم يتم اختيار صور.", loginTitle: "تسجيل الدخول", registerTitle: "تسجيل حساب جديد", emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور", btnLoginAction: "دخول", btnRegisterAction: "تسجيل", passwordHint: "6 أحرف على الأقل", dontHaveAccount: "ليس لديك حساب؟", registerLink: "سجل هنا", alreadyHaveAccount: "لديك حساب بالفعل؟", loginLink: "سجل الدخول هنا", btnLoginSidebar: "دخول", btnRegisterSidebar: "تسجيل", btnLogout: "خروج", offerFailGeneric: "فشل إرسال العرض.", fillRequiredFields: "يرجى ملء جميع الحقول المطلوبة.", loginRequiredProfile: "يرجى تسجيل الدخول لعرض ملفك الشخصي.", loggingIn: "جاري تسجيل الدخول...", loginSuccess: "تم تسجيل الدخول بنجاح!", loginFail: "فشل تسجيل الدخول", registering: "جاري التسجيل...", registerSuccess: "تم التسجيل بنجاح! يرجى تسجيل الدخول.", registerFail: "فشل التسجيل",
              phoneNotProvided: "لم يتم توفيره", // Added missing keys
              fullnameNotProvided: "لم يتم توفيره", // Added missing keys
              profileNotLoaded: "تعذر تحميل الملف الشخصي." // Added missing key
          }
       };
  
       function applyTranslations(lang) {
           console.log(`Applying translations for: ${lang}`);
           currentLanguage = lang; // Update global state
           const elements = document.querySelectorAll('[data-i18n]');
           elements.forEach(el => {
               const key = el.getAttribute('data-i18n');
               const translation = translations[lang]?.[key] || translations.en?.[key]; // Fallback to EN
               if (translation !== undefined) {
                  // Store original only once
                  if (!el.dataset.originalText) el.dataset.originalText = el.textContent;
                  el.textContent = translation;
               } else {
                   // Restore original if key not found? Or leave as is? Currently leaves as is.
                   console.warn(`Translation key "${key}" not found for lang "${lang}" or fallback "en"`);
                   // if(el.dataset.originalText) el.textContent = el.dataset.originalText;
               }
           });
  
           // Placeholders
           document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
               const key = el.getAttribute('data-i18n-placeholder');
               const translation = translations[lang]?.[key] || translations.en?.[key];
               if (translation !== undefined) {
                  if (!el.dataset.originalPlaceholder) el.dataset.originalPlaceholder = el.getAttribute('placeholder');
                   el.setAttribute('placeholder', translation);
               } else {
                    console.warn(`Placeholder key "${key}" not found for lang "${lang}" or fallback "en"`);
                    // if(el.dataset.originalPlaceholder) el.setAttribute('placeholder', el.dataset.originalPlaceholder);
               }
           });
  
           // Tooltips (title attribute)
           document.querySelectorAll('[data-i18n-title]').forEach(el => {
               const key = el.getAttribute('data-i18n-title');
               const translation = translations[lang]?.[key] || translations.en?.[key];
               if (translation !== undefined) {
                   el.setAttribute('title', translation);
               } else {
                    console.warn(`Title key "${key}" not found for lang "${lang}" or fallback "en"`);
               }
           });
  
           // Page Title
           const titleElement = document.querySelector('title[data-i18n]');
           if (titleElement) {
               const key = titleElement.getAttribute('data-i18n');
               const translation = translations[lang]?.[key] || translations.en?.[key];
               if (translation) document.title = translation;
           }
       }
  
       function setLanguage(lang) {
          if (!['en', 'ar'].includes(lang)) lang = 'ar';
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
          document.body.classList.toggle('rtl', lang === 'ar');
          document.body.classList.toggle('ltr', lang === 'en');
          // Update button text
          if (languageToggle) {
              const buttonTextSpan = languageToggle.querySelector('span');
              if (buttonTextSpan) {
                  buttonTextSpan.textContent = lang === 'ar' ? (translations.en?.langToggleText || 'English') : (translations.ar?.langToggleText || 'العربية');
              }
          }
          localStorage.setItem('lang', lang);
          applyTranslations(lang);
          console.log(`Language set to: ${lang}, direction: ${document.documentElement.dir}`);
       }
  
       if (languageToggle) {
          languageToggle.addEventListener('click', () => {
              const newLang = currentLanguage === 'ar' ? 'en' : 'ar';
              setLanguage(newLang);
          });
       }
  
  
      // --- Helper Functions ---
      function showLoading(container, isLoading, i18nKey = 'loadingListings') {
          if (!container) return;
          // Remove existing loading placeholder if present, unless we are explicitly showing loading
           if (!isLoading) {
               const existingPlaceholder = container.querySelector('.placeholder-text.loading');
               if (existingPlaceholder) {
                   existingPlaceholder.remove();
               }
           }
  
          const existingPlaceholder = container.querySelector('.placeholder-text.loading');
          if (isLoading) {
              if (!existingPlaceholder) {
                  const placeholder = document.createElement('p');
                  placeholder.className = 'placeholder-text loading'; // Add loading class
                  placeholder.dataset.i18n = i18nKey;
                   // Use translations directly, fallback to English/default text
                  placeholder.textContent = translations[currentLanguage]?.[i18nKey] || translations.en?.[i18nKey] || 'Loading...';
                  container.insertBefore(placeholder, container.firstChild); // Add at the beginning
                  applyTranslations(currentLanguage); // Ensure translation if needed (redundant but safe)
              }
               // Removed loadingIndicator variable as it's null
              // if(loadingIndicator) loadingIndicator.style.display = 'block'; // Show general spinner if exists
          } else {
               // Handled removal at the start of the function now
               // if(loadingIndicator) loadingIndicator.style.display = 'none'; // Hide general spinner
          }
      }
  
  
      // --- Initial Load ---
      function initializeApp() {
          setLanguage(currentLanguage); // Set initial language and apply translations
  
          // Determine initial section from hash
          const hash = window.location.hash.substring(1);
          let initialSectionId = 'home';
          let initialData = null;
  
          if (hash.startsWith('listing-detail')) {
              const urlParams = new URLSearchParams(hash.split('?')[1]);
              const listingId = urlParams.get('id');
              if (listingId) {
                  initialSectionId = 'listing-detail';
                  initialData = { listingId: listingId };
              } else {
                  // If hash is #listing-detail but no id, treat as invalid, redirect to home
                  console.warn("Invalid #listing-detail hash: Missing ID. Redirecting to #home.");
                  history.replaceState({ section: 'home' }, "", `#home`);
                  initialSectionId = 'home';
                  initialData = null;
              }
          } else if (hash && document.getElementById(hash)?.classList.contains('page-section')) {
              initialSectionId = hash;
          } else if (hash) {
               // Handle other potential invalid hashes (e.g., #xyz which isn't a section)
               console.warn(`Unknown hash '${hash}'. Redirecting to #home.`);
               history.replaceState({ section: 'home' }, "", `#home`);
               initialSectionId = 'home';
               initialData = null;
          }
           // If hash was empty, initialSectionId is already 'home', no history manipulation needed for root.
  
           console.log(`Initial load: section='${initialSectionId}'`, initialData);
           // Push the initial state if it's not the default 'home' state (already replaced above if needed)
           // This ensures the first state is recorded if starting somewhere other than #home
           // However, the logic above already uses history.replaceState for invalid hashes.
           // For a valid non-home initial hash, popstate will handle it,
           // or the first showSection call implicitly replaces the initial empty state.
           // Let's simplify and just call showSection. The history state management on navigation clicks and popstate is more critical.
           showSection(initialSectionId, initialData);
  
  
           // --- Initial UI Setup ---
           // This was previously outside DOMContentLoaded, moved inside.
           // It should be called after the language is set and initial section is shown.
           updateAuthUI();
  
      }
  
      // --- DOM Element Selectors (Consolidated) ---
      // Moved these up to the top for better organization.
      // Ensure you don't have duplicate declarations.
      // Commenting out duplicates if they exist here, relying on the declarations at the top.
      /*
      const loginNavBtn = document.getElementById('login-nav-btn'); // Check if this exists in HTML, seems to be handled by sidebar links now?
      const registerNavBtn = document.getElementById('register-nav-btn'); // Check if this exists in HTML
      const logoutBtn = document.getElementById('logout-btn'); // Check if this exists in HTML, sidebar has logoutBtnSidebar
      const userGreeting = document.getElementById('user-greeting'); // Check if this exists in HTML, sidebar has userGreetingSidebar
      const authModal = document.getElementById('auth-modal'); // Check if you are still using a modal based on the latest HTML
      const closeModalBtn = document.getElementById('close-auth-modal'); // Check if modal is used
      const loginFormDiv = document.getElementById('login-form'); // Check if these are needed if using sections
      const registerFormDiv = document.getElementById('register-form'); // Check if these are needed if using sections
      const showRegisterLink = document.getElementById('show-register'); // Check if these are needed if using sections
      const showLoginLink = document.getElementById('show-login'); // Check if these are needed if using sections
      const loginForm = document.getElementById('login-form-actual'); // Check if these are needed if using sections
      const registerForm = document.getElementById('register-form-actual'); // Check if these are needed if using sections
      const authMessageDiv = document.getElementById('auth-message'); // Check if this is needed if using section-specific messages
      const offerForm = document.getElementById('offer-form'); // Check if this is used, seems postOfferForm is used instead
      */
  
      // Based on the provided HTML, auth forms are sections:
      const loginSectionElement = document.getElementById('login');
      const registerSectionElement = document.getElementById('register');
  
      // --- Helper Functions (Updated for Section Auth) ---
      // These functions seem to be designed for a modal.
      // If you are using the section-based forms now, you might not need these.
      // Keeping them commented out for now if they were for a modal.
      /*
      function displayAuthMessage(section, message, isError = false) {
          const messageDiv = section === 'login' ? loginMessageSection : registerMessageSection; // Uses loginMessageSection/registerMessageSection
          // ... (rest of the function) ...
      }
  
      function openAuthModal(showLogin = true) { // Modal function
         // ...
      }
  
      function closeAuthModal() { // Modal function
          // ...
      }
      */
  
       // UpdateAuthUI function is used, let's keep it and ensure it targets sidebar elements
       // Moved up with other helper functions.
  
      // --- API Call Functions (Updated to use correct message areas) ---
      // Modified handleLogin and handleRegister to use loginMessageSection/registerMessageSection directly
      async function handleLogin(email, password) {
          // Use the message area within the login section
          const messageDiv = loginMessageSection; // Already defined at the top
          if (!messageDiv) { console.error("Login message area not found."); return; }
  
          messageDiv.textContent = translations[currentLanguage]?.loggingIn || translations.en.loggingIn;
          messageDiv.className = 'message-area info';
          messageDiv.style.display = 'block';
          applyTranslations(currentLanguage);
  
          try {
              const response = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password }),
              });
  
              const data = await response.json();
  
              if (response.ok) {
                  localStorage.setItem('token', data.token);
                  localStorage.setItem('userInfo', JSON.stringify(data.user));
                  messageDiv.textContent = translations[currentLanguage]?.loginSuccess || translations.en.loginSuccess;
                  messageDiv.className = 'message-area success';
                  applyTranslations(currentLanguage);
                  updateAuthUI();
                  // Redirect to home or previous page after successful login
                  setTimeout(() => {
                       history.pushState({ section: 'home' }, "", `#home`); // Redirect to home
                       showSection('home');
                  }, 1000);
              } else {
                   // Server returned non-OK status (e.g., 401, 400)
                   let errorMessage = data.message || `Login failed with status: ${response.status}`;
                   if (data.errors && Array.isArray(data.errors)) { // Check for Zod-like errors
                        errorMessage += " Details: " + data.errors.map(e => `${e.field.split('.').pop()}: ${e.message}`).join(', ');
                   }
                  throw new Error(errorMessage); // Throw to be caught by the catch block
              }
  
          } catch (error) {
              console.error('Login failed:', error);
              localStorage.removeItem('token');
              localStorage.removeItem('userInfo');
              updateAuthUI(); // Update UI to show logged out state
              messageDiv.textContent = `${translations[currentLanguage]?.loginFail || translations.en.loginFail}: ${error.message}`;
              messageDiv.className = 'message-area error';
              messageDiv.style.display = 'block';
              applyTranslations(currentLanguage);
          }
      }
  
      async function handleRegister(username, email, password) {
           // Use the message area within the register section
          const messageDiv = registerMessageSection; // Already defined at the top
           if (!messageDiv) { console.error("Register message area not found."); return; }
  
          const phoneInput = document.getElementById('register-phone-section'); // Ensure this exists
          const phone = phoneInput ? phoneInput.value.trim() : null;
  
          messageDiv.textContent = translations[currentLanguage]?.registering || translations.en.registering;
          messageDiv.className = 'message-area info';
          messageDiv.style.display = 'block';
          applyTranslations(currentLanguage);
  
          try {
              const response = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      username,
                      email,
                      password,
                      phone // Include phone in the body
                  }),
              });
  
              const data = await response.json();
  
              if (response.ok) {
                  console.log('Registration successful:', data);
                  messageDiv.textContent = translations[currentLanguage]?.registerSuccess || translations.en.registerSuccess;
                  messageDiv.className = 'message-area success';
                  messageDiv.style.display = 'block';
                   applyTranslations(currentLanguage);
                  // Clear forms
                  if(loginFormSection) loginFormSection.reset();
                  if(registerFormSection) registerFormSection.reset();
                   // Redirect to login section after successful registration
                   setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                   }, 1500); // Redirect after 1.5 seconds
              } else {
                   // Server returned non-OK status (e.g., 400)
                   let errorMessage = data.message || `Registration failed with status: ${response.status}`;
                   if (data.errors && Array.isArray(data.errors)) { // Check for Zod-like errors
                        errorMessage += " Details: " + data.errors.map(e => `${e.field.split('.').pop()}: ${e.message}`).join(', ');
                   }
                   throw new Error(errorMessage); // Throw to be caught by the catch block
              }
  
          } catch (error) {
              console.error('Registration failed:', error);
              messageDiv.textContent = `${translations[currentLanguage]?.registerFail || translations.en.registerFail}: ${error.message}`;
              messageDiv.className = 'message-area error';
              messageDiv.style.display = 'block';
              applyTranslations(currentLanguage);
          }
      }
  
      // --- Event Listeners (Updated for Section Auth) ---
      // Assuming the old modal-related buttons/elements like loginNavBtn, registerNavBtn, authModal, etc. are no longer used or targeted in HTML
      // and sidebar links now point to #login and #register sections.
  
      // Event listeners for the forms within the sections (loginFormSection, registerFormSection)
      // These were defined at the end of the script, consolidating them here.
  
      loginFormSection?.addEventListener('submit', (e) => {
          e.preventDefault();
          const emailInput = document.getElementById('login-email-section');
          const passwordInput = document.getElementById('login-password-section');
  
           if (!emailInput || !passwordInput) {
               console.error("Login form inputs not found.");
               const messageDiv = loginMessageSection;
               if(messageDiv) {
                   messageDiv.textContent = "Form elements missing. Cannot proceed.";
                   messageDiv.className = 'message-area error';
                   messageDiv.style.display = 'block';
               }
               return;
           }
  
          const email = emailInput.value;
          const password = passwordInput.value;
  
          if (!email || !password) {
               const messageDiv = loginMessageSection;
               if(messageDiv) {
                  messageDiv.textContent = translations[currentLanguage]?.fillRequiredFields || translations.en.fillRequiredFields;
                  messageDiv.className = 'message-area error';
                  messageDiv.style.display = 'block';
                   applyTranslations(currentLanguage);
               }
               return;
          }
  
          handleLogin(email, password);
      });
  
      registerFormSection?.addEventListener('submit', (e) => {
          e.preventDefault();
          const usernameInput = document.getElementById('register-username-section');
          const emailInput = document.getElementById('register-email-section');
          const passwordInput = document.getElementById('register-password-section');
  
           if (!usernameInput || !emailInput || !passwordInput) {
               console.error("Register form inputs not found.");
               const messageDiv = registerMessageSection;
               if(messageDiv) {
                   messageDiv.textContent = "Form elements missing. Cannot proceed.";
                   messageDiv.className = 'message-area error';
                   messageDiv.style.display = 'block';
               }
               return;
           }
  
          const username = usernameInput.value;
          const email = emailInput.value;
          const password = passwordInput.value;
  
           if (!username || !email || !password) {
              const messageDiv = registerMessageSection;
               if(messageDiv) {
                  messageDiv.textContent = translations[currentLanguage]?.fillRequiredFields || translations.en.fillRequiredFields;
                  messageDiv.className = 'message-area error';
                  messageDiv.style.display = 'block';
                   applyTranslations(currentLanguage);
               }
               return;
           }
          if (password.length < 6) {
              const messageDiv = registerMessageSection;
              if(messageDiv) {
                  messageDiv.textContent = translations[currentLanguage]?.passwordHint || translations.en.passwordHint;
                  messageDiv.className = 'message-area error'; // Use error for validation message
                  messageDiv.style.display = 'block';
                  applyTranslations(currentLanguage);
              }
              return;
          }
  
  
          handleRegister(username, email, password);
      });
  
      // Logout button in the sidebar
      logoutBtnSidebar?.addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          updateAuthUI();
           // Optionally show a message on the current page before redirecting
           const currentSectionId = window.location.hash.substring(1) || 'home';
           const currentSectionElement = document.getElementById(currentSectionId);
           if (currentSectionElement) {
                // Could add a temporary message div to the current section
                console.log("Logged out. Redirecting to home.");
           }
  
          history.pushState({ section: 'home' }, "", `#home`);
          showSection('home'); // Redirect to home page
      });
  
      // The offerForm?.addEventListener is now using postOfferForm, which is correct.
      // The logic seems mostly fine, using the postOfferMessage area.
  
      // --- Client-Side Image Upload Function (Already using compat syntax) ---
      // This function is already using the compat 'storage' object correctly.
      // No changes needed here based on the compat vs modular discussion.
      async function uploadFileToFirebaseClientCompat(file, userId) {
          if (!file || !userId) {
               console.error("uploadFileToFirebaseClientCompat: Invalid file or userId provided.");
               return null;
          }
          const uniqueFilename = `${uuidv4()}-${file.name}`;
          // Store files under a user-specific path
          const filePath = `listing-images/${userId}/${uniqueFilename}`;
          const storageRef = storage.ref(filePath); // Uses compat storage instance
  
          try {
              console.log(`Client Upload Compat: Starting upload for ${filePath}`);
              const uploadTask = storageRef.put(file);
  
              // Optional: Monitor progress - this is for UI feedback if you add it
              // uploadTask.on('state_changed', (snapshot) => { ... });
  
              // Wait for upload to complete
              // The on('state_changed') handler's complete callback runs,
              // but awaiting the task here is cleaner for getting the final URL.
              await uploadTask;
              console.log(`Client Upload Compat: Upload finished for ${filePath}. Getting URL...`);
  
              const downloadURL = await storageRef.getDownloadURL(); // Get URL *after* completion
              console.log(`Client Upload Compat: Got URL for ${filePath}: ${downloadURL}`);
              return downloadURL;
  
          } catch (error) {
              console.error(`Client Upload Compat: Failed to upload ${file.name}`, error);
              // Handle the error more gracefully in the UI?
              return null; // Return null on failure
          }
      }
  
      // Define uuidv4 if not already defined
      function uuidv4() {
          // Standard UUID v4 generation
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
          });
      }
  
      // --- DOMContentLoaded Ends ---
  }); // End DOMContentLoaded listener
  
  // The script tags from index.html provided were outside the script.js content.
  // They should remain in index.html as they were:
  /*
  <!-- NEW: Firebase v9 Compatibility SDK Scripts -->
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script> // Add auth if needed client-side
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script> // Add firestore if needed client-side
  <!-- Add other compat SDKs if needed -->
  
  <!-- Your existing script tag (NO type="module") -->
  <script src="script.js"></script>
  */