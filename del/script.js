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
      // NEW: Clear Images Button
      const clearImagesBtn = document.getElementById('clear-images-btn');
  
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
                  <img src="${imageUrl}" alt="${listing.title || 'Property Image'}" class="card-image" loading="lazy" onerror="this.onerror=null; this.src='/images/placeholder.webp';">
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
                  // Use a DocumentFragment for better performance
                  const fragment = document.createDocumentFragment();
                  listings.forEach(listing => {
                      const listingElement = createListingElement(listing);
                      if (listingElement) {
                          fragment.appendChild(listingElement);
                      }
                  });
                  listingsContainer.appendChild(fragment);
              }
          } catch (error) {
              console.error('Error fetching/displaying listings:', error);
              showLoading(listingsContainer, false);
              // Provide a more specific error message if it's the "fieldPath" issue
              const errorMessage = error.message.includes('Value for argument "fieldPath" is not a valid field path')
                  ? translations[currentLanguage]?.queryFieldError || translations.en.queryFieldError
                  : error.message;
              listingsContainer.innerHTML = `<p class="error-message">Could not load listings: ${errorMessage}. Please try again later.</p>`;
              applyTranslations(currentLanguage); // Translate any static text in the error message
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
                               <img id="carousel-main-img" src="${mainImageUrl}" alt="${listing.title || 'Main listing image'}" loading="lazy" onerror="this.onerror=null; this.src='/images/placeholder.webp';">
                           </div>
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
          showLoading(favoritesGrid, true, 'loadingListings');
          if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';
  
          const favoriteIds = Array.from(favorites);
          const validFavoriteIds = favoriteIds.filter(id => typeof id === 'string' && id.trim().length > 0);
  
          if (validFavoriteIds.length === 0) {
              showLoading(favoritesGrid, false);
              if (noFavoritesMessage) {
                noFavoritesMessage.style.display = 'block';
                applyTranslations(currentLanguage);
              }
              return;
          }
  
          try {
              const batchApiUrl = '/api/listings/batch?ids=' + validFavoriteIds.join(',');
              console.log("Fetching favorites from:", batchApiUrl);
              const response = await fetch(batchApiUrl);
  
              let favoriteListings = [];
              if (response.ok) {
                   favoriteListings = await response.json();
                   console.log(`Fetched ${favoriteListings.length} favorite listings using batch endpoint.`);
              } else {
                  console.warn(`Batch endpoint ${batchApiUrl} failed (${response.status}). Your backend API for /api/listings/batch might not be working as expected or the IDs are not found.`);
                  // Consider removing the fallback to all listings if the batch endpoint is critical
                  // and instead show an error that favorites could not be loaded.
                  // For now, keeping the fallback but logging a clear warning.
                  const allListings = await fetchListingsAPI();
                  favoriteListings = allListings.filter(listing => validFavoriteIds.includes(listing.id));
              }
  
              showLoading(favoritesGrid, false);
  
              if (!favoriteListings || favoriteListings.length === 0) {
                   if (noFavoritesMessage) {
                       noFavoritesMessage.style.display = 'block';
                       applyTranslations(currentLanguage);
                   }
              } else {
                  const fragment = document.createDocumentFragment();
                  favoriteListings.forEach(listing => {
                      const listingElement = createListingElement(listing);
                      if (listingElement) {
                          fragment.appendChild(listingElement);
                      }
                  });
                  favoritesGrid.appendChild(fragment);
              }
          } catch (error) {
              console.error('Error fetching/displaying favorites:', error);
              showLoading(favoritesGrid, false);
              favoritesGrid.innerHTML = `<p class="error-message">Could not load favorites: ${error.message}. Please try again later.</p>`;
               applyTranslations(currentLanguage);
          }
      }
  
  
      // --- Navigation ---
      async function displayUserProfile() {
          console.log("Attempting to display user profile...");
          // Ensure all necessary elements are available before proceeding
          if (!displayUsernameElem || !displayEmailElem || !displayPhoneElem || !displayFullnameElem || !userProfileMessage) {
              console.error("One or more user profile display elements not found.");
              return; // Exit if elements are missing
          }
  
          // Clear previous data and messages, show loading state
          displayUsernameElem.textContent = translations[currentLanguage]?.loadingProfile || translations.en.loadingProfile; // New translation key for profile loading
          displayEmailElem.textContent = translations[currentLanguage]?.loadingData || translations.en.loadingData; // New translation key for general data loading
          displayPhoneElem.textContent = translations[currentLanguage]?.loadingData || translations.en.loadingData;
          displayFullnameElem.textContent = translations[currentLanguage]?.loadingData || translations.en.loadingData;
          userProfileMessage.textContent = '';
          userProfileMessage.className = 'message-area'; // Reset class
          userProfileMessage.style.display = 'none';
  
  
          const token = localStorage.getItem('token');
          if (!token) {
              console.log("No token found, cannot display profile. Showing login message.");
              // Clear fields and show login required message
              displayUsernameElem.textContent = '';
              displayEmailElem.textContent = '';
              displayPhoneElem.textContent = '';
              displayFullnameElem.textContent = '';
              userProfileMessage.textContent = translations[currentLanguage]?.loginRequiredProfile || translations.en.loginRequiredProfile;
              userProfileMessage.className = 'message-area error';
              userProfileMessage.style.display = 'block';
              // Hide managed offers list and show no offers message placeholder
               const managedOfferList = document.querySelector('.managed-offer-list');
               const noOffersMessage = document.getElementById('no-offers-message');
               if (managedOfferList) managedOfferList.style.display = 'none';
               if (noOffersMessage) noOffersMessage.style.display = 'block';
  
              applyTranslations(currentLanguage); // Ensure message is translated
              return;
          }
  
          try {
              const response = await fetch('/api/users/me', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
  
              if (!response.ok) {
                  // Attempt to parse error message from server, fallback to generic
                  const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                  throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
              }
  
              const profileData = await response.json();
              console.log("Profile data received:", profileData);
  
              // Populate profile details
              displayUsernameElem.textContent = profileData.username || (translations[currentLanguage]?.notProvided || translations.en.notProvided); // Fallback for all
              displayEmailElem.textContent = profileData.email || (translations[currentLanguage]?.notProvided || translations.en.notProvided);
              displayPhoneElem.textContent = profileData.phone || (translations[currentLanguage]?.notProvided || translations.en.notProvided);
              displayFullnameElem.textContent = profileData.fullname || (translations[currentLanguage]?.notProvided || translations.en.notProvided);
  
              userProfileMessage.textContent = ''; // Clear message on success
              userProfileMessage.style.display = 'none';
  
              // --- Fetch and Display User Offers ---
              await fetchAndDisplayUserOffers(token);
  
          } catch (error) {
              console.error('Error fetching user profile:', error);
              // Display error state
              displayUsernameElem.textContent = translations[currentLanguage]?.errorLoading || translations.en.errorLoading; // Generic error
              displayEmailElem.textContent = translations[currentLanguage]?.errorLoading || translations.en.errorLoading;
              displayPhoneElem.textContent = translations[currentLanguage]?.errorLoading || translations.en.errorLoading;
              displayFullnameElem.textContent = translations[currentLanguage]?.errorLoading || translations.en.errorLoading;
              userProfileMessage.textContent = `${translations[currentLanguage]?.profileNotLoaded || translations.en.profileNotLoaded}: ${error.message}`;
              userProfileMessage.className = 'message-area error';
              userProfileMessage.style.display = 'block';
              // Hide managed offers list and show no offers message placeholder
               const managedOfferList = document.querySelector('.managed-offer-list');
               const noOffersMessage = document.getElementById('no-offers-message');
               if (managedOfferList) managedOfferList.style.display = 'none';
               if (noOffersMessage) noOffersMessage.style.display = 'block';
          } finally {
               applyTranslations(currentLanguage); // Always apply translations
          }
      }
  
      async function fetchAndDisplayUserOffers(token) {
          const userOfferList = document.getElementById('user-offer-list');
          const noOffersMessage = document.getElementById('no-offers-message');
          const managedOfferListContainer = document.querySelector('.managed-offer-list');
  
          if (!userOfferList || !noOffersMessage || !managedOfferListContainer) {
              console.error("User offers display elements not found.");
              return;
          }
  
          userOfferList.innerHTML = '';
          noOffersMessage.style.display = 'none';
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
                  noOffersMessage.style.display = 'block';
              } else {
                  const fragment = document.createDocumentFragment(); // Use DocumentFragment for performance
                  userOffers.forEach(offer => {
                      const listItem = document.createElement('li');
                      listItem.dataset.offerId = offer.id;
                      listItem.innerHTML = `
                           <span><i class="fas fa-tag"></i> ${offer.title || 'Untitled Offer'}</span>
                           <div class="offer-actions">
                               <button class="btn-icon edit-offer-btn" aria-label="${translations[currentLanguage]?.editOfferTooltip || translations.en.editOfferTooltip}" title="${translations[currentLanguage]?.editOfferTooltip || translations.en.editOfferTooltip}"><i class="fas fa-edit"></i></button>
                               <button class="btn-icon delete-offer-btn" aria-label="${translations[currentLanguage]?.deleteOfferTooltip || translations.en.deleteOfferTooltip}" title="${translations[currentLanguage]?.deleteOfferTooltip || translations.en.deleteOfferTooltip}"><i class="fas fa-trash-alt"></i></button>
                           </div>
                       `;
                      fragment.appendChild(listItem); // Append to fragment
  
                      // Add listeners to action buttons
                       const editButton = listItem.querySelector('.edit-offer-btn');
                       const deleteButton = listItem.querySelector('.delete-offer-btn');
  
                       editButton?.addEventListener('click', () => {
                           console.log('Edit button clicked for offer:', offer.id);
                           alert('Edit functionality not yet implemented.');
                       });
  
                       deleteButton?.addEventListener('click', () => {
                           console.log('Delete button clicked for offer:', offer.id);
                           if (confirm('Are you sure you want to delete this offer?')) {
                               handleDeleteOffer(offer.id, listItem);
                           }
                       });
                  });
                  userOfferList.appendChild(fragment); // Append fragment to DOM once
              }
          } catch (error) {
              console.error('Error fetching user offers:', error);
               userOfferList.innerHTML = `<p class="error-message">Could not load your offers: ${error.message}.</p>`;
               noOffersMessage.style.display = 'none';
               applyTranslations(currentLanguage);
          } finally {
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
  
              if (listItemElement) {
                   listItemElement.remove();
                   console.log(`Offer ${offerId} deleted successfully from UI.`);
                   const userOfferList = document.getElementById('user-offer-list');
                   const noOffersMessage = document.getElementById('no-offers-message');
                   if (userOfferList && noOffersMessage && userOfferList.children.length === 0) {
                        noOffersMessage.style.display = 'block';
                   }
              }
  
               const userProfileMessage = document.getElementById('user-profile-message');
               if (userProfileMessage) {
                   userProfileMessage.textContent = translations[currentLanguage]?.offerDeleteSuccess || translations.en.offerDeleteSuccess; // New translation key
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
                   userProfileMessage.textContent = `${translations[currentLanguage]?.offerDeleteFail || translations.en.offerDeleteFail}: ${error.message}`; // New translation key
                   userProfileMessage.className = 'message-area error';
                   userProfileMessage.style.display = 'block';
               }
          } finally {
               applyTranslations(currentLanguage);
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
              sectionId = 'home';
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
              displayUserProfile();
          }
  
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
  
                  const isPageSection = targetElement && targetElement.classList.contains('page-section');
                  const isAuthLink = targetSectionId === 'login' || targetSectionId === 'register';
  
  
                  if (isPageSection || isAuthLink) {
                      e.preventDefault();
                      if (sidebar && sidebar.classList.contains('open') && window.innerWidth < 993) {
                          sidebar.classList.remove('open');
                      }
  
                      history.pushState({ section: targetSectionId }, "", `#${targetSectionId}`);
                      showSection(targetSectionId);
  
                  }
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
                       history.replaceState({ section: 'home' }, "", `#home`);
                  }
              } else if (hash && document.getElementById(hash)?.classList.contains('page-section')) {
                  targetSectionId = hash;
              } else if (hash) {
               console.warn(`Unknown hash '${hash}'. Redirecting to #home.`);
               history.replaceState({ section: 'home' }, "", `#home`);
               initialSectionId = 'home'; // This should be targetSectionId
               initialData = null;      // This should be targetData
          }
           showSection(targetSectionId, targetData);
          }
      });
  
  
      // --- Post Offer Form ---
      // NEW: Function to clear selected images
      function clearSelectedImages() {
          if (offerImagesInput) {
              offerImagesInput.value = ''; // Clears the selected files from the input
          }
          if (postImagePreviewArea) {
              postImagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>';
              applyTranslations(currentLanguage); // Apply translation to the placeholder
          }
      }
  
      function resetPostOfferForm() {
           if (postOfferForm) postOfferForm.reset();
           if (postOfferMessage) {
               postOfferMessage.textContent = '';
               postOfferMessage.className = 'message';
               postOfferMessage.style.display = 'none';
           }
           if (descriptionInput && descriptionCharCount) {
               descriptionCharCount.textContent = descriptionInput.value.length;
               if (counterContainer) counterContainer.classList.remove('warn', 'limit');
           }
           // MODIFIED: Clear image preview and file input using the new function
           clearSelectedImages();
           applyTranslations(currentLanguage);
       }
  
      if (postOfferForm) {
          if (descriptionInput && descriptionCharCount && counterContainer) {
              const maxLength = parseInt(descriptionInput.getAttribute('maxlength') || '1000', 10);
              descriptionInput.addEventListener('input', () => {
                  const currentLength = descriptionInput.value.length;
                  descriptionCharCount.textContent = currentLength;
                  counterContainer.classList.toggle('warn', currentLength > maxLength * 0.9 && currentLength <= maxLength);
                  counterContainer.classList.toggle('limit', currentLength > maxLength);
              });
               descriptionCharCount.textContent = descriptionInput.value.length;
          }
  
          // NEW: Event listener for clear images button
          if (clearImagesBtn) {
              clearImagesBtn.addEventListener('click', clearSelectedImages);
          }
  
          postOfferForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              if (!postOfferMessage) return;
  
              const token = localStorage.getItem('token');
              if (!token) {
                  postOfferMessage.textContent = translations[currentLanguage]?.loginRequiredPost || translations.en.loginRequiredPost;
                  postOfferMessage.className = 'message-area error';
                  postOfferMessage.style.display = 'block';
                  applyTranslations(currentLanguage);
                  setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                  }, 2000);
                  return;
              }
  
               const formData = new FormData(postOfferForm);
               let allRequiredFieldsFilled = true;
               const requiredFields = ['title', 'price', 'description', 'offerType', 'propertyType', 'location'];
               for (const field of requiredFields) {
                   if (!formData.has(field) || formData.get(field).trim() === '') {
                       allRequiredFieldsFilled = false;
                       break;
                   }
               }
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
              postOfferMessage.style.display = 'block';
               applyTranslations(currentLanguage);
  
  
              const userId = JSON.parse(localStorage.getItem('userInfo'))?.id;
               if (!userId) {
                   console.error("User ID not found in local storage, but token exists.");
                   postOfferMessage.textContent = "User information missing. Please re-login.";
                   postOfferMessage.className = 'message-area error';
                   postOfferMessage.style.display = 'block';
                   applyTranslations(currentLanguage);
                   localStorage.removeItem('token');
                   localStorage.removeItem('userInfo');
                   updateAuthUI();
                   setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                   }, 2000);
                   return;
               }
  
              try {
                  const files = offerImagesInput?.files;
                  let imageUrls = []; // Initialize imageUrls array
  
                  // MODIFIED: Only attempt to upload files if there are any
                  if (files && files.length > 0) {
                      console.log(`Attempting to upload ${files.length} images...`);
                      const uploadPromises = Array.from(files).map(file => uploadFileToFirebaseClientCompat(file, userId));
                      const uploadedUrls = await Promise.all(uploadPromises);
                       const failedUploads = uploadedUrls.filter(url => url === null).length;
                       if (failedUploads > 0) {
                            // Error message is now set inside uploadFileToFirebaseClientCompat if CORS/upload fails
                            throw new Error(`Failed to upload ${failedUploads} image(s). Check console and Firebase CORS settings.`);
                       }
                      imageUrls = uploadedUrls.filter(url => url !== null); // Filter out any nulls if partial failure
                  } else {
                      console.log("No images selected for upload. Proceeding without images.");
                  }
  
                  // This client-side 'imageUrls' is only for the client's own reference if needed.
                  // The server will use the URLs from files it directly received and uploaded.
                  // However, if you intend for the client to manage URLs (e.g. for already uploaded images),
                  // the server needs to be adapted to accept them in the body, and Zod schema updated.
                  // For now, assuming server handles `req.files` for new uploads.
                  // formData.append('imageUrls', JSON.stringify(imageUrls)); // This might be redundant if server uses req.files

                  const response = await fetch('/api/offers', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }, // Token is enough, Content-Type set by FormData
                      body: formData, // FormData handles files and other fields
                  });
  
                  const result = await response.json();
  
                  if (response.ok) {
                      console.log('Offer submitted successfully:', result);
                      postOfferMessage.textContent = translations[currentLanguage]?.offerSuccess || translations.en.offerSuccess;
                      postOfferMessage.className = 'message-area success';
                      applyTranslations(currentLanguage);
                      resetPostOfferForm();
                      setTimeout(() => {
                          history.pushState({ section: 'home' }, "", `#home`);
                          showSection('home', { navigatedFromSuccess: true });
                      }, 1500);
                  } else {
                       console.error('Failed to post offer (Server Response):', result);
                      let errorMessage = result?.message || `Failed to post offer. Server responded with status ${response.status}.`;
                      if (result?.errors && Array.isArray(result.errors)) {
                          const validationDetails = result.errors.map(e => `${e.field.split('.').pop() || 'Field'}: ${e.message}`).join(', ');
                          errorMessage += ` Details: ${validationDetails}`;
                      }
                      postOfferMessage.textContent = errorMessage;
                      postOfferMessage.className = 'message-area error';
                      postOfferMessage.style.display = 'block';
                      applyTranslations(currentLanguage);
                  }
              } catch (error) {
                  console.error('Error submitting offer (Client-side or Network):', error);
                  // If the error is about image upload, it's likely already displayed by uploadFileToFirebaseClientCompat
                  if (!postOfferMessage.textContent.includes("Image upload failed")) {
                    postOfferMessage.textContent = `${translations[currentLanguage]?.offerFailNetwork || translations.en.offerFailNetwork} - ${error.message}`;
                  }
                  postOfferMessage.className = 'message-area error';
                  postOfferMessage.style.display = 'block';
                  applyTranslations(currentLanguage);
              }
          });
  
          if (offerImagesInput && postImagePreviewArea) {
              offerImagesInput.addEventListener('change', (event) => {
                  postImagePreviewArea.innerHTML = '';
                  const files = event.target.files;
                  if (!files || files.length === 0) {
                      postImagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>';
                      applyTranslations(currentLanguage);
                      return;
                  }
                  if (files.length > 5) {
                      alert('You can only upload a maximum of 5 images.');
                      offerImagesInput.value = '';
                      postImagePreviewArea.innerHTML = '<p class="placeholder-text" data-i18n="noImagesSelected">No images selected.</p>';
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
                  propertyType: document.getElementById('filter-property-type')?.value,
              };
              Object.keys(filters).forEach(key => {
                  const value = filters[key];
                  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || value === 'all') {
                       delete filters[key];
                  }
              });
              console.log("Applying filters:", filters);
              fetchAndDisplayListings(filters);
              if (filterDropdown) filterDropdown.classList.remove('show');
          });
      }
  
      if (searchButton && searchInput) {
          const performSearch = () => {
               const searchTerm = searchInput.value.trim();
               console.log("Applying search:", searchTerm);
               fetchAndDisplayListings({ search: searchTerm });
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
          document.addEventListener('click', (e) => {
              if (filterDropdown.classList.contains('show') && !filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                  filterDropdown.classList.remove('show');
              }
          });
      }
  
  
      // --- UI Toggles (Menu, Dark Mode, Language) ---
      // Burger Menu
      if (menuToggle && sidebar) {
          menuToggle.addEventListener('click', (e) => {
              console.log("Menu toggle clicked!"); // DEBUG
              e.stopPropagation();
              sidebar.classList.toggle('open');
          });
      } else {
          if (!menuToggle) console.error("CRITICAL: Menu toggle button (#menu-toggle) not found!");
          if (!sidebar) console.error("CRITICAL: Sidebar element (.sidebar) not found!");
      }

      if (closeMenuButton && sidebar) {
          closeMenuButton.addEventListener('click', () => {
            console.log("Close menu button clicked!"); // DEBUG
            sidebar.classList.remove('open');
          });
      } else {
          if (!closeMenuButton) console.error("CRITICAL: Close menu button (#close-menu) not found!");
      }
       document.addEventListener('click', (event) => {
           if (sidebar?.classList.contains('open') &&
               !sidebar.contains(event.target) &&
               !menuToggle?.contains(event.target) &&
               window.innerWidth < 993) { // Only for mobile view
               console.log("Clicked outside sidebar, closing."); // DEBUG
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
           const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
           let initialDarkModeState = savedDarkMode === 'enabled' || (savedDarkMode !== 'disabled' && prefersDark);
           darkModeToggle.checked = initialDarkModeState;
           applyDarkMode(initialDarkModeState);
           darkModeToggle.addEventListener('change', () => applyDarkMode(darkModeToggle.checked));
           if(window.matchMedia) {
               window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                   if (localStorage.getItem('darkMode') === null) { // Only if not manually set
                       darkModeToggle.checked = event.matches;
                       applyDarkMode(event.matches);
                   }
               });
           }
      } else {
           if (localStorage.getItem('darkMode') !== 'disabled' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
               document.body.classList.add('dark');
           }
      }
  
      // Language
      const translations = {
          en: {
              pageTitle: "Baytak - Your Home", navHome: "Home", navFavorites: "Favorites", navPostOffer: "Post Offer", navUser: "User Account", navSettings: "Settings", navAbout: "About Us", navContact: "Contact Us", navPolicy: "Use Policy", siteName: "Baytak", siteSubName: "Your Home", searchPlaceholder: "Search for a property...", filterBtn: "Filter", filterType: "Type:", filterAll: "All", filterRent: "Rent", filterSale: "Sale", filterLocation: "Location:", filterPrice: "Price:", applyFiltersBtn: "Apply Filters", allListingsTitle: "Available Properties", loadingListings: "Loading listings...", noListingsFound: "No listings found matching your criteria.", listingDetailPageTitle: "Property Details", detailBasicInfoLabel: "Basic Information", detailDescLabel: "Description", detailFeaturesLabel: "Features", noFeaturesListed: "No features listed.", detailLocationLabel: "Location", mapPlaceholder: "Map Area Placeholder", detailSellerLabel: "Seller Information", contactSellerBtn: "Contact Seller", postOfferPageTitle: "Post Your New Offer", offerTitleLabel: "Offer Title", offerTypeLabel: "Offer Type:", offerTypeRent: "Rent", offerTypeSale: "Sale", offerPriceLabel: "Price (AED)", offerDescLabel: "Detailed Description", offerLocationLabel: "Location/Address", offerPropTypeLabel: "Property Type:", propTypeApartment: "Apartment", propTypeHouse: "House", propTypeVilla: "Villa", propTypeLand: "Land", offerBedroomsLabel: "Bedrooms:", offerBathroomsLabel: "Bathrooms:", offerAreaLabel: "Area (m²):", offerAmenitiesLabel: "Additional Amenities:", amenityPool: "Pool", amenityGarage: "Garage", amenityGarden: "Garden", offerImagesLabel: "Choose Property Images", submitOfferBtn: "Submit Offer for Review", favoritesPageTitle: "Favorite Properties", noFavorites: "You haven't favorited any properties yet.", userPageTitle: "User Account", usernameLabel: "Username", contactInfoLabel: "Contact Information", offersLabel: "Your Offers", editOfferTooltip: "Edit Offer", deleteOfferTooltip: "Delete Offer", noUserOffers: "You haven't posted any offers yet.", settingsPageTitle: "Settings", languageLabel: "Language", langToggleText: "العربية", darkModeLabel: "Dark Mode", notificationsLabel: "Notifications", cookiesLabel: "Cookies", showNameLabel: "Show Name on Posts", showContactLabel: "Show Contact Info", showOldOffersLabel: "Show Old Offers", aboutTitle: "About Us", aboutSubTitle: "WHO ARE WE", aboutDesc1: "We specialize in providing the best properties for you. (Placeholder Text)", moaydName: "Moayd", moaydDesc: "Computer Engineering Student, Graphic Designer, Beginner Programmer, Ambitious, passionate.", akramName: "Akram", akramDesc: "Student, Moayd's friend, figuring out his path. (Placeholder Text)", contactTitle: "Contact Us", contactSubTitle: "CONTACT US", contactDesc: "Reach out to us if you face any issues or to report bugs.", contactServer: "24/7 SERVER", contactNotice: "Please note that all calls are recorded.", policyTitle: "Use Policy", policySubTitle: "USE POLICY", policyDesc1: "Use this site at your own risk. We are not responsible for any issues. (Placeholder Text)", policyDesc2: "For legal matters, contact Akram. For financial matters, contact Moayd. (Placeholder Text)", listingNotFound: "Listing not found.", loginRequiredPost: "Please log in to post an offer.", submittingOffer: "Submitting offer...", offerSuccess: "Offer submitted successfully!", offerFailNetwork: "Network error. Please try again.", noImagesSelected: "No images selected.", loginTitle: "Login", registerTitle: "Register", emailLabel: "Email", passwordLabel: "Password", btnLoginAction: "Login", btnRegisterAction: "Register", passwordHint: "Minimum 6 characters", dontHaveAccount: "Don't have an account?", registerLink: "Register here", alreadyHaveAccount: "Already have an account?", loginLink: "Login here", welcome: "Welcome", btnLoginSidebar: "Login", btnRegisterSidebar: "Register", btnLogout: "Logout", offerFailGeneric: "Failed to submit offer.", fillRequiredFields: "Please fill in all required fields.", loginRequiredProfile: "Please log in to view your profile.",
               loggingIn: "Logging in...", loginSuccess: "Login successful!", loginFail: "Login failed", registering: "Registering...", registerSuccess: "Registration successful! Please login.", registerFail: "Registration failed",
               phoneNotProvided: "Not Provided", fullnameNotProvided: "Not Provided", profileNotLoaded: "Could not load profile.",
               clearImagesBtn: "Clear Images",
               loadingProfile: "Loading profile...", // NEW
               loadingData: "Loading data...", // NEW
               errorLoading: "Error loading data.", // NEW
               notProvided: "N/A", // NEW general fallback
               offerDeleteSuccess: "Offer deleted successfully!", // NEW
               offerDeleteFail: "Failed to delete offer.", // NEW
               queryFieldError: "There's an issue with the query parameters. Please try different filters." // NEW
          },
          ar: {
              pageTitle: "بيتك - منزلك", navHome: "الرئيسية", navFavorites: "المفضلة", navPostOffer: "انشر عرض", navUser: "حساب المستخدم", navSettings: "الإعدادات", navAbout: "من نحن", navContact: "تواصل معنا", navPolicy: "سياسة الاستخدام", siteName: "بيتك", siteSubName: "منزلك", searchPlaceholder: "ابحث عن عقار...", filterBtn: "فلترة", filterType: "النوع:", filterAll: "الكل", filterRent: "إيجار", filterSale: "بيع", filterLocation: "الموقع:", filterPrice: "السعر:", applyFiltersBtn: "تطبيق الفلاتر", allListingsTitle: "العقارات المتاحة", loadingListings: "جاري تحميل العروض...", noListingsFound: "لم يتم العثور على عروض تطابق بحثك.", listingDetailPageTitle: "تفاصيل العقار", detailBasicInfoLabel: "معلومات أساسية", detailDescLabel: "الوصف", detailFeaturesLabel: "المميزات", noFeaturesListed: "لا توجد مميزات مدرجة.", detailLocationLabel: "الموقع", mapPlaceholder: "منطقة الخريطة", detailSellerLabel: "معلومات البائع/المؤجر", contactSellerBtn: "تواصل مع البائع", postOfferPageTitle: "انشر عرضك الجديد", offerTitleLabel: "عنوان العرض", offerTypeLabel: "نوع العرض:", offerTypeRent: "إيجار", offerTypeSale: "بيع", offerPriceLabel: "السعر (درهم)", offerDescLabel: "الوصف التفصيلي", offerLocationLabel: "الموقع/العنوان", offerPropTypeLabel: "نوع العقار:", propTypeApartment: "شقة", propTypeHouse: "منزل", propTypeVilla: "فيلا", propTypeLand: "أرض", offerBedroomsLabel: "غرف نوم:", offerBathroomsLabel: "حمامات:", offerAreaLabel: "المساحة (م²):", offerAmenitiesLabel: "مرافق إضافية:", amenityPool: "مسبح", amenityGarage: "جراج", amenityGarden: "حديقة", offerImagesLabel: "اختر صور العقار", submitOfferBtn: "أرسل العرض للمراجعة", favoritesPageTitle: "العقارات المفضلة", noFavorites: "لم تقم بإضافة أي عقارات للمفضلة بعد.", userPageTitle: "حساب المستخدم", usernameLabel: "اسم المستخدم", contactInfoLabel: "معلومات التواصل", offersLabel: "عروضك", editOfferTooltip: "تعديل العرض", deleteOfferTooltip: "حذف العرض", noUserOffers: "لم تنشر أي عروض بعد.", settingsPageTitle: "الإعدادات", languageLabel: "اللغة", langToggleText: "English", darkModeLabel: "الوضع المظلم", notificationsLabel: "الاشعارات", cookiesLabel: "ملفات تعريف الارتباط (Cookies)", showNameLabel: "إظهار الاسم عند النشر", showContactLabel: "إظهار معلومات التواصل", showOldOffersLabel: "إظهار العروض القديمة", aboutTitle: "من نحن", aboutSubTitle: "من نحن", aboutDesc1: "متخصصين الهبد نفعل لك اي شي ووقفه التبجيله كاد شات جبت ان يكون مبرمجا.", moaydName: "مؤيد", moaydDesc: "طالب هندسة حاسوب, مصمم جرافيك, مبتدئ في عالم البرمجة, طموح, شغوف.", akramName: "اكرم", akramDesc: "طالب, يد بت عمو + صاحب مؤيد هو زاتو ما عارف نفسو بعمل شنو.", contactTitle: "تواصل معنا", contactSubTitle: "تواصل معنا", contactDesc: "تواصل معنا في حال واجهتك أي مشكلة في الموقع او للابلاغ عن ثغرات.", contactServer: "خدمة 24/7", contactNotice: "يرجى الملاحظة: يتم تسجيل جميع المكالمات.", policyTitle: "سياسة الاستخدام", policySubTitle: "سياسة الاستخدام", policyDesc1: "عاين الملخص بتاع الكلام ما عندك اي حاجة عندنا , تستعمل تطبيقنا او موقعنا تحت مسؤليتك نتسرق , تتنهب , مافي زول بشتغل بيك , مافي زول ماسكك من أضانك قال ليك استعمل موقعنا شافع انت ؟ يقولو ليك تعال شوف الموقع الفلاني طوالي تقوم تخش ؟ والله بليد كيف المهم الكلام دا واضح , شغل محاكم وبتاع دا ما بنفع معانا", policyDesc2: "القروش ماسكها مؤيد والمسائل القانونية عند اكرم يعني عندكم اي مشكلة امشو لي اكرم طوالي ما بقصر", listingNotFound: "العرض غير موجود.", loginRequiredPost: "يرجى تسجيل الدخول لنشر عرض.", submittingOffer: "جاري إرسال العرض...", offerSuccess: "تم إرسال العرض بنجاح!", offerFailNetwork: "خطأ في الشبكة. الرجاء المحاولة مرة أخرى.", noImagesSelected: "لم يتم اختيار صور.", loginTitle: "تسجيل الدخول", registerTitle: "تسجيل حساب جديد", emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور", btnLoginAction: "دخول", btnRegisterAction: "تسجيل", passwordHint: "6 أحرف على الأقل", dontHaveAccount: "ليس لديك حساب؟", registerLink: "سجل هنا", alreadyHaveAccount: "لديك حساب بالفعل؟", loginLink: "سجل الدخول هنا", btnLoginSidebar: "دخول", btnRegisterSidebar: "تسجيل", btnLogout: "خروج", offerFailGeneric: "فشل إرسال العرض.", fillRequiredFields: "يرجى ملء جميع الحقول المطلوبة.", loginRequiredProfile: "يرجى تسجيل الدخول لعرض ملفك الشخصي.",
              loggingIn: "جاري تسجيل الدخول...", loginSuccess: "تم تسجيل الدخول بنجاح!", loginFail: "فشل تسجيل الدخول", registering: "جاري التسجيل...", registerSuccess: "تم التسجيل بنجاح! يرجى تسجيل الدخول.", registerFail: "فشل التسجيل",
              phoneNotProvided: "لم يتم توفيره", fullnameNotProvided: "لم يتم توفيره", profileNotLoaded: "تعذر تحميل الملف الشخصي.",
              clearImagesBtn: "إلغاء الصور",
              loadingProfile: "جاري تحميل الملف الشخصي...", // NEW
              loadingData: "جاري تحميل البيانات...", // NEW
              errorLoading: "خطأ في تحميل البيانات.", // NEW
              notProvided: "غير متوفر", // NEW
              offerDeleteSuccess: "تم حذف العرض بنجاح!", // NEW
              offerDeleteFail: "فشل حذف العرض.", // NEW
              queryFieldError: "هناك مشكلة في معلمات الاستعلام. يرجى تجربة فلاتر مختلفة." // NEW
          }
       };
  
       function applyTranslations(lang) {
           console.log(`Applying translations for: ${lang}`);
           currentLanguage = lang;
           const elements = document.querySelectorAll('[data-i18n]');
           elements.forEach(el => {
               const key = el.getAttribute('data-i18n');
               const translation = translations[lang]?.[key] || translations.en?.[key];

               if (key === 'languageLabel' || key === 'darkModeLabel' || key === 'notificationsLabel' || key === 'cookiesLabel' || key === 'showNameLabel' || key === 'showContactLabel' || key === 'showOldOffersLabel') {
                   console.log(`DEBUG: Translating settings key: ${key}, lang: ${lang}, translation found: "${translation}"`, el);
               }

               if (translation !== undefined) {
                  el.textContent = translation;
               } else {
                   console.warn(`Translation key "${key}" not found for lang "${lang}" or fallback "en"`);
               }
           });
  
           document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
               const key = el.getAttribute('data-i18n-placeholder');
               const translation = translations[lang]?.[key] || translations.en?.[key];
               if (translation !== undefined) {
                  if (!el.dataset.originalPlaceholder) el.dataset.originalPlaceholder = el.getAttribute('placeholder');
                   el.setAttribute('placeholder', translation);
               } else {
                    console.warn(`Placeholder key "${key}" not found for lang "${lang}" or fallback "en"`);
               }
           });
  
           document.querySelectorAll('[data-i18n-title]').forEach(el => {
               const key = el.getAttribute('data-i18n-title');
               const translation = translations[lang]?.[key] || translations.en?.[key];
               if (translation !== undefined) {
                   el.setAttribute('title', translation);
               } else {
                    console.warn(`Title key "${key}" not found for lang "${lang}" or fallback "en"`);
               }
           });
  
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
                  placeholder.className = 'placeholder-text loading';
                  placeholder.dataset.i18n = i18nKey;
                  placeholder.textContent = translations[currentLanguage]?.[i18nKey] || translations.en?.[i18nKey] || 'Loading...';
                  container.insertBefore(placeholder, container.firstChild);
                  applyTranslations(currentLanguage);
              }
          }
      }
  
  
      // --- Initial Load ---
      function initializeApp() {
          setLanguage(currentLanguage);
  
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
                  console.warn("Invalid #listing-detail hash: Missing ID. Redirecting to #home.");
                  history.replaceState({ section: 'home' }, "", `#home`);
                  initialSectionId = 'home';
                  initialData = null;
              }
          } else if (hash && document.getElementById(hash)?.classList.contains('page-section')) {
              initialSectionId = hash;
          } else if (hash) {
               console.warn(`Unknown hash '${hash}'. Redirecting to #home.`);
               history.replaceState({ section: 'home' }, "", `#home`);
               initialSectionId = 'home';
               initialData = null;
          }
           console.log(`Initial load: section='${initialSectionId}'`, initialData);
           showSection(initialSectionId, initialData);
  
           updateAuthUI();
      }
  
      const loginSectionElement = document.getElementById('login');
      const registerSectionElement = document.getElementById('register');
  
       function updateAuthUI() {
           const token = localStorage.getItem('token');
           const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
           if (token && userInfo) {
               userGreetingSidebar.textContent = `${translations[currentLanguage]?.welcome || translations.en.welcome}, ${userInfo.username || userInfo.email}!`;
               userGreetingSidebar.style.display = 'block';
               logoutBtnSidebar.style.display = 'inline-block';
               guestAuthLinksSidebar.style.display = 'none';
               navUserLink.style.display = 'block'; // Show User Account link if logged in
           } else {
               userGreetingSidebar.style.display = 'none';
               logoutBtnSidebar.style.display = 'none';
               guestAuthLinksSidebar.style.display = 'flex'; // Use flex to arrange buttons
               navUserLink.style.display = 'none'; // Hide User Account link if logged out
           }
           applyTranslations(currentLanguage); // Re-apply translations for dynamic elements
       }
  
      async function handleLogin(email, password) {
          const messageDiv = loginMessageSection;
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
                  setTimeout(() => {
                       history.pushState({ section: 'home' }, "", `#home`);
                       showSection('home');
                  }, 1000);
              } else {
                   let errorMessage = data.message || `Login failed with status: ${response.status}`;
                   if (data.errors && Array.isArray(data.errors)) {
                        errorMessage += " Details: " + data.errors.map(e => `${e.field.split('.').pop()}: ${e.message}`).join(', ');
                   }
                  throw new Error(errorMessage);
              }
  
          } catch (error) {
              console.error('Login failed:', error);
              localStorage.removeItem('token');
              localStorage.removeItem('userInfo');
              updateAuthUI();
              messageDiv.textContent = `${translations[currentLanguage]?.loginFail || translations.en.loginFail}: ${error.message}`;
              messageDiv.className = 'message-area error';
              messageDiv.style.display = 'block';
              applyTranslations(currentLanguage);
          }
      }
  
      async function handleRegister(username, email, password) {
           const messageDiv = registerMessageSection;
           if (!messageDiv) { console.error("Register message area not found."); return; }
  
          const phoneInput = document.getElementById('register-phone-section');
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
                      phone
                  }),
              });
  
              const data = await response.json();
  
              if (response.ok) {
                  console.log('Registration successful:', data);
                  messageDiv.textContent = translations[currentLanguage]?.registerSuccess || translations.en.registerSuccess;
                  messageDiv.className = 'message-area success';
                  messageDiv.style.display = 'block';
                   applyTranslations(currentLanguage);
                  if(loginFormSection) loginFormSection.reset();
                  if(registerFormSection) registerFormSection.reset();
                   setTimeout(() => {
                      history.pushState({ section: 'login' }, "", `#login`);
                      showSection('login');
                   }, 1500);
              } else {
                   let errorMessage = data.message || `Registration failed with status: ${response.status}`;
                   if (data.errors && Array.isArray(data.errors)) {
                        errorMessage += " Details: " + data.errors.map(e => `${e.field.split('.').pop()}: ${e.message}`).join(', ');
                   }
                   throw new Error(errorMessage);
              }
  
          } catch (error) {
              console.error('Registration failed:', error);
              messageDiv.textContent = `${translations[currentLanguage]?.registerFail || translations.en.registerFail}: ${error.message}`;
              messageDiv.className = 'message-area error';
              messageDiv.style.display = 'block';
              applyTranslations(currentLanguage);
          }
      }
  
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
                  messageDiv.className = 'message-area error';
                  messageDiv.style.display = 'block';
                  applyTranslations(currentLanguage);
              }
              return;
          }
  
  
          handleRegister(username, email, password);
      });
  
      logoutBtnSidebar?.addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          updateAuthUI();
           const currentSectionId = window.location.hash.substring(1) || 'home';
           const currentSectionElement = document.getElementById(currentSectionId);
           if (currentSectionElement) {
                console.log("Logged out. Redirecting to home.");
           }
  
          history.pushState({ section: 'home' }, "", `#home`);
          showSection('home');
      });
  
      async function uploadFileToFirebaseClientCompat(file, userId) {
          if (!file || !userId) {
               console.error("uploadFileToFirebaseClientCompat: Invalid file or userId provided.");
               return null;
          }
          const uniqueFilename = `${uuidv4()}-${file.name}`;
          const filePath = `listing-images/${userId}/${uniqueFilename}`;
          const storageRef = storage.ref(filePath);
  
          try {
              console.log(`Client Upload Compat: Starting upload for ${filePath}`);
              const uploadTask = storageRef.put(file);
  
              await uploadTask;
              console.log(`Client Upload Compat: Upload finished for ${filePath}. Getting URL...`);
  
              const downloadURL = await storageRef.getDownloadURL();
              console.log(`Client Upload Compat: Got URL for ${filePath}: ${downloadURL}`);
              return downloadURL;
  
          } catch (error) {
              console.error(`Client Upload Compat: Failed to upload ${file.name}`, error);
              if (postOfferMessage) { // Display error to user on the post offer page
                postOfferMessage.textContent = `Image upload failed: ${error.message}. Please check your internet connection and Firebase Storage CORS configuration.`;
                postOfferMessage.className = 'message-area error';
                postOfferMessage.style.display = 'block';
                applyTranslations(currentLanguage); // Ensure message is translated if possible
              }
              return null;
          }
      }
  
      function uuidv4() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
          });
      }
  
      // Call initializeApp to start everything
      try {
        initializeApp();
      } catch (e) {
        console.error("CRITICAL ERROR during initializeApp():", e);
        // Optionally, display a user-friendly message on the page itself
        // document.body.innerHTML = "<p>A critical error occurred. Please try refreshing the page or contact support.</p>";
      }
  
  });