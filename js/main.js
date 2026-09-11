// SASI Steel Engineering - Main Application JavaScript

// State Management
const STATE_KEYS = {
  WISHLIST: 'sasi_wishlist_items'
};

// Wishlist Helper Functions
function getWishlist() {
  try {
    const data = localStorage.getItem(STATE_KEYS.WISHLIST);
    let items = data ? JSON.parse(data) : [];
    if (typeof servicesData !== 'undefined' && Array.isArray(items)) {
      items = items.map(item => {
        const found = servicesData.find(s => s.id === item.id);
        if (found) {
          return {
            ...item,
            image: found.image,
            name: found.name,
            price: found.price,
            priceFormatted: found.priceFormatted
          };
        }
        return item;
      });
    }
    return items;
  } catch (e) {
    console.error('Error reading wishlist', e);
    return [];
  }
}

function saveWishlist(wishlist) {
  try {
    localStorage.setItem(STATE_KEYS.WISHLIST, JSON.stringify(wishlist));
    updateHeaderCounts();
    updateWishlistButtonStates();
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: wishlist }));
  } catch (e) {
    console.error('Error saving wishlist', e);
  }
}

function toggleWishlist(serviceId) {
  const service = servicesData.find(s => s.id === serviceId);
  if (!service) return;

  let wishlist = getWishlist();
  const exists = wishlist.some(item => item.id === serviceId);

  if (exists) {
    wishlist = wishlist.filter(item => item.id !== serviceId);
    saveWishlist(wishlist);
    showToast(`Removed <strong>${service.name}</strong> from Wishlist`, 'info');
  } else {
    wishlist.push({
      id: service.id,
      name: service.name,
      category: service.category,
      price: service.price,
      priceFormatted: service.priceFormatted,
      unit: service.unit,
      image: service.image,
      shortDescription: service.shortDescription
    });
    saveWishlist(wishlist);
    showToast(`Saved <strong>${service.name}</strong> to Wishlist!`, 'success', '<a href="wishlist.html" class="underline font-semibold ml-1 text-orange-400">View Wishlist</a>');
  }
}

function isInWishlist(serviceId) {
  const wishlist = getWishlist();
  return wishlist.some(item => item.id === serviceId);
}

// Update Header Badges
function updateHeaderCounts() {
  const wishlist = getWishlist();
  const totalWishlistCount = wishlist.length;

  document.querySelectorAll('.wishlist-count-badge').forEach(el => {
    el.textContent = totalWishlistCount;
    el.classList.toggle('hidden', totalWishlistCount === 0);
  });
}

function updateWishlistButtonStates() {
  const wishlist = getWishlist();
  const idsInWishlist = new Set(wishlist.map(i => i.id));

  document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
    const id = btn.getAttribute('data-wishlist-id');
    const icon = btn.querySelector('i');
    if (idsInWishlist.has(id)) {
      btn.classList.add('text-red-500', 'bg-red-50', 'border-red-200');
      btn.classList.remove('text-slate-500', 'bg-white', 'border-slate-200');
      if (icon) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
      }
    } else {
      btn.classList.remove('text-red-500', 'bg-red-50', 'border-red-200');
      btn.classList.add('text-slate-500', 'bg-white', 'border-slate-200');
      if (icon) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
      }
    }
  });
}

