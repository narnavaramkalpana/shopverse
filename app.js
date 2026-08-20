// Carousel Slider Logic
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let slideInterval;

function showSlide(index) {
  if (slides.length === 0) return;
  
  slides.forEach(slide => slide.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function startSlideShow() {
  if (slides.length === 0) return;
  slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideShow() {
  clearInterval(slideInterval);
}

// Dot controls
dots.forEach(dot => {
  dot.addEventListener('click', (e) => {
    stopSlideShow();
    const index = parseInt(e.target.getAttribute('data-index'));
    showSlide(index);
    startSlideShow();
  });
});


// --- E-Commerce State & Globals ---
let currentPage = 1;
const productsLimit = 8;
let selectedCategory = 'all';
let searchQuery = '';
let totalProductsCount = 0;
let storeProducts = []; // Save current catalog fetched items

// Local storage items
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
let wishlistItems = JSON.parse(localStorage.getItem('wishlistItems')) || [];


// --- Page OnLoad Initializer ---
document.addEventListener('DOMContentLoaded', () => {
  // Carousel setup
  if (slides.length > 0) {
    showSlide(0);
    startSlideShow();
  }
  
  // FAQ Accordions toggles
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  updateCartWishlistBadges();
  
  // Initialize store catalog if grid container exists
  if (document.getElementById('productGrid')) {
    initStore();
  }

  // Setup Details Modal Closing
  const modalClose = document.getElementById('modalClose');
  const productModal = document.getElementById('productModal');
  if (modalClose && productModal) {
    modalClose.addEventListener('click', () => productModal.classList.remove('active'));
    // Close on click outside modal card
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) productModal.classList.remove('active');
    });
  }

  // Initialize AI assistant chatbot
  initAiAssistant();
});


function updateCartWishlistBadges() {
  const cartBadge = document.getElementById('cartBadge');
  const wishlistBadge = document.getElementById('wishlistBadge');
  if (cartBadge) cartBadge.textContent = cartItems.length;
  if (wishlistBadge) wishlistBadge.textContent = wishlistItems.length;
}


function initStore() {
  fetchProducts();
  setupCategoryFilters();
  setupSearch();
}

function setupCategoryFilters() {
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      selectedCategory = e.target.getAttribute('data-category');
      searchQuery = '';
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
      
      currentPage = 1;
      fetchProducts();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput && searchBtn) {
    const triggerSearch = () => {
      searchQuery = searchInput.value.trim();
      selectedCategory = 'all';
      const categoryBtns = document.querySelectorAll('.category-btn');
      categoryBtns.forEach(b => b.classList.remove('active'));
      if (categoryBtns[0]) categoryBtns[0].classList.add('active');
      
      currentPage = 1;
      fetchProducts();
    };

    searchBtn.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }
}

