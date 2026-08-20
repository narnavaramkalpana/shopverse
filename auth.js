// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Re-run lucide to render the icon in toast
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Remove toast after animation
  setTimeout(() => {
    toast.style.animation = 'toast-in 0.3s reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      
      // Animate hamburger lines
      const spans = menuToggle.querySelectorAll('span');
      if (navLinks.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });
  }

  // Manage Logged In state in Header
  updateHeaderAuthState();
});

// Update navigation header based on auth state
function updateHeaderAuthState() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const authNavItem = document.getElementById('authNavItem');
  const registerNavItem = document.getElementById('registerNavItem');

  if (currentUser) {
    // User is logged in
    if (registerNavItem) {
      registerNavItem.style.display = 'none';
    }

    if (authNavItem) {
      authNavItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          <a href="dashboard.html" class="user-tag"><i data-lucide="user" style="width: 0.9rem; height: 0.9rem; display: inline-block; vertical-align: middle; margin-right: 0.25rem;"></i>${currentUser.name}</a>
          <span class="logout-link" id="logoutBtn">Logout</span>
        </div>
      `;
      
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('currentUser');
          showToast('Logged out successfully!', 'info');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        });
      }
    }
  }
}

// Password Strength Meter Logic (Register page only)
const regPasswordInput = document.getElementById('regPassword');
if (regPasswordInput) {
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  regPasswordInput.addEventListener('input', () => {
    const val = regPasswordInput.value;
    let score = 0;
    
    if (val.length >= 6) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score++;

    let width = '0%';
    let color = 'var(--color-accent)';
    let text = 'Weak';

    if (val.length > 0) {
      if (score === 1) {
        width = '25%';
        color = '#ef4444'; // Red
        text = 'Weak';
      } else if (score === 2) {
        width = '50%';
        color = '#f97316'; // Orange
        text = 'Fair';
      } else if (score === 3) {
        width = '75%';
        color = '#eab308'; // Yellow
        text = 'Strong';
      } else if (score === 4) {
        width = '100%';
        color = '#10b981'; // Green
        text = 'Excellent';
      }
    }

    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = `Password Strength: ${text}`;
    strengthText.style.color = color;
  });
}

// Form Submission & Validation: Registration Page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('regConfirmPassword');
    const termsInput = document.getElementById('regTerms');
    
    let isValid = true;
    
    // Validate Name
    if (!nameInput.value.trim()) {
      showFieldError('groupName', true);
      isValid = false;
    } else {
      showFieldError('groupName', false);
    }
    
    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showFieldError('groupEmail', true);
      isValid = false;
    } else {
      showFieldError('groupEmail', false);
    }
    
    // Validate Password
    if (passwordInput.value.length < 6) {
      showFieldError('groupPassword', true);
      isValid = false;
    } else {
      showFieldError('groupPassword', false);
    }
    
    // Validate Confirm Password
    if (confirmPasswordInput.value !== passwordInput.value || !confirmPasswordInput.value) {
      showFieldError('groupConfirmPassword', true);
      isValid = false;
    } else {
      showFieldError('groupConfirmPassword', false);
    }
    
    // Validate Terms
    if (!termsInput.checked) {
      showFieldError('groupTerms', true);
      isValid = false;
    } else {
      showFieldError('groupTerms', false);
    }
    
    if (isValid) {
      // Check if user already exists
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const userExists = users.some(u => u.email.toLowerCase() === emailInput.value.trim().toLowerCase());
      
      if (userExists) {
        showToast('Account with this email already exists.', 'error');
        return;
      }
      
      // Save User
      const newUser = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      showToast('Registration Successful! Redirecting to login...', 'success');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    }
  });
}

// Form Submission & Validation: Login Page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('logEmail');
    const passwordInput = document.getElementById('logPassword');
    
    let isValid = true;
    
    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showFieldError('groupEmail', true);
      isValid = false;
    } else {
      showFieldError('groupEmail', false);
    }
    
    // Validate Password
    if (!passwordInput.value) {
      showFieldError('groupPassword', true);
      isValid = false;
    } else {
      showFieldError('groupPassword', false);
    }
    
    if (isValid) {
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const matchedUser = users.find(u => u.email === emailInput.value.trim().toLowerCase() && u.password === passwordInput.value);
      
      if (matchedUser) {
        // Successful login
        localStorage.setItem('currentUser', JSON.stringify({
          name: matchedUser.name,
          email: matchedUser.email
        }));
        
        showToast(`Welcome back, ${matchedUser.name}!`, 'success');
        
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        showToast('Invalid email or password.', 'error');
      }
    }
  });
}

// Helper to show/hide validation state
function showFieldError(groupId, isError) {
  const group = document.getElementById(groupId);
  if (group) {
    if (isError) {
      group.classList.add('has-error');
    } else {
      group.classList.remove('has-error');
    }
  }
}
