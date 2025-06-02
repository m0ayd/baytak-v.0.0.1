const mobileMenuButton = document.getElementById('mobile-menu-button');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mainContent = document.getElementById('main-content');
const pageLinks = document.querySelectorAll('#sidebar a');
const offerImages = document.querySelectorAll('.offer-image');
const imageModals = document.querySelectorAll('#home-page > div > div > div.hidden'); // Select modals within home page
mobileMenuButton.addEventListener('click', () => {
sidebar.classList.toggle('translate-x-full');
sidebarOverlay.classList.toggle('hidden');
mainContent.classList.toggle('md:mr-64');
});
sidebarOverlay.addEventListener('click', () => {
sidebar.classList.add('translate-x-full');
sidebarOverlay.classList.add('hidden');
mainContent.classList.remove('md:mr-64');
});
pageLinks.forEach(link => {
link.addEventListener('click', (event) => {
event.preventDefault();
const pageId = link.getAttribute('data-page') + '-page';
document.querySelectorAll('main > section').forEach(section => {
section.classList.add('hidden');
});
document.getElementById(pageId).classList.remove('hidden');
// Close sidebar on mobile view after navigation
    if (window.innerWidth < 768) {
        sidebar.classList.add('translate-x-full');
        sidebarOverlay.classList.add('hidden');
        mainContent.classList.remove('md:mr-64');
    }
});
});
offerImages.forEach((img, index) => {
img.addEventListener('click', () => {
const modal = img.parentNode.nextElementSibling;
const modalImg = modal.querySelector('img');
modalImg.src = img.src;
modal.classList.remove('hidden');
});
});
imageModals.forEach(modal => {
const closeButton = modal.querySelector('button');
closeButton.addEventListener('click', () => {
modal.classList.add('hidden');
});
modal.addEventListener('click', (event) => {
if (event.target === modal) {
modal.classList.add('hidden');
}
});
});
// Show the home page by default
document.addEventListener('DOMContentLoaded', () => {
document.querySelectorAll('main > section').forEach((section, index) => {
if (section.id === 'home-page') {
section.classList.remove('hidden');
} else {
section.classList.add('hidden');
}
});
});