// Fetch products from DummyJSON API
async function fetchProducts() {
  const gridContainer = document.getElementById('productGrid');
  if (!gridContainer) return;
  
  gridContainer.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-muted);">
      <div style="display: inline-block; width: 2.5rem; height: 2.5rem; border: 4px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
      <p>Loading products from catalog...</p>
    </div>
  `;
  
  if (!document.getElementById('spin-keyframe')) {
    const style = document.createElement('style');
    style.id = 'spin-keyframe';
    style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const skip = (currentPage - 1) * productsLimit;
  let url = `https://dummyjson.com/products?limit=${productsLimit}&skip=${skip}`;
  
  if (searchQuery) {
    url = `https://dummyjson.com/products/search?q=${searchQuery}&limit=${productsLimit}&skip=${skip}`;
  } else if (selectedCategory !== 'all') {
    url = `https://dummyjson.com/products/category/${selectedCategory}?limit=${productsLimit}&skip=${skip}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    
    totalProductsCount = data.total;
    storeProducts = data.products;
    renderProducts(data.products);
    renderPagination();
  } catch (error) {
    console.error('Error fetching products:', error);
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-accent);">
        <i data-lucide="alert-triangle" style="width: 3rem; height: 3rem; margin: 0 auto 1rem;"></i>
        <p>Failed to load products. Please check your internet connection.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Render dynamic product cards
function renderProducts(products) {
  const gridContainer = document.getElementById('productGrid');
  if (!gridContainer) return;
  
  if (products.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-text-muted);">
        <p style="font-size: 1.15rem; font-weight: 500; margin-bottom: 0.5rem;">No products found</p>
        <p style="font-size: 0.9rem;">Try adjusting your keywords or category filters.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = '';
  
  products.forEach(product => {
    const discount = product.discountPercentage ? Math.round(product.discountPercentage) : 0;
    const currentPrice = product.price;
    const originalPrice = discount > 0 ? (currentPrice / (1 - discount/100)).toFixed(2) : null;
    
    const isWishlisted = wishlistItems.some(item => item.id === product.id);
    const wishlistClass = isWishlisted ? 'active' : '';
    const wishlistHeartIcon = isWishlisted ? 'fill' : 'none';

    const ratingRounded = Math.round(product.rating || 5);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<i data-lucide="star" style="width: 0.9rem; height: 0.9rem; ${i <= ratingRounded ? 'fill: #fbbf24; color: #fbbf24;' : ''}"></i>`;
    }

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
      <button class="wishlist-card-btn ${wishlistClass}" data-id="${product.id}" title="Add to Wishlist">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${wishlistHeartIcon}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </button>
      
      <div class="product-img-wrapper" style="cursor: pointer;" onclick="openProductDetails(${product.id})">
        <img src="${product.thumbnail}" class="product-img" alt="${product.title}" loading="lazy">
      </div>
      
      <div class="product-info">
        <h3 class="product-title" style="cursor: pointer;" onclick="openProductDetails(${product.id})">${product.title}</h3>
        <div class="product-rating">
          ${starsHtml}
          <span class="rating-value">(${product.rating.toFixed(2)})</span>
        </div>
        
        <div class="product-price-wrapper">
          <span class="product-price">$${currentPrice.toFixed(2)}</span>
          ${originalPrice ? `<span class="product-original-price">$${originalPrice}</span>` : ''}
        </div>
        
        <div class="stock-tag">
          ${product.stock > 0 ? `${product.stock} items available` : '<span style="color: var(--color-accent);">Out of stock</span>'}
        </div>
        
        <button class="add-to-cart-btn" data-id="${product.id}">
          <i data-lucide="shopping-cart" style="width: 1rem; height: 1rem;"></i> Add to Cart
        </button>
      </div>
    `;
    
    gridContainer.appendChild(card);
  });
  
  if (window.lucide) window.lucide.createIcons();
  attachCardEvents();
}

function attachCardEvents() {
  // Add to Cart Click
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = parseInt(e.currentTarget.getAttribute('data-id'));
      // Search in current catalog products
      const product = storeProducts.find(p => p.id === prodId);
      
      if (product) {
        cartItems.push(product);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        updateCartWishlistBadges();
        showToast(`"${product.title}" added to shopping bag!`, 'success');
      }
    });
  });

  // Wishlist Toggle Click
  document.querySelectorAll('.wishlist-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = parseInt(e.currentTarget.getAttribute('data-id'));
      const product = storeProducts.find(p => p.id === prodId);
      
      if (product) {
        const index = wishlistItems.findIndex(item => item.id === prodId);
        const svg = e.currentTarget.querySelector('svg');
        
        if (index === -1) {
          wishlistItems.push(product);
          e.currentTarget.classList.add('active');
          if (svg) svg.setAttribute('fill', 'currentColor');
          showToast(`"${product.title}" saved to wishlist!`, 'success');
        } else {
          wishlistItems.splice(index, 1);
          e.currentTarget.classList.remove('active');
          if (svg) svg.setAttribute('fill', 'none');
          showToast(`"${product.title}" removed from wishlist.`, 'info');
        }
        
        localStorage.setItem('wishlistItems', JSON.stringify(wishlistItems));
        updateCartWishlistBadges();
      }
    });
  });
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  container.innerHTML = '';
  const totalPages = Math.ceil(totalProductsCount / productsLimit);
  if (totalPages <= 1) return;
  
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 1rem; height: 1rem;"></i>';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      fetchProducts();
      scrollToProducts();
    });
    container.appendChild(prevBtn);
  }
  
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      fetchProducts();
      scrollToProducts();
    });
    container.appendChild(btn);
  }
  
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 1rem; height: 1rem;"></i>';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      fetchProducts();
      scrollToProducts();
    });
    container.appendChild(nextBtn);
  }
  
  if (window.lucide) window.lucide.createIcons();
}

function scrollToProducts() {
  const filterBar = document.querySelector('.filter-search-bar');
  if (filterBar) {
    filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}


// --- PRODUCT DETAILS MODAL LOGIC ---
async function openProductDetails(productId) {
  const modal = document.getElementById('productModal');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalBody) return;
  
  // Show Loading state inside modal
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 5rem 0;">
      <div style="display: inline-block; width: 2.5rem; height: 2.5rem; border: 4px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
      <p>Fetching product details...</p>
    </div>
  `;
  modal.classList.add('active');

  try {
    const response = await fetch(`https://dummyjson.com/products/${productId}`);
    if (!response.ok) throw new Error('Failed to load item detail');
    const product = await response.json();
    
    // Save detailed reviews list in local memory (or load standard reviews)
    let reviews = product.reviews || [
      { reviewerName: 'Samantha Green', rating: 5, date: '2026-06-12T10:00:00Z', comment: 'Absolutely love this! High quality and matches description.' },
      { reviewerName: 'David Miller', rating: 4, date: '2026-06-18T14:30:00Z', comment: 'Shipping was super quick. Packaging is nice. Good value.' }
    ];

    renderModalContent(product, reviews);
  } catch (error) {
    console.error(error);
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--color-accent);">
        <i data-lucide="alert-triangle" style="width: 3rem; height: 3rem; margin: 0 auto 1rem;"></i>
        <p>Failed to load product specifications. Please try again.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