// Toast Notification System
function showToast(message, type = 'success', actionHtml = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' 
    ? 'bg-slate-900 border-orange-500 text-white' 
    : type === 'info' 
    ? 'bg-slate-800 border-slate-600 text-white' 
    : 'bg-red-900 border-red-500 text-white';

  const iconClass = type === 'success' 
    ? 'fa-solid fa-circle-check text-orange-400' 
    : type === 'info' 
    ? 'fa-solid fa-circle-info text-orange-300' 
    : 'fa-solid fa-triangle-exclamation text-red-400';

  toast.className = `toast flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl ${bgClass} text-sm max-w-md`;
  toast.innerHTML = `
    <i class="${iconClass} text-lg shrink-0"></i>
    <div class="flex-1 leading-snug">
      <span>${message}</span>
      ${actionHtml ? `<span class="block mt-0.5 text-xs text-orange-300">${actionHtml}</span>` : ''}
    </div>
    <button class="text-slate-400 hover:text-white shrink-0 p-1" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Floating WhatsApp and Call Action Buttons
function injectFloatingContactButtons() {
  if (document.getElementById('floating-contact-dock')) return;

  const dock = document.createElement('div');
  dock.id = 'floating-contact-dock';
  dock.className = 'floating-actions-dock';
  dock.innerHTML = `
    <!-- WhatsApp Floating Button -->
    <a href="https://wa.me/919845012345?text=Hello%20SASI%20Steel%20Engineering,%20I%20would%20like%20to%20inquire%20about%20fabrication%20services." 
       target="_blank" 
       rel="noopener noreferrer"
       class="floating-btn-item group" 
       aria-label="Chat on WhatsApp">
      <span class="floating-btn-label">Chat on WhatsApp</span>
      <div class="floating-circle-btn floating-whatsapp-btn pulse-ring text-white">
        <i class="fa-brands fa-whatsapp"></i>
      </div>
    </a>

    <!-- Call Floating Button -->
    <a href="tel:+919845012345" 
       class="floating-btn-item group" 
       aria-label="Call SASI Steel Engineering">
      <span class="floating-btn-label">Call Now (+91 98450 12345)</span>
      <div class="floating-circle-btn floating-call-btn pulse-ring text-white">
        <i class="fa-solid fa-phone"></i>
      </div>
    </a>

    <!-- Close / Dismiss Toggle (X) -->
    <button onclick="toggleFloatingDock()" 
            class="floating-toggle-btn" 
            title="Toggle Contact Options"
            aria-label="Close Contact Widget">
      <i class="fa-solid fa-xmark text-xs" id="floating-toggle-icon"></i>
    </button>
  `;

  document.body.appendChild(dock);
}

function toggleFloatingDock() {
  const dock = document.getElementById('floating-contact-dock');
  const icon = document.getElementById('floating-toggle-icon');
  if (!dock) return;

  const items = dock.querySelectorAll('.floating-btn-item');
  const isHidden = items[0].classList.contains('hidden');

  items.forEach(el => {
    if (isHidden) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  if (icon) {
    if (isHidden) {
      icon.className = 'fa-solid fa-xmark text-xs';
    } else {
      icon.className = 'fa-solid fa-comments text-xs text-orange-400';
    }
  }
}

// Service Card HTML Generator (Clean & professional with Details & Get Quote buttons)
function createServiceCardHTML(service, animationDelay = 0) {
  const inWishlist = isInWishlist(service.id);
  const heartIconClass = inWishlist ? 'fa-solid text-red-500' : 'fa-regular text-slate-500';
  const heartBgClass = inWishlist ? 'bg-red-50 border-red-200' : 'bg-white/90 border-slate-200';

  return `
    <div class="ref-service-card group flex flex-col justify-between"
         data-aos="fade-up" data-aos-delay="${animationDelay}">
      
      <!-- Top Image -->
      <div class="relative h-48 w-full overflow-hidden bg-slate-100">
        <img src="${service.image}" alt="${service.name}" 
             onerror="this.onerror=null;this.src='welding-works.jpg'"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        
        <!-- Wishlist Button -->
        <button onclick="toggleWishlist('${service.id}')" data-wishlist-id="${service.id}"
                aria-label="Add to Wishlist"
                class="wishlist-btn absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center ${heartBgClass} shadow-md border hover:scale-110 active:scale-95 transition-all">
          <i class="${heartIconClass} text-xs"></i>
        </button>

        <div class="absolute bottom-2 right-3">
          <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-sm">
            ${service.priceFormatted}
          </span>
        </div>
      </div>

      <!-- Bottom Content: Circular Icon Badge & Title -->
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3">
            <div class="ref-icon-badge shrink-0">
              <i class="fa-solid ${service.icon || 'fa-industry'} text-base"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors leading-snug">
                ${service.name}
              </h3>
              <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                ${service.shortDescription}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-slate-100">
          <button onclick="openServiceModal('${service.id}')"
                  class="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <i class="fa-regular fa-eye text-orange-500"></i> View Details
          </button>
        </div>
      </div>
    </div>
  `;
}

// Service Details Modal (With Request Quote Action)
function openServiceModal(serviceId) {
  const service = servicesData.find(s => s.id === serviceId);
  if (!service) return;

  let modal = document.getElementById('service-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'service-detail-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300';
    document.body.appendChild(modal);
  }

  const inWishlist = isInWishlist(service.id);
  const heartIconClass = inWishlist ? 'fa-solid text-red-500' : 'fa-regular text-slate-600';

  modal.innerHTML = `
    <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8" onclick="event.stopPropagation()">
      <button onclick="closeServiceModal()" class="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors z-10">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <div class="relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 h-64 md:h-72 bg-slate-100">
            <img src="${service.image}" alt="${service.name}" 
                 onerror="this.onerror=null;this.src='welding-works.jpg'"
                 class="w-full h-full object-cover" />
            <div class="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
              ${service.category}
            </div>
          </div>
          <div class="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-100 text-slate-700 text-xs flex items-center gap-3">
            <i class="fa-solid fa-shield-halved text-orange-600 text-xl"></i>
            <div>
              <p class="font-bold text-slate-900">SASI Engineering Quality Guarantee</p>
              <p>Every fabrication unit is load tested and certified for safety.</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between">
          <div>
            <span class="section-tag mb-1">Service Details</span>
            <h2 class="text-2xl md:text-3xl font-black text-slate-900 mt-1">${service.name}</h2>
            
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-black text-orange-600">${service.priceFormatted}</span>
              <span class="text-xs font-medium text-slate-500">${service.unit}</span>
            </div>

            <p class="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              ${service.detailedDescription}
            </p>

            <div class="mt-5">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">Key Highlights</h4>
              <ul class="space-y-1.5 text-xs text-slate-600">
                ${service.features.map(f => `
                  <li class="flex items-start gap-2">
                    <i class="fa-solid fa-check text-orange-500 mt-0.5"></i>
                    <span>${f}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
              <h4 class="font-bold text-slate-900 mb-2">Technical Specifications</h4>
              <div class="grid grid-cols-2 gap-y-1 text-[11px]">
                ${Object.entries(service.specifications).map(([key, val]) => `
                  <div class="text-slate-500 font-medium">${key}:</div>
                  <div class="text-slate-900 font-semibold">${val}</div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button onclick="closeServiceModal(); openQuoteModal('${service.name}');"
                    class="flex-1 py-3 px-5 rounded-full bg-orange-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center shadow-md hover:shadow-orange-500/30 active:scale-95">
              Request Custom Quote
            </button>
            <button onclick="toggleWishlist('${service.id}'); closeServiceModal();"
                    class="py-3 px-4 rounded-full border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              <i class="${heartIconClass}"></i> Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.onclick = (e) => {
    if (e.target === modal) closeServiceModal();
  };

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeServiceModal() {
  const modal = document.getElementById('service-detail-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Request Quote Modal
function openQuoteModal(serviceName = '') {
  let modal = document.getElementById('quote-request-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quote-request-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8" onclick="event.stopPropagation()">
      <button onclick="closeQuoteModal()" class="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3 text-xl">
          <i class="fa-solid fa-calculator"></i>
        </div>
        <span class="section-tag mb-1">Quick Quotation</span>
        <h3 class="text-2xl font-black text-slate-900">Request Custom Quote</h3>
        <p class="text-xs text-slate-500 mt-1">Talk to our engineering team for custom steel, welding & interior solutions.</p>
      </div>

      <form id="quote-form" onsubmit="handleQuoteSubmit(event)" class="space-y-4 text-xs">
        <div>
          <label class="block text-slate-700 font-bold mb-1">Your Full Name</label>
          <input type="text" required placeholder="e.g. Sasi Kumar" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-700 font-bold mb-1">Phone Number</label>
            <input type="tel" required placeholder="+91 98450 12345" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label class="block text-slate-700 font-bold mb-1">Email Address</label>
            <input type="email" required placeholder="name@company.com" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div>
          <label class="block text-slate-700 font-bold mb-1">Service Required</label>
          <select class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500">
            ${servicesData.map(s => `
              <option value="${s.name}" ${serviceName === s.name ? 'selected' : ''}>${s.name} (${s.priceFormatted})</option>
            `).join('')}
            <option value="Custom Project" ${!serviceName ? 'selected' : ''}>Turnkey Structure / Interior Works</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-700 font-bold mb-1">Project Details or Site Address</label>
          <textarea rows="3" placeholder="Dimensions, tonnage, location, CAD blueprints..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"></textarea>
        </div>
        <button type="submit" class="w-full py-3.5 rounded-full bg-orange-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition-all shadow-md">
          Submit Quote Request
        </button>
      </form>
    </div>
  `;

  modal.onclick = (e) => {
    if (e.target === modal) closeQuoteModal();
  };

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeQuoteModal() {
  const modal = document.getElementById('quote-request-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function handleQuoteSubmit(e) {
  e.preventDefault();
  closeQuoteModal();
  showToast('Inquiry Submitted! Our engineering team will contact you within 2 hours.', 'success');
}

// Mobile Menu Handler
function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-button');
  const closeBtn = document.getElementById('mobile-menu-close');
  const menu = document.getElementById('mobile-menu');

  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      menu.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    });
  }

  if (closeBtn && menu) {
    closeBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });
  }
}

// Highlight active page link in navigation
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a, #mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('text-orange-600', 'font-bold');
      if (link.classList.contains('nav-pill')) {
        link.classList.add('bg-orange-50', 'text-orange-600');
      }
    }
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderCounts();
  updateWishlistButtonStates();
  setupMobileMenu();
  highlightActiveNav();
  injectFloatingContactButtons();

  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 30
    });
  }
});