function renderModalContent(product, reviews) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  const discount = product.discountPercentage ? Math.round(product.discountPercentage) : 0;
  const ratingRounded = Math.round(product.rating || 5);
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<i data-lucide="star" style="width: 1.1rem; height: 1.1rem; ${i <= ratingRounded ? 'fill: #fbbf24; color: #fbbf24;' : ''}"></i>`;
  }

  // Render Reviews List HTML
  let reviewsHtml = '';
  reviews.forEach(rev => {
    let revStars = '';
    for (let j = 1; j <= 5; j++) {
      revStars += `<i data-lucide="star" style="width: 0.8rem; height: 0.8rem; ${j <= rev.rating ? 'fill: #fbbf24; color: #fbbf24;' : ''}"></i>`;
    }
    const dateStr = new Date(rev.date).toLocaleDateString();
    
    reviewsHtml += `
      <div class="review-item">
        <div class="review-meta">
          <span class="review-author">${rev.reviewerName}</span>
          <span class="review-date">${dateStr}</span>
        </div>
        <div class="review-rating">${revStars}</div>
        <p class="review-comment">${rev.comment}</p>
      </div>
    `;
  });

  modalBody.innerHTML = `
    <div class="modal-grid">
      <!-- Image Column -->
      <div class="modal-img-container">
        <img src="${product.thumbnail}" alt="${product.title}">
      </div>
      
      <!-- Info Column -->
      <div>
        <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-primary); font-weight: 700; margin-bottom: 0.5rem; display: block;">${product.category}</span>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; line-height: 1.2;">${product.title}</h2>
        
        <div class="product-rating" style="margin-bottom: 1rem;">
          ${starsHtml}
          <span class="rating-value" style="font-size: 0.9rem;">(${product.rating.toFixed(2)} Rating)</span>
        </div>
        
        <div class="product-price-wrapper" style="margin-bottom: 1.25rem;">
          <span class="product-price" style="font-size: 1.5rem;">$${product.price.toFixed(2)}</span>
          ${discount > 0 ? `<span class="product-original-price" style="font-size: 1.1rem; margin-left: 0.5rem;">$${(product.price / (1 - discount/100)).toFixed(2)}</span>` : ''}
        </div>
        
        <p class="modal-desc">${product.description || 'No detailed specifications listed.'}</p>
        
        <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <span>📦 Warranty: ${product.warrantyInformation || '1 Year Manufacturer'}</span>
          <span>🚚 Shipping: ${product.shippingInformation || 'Dispatched in 2 days'}</span>
          <span>🏷️ Brand: ${product.brand || 'ShopVerse Select'}</span>
          <span>⚙️ Availability: ${product.stock > 0 ? `${product.stock} items left` : 'Out of stock'}</span>
        </div>
        
        <button class="auth-btn" id="modalAddToCartBtn" style="padding: 0.85rem;">
          <i data-lucide="shopping-cart" style="width: 1.1rem; height: 1.1rem; display: inline-block; vertical-align: middle; margin-right: 0.25rem;"></i> Add to Cart Bag
        </button>
      </div>
    </div>

    <!-- Dynamic Customer Reviews Section -->
    <div class="reviews-section">
      <h3>Customer Reviews</h3>
      
      <div class="reviews-list" id="modalReviewsList">
        ${reviewsHtml}
      </div>

      <!-- Add Review Form -->
      <form class="review-form" id="modalReviewForm" novalidate>
        <h4>Write a Customer Review</h4>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div class="form-group" id="groupRevAuthor">
            <label class="form-label">Your Name</label>
            <input type="text" class="form-control" id="revAuthor" placeholder="Jane Doe" required style="padding-left: 1rem;">
          </div>
          
          <div class="form-group">
            <label class="form-label">Rating</label>
            <select class="form-control" id="revRating" style="padding-left: 1rem; cursor: pointer;">
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </select>
          </div>
        </div>
        
        <div class="form-group" id="groupRevComment" style="margin-bottom: 1.25rem;">
          <label class="form-label">Review Details</label>
          <textarea class="form-control" id="revComment" placeholder="Explain your feedback..." rows="3" required style="padding-left: 1rem; resize: none; font-family: inherit;"></textarea>
        </div>

        <button type="submit" class="coupon-apply-btn">Submit Review</button>
      </form>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Add to cart from modal
  const btn = document.getElementById('modalAddToCartBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      cartItems.push(product);
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      updateCartWishlistBadges();
      showToast(`"${product.title}" added to shopping bag!`, 'success');
    });
  }

  // Reviews submission
  const reviewForm = document.getElementById('modalReviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const author = document.getElementById('revAuthor');
      const rating = document.getElementById('revRating');
      const comment = document.getElementById('revComment');
      
      let isValid = true;
      if (!author.value.trim()) { toggleErrState('groupRevAuthor', true); isValid = false; } else toggleErrState('groupRevAuthor', false);
      if (!comment.value.trim()) { toggleErrState('groupRevComment', true); isValid = false; } else toggleErrState('groupRevComment', false);

      if (isValid) {
        const newRev = {
          reviewerName: author.value.trim(),
          rating: parseInt(rating.value),
          date: new Date().toISOString(),
          comment: comment.value.trim()
        };

        reviews.unshift(newRev);
        showToast('Review submitted successfully!', 'success');
        
        // Re-render modal content
        renderModalContent(product, reviews);
      }
    });
  }
}

function toggleErrState(groupId, show) {
  const g = document.getElementById(groupId);
  if (g) {
    if (show) g.classList.add('has-error');
    else g.classList.remove('has-error');
  }
}


// --- AI SHOPPING ASSISTANT LOGIC ---
function initAiAssistant() {
  const bubble = document.getElementById('chatBubble');
  const window = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatCloseBtn');
  const sendBtn = document.getElementById('chatSend');
  const input = document.getElementById('chatInput');
  const quickBtns = document.querySelectorAll('.quick-reply-btn');
  
  if (!bubble || !window) return;

  bubble.addEventListener('click', () => {
    window.classList.toggle('active');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.classList.remove('active');
    });
  }

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    
    appendChatMessage(text, 'user');
    input.value = '';
    
    // Simulate thinking and reply
    setTimeout(() => {
      generateBotResponse(text);
    }, 800);
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) {
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Quick Replies Click
  quickBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const query = e.target.getAttribute('data-reply');
      appendChatMessage(query, 'user');
      setTimeout(() => {
        generateBotResponse(query);
      }, 800);
    });
  });
}

function appendChatMessage(text, sender) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;
  msgDiv.textContent = text;
  
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function generateBotResponse(userText) {
  const query = userText.toLowerCase();
  let botReply = '';

  if (query.includes('makeup') || query.includes('cosmetic') || query.includes('beauty')) {
    botReply = 'Finding beauty products from our store catalog... 💄';
    appendChatMessage(botReply, 'bot');
    
    try {
      const res = await fetch('https://dummyjson.com/products/category/beauty?limit=3');
      const data = await res.json();
      let matches = 'Here are our top recommended beauty items:\n\n';
      data.products.forEach(p => {
        matches += `✨ ${p.title} - $${p.price.toFixed(2)}\n`;
      });
      matches += '\nFeel free to explore them in the catalog grid!';
      appendChatMessage(matches, 'bot');
    } catch {
      appendChatMessage('Sorry, I had trouble fetching those products right now.', 'bot');
    }
    return;
  }
  
  if (query.includes('phone') || query.includes('smartphone') || query.includes('tech')) {
    botReply = 'Looking up active smartphones listings... 📱';
    appendChatMessage(botReply, 'bot');
    
    try {
      const res = await fetch('https://dummyjson.com/products/category/smartphones?limit=3');
      const data = await res.json();
      let matches = 'Here are some premium smartphones in stock:\n\n';
      data.products.forEach(p => {
        matches += `📱 ${p.title} - $${p.price.toFixed(2)}\n`;
      });
      matches += '\nType any product name in our search bar to find them instantly!';
      appendChatMessage(matches, 'bot');
    } catch {
      appendChatMessage('Sorry, I had trouble accessing tech listings.', 'bot');
    }
    return;
  }

  if (query.includes('coupon') || query.includes('offer') || query.includes('code') || query.includes('discount')) {
    botReply = '🎫 Active Coupon Offers:\n\n1. **SAVE20** - Applies a 20% flat discount on your cart total.\n2. **WELCOME10** - Gets you 10% off your initial purchase.\n\nYou can enter these codes in your Cart Summary panel before checkout!';
  } else if (query.includes('shipping') || query.includes('delivery') || query.includes('time')) {
    botReply = '🚚 Shipping Information:\n\n* **Standard Shipping:** 3-5 business days ($10.00, Free for orders above $50).\n* **Express Delivery:** 1-2 business days ($25.00).\n\nOrders are dispatched within 24 hours of placement!';
  } else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    botReply = 'Hello! How can I assist you with your ShopVerse shopping experience today? Ask me about products, shipping, or coupons!';
  } else {
    botReply = "I'm a shopping assistant. I can help you search for categories, recommend products, or show deals. Try asking:\n\n👉 *'Show me smartphones'*\n👉 *'Active coupon codes?'*\n👉 *'Recommend cosmetic products'*\n👉 *'What are the shipping fees?'*";
  }

  appendChatMessage(botReply, 'bot');
}
