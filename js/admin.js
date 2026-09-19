// =========================================================
// SASI STEEL ENGINEERING - ADMIN DASHBOARD ENGINE (Supabase & Cloudinary)
// =========================================================

let currentActiveTab = 'employees';
let activeModalType = null;
let editingItemId = null;

const PROTECTED_SECTIONS = ['quotations', 'orders', 'finance'];

// In-memory lock state: All 3 sections are always locked by default on page load / refresh
const sectionLockState = {
  quotations: true,
  orders: true,
  finance: true
};

let previousActiveTab = 'employees';
let pendingUnlockTab = null;

// Auth check on load
async function loadInitialCounts() {
  try {
    const quotes = await dbGetQuotations();
    if (quotes) {
      allQuotationsRecords = quotes;
      const b = document.getElementById('badge-quotes-count');
      if (b) b.textContent = quotes.length;
    }
    const inq = await dbGetInquiries();
    if (inq) {
      allInquiriesRecords = inq;
      const unread = inq.filter(i => i.status === 'New').length;
      const b = document.getElementById('badge-inquiries-count');
      if (b) b.textContent = allQuotationsRecords.length;
      const bSub = document.getElementById('badge-inquiries-subtab-count');
      if (bSub) bSub.textContent = inq.length;
    }
    const orders = await dbGetOrders();
    if (orders) {
      allOrdersRecords = orders;
      const activeOrd = orders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
      const b = document.getElementById('badge-orders-count');
      if (b) b.textContent = activeOrd;
    }
    const emp = await dbGetEmployees();
    if (emp) {
      const b = document.getElementById('badge-employees-count');
      if (b) b.textContent = emp.length;
    }
    const prods = await dbGetProducts();
    if (prods) {
      allProductsRecords = prods;
      const b = document.getElementById('badge-products-count');
      if (b) b.textContent = prods.length;
    }
  } catch (e) {}
}

function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('sasi_admin_auth');
  const authModal = document.getElementById('auth-modal');
  if (!isAuth) {
    if (authModal) authModal.classList.remove('hidden');
  } else {
    if (authModal) authModal.classList.add('hidden');
    initHeaderTodayDate();

    // Check if session has already unlocked the protected sections
    const isUnlocked = sessionStorage.getItem('sasi_sections_unlocked') === 'true';
    PROTECTED_SECTIONS.forEach(sec => {
      sectionLockState[sec] = !isUnlocked;
    });

    updateAllLockBadges();
    
    // Navigate to default tab
    switchTab(isUnlocked ? 'quotations' : 'employees');
    loadInitialCounts();
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value.trim();

  // Master password check
  if ((user === 'admin' || user === 'sasisteels863@gmail.com') && (pass === '123456789' || pass === 'sasi833399')) {
    sessionStorage.setItem('sasi_admin_auth', 'true');
    document.getElementById('auth-modal').classList.add('hidden');
    initHeaderTodayDate();
    updateAllLockBadges();
    switchTab('employees');
    loadInitialCounts();
  } else {
    alert('Incorrect credentials! Please enter the correct password.');
  }
}

// ================= DASHBOARD TOAST NOTIFICATION ENGINE =================
function showDashboardToast(message, type = 'success', actionText = '', actionCallback = null) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-md w-full px-4';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  let bgClass = 'bg-slate-900 border-slate-700 text-white';
  let icon = '<i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>';

  if (type === 'success') {
    bgClass = 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/50';
    icon = '<i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>';
  } else if (type === 'error') {
    bgClass = 'bg-slate-900/95 border-red-500/50 text-white shadow-red-950/50';
    icon = '<i class="fa-solid fa-circle-xmark text-red-400 text-base"></i>';
  } else if (type === 'info') {
    bgClass = 'bg-slate-900/95 border-cyan-500/50 text-white shadow-cyan-950/50';
    icon = '<i class="fa-solid fa-circle-info text-cyan-400 text-base"></i>';
  } else if (type === 'warning') {
    bgClass = 'bg-slate-900/95 border-amber-500/50 text-white shadow-amber-950/50';
    icon = '<i class="fa-solid fa-triangle-exclamation text-amber-400 text-base"></i>';
  }

  const toastId = 'toast-' + Date.now();
  toast.id = toastId;
  toast.className = `toast pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${bgClass} text-xs font-semibold transition-all`;
  
  toast.innerHTML = `
    <div class="flex items-center gap-2.5 flex-1">
      ${icon}
      <span class="leading-snug">${message}</span>
    </div>
    <div class="flex items-center gap-2">
      ${actionText && typeof actionCallback === 'function' ? `
        <button id="${toastId}-btn" class="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] transition-all whitespace-nowrap shadow-sm cursor-pointer">
          ${actionText}
        </button>
      ` : ''}
      <button onclick="this.closest('.toast').remove()" class="text-slate-400 hover:text-white text-sm px-1 cursor-pointer">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;

  container.appendChild(toast);

  if (actionText && typeof actionCallback === 'function') {
    const actionBtn = document.getElementById(`${toastId}-btn`);
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        actionCallback();
        toast.remove();
      });
    }
  }

  setTimeout(() => {
    if (toast && toast.parentElement) {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 350);
    }
  }, 5000);
}

function lockAllProtectedSections() {
  PROTECTED_SECTIONS.forEach(sec => {
    sectionLockState[sec] = true;
    updateSectionLockIcon(sec, true);
  });
  sessionStorage.removeItem('sasi_sections_unlocked');
  if (PROTECTED_SECTIONS.includes(currentActiveTab)) {
    switchTab('employees');
  }
  showDashboardToast(`🔒 All protected sections have been locked.`, 'info');
}

function adminLogout() {
  sessionStorage.removeItem('sasi_admin_auth');
  sessionStorage.removeItem('sasi_sections_unlocked');
  window.location.reload();
}

function toggleSidebar() {
  const sb = document.getElementById('admin-sidebar');
  if (sb) sb.classList.toggle('hidden');
}

// ================= PIN LOCK & SECURITY CONTROLLER =================

function updateSectionLockIcon(sectionName, isLocked) {
  const iconEl = document.getElementById(`lock-icon-${sectionName}`);
  if (!iconEl) return;
  if (isLocked) {
    iconEl.className = 'fa-solid fa-lock text-[11px] text-amber-400 transition-transform';
    iconEl.title = 'Protected with Security PIN';
  } else {
    iconEl.className = 'fa-solid fa-lock-open text-[11px] text-emerald-400 transition-transform';
    iconEl.title = 'Unlocked for current session';
  }
}

function updateAllLockBadges() {
  PROTECTED_SECTIONS.forEach(sec => {
    updateSectionLockIcon(sec, sectionLockState[sec]);
  });
}

function openPinLockModal(targetTab) {
  pendingUnlockTab = targetTab;
  const modal = document.getElementById('pin-lock-modal');
  const titleEl = document.getElementById('pin-lock-section-title');
  const descEl = document.getElementById('pin-lock-section-desc');
  const iconEl = document.getElementById('pin-lock-icon');
  const inputEl = document.getElementById('pin-input');
  const errorEl = document.getElementById('pin-lock-error');

  if (errorEl) errorEl.classList.add('hidden');
  if (inputEl) {
    inputEl.value = '';
    inputEl.classList.remove('border-red-500');
  }

  let sectionDisplayName = 'Protected Section';
  let sectionDesc = 'Enter your 4-digit master security PIN. Entering PIN unlocks all protected sections (Quotations, Orders & Finance) for this session.';
  let iconClass = 'fa-solid fa-lock';

  if (targetTab === 'quotations') {
    sectionDisplayName = 'Quotations & Leads';
    sectionDesc = 'Enter your PIN to unlock Quotations, Orders & Bookings, and Finance sections.';
    iconClass = 'fa-solid fa-file-invoice text-orange-500';
  } else if (targetTab === 'orders') {
    sectionDisplayName = 'Orders & Bookings';
    sectionDesc = 'Enter your PIN to unlock Orders, Quotations, and Finance sections.';
    iconClass = 'fa-solid fa-cart-shopping text-emerald-400';
  } else if (targetTab === 'finance') {
    sectionDisplayName = 'Income & Expenses (Finance)';
    sectionDesc = 'Enter your PIN to unlock Finance, Quotations, and Orders sections.';
    iconClass = 'fa-solid fa-chart-line text-emerald-400';
  }

  if (titleEl) titleEl.textContent = sectionDisplayName;
  if (descEl) descEl.textContent = sectionDesc;
  if (iconEl) iconEl.className = iconClass;

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (inputEl) inputEl.focus();
    }, 100);
  }
}

function closePinLockModal() {
  const modal = document.getElementById('pin-lock-modal');
  if (modal) modal.classList.add('hidden');
  const inputEl = document.getElementById('pin-input');
  if (inputEl) inputEl.value = '';
}

function cancelPinUnlockModal() {
  closePinLockModal();
  const wasPending = pendingUnlockTab;
  pendingUnlockTab = null;

  // If currently on a locked section without unlock, revert to safe unlocked tab (employees or inventory)
  if (PROTECTED_SECTIONS.includes(currentActiveTab) && sectionLockState[currentActiveTab]) {
    switchTab('employees');
  }
}

async function handlePinUnlockSubmit(e) {
  if (e) e.preventDefault();
  const inputEl = document.getElementById('pin-input');
  const errorEl = document.getElementById('pin-lock-error');
  const errorTextEl = document.getElementById('pin-lock-error-text');
  const unlockBtn = document.getElementById('pin-unlock-btn');
  const enteredPin = inputEl?.value.trim();

  if (!enteredPin) {
    if (errorEl && errorTextEl) {
      errorTextEl.textContent = "Please enter your security PIN.";
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (unlockBtn) {
    unlockBtn.disabled = true;
    unlockBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying...`;
  }

  try {
    const isCorrect = await dbVerifySecurityPin(enteredPin);
    if (isCorrect) {
      const targetTab = pendingUnlockTab || currentActiveTab;
      
      // UNLOCK ALL PROTECTED SECTIONS TOGETHER (Quotations, Orders & Finance)
      PROTECTED_SECTIONS.forEach(sec => {
        sectionLockState[sec] = false;
        updateSectionLockIcon(sec, false);
      });
      sessionStorage.setItem('sasi_sections_unlocked', 'true');

      closePinLockModal();

      previousActiveTab = currentActiveTab;
      currentActiveTab = targetTab;

      document.querySelectorAll('.sidebar-link').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(`tab-btn-${targetTab}`);
      if (activeBtn) activeBtn.classList.add('active');

      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(`section-${targetTab}`);
      if (activeSection) activeSection.classList.remove('hidden');

      loadCurrentTab();
      pendingUnlockTab = null;

      showDashboardToast(`🔓 All protected sections (Quotations, Orders & Finance) unlocked!`, 'success');
    } else {
      if (errorEl && errorTextEl) {
        errorTextEl.textContent = "Incorrect PIN. Please try again.";
        errorEl.classList.remove('hidden');
      }
      if (inputEl) {
        inputEl.classList.add('border-red-500');
        inputEl.value = '';
        inputEl.focus();
      }
    }
  } catch (err) {
    if (errorEl && errorTextEl) {
      errorTextEl.textContent = err.message || "Verification failed. Please try again.";
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (unlockBtn) {
      unlockBtn.disabled = false;
      unlockBtn.innerHTML = `<i class="fa-solid fa-lock-open mr-2"></i> Unlock All Sections`;
    }
  }
}

// Numeric Keypad Handlers
function appendPinDigit(digit) {
  const input = document.getElementById('pin-input');
  if (input && input.value.length < 8) {
    input.value += digit;
    const errorEl = document.getElementById('pin-lock-error');
    if (errorEl) errorEl.classList.add('hidden');
  }
}

function clearPinInput() {
  const input = document.getElementById('pin-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function backspacePinDigit() {
  const input = document.getElementById('pin-input');
  if (input && input.value.length > 0) {
    input.value = input.value.slice(0, -1);
  }
}

function togglePinInputVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btnEl) {
    btnEl.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
  }
}

// Change PIN Modal Handlers
function openChangePinModal() {
  const modal = document.getElementById('change-pin-modal');
  const msgEl = document.getElementById('change-pin-msg');
  if (msgEl) {
    msgEl.className = 'hidden mb-4 p-3 rounded-xl text-xs font-semibold';
    msgEl.innerHTML = '';
  }
  document.getElementById('change-pin-current').value = '';
  document.getElementById('change-pin-new').value = '';
  document.getElementById('change-pin-confirm').value = '';
  if (modal) modal.classList.remove('hidden');
}

function closeChangePinModal() {
  const modal = document.getElementById('change-pin-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleChangePinSubmit(e) {
  e.preventDefault();
  const currentPin = document.getElementById('change-pin-current').value.trim();
  const newPin = document.getElementById('change-pin-new').value.trim();
  const confirmPin = document.getElementById('change-pin-confirm').value.trim();
  const msgEl = document.getElementById('change-pin-msg');
  const saveBtn = document.getElementById('btn-change-pin-save');

  if (newPin !== confirmPin) {
    if (msgEl) {
      msgEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 block';
      msgEl.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1.5"></i> New PIN and Confirm PIN do not match.';
    }
    return;
  }

  if (newPin.length < 4 || newPin.length > 8) {
    if (msgEl) {
      msgEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 block';
      msgEl.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1.5"></i> New PIN must be between 4 and 8 digits.';
    }
    return;
  }

  if (!/^\d+$/.test(newPin)) {
    if (msgEl) {
      msgEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 block';
      msgEl.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1.5"></i> PIN must contain numeric digits only.';
    }
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Verifying & Saving...`;
  }

  try {
    await dbChangeSecurityPin(currentPin, newPin);

    if (msgEl) {
      msgEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 block';
      msgEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i> Security PIN updated successfully!';
    }

    setTimeout(() => {
      closeChangePinModal();
    }, 1200);
  } catch (err) {
    if (msgEl) {
      msgEl.className = 'mb-4 p-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 block';
      msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i> ${err.message || 'Current PIN is incorrect. Please try again.'}`;
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-shield-halved mr-1.5"></i> Verify & Save New PIN`;
    }
  }
}

// Tab Switching Controller (Keeps unlocked sections accessible throughout session)
function switchTab(tabName) {
  // If target section is protected and still locked, intercept and show PIN modal
  if (PROTECTED_SECTIONS.includes(tabName) && sectionLockState[tabName] === true) {
    openPinLockModal(tabName);
    return;
  }

  previousActiveTab = currentActiveTab;
  currentActiveTab = tabName;

  document.querySelectorAll('.sidebar-link').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
  const activeSection = document.getElementById(`section-${tabName}`);
  if (activeSection) activeSection.classList.remove('hidden');

  loadCurrentTab();
}

function loadCurrentTab() {
  switch (currentActiveTab) {
    case 'quotations': loadQuotations(); break;
    case 'orders': loadOrders(); break;
    case 'employees': loadEmployees(); break;
    case 'attendance': loadAttendance(); break;
    case 'inventory': loadInventory(); break;
    case 'finance': loadFinance(); break;
    case 'products': loadProducts(); break;
    case 'gallery': loadGallery(); break;
  }
}

// Global State for Filtering & Exports
// Date Utilities for Accurate Filtering Across Timezones
function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRecordDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
    const parts = val.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return getLocalDateStr(d);
    }
  } catch (e) {}
  return String(val).substring(0, 10);
}

function formatDisplayDate(val) {
  if (!val) return getLocalDateStr();
  try {
    const raw = getRecordDateStr(val);
    if (!raw || !raw.includes('-')) return String(val);
    const [year, month, day] = raw.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIndex = parseInt(month, 10) - 1;
    const mName = (mIndex >= 0 && mIndex < 12) ? monthNames[mIndex] : month;
    return `${parseInt(day, 10)} ${mName} ${year}`;
  } catch (e) {
    return String(val);
  }
}

function initHeaderTodayDate() {
  const badgeEl = document.getElementById('header-today-text');
  if (badgeEl) {
    const d = new Date();
    const day = d.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    badgeEl.textContent = `${weekDays[d.getDay()]}, ${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }
}

let allInquiriesRecords = [];
let allOrdersRecords = [];
let allEmployeesRecords = [];
let allAttendanceRecords = [];
let allInventoryRecords = [];
let allFinanceRecords = [];
let allProductsRecords = [];

let currentInquiryDatePreset = 'all';
let currentOrderDatePreset = 'all';
let currentAttendanceDatePreset = 'all';
let currentFinanceDatePreset = 'all';

// ================= GLOBAL UNIFIED DATE FILTER ENGINE =================
function setDateFilterPreset(prefix, preset) {
  const todayStr = getLocalDateStr();
  const fromInput = document.getElementById(`${prefix}-filter-from`);
  const toInput = document.getElementById(`${prefix}-filter-to`);

  if (preset === 'today') {
    if (fromInput) fromInput.value = todayStr;
    if (toInput) toInput.value = todayStr;
  } else if (preset === 'this_week') {
    const now = new Date();
    const day = now.getDay(); // 0 is Sun, 1 is Mon
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const mondayStr = getLocalDateStr(monday);
    const endOfWeek = new Date(monday);
    endOfWeek.setDate(monday.getDate() + 6);
    const endOfWeekStr = getLocalDateStr(endOfWeek);
    if (fromInput) fromInput.value = mondayStr;
    if (toInput) toInput.value = endOfWeekStr;
  } else if (preset === 'this_month') {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = getLocalDateStr(lastDay);
    if (fromInput) fromInput.value = firstDay;
    if (toInput) toInput.value = lastDayStr;
  } else if (preset === 'all') {
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
  }

  updatePresetButtonStyles(prefix, preset);

  // Trigger the appropriate section filter
  if (prefix === 'inquiry') filterInquiriesData();
  else if (prefix === 'order') filterOrdersData();
  else if (prefix === 'attendance') filterAttendanceData();
  else if (prefix === 'finance') filterFinanceData();
}

function onDateInputFilterChange(prefix) {
  const fromVal = document.getElementById(`${prefix}-filter-from`)?.value || '';
  const toVal = document.getElementById(`${prefix}-filter-to`)?.value || '';
  const todayStr = getLocalDateStr();
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = getLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  let matchedPreset = 'custom';
  if (!fromVal && !toVal) {
    matchedPreset = 'all';
  } else if (fromVal === todayStr && toVal === todayStr) {
    matchedPreset = 'today';
  } else if (fromVal === firstDay && (toVal === lastDay || toVal === todayStr)) {
    matchedPreset = 'this_month';
  }

  updatePresetButtonStyles(prefix, matchedPreset);

  if (prefix === 'inquiry') filterInquiriesData();
  else if (prefix === 'order') filterOrdersData();
  else if (prefix === 'attendance') filterAttendanceData();
  else if (prefix === 'finance') filterFinanceData();
}

function updatePresetButtonStyles(prefix, activePreset) {
  const allBtn = document.getElementById(`${prefix}-preset-all`);
  const todayBtn = document.getElementById(`${prefix}-preset-today`);
  const weekBtn = document.getElementById(`${prefix}-preset-week`);
  const monthBtn = document.getElementById(`${prefix}-preset-month`);

  [allBtn, todayBtn, weekBtn, monthBtn].forEach(b => {
    if (b) {
      b.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer';
    }
  });

  const activeBtn = document.getElementById(`${prefix}-preset-${activePreset === 'this_month' ? 'month' : (activePreset === 'this_week' ? 'week' : activePreset)}`);
  if (activeBtn) {
    activeBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all bg-orange-600 text-white shadow cursor-pointer';
  }
}

// ================= CSV EXPORT ENGINE =================
function downloadCSV(filename, headers, rows) {
  let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel compatibility
  csvContent += headers.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(",") + "\r\n";
  
  rows.forEach(row => {
    csvContent += row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(",") + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Global Quotations Engine State
let allQuotationsRecords = [];
let currentQuoteDatePreset = 'all';
let currentQuotationSubTab = 'official';
let activeQuotationEditingId = null;
let activeQuotationItems = [];
let activeQuotationTerms = [];
let activeQuotationSettings = null;
let activeCatalogPickerTargetIndex = null;
let previewingQuotationData = null;

const OFFICIAL_COMPANY_TERMS = [
  'Items will be ready within 30-45 working days form the date of Approval.',
  'Price ex-works, 60% Advance along with Work Order, 30% against delivery, balance 10% payment after installation',
  'Above rates are excluding of GST, will be applicable @ 18%',
  'Installation/Mechanic/oil of above fixtures on site is not in our scope of work, If it is then it will be charge extra 6-8% on base value for above one lakh, Rs2000 per head below one lakh.',
  'Above rates are excluding of loading, unloading & transportation Charges, It will be charge extra at actuals, Packing charges 4% extra.',
  'Above rates are approximately and are likely to be change, according to the (Market/Rawmaterials) conditions.',
  'This Quotation is valid for 15days from the date of issue.'
];

function sanitizeQuotationTerms(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return [...OFFICIAL_COMPANY_TERMS];
  }
  const isOldOutdated = terms.some(t => typeof t === 'string' && (
    t.includes('Prices are valid for 15 days from the date of quotation') ||
    t.includes('drawing approval') ||
    t.includes('Guntur jurisdiction only')
  ));
  if (isOldOutdated || terms.length < 7) {
    return [...OFFICIAL_COMPANY_TERMS];
  }
  return terms.filter(t => t && String(t).trim().length > 0);
}

function sanitizeQuotationSettings(settings) {
  const s = { ...DEFAULT_QUOTATION_SETTINGS, ...(settings || {}) };
  if (!s.company_address || s.company_address.includes('Hosanna Church') || s.company_address.includes('522034')) {
    s.company_address = DEFAULT_QUOTATION_SETTINGS.company_address;
  }
  if (!s.company_phone || s.company_phone.includes('83339 99912')) {
    s.company_phone = DEFAULT_QUOTATION_SETTINGS.company_phone;
  }
  if (!s.company_gstin || s.company_gstin.includes('37AAAAA0000A1Z5')) {
    s.company_gstin = DEFAULT_QUOTATION_SETTINGS.company_gstin;
  }
  if (!s.bank_name || s.bank_name === 'State Bank of India') {
    s.bank_name = DEFAULT_QUOTATION_SETTINGS.bank_name;
  }
  if (!s.account_number || s.account_number === '39824567123') {
    s.account_number = DEFAULT_QUOTATION_SETTINGS.account_number;
  }
  if (!s.company_logo) {
    s.company_logo = DEFAULT_QUOTATION_SETTINGS.company_logo;
  }
  s.default_terms = sanitizeQuotationTerms(s.default_terms);
  return s;
}

// Helper: Convert Image URL or File to Base64 for ExcelJS & PDF
async function urlToBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Could not convert image to base64:", url, e);
    return null;
  }
}

// ================= 1. QUOTATIONS & ESTIMATES CONTROLLER =================

function switchQuotationSubTab(subTab) {
  currentQuotationSubTab = subTab;
  const offBtn = document.getElementById('subtab-btn-official');
  const inqBtn = document.getElementById('subtab-btn-inquiries');
  const offView = document.getElementById('subtab-view-official');
  const inqView = document.getElementById('subtab-view-inquiries');

  if (subTab === 'official') {
    if (offBtn) {
      offBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-orange-600 text-white shadow flex items-center gap-2';
    }
    if (inqBtn) {
      inqBtn.className = 'px-4 py-2 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2';
    }
    if (offView) offView.classList.remove('hidden');
    if (inqView) inqView.classList.add('hidden');
    loadQuotations();
  } else {
    if (inqBtn) {
      inqBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-orange-600 text-white shadow flex items-center gap-2';
    }
    if (offBtn) {
      offBtn.className = 'px-4 py-2 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2';
    }
    if (inqView) inqView.classList.remove('hidden');
    if (offView) offView.classList.add('hidden');
    filterInquiriesData();
  }
}

async function loadQuotations() {
  const tbodyQuotes = document.getElementById('table-official-quotations');
  const tbodyInq = document.getElementById('table-inquiries');
  if (tbodyQuotes) tbodyQuotes.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading quotations...</td></tr>`;

  try {
    // Load Settings
    activeQuotationSettings = await dbGetQuotationSettings();

    // Load Official Quotations
    const quotes = await dbGetQuotations();
    allQuotationsRecords = quotes || [];

    // Auto-sync any approved or completed quotations to orders
    if (typeof syncQuotationToOrder === 'function') {
      for (const q of allQuotationsRecords) {
        if (q.status === 'Approved' || q.status === 'Completed') {
          await syncQuotationToOrder(q);
        }
      }
    }

    // Load Inquiries
    const inquiries = await dbGetInquiries();
    allInquiriesRecords = inquiries || [];

    // Calculate Summary KPIs
    const totalQuotesCount = allQuotationsRecords.length;
    const totalPipelineValue = allQuotationsRecords.reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0);
    const approvedQuotesCount = allQuotationsRecords.filter(q => q.status === 'Approved' || q.status === 'Completed').length;
    const pendingInquiriesCount = allInquiriesRecords.filter(i => i.status === 'New' || i.status === 'Contacted').length;

    const elTotal = document.getElementById('quote-stat-total');
    const elVal = document.getElementById('quote-stat-value');
    const elApp = document.getElementById('quote-stat-approved');
    const elInq = document.getElementById('quote-stat-inquiries');
    const badgeQuotes = document.getElementById('badge-quotes-count');
    const badgeInqSub = document.getElementById('badge-inquiries-subtab-count');
    const badgeSidebarInq = document.getElementById('badge-inquiries-count');

    if (elTotal) elTotal.textContent = totalQuotesCount;
    if (elVal) elVal.textContent = '₹' + totalPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    if (elApp) elApp.textContent = approvedQuotesCount;
    if (elInq) elInq.textContent = pendingInquiriesCount;
    if (badgeQuotes) badgeQuotes.textContent = totalQuotesCount;
    if (badgeInqSub) badgeInqSub.textContent = allInquiriesRecords.length;
    if (badgeSidebarInq) badgeSidebarInq.textContent = totalQuotesCount;

    filterQuotationsData();
    filterInquiriesData();
  } catch (err) {
    console.error("Error in loadQuotations:", err);
    if (tbodyQuotes) tbodyQuotes.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No official quotations found.</td></tr>`;
  }
}

function setQuoteDatePreset(preset) {
  setDateFilterPreset('quote', preset);
}

function filterQuotationsData() {
  const tbody = document.getElementById('table-official-quotations');
  if (!tbody) return;

  const searchVal = (document.getElementById('quote-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('quote-filter-status')?.value || 'ALL';
  const fromVal = document.getElementById('quote-filter-from')?.value || '';
  const toVal = document.getElementById('quote-filter-to')?.value || '';

  const filtered = allQuotationsRecords.filter(item => {
    if (statusVal !== 'ALL' && item.status !== statusVal) return false;

    const qDate = getRecordDateStr(item.quote_date || item.created_at);
    if (fromVal && qDate < fromVal) return false;
    if (toVal && qDate > toVal) return false;

    if (searchVal) {
      const matchQuoteNo = (item.quote_number || '').toLowerCase().includes(searchVal);
      const matchCustomer = (item.customer_name || '').toLowerCase().includes(searchVal);
      const matchCompany = (item.company_name || '').toLowerCase().includes(searchVal);
      const matchPhone = (item.customer_phone || '').toLowerCase().includes(searchVal);
      const matchAddress = (item.customer_address || '').toLowerCase().includes(searchVal);
      if (!matchQuoteNo && !matchCustomer && !matchCompany && !matchPhone && !matchAddress) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-slate-400">
            <i class="fa-solid fa-file-invoice"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No matching official quotations found.</p>
          <p class="text-xs text-slate-500 mt-1">Click "+ Create New Quotation" or adjust your search filter.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(q => {
    const rawPhone = (q.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneLink = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? '91' + rawPhone : '');
    const itemsCount = Array.isArray(q.items) ? q.items.length : 0;
    const displayDate = formatDisplayDate(q.quote_date || q.created_at);
    const grandTotalFormatted = '₹' + (parseFloat(q.grand_total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const firstItemDesc = (q.items && q.items[0] && q.items[0].description) ? q.items[0].description : 'General Fabrication';
    const shortDesc = firstItemDesc.length > 38 ? firstItemDesc.substring(0, 38) + '...' : firstItemDesc;

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4">
          <span class="font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20 inline-block text-[11px]">${q.quote_number}</span>
        </td>
        <td class="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
          <div class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${displayDate}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white text-xs flex items-center gap-1.5">
            <i class="fa-solid fa-user text-orange-400 text-[10px]"></i>
            ${q.customer_name}
          </div>
          ${q.company_name ? `<div class="text-[11px] text-slate-300 font-medium mt-0.5"><i class="fa-solid fa-building text-slate-400 text-[9px] mr-1"></i>${q.company_name}</div>` : ''}
          <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
            ${q.customer_phone ? `
              <a href="https://wa.me/${phoneLink}" target="_blank" class="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-mono">
                <i class="fa-brands fa-whatsapp"></i> ${q.customer_phone}
              </a>
            ` : ''}
            ${q.customer_address ? `
              <span class="text-slate-400 inline-flex items-center gap-1">
                <i class="fa-solid fa-location-dot text-red-400 text-[9px]"></i> ${q.customer_address}
              </span>
            ` : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-200">${shortDesc}</div>
          <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span class="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 font-bold">${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}</span>
            <span>GST ${q.gst_rate || 18}%</span>
          </div>
        </td>
        <td class="py-3 px-4 font-bold text-emerald-400 font-mono text-sm whitespace-nowrap">
          ${grandTotalFormatted}
        </td>
        <td class="py-3 px-4">
          <select onchange="handleQuotationStatusChange('${q.id || q.quote_number}', this.value)" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-orange-500 cursor-pointer">
            <option value="Draft" ${q.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Sent" ${q.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option value="Approved" ${q.status === 'Approved' ? 'selected' : ''}>Approved (Confirmed)</option>
            <option value="Rejected" ${q.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            <option value="Completed" ${q.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
          ${(q.status === 'Approved' || q.status === 'Completed') ? `
            <button onclick="viewLinkedOrder('${q.quote_number}')" class="p-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold inline-flex items-center gap-1 border border-emerald-500/30 transition-all" title="Order Confirmed! Click to view in Orders & Bookings">
              <i class="fa-solid fa-cart-shopping text-emerald-400"></i> <span class="hidden sm:inline">Booked</span>
            </button>
          ` : `
            <button onclick="confirmQuotationOrder('${q.id || q.quote_number}')" class="p-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold inline-flex items-center gap-1 border border-emerald-500/30 transition-all" title="Confirm Order & Book to Orders & Bookings">
              <i class="fa-solid fa-cart-arrow-down"></i> <span class="hidden sm:inline">Confirm</span>
            </button>
          `}
          <button onclick="openQuotationPreview('${q.id || q.quote_number}')" class="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs" title="Live Preview">
            <i class="fa-solid fa-eye text-orange-400"></i>
          </button>
          <button onclick="openQuotationModal('${q.id || q.quote_number}', false)" class="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs" title="Edit Quotation">
            <i class="fa-solid fa-pen-to-square text-blue-400"></i>
          </button>
          <button onclick="openQuotationModal('${q.id || q.quote_number}', true)" class="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs" title="Duplicate Quotation">
            <i class="fa-solid fa-clone text-purple-400"></i>
          </button>
          <button onclick="exportQuotationToExcel('${q.id || q.quote_number}')" class="p-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs" title="Download Excel (.xlsx)">
            <i class="fa-solid fa-file-excel"></i>
          </button>
          <button onclick="exportQuotationToPDF('${q.id || q.quote_number}')" class="p-1.5 px-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs" title="Download PDF">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
          <button onclick="handleDeleteQuotation('${q.id || q.quote_number}')" class="p-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function resetQuotationsFilter() {
  const searchInput = document.getElementById('quote-filter-search');
  const statusSelect = document.getElementById('quote-filter-status');
  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  currentQuoteDatePreset = 'all';

  const allBtn = document.getElementById('quote-preset-all');
  const todayBtn = document.getElementById('quote-preset-today');
  const monthBtn = document.getElementById('quote-preset-month');
  [allBtn, todayBtn, monthBtn].forEach(b => {
    if (b) b.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300';
  });
  if (allBtn) allBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all bg-orange-600 text-white shadow';

  filterQuotationsData();
}

async function confirmQuotationOrder(id) {
  let quote = (allQuotationsRecords || []).find(q => String(q.id) === String(id) || String(q.quote_number) === String(id));
  if (!quote && previewingQuotationData && (String(previewingQuotationData.id) === String(id) || String(previewingQuotationData.quote_number) === String(id))) {
    quote = previewingQuotationData;
  }
  if (!quote && allQuotationsRecords.length > 0) {
    quote = allQuotationsRecords[0];
  }
  if (!quote) {
    alert("Quotation not found.");
    return false;
  }

  try {
    const updatedQuote = { ...quote, status: 'Approved' };
    await dbUpdateQuotation(quote.id || quote.quote_number, { status: 'Approved' });

    if (typeof syncQuotationToOrder === 'function') {
      await syncQuotationToOrder(updatedQuote);
    }

    await loadQuotations();
    await loadOrders();
    loadInitialCounts();

    showDashboardToast(`🎉 Quotation #${quote.quote_number} confirmed! Order booked in Orders & Bookings.`, 'success', 'View in Orders', () => {
      viewLinkedOrder(quote.quote_number);
    });
    return true;
  } catch (err) {
    console.error("Error confirming quotation order:", err);
    alert("Could not confirm quotation order: " + (err.message || err));
    return false;
  }
}

async function handleQuotationStatusChange(id, newStatus) {
  const quote = allQuotationsRecords.find(q => String(q.id) === String(id) || String(q.quote_number) === String(id));
  await dbUpdateQuotation(id, { status: newStatus });
  
  if (quote) {
    const updatedQuote = { ...quote, status: newStatus };
    if (typeof syncQuotationToOrder === 'function') {
      await syncQuotationToOrder(updatedQuote);
    }
    
    if (newStatus === 'Approved' || newStatus === 'Completed') {
      showDashboardToast(`🎉 Quotation #${quote.quote_number} marked as ${newStatus}! Booked in Orders & Bookings.`, 'success', 'View in Orders', () => {
        viewLinkedOrder(quote.quote_number);
      });
    } else if (newStatus === 'Rejected' || newStatus === 'Cancelled') {
      showDashboardToast(`Quotation #${quote.quote_number} marked as ${newStatus}.`, 'info');
    }
  }

  await loadQuotations();
  await loadOrders();
  loadInitialCounts();
}

function viewLinkedOrder(quoteNumber) {
  closeQuotationPreviewModal();
  switchTab('orders');
  setTimeout(() => {
    const statusSelect = document.getElementById('order-filter-status');
    const paymentSelect = document.getElementById('order-filter-payment');
    const fromInput = document.getElementById('order-filter-from');
    const toInput = document.getElementById('order-filter-to');
    if (statusSelect) statusSelect.value = 'ALL';
    if (paymentSelect) paymentSelect.value = 'ALL';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    if (typeof setDateFilterPreset === 'function') setDateFilterPreset('order', 'all');

    const searchInput = document.getElementById('order-filter-search');
    if (searchInput) {
      searchInput.value = quoteNumber;
      filterOrdersData();
    }
  }, 250);
}

async function handleDeleteQuotation(id) {
  if (confirm("Are you sure you want to delete this quotation record?")) {
    await dbDeleteQuotation(id);
    await loadQuotations();
    await loadOrders();
    loadInitialCounts();
  }
}

// ================= WEBSITE RFQ LEADS & INQUIRIES CONTROLLER =================

function setInquiryDatePreset(preset) {
  setDateFilterPreset('inquiry', preset);
}

function filterInquiriesData() {
  const tbody = document.getElementById('table-inquiries');
  if (!tbody) return;

  const searchVal = (document.getElementById('inquiry-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('inquiry-filter-status')?.value || 'ALL';
  const fromVal = document.getElementById('inquiry-filter-from')?.value || '';
  const toVal = document.getElementById('inquiry-filter-to')?.value || '';

  const filtered = allInquiriesRecords.filter(item => {
    if (statusVal !== 'ALL' && item.status !== statusVal) return false;

    const inqDate = getRecordDateStr(item.created_at || item.date);
    if (fromVal && inqDate < fromVal) return false;
    if (toVal && inqDate > toVal) return false;

    if (searchVal) {
      const matchName = (item.client_name || item.name || '').toLowerCase().includes(searchVal);
      const matchPhone = (item.client_phone || item.phone || '').toLowerCase().includes(searchVal);
      const matchEmail = (item.client_email || item.email || '').toLowerCase().includes(searchVal);
      const matchProject = (item.project_type || '').toLowerCase().includes(searchVal);
      const matchScope = (item.project_scope || item.message || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchPhone && !matchEmail && !matchProject && !matchScope) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-slate-400">
            <i class="fa-solid fa-headset"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No website RFQ inquiries found.</p>
          <p class="text-xs text-slate-500 mt-1">Inquiries submitted from your live website will appear here in real-time.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(inq => {
    const rawPhone = (inq.client_phone || inq.phone || '').replace(/[^0-9]/g, '');
    const phoneLink = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? '91' + rawPhone : '');
    const clientName = inq.client_name || inq.name || 'Website Inquiry';
    const displayDate = formatDisplayDate(inq.created_at || inq.date);
    const projType = inq.project_type || 'General Steel Fabrication';
    const projScope = inq.project_scope || inq.message || 'Custom Dimensions & Specifications';
    const estCost = inq.estimated_cost || inq.estimatedCost || 'Contact for Quote';
    const hasBlueprint = !!(inq.blueprint_url || inq.blueprintUrl);

    let statusBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    if (inq.status === 'New') statusBadgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    else if (inq.status === 'Contacted') statusBadgeClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    else if (inq.status === 'Quoted') statusBadgeClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    else if (inq.status === 'Completed') statusBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    else if (inq.status === 'Cancelled') statusBadgeClass = 'bg-red-500/20 text-red-400 border-red-500/30';

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
          <div class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${displayDate}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white text-xs flex items-center gap-1.5">
            <i class="fa-solid fa-user text-orange-400 text-[10px]"></i>
            ${clientName}
          </div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
            ${rawPhone ? `
              <a href="https://wa.me/${phoneLink}" target="_blank" class="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-mono font-semibold" title="Chat on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> ${inq.client_phone || inq.phone}
              </a>
              <a href="tel:${rawPhone}" class="text-slate-400 hover:text-white inline-flex items-center gap-1" title="Direct Phone Call">
                <i class="fa-solid fa-phone text-[9px]"></i> Call
              </a>
            ` : '<span class="text-slate-500">No phone provided</span>'}
            ${inq.client_email || inq.email ? `
              <span class="text-slate-400 text-[10px] inline-flex items-center gap-1"><i class="fa-regular fa-envelope text-[9px]"></i> ${inq.client_email || inq.email}</span>
            ` : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200 text-xs">${projType}</div>
          <div class="text-[11px] text-slate-400 mt-0.5 line-clamp-2 max-w-xs">${projScope}</div>
        </td>
        <td class="py-3 px-4 font-mono font-bold text-orange-400 text-xs whitespace-nowrap">
          ${estCost}
        </td>
        <td class="py-3 px-4">
          ${hasBlueprint ? `
            <a href="${inq.blueprint_url || inq.blueprintUrl}" target="_blank" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[10px] inline-flex items-center gap-1 border border-cyan-500/30 transition-colors">
              <i class="fa-solid fa-paperclip"></i> View File
            </a>
          ` : '<span class="text-slate-500 text-[11px]">None</span>'}
        </td>
        <td class="py-3 px-4">
          <select onchange="handleInquiryStatusChange('${inq.id}', this.value)" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-orange-500">
            <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Quoted" ${inq.status === 'Quoted' ? 'selected' : ''}>Quoted</option>
            <option value="Completed" ${inq.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${inq.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
          <button onclick="convertInquiryToQuotation('${inq.id}')" class="px-2.5 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1" title="Generate Official Quotation from this lead">
            <i class="fa-solid fa-file-invoice"></i> Create Quote
          </button>
          ${rawPhone ? `
            <a href="https://wa.me/${phoneLink}?text=Hello%20${encodeURIComponent(clientName)},%20thank%20you%20for%20contacting%20SASI%20Steel%20Engineering.%20Regarding%20your%20inquiry%20for%20${encodeURIComponent(projType)}..." target="_blank" class="p-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs inline-block" title="WhatsApp Message">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
          ` : ''}
          <button onclick="handleDeleteInquiry('${inq.id}')" class="p-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs" title="Delete Inquiry">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function resetInquiriesFilter() {
  const searchInput = document.getElementById('inquiry-filter-search');
  const statusSelect = document.getElementById('inquiry-filter-status');
  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  currentInquiryDatePreset = 'all';

  const allBtn = document.getElementById('inquiry-preset-all');
  const todayBtn = document.getElementById('inquiry-preset-today');
  const monthBtn = document.getElementById('inquiry-preset-month');
  [allBtn, todayBtn, monthBtn].forEach(b => {
    if (b) b.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300';
  });
  if (allBtn) allBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all bg-orange-600 text-white shadow';

  filterInquiriesData();
}

async function handleInquiryStatusChange(id, newStatus) {
  await dbUpdateInquiryStatus(id, newStatus);
  await loadQuotations();
}

async function handleDeleteInquiry(id) {
  if (confirm("Are you sure you want to delete this customer inquiry?")) {
    await dbDeleteInquiry(id);
    await loadQuotations();
  }
}

async function convertInquiryToQuotation(inquiryId) {
  const inq = allInquiriesRecords.find(x => String(x.id) === String(inquiryId));
  if (!inq) return;

  // Open Quotation Builder
  await openQuotationModal(null, false);

  // Pre-fill from Inquiry
  const custInput = document.getElementById('quote-input-customer');
  const phoneInput = document.getElementById('quote-input-phone');
  const emailInput = document.getElementById('quote-input-email');
  const notesInput = document.getElementById('quote-input-notes');

  if (custInput) custInput.value = inq.client_name || inq.name || '';
  if (phoneInput) phoneInput.value = inq.client_phone || inq.phone || '';
  if (emailInput) emailInput.value = inq.client_email || inq.email || '';
  if (notesInput) notesInput.value = `Converted from Website RFQ Lead: ${inq.project_type || ''} - ${inq.project_scope || inq.message || ''}`;

  // Pre-fill first item description
  if (activeQuotationItems.length > 0) {
    activeQuotationItems[0].description = inq.project_type ? `${inq.project_type} (${inq.project_scope || 'Custom'})` : 'Custom Steel Fabrication';
    renderQuotationItemRows();
    recalculateQuotationTotals();
  }
}


function exportInquiriesCSV() {
  if (!allInquiriesRecords || allInquiriesRecords.length === 0) {
    alert("No inquiries to export.");
    return;
  }
  const headers = ['Date', 'Client Name', 'Phone', 'Email', 'Project Type', 'Project Scope', 'Estimated Cost', 'Status'];
  const rows = allInquiriesRecords.map(i => [
    i.created_at ? i.created_at.substring(0, 10) : '',
    `"${(i.client_name || i.name || '').replace(/"/g, '""')}"`,
    `"${(i.client_phone || i.phone || '').replace(/"/g, '""')}"`,
    `"${(i.client_email || i.email || '').replace(/"/g, '""')}"`,
    `"${(i.project_type || '').replace(/"/g, '""')}"`,
    `"${(i.project_scope || i.message || '').replace(/"/g, '""')}"`,
    `"${(i.estimated_cost || '').replace(/"/g, '""')}"`,
    i.status || 'New'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SASI_Steels_Inquiries_${getLocalDateStr()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ================= 2. QUOTATION BUILDER & MODAL LOGIC =================

async function openQuotationModal(editId = null, isDuplicate = false) {
  activeQuotationEditingId = isDuplicate ? null : editId;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());

  const modal = document.getElementById('quotation-modal');
  const modalTitle = document.getElementById('quote-modal-title');
  if (!modal) return;

  if (editId) {
    const existing = allQuotationsRecords.find(x => String(x.id) === String(editId) || String(x.quote_number) === String(editId));
    if (existing) {
      modalTitle.textContent = isDuplicate ? 'Duplicate Quotation' : `Edit Quotation (${existing.quote_number})`;
      document.getElementById('quote-input-number').value = isDuplicate ? generateNextQuoteNumber(allQuotationsRecords) : existing.quote_number;
      document.getElementById('quote-input-date').value = isDuplicate ? getLocalDateStr() : (existing.quote_date || getLocalDateStr());
      document.getElementById('quote-input-validity').value = existing.validity_days || 15;
      document.getElementById('quote-input-customer').value = existing.customer_name || '';
      document.getElementById('quote-input-company').value = existing.company_name || '';
      document.getElementById('quote-input-phone').value = existing.customer_phone || '';
      document.getElementById('quote-input-email').value = existing.customer_email || '';
      document.getElementById('quote-input-gst').value = existing.customer_gst || '';
      document.getElementById('quote-input-address').value = existing.customer_address || '';
      document.getElementById('quote-input-status').value = isDuplicate ? 'Draft' : (existing.status || 'Draft');
      document.getElementById('quote-input-notes').value = existing.notes || '';
      document.getElementById('quote-input-packing').value = existing.packing_charges || 0;
      document.getElementById('quote-input-gstrate').value = existing.gst_rate !== undefined ? existing.gst_rate : 18;
      document.getElementById('quote-input-other-desc').value = existing.other_charges_desc || '';
      document.getElementById('quote-input-other-amount').value = existing.other_charges || 0;

      // Bank Details
      const bank = existing.bank_details || settings;
      document.getElementById('quote-input-bank-name').value = bank.bank_name || settings.bank_name || '';
      document.getElementById('quote-input-bank-holder').value = bank.account_holder || settings.account_holder || '';
      document.getElementById('quote-input-bank-acc').value = bank.account_number || settings.account_number || '';
      document.getElementById('quote-input-bank-ifsc').value = bank.ifsc_code || settings.ifsc_code || '';
      document.getElementById('quote-input-bank-branch').value = bank.branch_name || settings.branch_name || '';
      document.getElementById('quote-input-bank-upi').value = bank.upi_id || settings.upi_id || '';

      // Items & Terms
      activeQuotationItems = (existing.items && Array.isArray(existing.items) && existing.items.length > 0)
        ? JSON.parse(JSON.stringify(existing.items))
        : [{ sno: 1, image_url: '', description: '', finish: 'POWDER COATING', quantity: 1, rate: 0, amount: 0 }];

      activeQuotationTerms = sanitizeQuotationTerms(existing.terms || settings.default_terms);
    }
  } else {
    // New Quotation
    modalTitle.textContent = 'Create Official Quotation';
    document.getElementById('quote-input-number').value = generateNextQuoteNumber(allQuotationsRecords);
    document.getElementById('quote-input-date').value = getLocalDateStr();
    document.getElementById('quote-input-validity').value = 15;
    document.getElementById('quote-input-customer').value = '';
    document.getElementById('quote-input-company').value = '';
    document.getElementById('quote-input-phone').value = '';
    document.getElementById('quote-input-email').value = '';
    document.getElementById('quote-input-gst').value = '';
    document.getElementById('quote-input-address').value = '';
    document.getElementById('quote-input-status').value = 'Draft';
    document.getElementById('quote-input-notes').value = '';
    document.getElementById('quote-input-packing').value = 0;
    document.getElementById('quote-input-gstrate').value = 18;
    document.getElementById('quote-input-other-desc').value = '';
    document.getElementById('quote-input-other-amount').value = 0;

    // Bank Details from Settings
    document.getElementById('quote-input-bank-name').value = settings.bank_name || '';
    document.getElementById('quote-input-bank-holder').value = settings.account_holder || '';
    document.getElementById('quote-input-bank-acc').value = settings.account_number || '';
    document.getElementById('quote-input-bank-ifsc').value = settings.ifsc_code || '';
    document.getElementById('quote-input-bank-branch').value = settings.branch_name || '';
    document.getElementById('quote-input-bank-upi').value = settings.upi_id || '';

    // Initial 2 Default Item Rows
    activeQuotationItems = [
      { sno: 1, image_url: 'product-display-racks.png', description: 'Commercial Showroom Steel Display Racks (Heavy Welded Frame)', finish: 'POWDER COATING (MATTE BLACK)', quantity: 2, rate: 6500, amount: 13000 },
      { sno: 2, image_url: 'product-sheets.jpg', description: 'Galvalume Corrugated Roofing Sheets (0.50mm AZ-150 Coating)', finish: 'COLOR COATED', quantity: 50, rate: 380, amount: 19000 }
    ];

    activeQuotationTerms = sanitizeQuotationTerms(settings.default_terms);
  }

  renderQuotationItemRows();
  renderQuotationTerms();
  recalculateQuotationTotals();
  modal.classList.remove('hidden');
}

function closeQuotationModal() {
  const modal = document.getElementById('quotation-modal');
  if (modal) modal.classList.add('hidden');
  activeQuotationEditingId = null;
}

function renderQuotationItemRows() {
  const tbody = document.getElementById('quote-items-tbody');
  if (!tbody) return;

  tbody.innerHTML = activeQuotationItems.map((item, idx) => {
    const sno = idx + 1;
    item.sno = sno;
    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    item.amount = amount;

    const imgPreview = item.image_url 
      ? `<img src="${item.image_url}" class="w-12 h-12 object-cover rounded-lg border border-slate-700 shadow-sm" onerror="this.src='image.png'" />`
      : `<div class="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs"><i class="fa-solid fa-image"></i></div>`;

    return `
      <tr class="hover:bg-slate-900/50 transition-colors">
        <td class="py-2.5 px-3 text-center font-bold text-slate-400">${sno}</td>
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-2">
            ${imgPreview}
            <div class="space-y-1">
              <label class="cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-orange-400 block text-center border border-slate-700 transition-colors">
                <i class="fa-solid fa-upload"></i> Upload
                <input type="file" accept="image/*" class="hidden" onchange="handleItemImageUpload(event, ${idx})" />
              </label>
              ${item.image_url ? `<button type="button" onclick="removeItemImage(${idx})" class="text-[9px] text-red-400 hover:underline block text-center w-full">Remove</button>` : ''}
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3">
          <textarea rows="2" placeholder="Item description, dimensions, thickness & specs..." class="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-orange-500 outline-none" oninput="updateItemField(${idx}, 'description', this.value)">${item.description || ''}</textarea>
        </td>
        <td class="py-2.5 px-3">
          <input type="text" placeholder="Finish (e.g. Powder Coat)" value="${item.finish || ''}" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-orange-500 outline-none font-semibold uppercase" oninput="updateItemField(${idx}, 'finish', this.value)" />
        </td>
        <td class="py-2.5 px-3">
          <input type="number" min="1" step="any" value="${item.quantity || 1}" class="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center text-xs focus:border-orange-500 outline-none" oninput="updateItemField(${idx}, 'quantity', this.value)" />
        </td>
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-1">
            <span class="text-slate-500 font-bold">₹</span>
            <input type="number" min="0" step="any" value="${item.rate || 0}" class="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-right text-xs focus:border-orange-500 outline-none" oninput="updateItemField(${idx}, 'rate', this.value)" />
          </div>
        </td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-xs whitespace-nowrap">
          ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td class="py-2.5 px-3 text-center">
          <button type="button" onclick="removeQuotationItemRow(${idx})" class="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors inline-flex items-center justify-center text-xs" title="Delete Row">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function addNewQuotationItemRow(prefill = null) {
  const newItem = prefill || {
    sno: activeQuotationItems.length + 1,
    image_url: '',
    description: '',
    finish: 'POWDER COATING',
    quantity: 1,
    rate: 0,
    amount: 0
  };
  activeQuotationItems.push(newItem);
  renderQuotationItemRows();
  recalculateQuotationTotals();
}

function removeQuotationItemRow(index) {
  if (activeQuotationItems.length <= 1) {
    alert("Quotation must have at least 1 line item.");
    return;
  }
  activeQuotationItems.splice(index, 1);
  renderQuotationItemRows();
  recalculateQuotationTotals();
}

function updateItemField(index, field, value) {
  if (activeQuotationItems[index]) {
    activeQuotationItems[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      const q = parseFloat(activeQuotationItems[index].quantity) || 0;
      const r = parseFloat(activeQuotationItems[index].rate) || 0;
      activeQuotationItems[index].amount = q * r;
    }
    recalculateQuotationTotals();
  }
}

async function handleItemImageUpload(event, index) {
  const file = event.target.files?.[0];
  if (!file) return;

  const optimized = await fileToOptimizedDataUrl(file, 800, 0.85);
  if (optimized && activeQuotationItems[index]) {
    activeQuotationItems[index].image_url = optimized;
    renderQuotationItemRows();
  }

  // Upload to Cloudinary in background for persistence
  try {
    const cloudUrl = await uploadToCloudinary(file);
    if (cloudUrl && activeQuotationItems[index]) {
      activeQuotationItems[index].image_url = cloudUrl;
    }
  } catch (e) {}
}

function removeItemImage(index) {
  if (activeQuotationItems[index]) {
    activeQuotationItems[index].image_url = '';
    renderQuotationItemRows();
  }
}

function applyQuickFinish(finishText) {
  if (activeQuotationItems.length > 0) {
    activeQuotationItems[activeQuotationItems.length - 1].finish = finishText;
    renderQuotationItemRows();
  }
}

function recalculateQuotationTotals() {
  const subTotal = activeQuotationItems.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    return sum + (q * r);
  }, 0);

  const packing = parseFloat(document.getElementById('quote-input-packing')?.value) || 0;
  const gstRate = parseFloat(document.getElementById('quote-input-gstrate')?.value) || 0;
  const otherAmount = parseFloat(document.getElementById('quote-input-other-amount')?.value) || 0;

  const taxableAmount = subTotal + packing;
  const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + gstAmount + otherAmount) * 100) / 100;
  const amountWords = numberToIndianWords(grandTotal);

  const elSub = document.getElementById('calc-subtotal-display');
  const elGst = document.getElementById('calc-gst-display');
  const elGrand = document.getElementById('calc-grandtotal-display');
  const elWords = document.getElementById('calc-words-display');

  if (elSub) elSub.textContent = '₹' + subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (elGst) elGst.textContent = `₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${gstRate}%)`;
  if (elGrand) elGrand.textContent = '₹' + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (elWords) elWords.textContent = amountWords;
}

// Terms Manager
function renderQuotationTerms() {
  const container = document.getElementById('quote-terms-container');
  if (!container) return;

  container.innerHTML = activeQuotationTerms.map((term, idx) => `
    <div class="flex items-center gap-2">
      <span class="text-orange-400 font-bold text-[11px] w-5 text-right">${idx + 1}.</span>
      <input type="text" value="${term.replace(/"/g, '&quot;')}" class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500" oninput="activeQuotationTerms[${idx}] = this.value" />
      <button type="button" onclick="removeQuotationTerm(${idx})" class="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white inline-flex items-center justify-center text-xs">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function addNewQuotationTerm(customTerm = '') {
  activeQuotationTerms.push(customTerm || 'New custom condition.');
  renderQuotationTerms();
}

function removeQuotationTerm(index) {
  activeQuotationTerms.splice(index, 1);
  renderQuotationTerms();
}

function toggleAccordion(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById(`${id}-icon`);
  if (el) {
    el.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
  }
}

// ================= 3. CATALOG PRODUCT PICKER =================

async function openCatalogPickerModal() {
  const modal = document.getElementById('catalog-picker-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  filterCatalogPickerItems();
}

function closeCatalogPickerModal() {
  const modal = document.getElementById('catalog-picker-modal');
  if (modal) modal.classList.add('hidden');
}

async function filterCatalogPickerItems() {
  const listEl = document.getElementById('catalog-picker-list');
  if (!listEl) return;

  const q = (document.getElementById('catalog-picker-search')?.value || '').toLowerCase().trim();
  const prods = allProductsRecords.length > 0 ? allProductsRecords : (await dbGetProducts());
  const inv = allInventoryRecords.length > 0 ? allInventoryRecords : (await dbGetInventory());

  let items = [];

  prods.forEach(p => {
    items.push({
      id: p.id,
      name: p.name,
      category: p.category || 'Products',
      priceRaw: p.price_formatted ? parseFloat(p.price_formatted.replace(/[^0-9.]/g, '')) || 0 : 0,
      image_url: p.image_url || 'product-racks.jpg',
      type: 'Product',
      specs: p.specs || p.description || ''
    });
  });

  inv.forEach(i => {
    items.push({
      id: 'inv_' + i.id,
      name: i.item_name,
      category: i.category || 'Inventory',
      priceRaw: parseFloat(i.unit_price) || 0,
      image_url: 'product-racks.jpg',
      type: 'Inventory',
      specs: `Stock: ${i.quantity} ${i.unit || 'Units'} • Loc: ${i.storage_location || 'Main Yard'}`
    });
  });

  const filtered = items.filter(it => {
    if (!q) return true;
    return (it.name || '').toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q) || (it.specs || '').toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No matching products found.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(item => `
    <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 flex items-center justify-between gap-3 transition-colors">
      <div class="flex items-center gap-3 min-w-0">
        <img src="${item.image_url}" class="w-11 h-11 object-cover rounded-xl border border-slate-700 shrink-0" onerror="this.src='image.png'" />
        <div class="min-w-0">
          <div class="font-bold text-white text-xs truncate">${item.name}</div>
          <div class="text-[10px] text-slate-400 mt-0.5 truncate">${item.specs}</div>
          <div class="text-[10px] text-orange-400 font-semibold mt-0.5">₹${item.priceRaw.toLocaleString('en-IN')} <span class="text-slate-500 font-normal">(${item.category})</span></div>
        </div>
      </div>
      <button type="button" onclick="selectCatalogItem('${item.id}', '${item.type}')" class="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shrink-0 shadow">
        <i class="fa-solid fa-plus mr-1"></i> Add
      </button>
    </div>
  `).join('');
}

async function selectCatalogItem(id, type) {
  let target = null;
  if (type === 'Product') {
    target = allProductsRecords.find(p => String(p.id) === String(id));
  } else {
    const rawId = String(id).replace('inv_', '');
    target = allInventoryRecords.find(i => String(i.id) === String(rawId));
  }

  if (target) {
    const priceVal = target.unit_price ? parseFloat(target.unit_price) : (target.price_formatted ? parseFloat(target.price_formatted.replace(/[^0-9.]/g, '')) || 0 : 0);
    const itemObj = {
      sno: activeQuotationItems.length + 1,
      image_url: target.image_url || 'product-racks.jpg',
      description: `${target.name || target.item_name} ${target.specs ? '(' + target.specs + ')' : ''}`,
      finish: 'POWDER COATING',
      quantity: 1,
      rate: priceVal,
      amount: priceVal
    };

    // If last item is blank, overwrite it
    if (activeQuotationItems.length === 1 && !activeQuotationItems[0].description && activeQuotationItems[0].rate === 0) {
      activeQuotationItems[0] = itemObj;
    } else {
      activeQuotationItems.push(itemObj);
    }

    renderQuotationItemRows();
    recalculateQuotationTotals();
    closeCatalogPickerModal();
  }
}

// ================= 4. SAVE QUOTATION HANDLER =================

async function getQuotationFormData() {
  const quoteNumber = document.getElementById('quote-input-number')?.value.trim();
  const customerName = document.getElementById('quote-input-customer')?.value.trim();
  const phone = document.getElementById('quote-input-phone')?.value.trim();

  if (!quoteNumber || !customerName) {
    alert("Please fill required fields: Quotation Number and Customer Name.");
    return null;
  }

  const subTotal = activeQuotationItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const packing = parseFloat(document.getElementById('quote-input-packing')?.value) || 0;
  const gstRate = parseFloat(document.getElementById('quote-input-gstrate')?.value) || 0;
  const otherAmount = parseFloat(document.getElementById('quote-input-other-amount')?.value) || 0;
  const otherDesc = document.getElementById('quote-input-other-desc')?.value.trim() || '';

  const taxableAmount = subTotal + packing;
  const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + gstAmount + otherAmount) * 100) / 100;
  const words = numberToIndianWords(grandTotal);

  const bankDetails = {
    bank_name: document.getElementById('quote-input-bank-name')?.value.trim() || '',
    account_holder: document.getElementById('quote-input-bank-holder')?.value.trim() || '',
    account_number: document.getElementById('quote-input-bank-acc')?.value.trim() || '',
    ifsc_code: document.getElementById('quote-input-bank-ifsc')?.value.trim() || '',
    branch_name: document.getElementById('quote-input-bank-branch')?.value.trim() || '',
    upi_id: document.getElementById('quote-input-bank-upi')?.value.trim() || ''
  };

  return {
    quote_number: quoteNumber,
    quote_date: document.getElementById('quote-input-date')?.value || getLocalDateStr(),
    validity_days: parseInt(document.getElementById('quote-input-validity')?.value, 10) || 15,
    customer_name: customerName,
    company_name: document.getElementById('quote-input-company')?.value.trim() || '',
    customer_phone: phone,
    customer_email: document.getElementById('quote-input-email')?.value.trim() || '',
    customer_gst: document.getElementById('quote-input-gst')?.value.trim() || '',
    customer_address: document.getElementById('quote-input-address')?.value.trim() || '',
    status: document.getElementById('quote-input-status')?.value || 'Draft',
    items: activeQuotationItems,
    sub_total: subTotal,
    packing_charges: packing,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    other_charges: otherAmount,
    other_charges_desc: otherDesc,
    grand_total: grandTotal,
    amount_in_words: words,
    bank_details: bankDetails,
    terms: activeQuotationTerms,
    notes: document.getElementById('quote-input-notes')?.value.trim() || ''
  };
}

async function saveQuotationFormData() {
  const data = await getQuotationFormData();
  if (!data) return;

  if (activeQuotationEditingId) {
    await dbUpdateQuotation(activeQuotationEditingId, data);
  } else {
    await dbAddQuotation(data);
  }

  // Automatic sync to Orders & Bookings when marked as Approved / Confirmed
  if (data.status === 'Approved' || data.status === 'Completed') {
    if (typeof syncQuotationToOrder === 'function') {
      await syncQuotationToOrder(data);
    }
  }

  closeQuotationModal();
  await loadQuotations();
  await loadOrders();
  loadInitialCounts();
  showDashboardToast(`Quotation #${data.quote_number} saved successfully!`, 'success');
}

// ================= 5. CORPORATE LIVE A4 PREVIEW ENGINE (MATCHING REFERENCE IMAGE) =================

function generateQuotationPaperHTML(quote, settings) {
  const safeSettings = sanitizeQuotationSettings(settings);
  const companyName = safeSettings.company_name || 'SASI STEEL ENGINEERING & WELDING WORKS';
  const companyAddress = safeSettings.company_address || '128-56/4, guntur amaravathi road, gorantla,guntur,a.p';
  const companyGstin = safeSettings.company_gstin || '37AUCPA2925Q1ZG,CODE :37.';
  const companyLogo = safeSettings.company_logo || 'img/sasi-logo.png';
  const bank = quote.bank_details ? sanitizeQuotationSettings(quote.bank_details) : safeSettings;
  const termsList = sanitizeQuotationTerms(quote.terms || safeSettings.default_terms);

  const items = quote.items || [];
  const subTotal = parseFloat(quote.sub_total) || 0;
  const packingCharges = parseFloat(quote.packing_charges) || 0;
  const afterPacking = subTotal + packingCharges;
  const gstRate = parseFloat(quote.gst_rate) || 18;
  const gstAmount = parseFloat(quote.gst_amount) || Math.round(afterPacking * (gstRate / 100) * 100) / 100;
  const otherCharges = parseFloat(quote.other_charges) || 0;
  const grandTotal = parseFloat(quote.grand_total) || (afterPacking + gstAmount + otherCharges);

  const displayDate = quote.quote_date ? (function(d){
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  })(quote.quote_date) : new Date().toLocaleDateString('en-GB');

  const itemsHtml = items.map((it, idx) => {
    const q = parseFloat(it.quantity) || 0;
    const r = parseFloat(it.rate) || 0;
    const amt = parseFloat(it.amount) || (q * r);

    const imgTag = it.image_url
      ? `<img src="${it.image_url}" alt="Product" style="max-height: 48px; max-width: 65px; object-fit: contain; margin: 0 auto; display: block;" onerror="this.style.display='none'" />`
      : `<div style="height: 32px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px;"></div>`;

    return `
      <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
        <td style="border: 1px solid #333333; padding: 4px 2px; text-align: center; font-weight: 600; font-size: 9.5px;">${idx + 1}</td>
        <td style="border: 1px solid #333333; padding: 3px 2px; text-align: center; width: 80px; background: #fafafa;">${imgTag}</td>
        <td style="border: 1px solid #333333; padding: 4px 5px; text-align: center; font-weight: 700; font-size: 9.5px; text-transform: uppercase;">${it.description || ''}</td>
        <td style="border: 1px solid #333333; padding: 4px 5px; text-align: center; font-weight: 600; font-size: 9px; text-transform: uppercase;">${it.finish || 'POWDER COATING'}</td>
        <td style="border: 1px solid #333333; padding: 4px 2px; text-align: center; font-weight: 600; font-size: 9.5px;">${q}</td>
        <td style="border: 1px solid #333333; padding: 4px 3px; text-align: center; font-weight: 600; font-size: 9.5px;">${r.toLocaleString('en-IN')}</td>
        <td style="border: 1px solid #333333; padding: 4px 5px; text-align: right; font-weight: 700; font-size: 9.5px; white-space: nowrap;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="width: 100%; max-width: 730px; margin: 0 auto; background: #ffffff; color: #000000; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5px; border: 1px solid #333333; box-sizing: border-box;">
      
      <!-- 1. TOP HEADER BANNER (STEEL SLATE BLUE WITH OFFICIAL BRAND LOGO) -->
      <div style="background: #8EA9DB; color: #000000; padding: 6px 12px; border-bottom: 1px solid #333333; display: flex; align-items: center; justify-content: center; gap: 10px; page-break-inside: avoid;">
        <img src="${companyLogo}" alt="SASI Steels Logo" style="height: 48px; max-width: 70px; object-fit: contain; border-radius: 4px; background: #ffffff; padding: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;" onerror="this.style.display='none'" />
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.2;">${companyName}</div>
          <div style="font-size: 9.5px; font-weight: 600; margin-top: 1px; line-height: 1.2;">${companyAddress}</div>
          <div style="font-size: 9.5px; font-weight: 700; margin-top: 1px; line-height: 1.2;">GSTIN/UIN : ${companyGstin}</div>
        </div>
      </div>

      <!-- 2. DATE & CLIENT DETAILS BAR -->
      <div style="display: grid; grid-template-columns: 2fr 1.2fr 2.8fr; border-bottom: 1px solid #333333; background: #FCE4D6; font-size: 9.5px; line-height: 1.25; page-break-inside: avoid;">
        <div style="padding: 4px 8px; font-weight: 700; border-right: 1px solid #333333; display: flex; align-items: center;">
          Date : ${displayDate}
        </div>
        <div style="border-right: 1px solid #333333; background: #FCE4D6;"></div>
        <div style="padding: 4px 8px; font-weight: 700; font-size: 9.5px;">
          <div>Client : ${quote.customer_name}${quote.company_name ? ' (' + quote.company_name + ')' : ''}</div>
          <div style="font-weight: 600; text-transform: uppercase;">${quote.customer_address || 'KHAMMAM'}</div>
        </div>
      </div>

      <!-- 3. PRODUCT TABLE -->
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9.5px;">
        <thead>
          <tr style="background: #E2E8F0; font-weight: 800; font-size: 9.5px; text-transform: uppercase; page-break-inside: avoid;">
            <th style="border: 1px solid #333333; padding: 4px 2px; width: 35px;">S.No</th>
            <th style="border: 1px solid #333333; padding: 4px 2px; width: 85px;">IMAGES</th>
            <th style="border: 1px solid #333333; padding: 4px 4px;">DESCRIPTION</th>
            <th style="border: 1px solid #333333; padding: 4px 4px; width: 120px;">FINISH</th>
            <th style="border: 1px solid #333333; padding: 4px 2px; width: 40px;">QTY</th>
            <th style="border: 1px solid #333333; padding: 4px 3px; width: 80px;">RATE/UNIT</th>
            <th style="border: 1px solid #333333; padding: 4px 5px; width: 100px; text-align: center;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}

          <!-- BANK DETAILS ROW 1 + TOTAL -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="5" style="border: 1px solid #333333; padding: 4px 6px; text-align: center; font-weight: 800; text-transform: uppercase; background: #E2E8F0; font-size: 9.5px;">
              COMPANY BANK DETAILS
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 800; text-align: center; text-transform: uppercase; font-size: 9.5px;">
              TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 800; text-align: right; white-space: nowrap; font-size: 9.5px;">
              ₹ ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- BANK DETAILS ROW 2 + PACKING CHARGES -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="3" style="border: 1px solid #333333; padding: 4px 6px; text-align: center; font-weight: 700; font-size: 9px;">
              Bank Name : ${bank.bank_name || 'STATE BANK OF INDIA, Arundalpet'}
            </td>
            <td colspan="2" style="border: 1px solid #333333; padding: 4px 6px; text-align: center; font-weight: 700; font-size: 9px;">
              ${bank.company_phone || safeSettings.company_phone || 'PH: 9949321664, OFFICE: 8333991114(OR)5'}
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 700; text-align: center; background: #FCE4D6; font-size: 9px; text-transform: uppercase;">
              PACKING CHARGES ${packingCharges > 0 ? (Math.round((packingCharges / subTotal) * 100) || 2) + '%' : '2%'}
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 600; text-align: right; white-space: nowrap; font-size: 9px;">
              ₹ ${packingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- BANK DETAILS ROW 3 + AFTER PACKING TOTAL -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="3" style="border: 1px solid #333333; padding: 4px 6px; text-align: center; font-weight: 800; font-size: 9.5px;">
              A/C NO: ${bank.account_number || '42384233004'}
            </td>
            <td colspan="2" style="border: 1px solid #333333; padding: 4px 6px; text-align: center; font-weight: 600; font-size: 9px;">
              ${bank.ifsc_code ? 'IFSC: ' + bank.ifsc_code : ''} ${bank.upi_id ? '• UPI: ' + bank.upi_id : ''}
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 800; text-align: center; background: #FCE4D6; font-size: 8.5px; text-transform: uppercase; line-height: 1.15;">
              AFTER PACKING CHARGES TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 800; text-align: right; white-space: nowrap; font-size: 9.5px;">
              ₹ ${afterPacking.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- TERMS HEADER + GST -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="5" style="border: 1px solid #333333; padding: 3px 6px; text-align: left; font-weight: 800; text-transform: uppercase; background: #C6EFCE; font-size: 9.5px; color: #276A3C;">
              TERMS & CONDITIONS
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 700; text-align: center; text-transform: uppercase; font-size: 9.5px;">
              GST ${gstRate}%
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 700; text-align: right; white-space: nowrap; font-size: 9.5px;">
              ₹ ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- TERMS ROW 1 + GRAND TOTAL -->
          <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
            <td style="border: 1px solid #333333; padding: 2.5px 2px; text-align: center; font-weight: 600; font-size: 9px;">1</td>
            <td colspan="4" style="border: 1px solid #333333; padding: 2.5px 5px; text-align: left; font-size: 9px; line-height: 1.2;">
              ${termsList[0] || 'Items will be ready within 30-45 working days form the date of Approval.'}
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 900; text-align: center; background: #FCE4D6; text-transform: uppercase; font-size: 10px;">
              GRAND TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 4px 5px; font-weight: 900; text-align: right; white-space: nowrap; font-size: 10px;">
              ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- SUBSEQUENT TERMS ROWS (2 TO END) -->
          ${termsList.slice(1).map((t, idx) => {
            const isLast = idx === termsList.length - 2;
            return `
              <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
                <td style="border: 1px solid #333333; padding: 2.5px 2px; text-align: center; font-weight: 600; font-size: 9px;">${idx + 2}</td>
                <td colspan="4" style="border: 1px solid #333333; padding: 2.5px 5px; text-align: left; font-size: 9px; line-height: 1.2;">
                  ${t}
                </td>
                ${isLast ? `
                  <td style="border: 1px solid #333333; padding: 3px 5px; font-weight: 800; text-align: center; font-size: 9px; text-transform: uppercase;">
                    GRAND TOTAL
                  </td>
                  <td style="border: 1px solid #333333; padding: 3px 5px; font-weight: 800; text-align: right; white-space: nowrap; font-size: 9.5px;">
                    ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ` : `
                  <td style="border: 1px solid #333333;"></td>
                  <td style="border: 1px solid #333333;"></td>
                `}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

    </div>
  `;
}

async function previewCurrentQuotation() {
  const data = await getQuotationFormData();
  if (!data) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  previewingQuotationData = data;

  const docEl = document.getElementById('quotation-paper-document');
  const modalQuoteNo = document.getElementById('preview-modal-quote-no');
  if (docEl) docEl.innerHTML = generateQuotationPaperHTML(data, settings);
  if (modalQuoteNo) modalQuoteNo.textContent = data.quote_number;

  const modal = document.getElementById('quotation-preview-modal');
  if (modal) modal.classList.remove('hidden');
}

async function openQuotationPreview(quoteId) {
  const quote = allQuotationsRecords.find(q => String(q.id) === String(quoteId) || String(q.quote_number) === String(quoteId));
  if (!quote) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  previewingQuotationData = quote;

  const docEl = document.getElementById('quotation-paper-document');
  const modalQuoteNo = document.getElementById('preview-modal-quote-no');
  if (docEl) docEl.innerHTML = generateQuotationPaperHTML(quote, settings);
  if (modalQuoteNo) modalQuoteNo.textContent = quote.quote_number;

  const confirmBtn = document.getElementById('preview-confirm-order-btn');
  if (confirmBtn) {
    if (quote.status === 'Approved' || quote.status === 'Completed') {
      confirmBtn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/30 transition-all';
      confirmBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> View in Orders`;
      confirmBtn.onclick = () => viewLinkedOrder(quote.quote_number);
    } else {
      confirmBtn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow transition-all';
      confirmBtn.innerHTML = `<i class="fa-solid fa-cart-arrow-down"></i> Confirm Order`;
      confirmBtn.onclick = () => confirmQuotationOrderFromPreview();
    }
  }

  const modal = document.getElementById('quotation-preview-modal');
  if (modal) modal.classList.remove('hidden');
}

async function confirmQuotationOrderFromPreview() {
  const confirmBtn = document.getElementById('preview-confirm-order-btn');
  if (!previewingQuotationData) {
    alert("No active quotation preview to confirm.");
    return;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Confirming...`;
  }

  const qId = previewingQuotationData.id || previewingQuotationData.quote_number;
  const ok = await confirmQuotationOrder(qId);
  
  const updatedQuote = (allQuotationsRecords || []).find(q => String(q.id) === String(qId) || String(q.quote_number) === String(qId)) || { ...previewingQuotationData, status: 'Approved' };
  previewingQuotationData = updatedQuote;

  if (confirmBtn) {
    confirmBtn.disabled = false;
    if (ok) {
      confirmBtn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer';
      confirmBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> View in Orders`;
      confirmBtn.onclick = () => viewLinkedOrder(updatedQuote.quote_number);
    } else {
      confirmBtn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow transition-all cursor-pointer';
      confirmBtn.innerHTML = `<i class="fa-solid fa-cart-arrow-down"></i> Confirm Order`;
      confirmBtn.onclick = () => confirmQuotationOrderFromPreview();
    }
  }
}

function closeQuotationPreviewModal() {
  const modal = document.getElementById('quotation-preview-modal');
  if (modal) modal.classList.add('hidden');
}

function printQuotationDocument() {
  const printWrapper = document.getElementById('print-quotation-wrapper');
  const docEl = document.getElementById('quotation-paper-document');
  if (!printWrapper || !docEl) return;

  printWrapper.innerHTML = docEl.innerHTML;
  printWrapper.classList.remove('hidden');
  window.print();
  printWrapper.classList.add('hidden');
  printWrapper.innerHTML = '';
}

// ================= 6. EXCEL (.XLSX) GENERATION ENGINE (EXACT REFERENCE REPLICA) =================

async function exportQuotationToExcel(quoteId) {
  const quote = allQuotationsRecords.find(q => String(q.id) === String(quoteId) || String(q.quote_number) === String(quoteId));
  if (!quote) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generateExcelQuotationWorkbook(quote, settings);
}

async function downloadCurrentQuotationExcel() {
  const quote = previewingQuotationData || (await getQuotationFormData());
  if (!quote) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generateExcelQuotationWorkbook(quote, settings);
}

async function downloadPreviewExcel() {
  if (previewingQuotationData) {
    const settings = activeQuotationSettings || (await dbGetQuotationSettings());
    await generateExcelQuotationWorkbook(previewingQuotationData, settings);
  }
}

async function generateExcelQuotationWorkbook(quote, settings) {
  if (typeof ExcelJS === 'undefined') {
    alert("Excel library is loading, please try again in a moment.");
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = settings.company_name || 'SASI STEEL ENGINEERING & WELDING WORKS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Quotation', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 0 }
    });

    // Column Widths matching the reference image layout
    sheet.columns = [
      { key: 'sno', width: 6 },
      { key: 'images', width: 17 },
      { key: 'description', width: 22 },
      { key: 'finish', width: 20 },
      { key: 'qty', width: 8 },
      { key: 'rate', width: 14 },
      { key: 'amount', width: 18 }
    ];

    // Style & Color Constants
    const colorHeaderBlue = '8EA9DB';  // Steel Slate Blue top banner
    const colorPeach = 'FCE4D6';       // Peach for Date/Client & Grand Total
    const colorLightGray = 'E2E8F0';    // Table header gray
    const colorTermsGreen = 'C6EFCE';   // Light green for Terms header
    const colorTextGreen = '276A3C';

    const solidBorder = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };

    // 1. TOP HEADER BANNER (Row 1)
    sheet.mergeCells('A1:G1');
    const headerCell = sheet.getCell('A1');
    headerCell.value = `${settings.company_name || 'SASI STEEL ENGINEERING & WELDING WORKS'}\n${settings.company_address || '128-56/4, guntur amaravathi road, gorantla,guntur,a.p'}\nGSTIN/UIN : ${settings.company_gstin || '37AUCPA2925Q1ZG,CODE :37.'}`;
    headerCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '000000' } };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorHeaderBlue } };
    sheet.getRow(1).height = 50;
    for (let c = 1; c <= 7; c++) sheet.getRow(1).getCell(c).border = solidBorder;

    const logoUrl = settings.company_logo || 'img/sasi-logo.png';
    try {
      const logoBase64 = await urlToBase64(logoUrl);
      if (logoBase64) {
        const ext = logoBase64.includes('image/png') ? 'png' : 'jpeg';
        const cleanBase64 = logoBase64.split(',')[1] || logoBase64;
        const logoId = workbook.addImage({ base64: cleanBase64, extension: ext });
        sheet.addImage(logoId, {
          tl: { col: 0.12, row: 0.08 },
          ext: { width: 56, height: 56 },
          editAs: 'oneCell'
        });
      }
    } catch (e) {
      console.warn("Could not embed company logo in Excel:", e);
    }

    // 2. DATE & CLIENT DETAILS (Row 2)
    const displayDate = quote.quote_date ? (function(d){
      const parts = d.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    })(quote.quote_date) : new Date().toLocaleDateString('en-GB');

    sheet.mergeCells('A2:C2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Date : ${displayDate}`;
    dateCell.font = { name: 'Calibri', size: 10, bold: true };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left' };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

    sheet.getCell('D2').value = '';
    sheet.getCell('D2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

    sheet.mergeCells('E2:G2');
    const clientCell = sheet.getCell('E2');
    clientCell.value = `Client : ${quote.customer_name}${quote.company_name ? ' (' + quote.company_name + ')' : ''}\n${quote.customer_address || 'KHAMMAM'}`;
    clientCell.font = { name: 'Calibri', size: 9.5, bold: true };
    clientCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    clientCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };
    sheet.getRow(2).height = 26;
    for (let c = 1; c <= 7; c++) sheet.getRow(2).getCell(c).border = solidBorder;

    // 3. PRODUCT TABLE HEADER (Row 3)
    const headerRow = sheet.getRow(3);
    headerRow.height = 22;
    const tableHeaders = ['S.No', 'IMAGES', 'DESCRIPTION', 'FINISH', 'QTY', 'RATE/UNIT', 'AMOUNT'];
    tableHeaders.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorLightGray } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = solidBorder;
    });

    // 4. PRODUCT ROWS (Rows 4 to N)
    let currentRow = 4;
    const items = quote.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const r = sheet.getRow(currentRow);
      r.height = 75; // Tall row to accommodate vertical product image

      // Col A: S.No
      r.getCell(1).value = i + 1;
      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(1).font = { name: 'Calibri', size: 10 };
      r.getCell(1).border = solidBorder;

      // Col B: Image Cell
      r.getCell(2).value = '';
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).border = solidBorder;

      if (item.image_url) {
        try {
          const base64 = await urlToBase64(item.image_url);
          if (base64) {
            const ext = base64.includes('image/png') ? 'png' : 'jpeg';
            const cleanBase64 = base64.split(',')[1] || base64;
            const imgId = workbook.addImage({ base64: cleanBase64, extension: ext });
            sheet.addImage(imgId, {
              tl: { col: 1.12, row: currentRow - 0.92 },
              ext: { width: 85, height: 85 },
              editAs: 'oneCell'
            });
          }
        } catch (e) {
          console.warn("Could not embed image:", e);
        }
      }

      // Col C: Description
      r.getCell(3).value = (item.description || '').toUpperCase();
      r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      r.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      r.getCell(3).border = solidBorder;

      // Col D: Finish
      r.getCell(4).value = (item.finish || 'POWDER COATING').toUpperCase();
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      r.getCell(4).font = { name: 'Calibri', size: 9.5, bold: true };
      r.getCell(4).border = solidBorder;

      // Col E: Qty
      r.getCell(5).value = parseFloat(item.quantity) || 0;
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
      r.getCell(5).border = solidBorder;

      // Col F: Rate / Unit
      r.getCell(6).value = parseFloat(item.rate) || 0;
      r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(6).font = { name: 'Calibri', size: 10 };
      r.getCell(6).border = solidBorder;

      // Col G: Amount
      const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
      r.getCell(7).value = amt;
      r.getCell(7).numFmt = '"₹ "#,##0.00';
      r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(7).font = { name: 'Calibri', size: 10, bold: true };
      r.getCell(7).border = solidBorder;

      currentRow++;
    }

    // Calculations
    const subTotal = parseFloat(quote.sub_total) || 0;
    const packingCharges = parseFloat(quote.packing_charges) || 0;
    const afterPacking = subTotal + packingCharges;
    const gstRate = parseFloat(quote.gst_rate) || 18;
    const gstAmount = parseFloat(quote.gst_amount) || Math.round(afterPacking * (gstRate / 100) * 100) / 100;
    const otherCharges = parseFloat(quote.other_charges) || 0;
    const grandTotal = parseFloat(quote.grand_total) || (afterPacking + gstAmount + otherCharges);
    const bank = quote.bank_details || settings;
    let termsList = [];
    if (Array.isArray(quote.terms) && quote.terms.length > 0 && quote.terms.some(t => t && String(t).trim().length > 0)) {
      termsList = quote.terms.filter(t => t && String(t).trim().length > 0);
    } else if (settings && Array.isArray(settings.default_terms) && settings.default_terms.length > 0 && settings.default_terms.some(t => t && String(t).trim().length > 0)) {
      termsList = settings.default_terms.filter(t => t && String(t).trim().length > 0);
    } else {
      termsList = [...OFFICIAL_COMPANY_TERMS];
    }
    if (!termsList || termsList.length === 0) {
      termsList = [...OFFICIAL_COMPANY_TERMS];
    }

    // 5. BANK DETAILS ROW 1 + TOTAL
    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const b1 = sheet.getCell(`A${currentRow}`);
    b1.value = 'COMPANY BANK DETAILS';
    b1.font = { name: 'Calibri', size: 10, bold: true };
    b1.alignment = { vertical: 'middle', horizontal: 'center' };
    b1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorLightGray } };

    const totLabel = sheet.getCell(`F${currentRow}`);
    totLabel.value = 'TOTAL';
    totLabel.font = { name: 'Calibri', size: 10, bold: true };
    totLabel.alignment = { vertical: 'middle', horizontal: 'center' };

    const totVal = sheet.getCell(`G${currentRow}`);
    totVal.value = subTotal;
    totVal.numFmt = '"₹ "#,##0.00';
    totVal.font = { name: 'Calibri', size: 10, bold: true };
    totVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(currentRow).height = 20;
    for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = solidBorder;
    currentRow++;

    // 6. BANK DETAILS ROW 2 + PACKING CHARGES
    sheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const b2 = sheet.getCell(`A${currentRow}`);
    b2.value = `Bank Name : ${bank.bank_name || 'STATE BANK OF INDIA, Arundalpet'}`;
    b2.font = { name: 'Calibri', size: 9.5, bold: true };
    b2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    sheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const b2Phone = sheet.getCell(`D${currentRow}`);
    b2Phone.value = bank.company_phone || settings.company_phone || 'PH: 9949321664, OFFICE: 8333991114(OR)5';
    b2Phone.font = { name: 'Calibri', size: 9, bold: true };
    b2Phone.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    const packLabel = sheet.getCell(`F${currentRow}`);
    packLabel.value = `PACKING CHARGES ${packingCharges > 0 ? (Math.round((packingCharges / subTotal) * 100) || 2) + '%' : '2%'}`;
    packLabel.font = { name: 'Calibri', size: 9, bold: true };
    packLabel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    packLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

    const packVal = sheet.getCell(`G${currentRow}`);
    packVal.value = packingCharges;
    packVal.numFmt = '"₹ "#,##0.00';
    packVal.font = { name: 'Calibri', size: 10 };
    packVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(currentRow).height = 22;
    for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = solidBorder;
    currentRow++;

    // 7. BANK DETAILS ROW 3 + AFTER PACKING TOTAL
    sheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const b3Acc = sheet.getCell(`A${currentRow}`);
    b3Acc.value = `A/C NO: ${bank.account_number || '42384233004'}`;
    b3Acc.font = { name: 'Calibri', size: 10, bold: true };
    b3Acc.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const b3Extra = sheet.getCell(`D${currentRow}`);
    b3Extra.value = `${bank.ifsc_code ? 'IFSC: ' + bank.ifsc_code : ''} ${bank.upi_id ? '• UPI: ' + bank.upi_id : ''}`;
    b3Extra.font = { name: 'Calibri', size: 9 };
    b3Extra.alignment = { vertical: 'middle', horizontal: 'center' };

    const aftLabel = sheet.getCell(`F${currentRow}`);
    aftLabel.value = 'AFTER PACKING CHARGES TOTAL';
    aftLabel.font = { name: 'Calibri', size: 8.5, bold: true };
    aftLabel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    aftLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

    const aftVal = sheet.getCell(`G${currentRow}`);
    aftVal.value = afterPacking;
    aftVal.numFmt = '"₹ "#,##0.00';
    aftVal.font = { name: 'Calibri', size: 10, bold: true };
    aftVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(currentRow).height = 24;
    for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = solidBorder;
    currentRow++;

    // 8. TERMS HEADER + GST
    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const termsHeader = sheet.getCell(`A${currentRow}`);
    termsHeader.value = 'TERMS & CONDITIONS';
    termsHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colorTextGreen } };
    termsHeader.alignment = { vertical: 'middle', horizontal: 'left' };
    termsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorTermsGreen } };

    const gstLabel = sheet.getCell(`F${currentRow}`);
    gstLabel.value = `GST ${gstRate}%`;
    gstLabel.font = { name: 'Calibri', size: 10, bold: true };
    gstLabel.alignment = { vertical: 'middle', horizontal: 'center' };

    const gstVal = sheet.getCell(`G${currentRow}`);
    gstVal.value = gstAmount;
    gstVal.numFmt = '"₹ "#,##0.00';
    gstVal.font = { name: 'Calibri', size: 10, bold: true };
    gstVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(currentRow).height = 20;
    for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = solidBorder;
    currentRow++;

    // 9. TERMS ROW 1 + GRAND TOTAL
    sheet.getCell(`A${currentRow}`).value = 1;
    sheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${currentRow}`).font = { name: 'Calibri', size: 9.5 };

    sheet.mergeCells(`B${currentRow}:E${currentRow}`);
    const t1 = sheet.getCell(`B${currentRow}`);
    t1.value = termsList[0] || 'Items will be ready within 30-45 working days form the date of Approval.';
    t1.font = { name: 'Calibri', size: 9 };
    t1.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    const grandLabel = sheet.getCell(`F${currentRow}`);
    grandLabel.value = 'GRAND TOTAL';
    grandLabel.font = { name: 'Calibri', size: 10, bold: true };
    grandLabel.alignment = { vertical: 'middle', horizontal: 'center' };
    grandLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

    const grandVal = sheet.getCell(`G${currentRow}`);
    grandVal.value = grandTotal;
    grandVal.numFmt = '"₹ "#,##0.00';
    grandVal.font = { name: 'Calibri', size: 10.5, bold: true };
    grandVal.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(currentRow).height = 20;
    for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = solidBorder;
    currentRow++;

    // 10. SUBSEQUENT TERMS ROWS (2 TO END)
    for (let tIdx = 1; tIdx < termsList.length; tIdx++) {
      const isLast = tIdx === termsList.length - 1;
      const tRow = sheet.getRow(currentRow);

      tRow.getCell(1).value = tIdx + 1;
      tRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      tRow.getCell(1).font = { name: 'Calibri', size: 9 };

      sheet.mergeCells(`B${currentRow}:E${currentRow}`);
      tRow.getCell(2).value = termsList[tIdx];
      tRow.getCell(2).font = { name: 'Calibri', size: 9 };
      tRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      if (isLast) {
        tRow.getCell(6).value = 'GRAND TOTAL';
        tRow.getCell(6).font = { name: 'Calibri', size: 9.5, bold: true };
        tRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        tRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPeach } };

        tRow.getCell(7).value = grandTotal;
        tRow.getCell(7).numFmt = '"₹ "#,##0.00';
        tRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true };
        tRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        tRow.getCell(6).value = '';
        tRow.getCell(7).value = '';
      }

      tRow.height = 19;
      for (let c = 1; c <= 7; c++) tRow.getCell(c).border = solidBorder;
      currentRow++;
    }

    // Export Workbook to File
    const buffer = await workbook.xlsx.writeBuffer();
    const cleanNum = (quote.quote_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${cleanNum}_${getLocalDateStr()}.xlsx`);
  } catch (err) {
    console.error("Excel generation error:", err);
    alert("Error generating Excel file: " + err.message);
  }
}

// Master Excel Exporter for All Quotations
async function exportAllQuotationsExcel() {
  if (typeof ExcelJS === 'undefined') return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('All Quotations');

    sheet.columns = [
      { header: 'Quote Number', key: 'quote_number', width: 20 },
      { header: 'Date', key: 'quote_date', width: 15 },
      { header: 'Customer Name', key: 'customer_name', width: 25 },
      { header: 'Company Name', key: 'company_name', width: 28 },
      { header: 'Phone', key: 'customer_phone', width: 18 },
      { header: 'Items Count', key: 'items_count', width: 12 },
      { header: 'Sub Total (₹)', key: 'sub_total', width: 18 },
      { header: 'GST (₹)', key: 'gst_amount', width: 16 },
      { header: 'Grand Total (₹)', key: 'grand_total', width: 20 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    sheet.getRow(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EA580C' } };
    sheet.getRow(1).height = 24;

    allQuotationsRecords.forEach(q => {
      sheet.addRow({
        quote_number: q.quote_number,
        quote_date: q.quote_date || q.created_at?.substring(0, 10),
        customer_name: q.customer_name,
        company_name: q.company_name || '',
        customer_phone: q.customer_phone || '',
        items_count: Array.isArray(q.items) ? q.items.length : 0,
        sub_total: q.sub_total || 0,
        gst_amount: q.gst_amount || 0,
        grand_total: q.grand_total || 0,
        status: q.status || 'Draft'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SASI_Steels_Quotations_Master_${getLocalDateStr()}.xlsx`);
  } catch (e) {
    console.error("Master Excel export error:", e);
  }
}

// ================= 7. PDF GENERATION ENGINE (html2pdf) =================

async function exportQuotationToPDF(quoteId) {
  let quote = allQuotationsRecords.find(q => String(q.id) === String(quoteId) || String(q.quote_number) === String(quoteId));
  if (!quote) {
    const quotes = await dbGetQuotations();
    allQuotationsRecords = quotes || [];
    quote = allQuotationsRecords.find(q => String(q.id) === String(quoteId) || String(q.quote_number) === String(quoteId));
  }
  if (!quote) {
    alert("Quotation not found.");
    return;
  }
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generatePdfDocument(quote, settings);
}

async function downloadCurrentQuotationPDF() {
  const quoteModal = document.getElementById('quotation-modal');
  const previewModal = document.getElementById('quotation-preview-modal');
  
  let quote = null;
  if (previewModal && !previewModal.classList.contains('hidden')) {
    quote = previewingQuotationData;
  } else if (quoteModal && !quoteModal.classList.contains('hidden')) {
    quote = await getQuotationFormData();
  } else {
    quote = previewingQuotationData || (await getQuotationFormData());
  }

  if (!quote) {
    alert("Please fill in or select a quotation first.");
    return;
  }
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generatePdfDocument(quote, settings);
}

async function downloadPreviewPDF() {
  const quote = previewingQuotationData || (await getQuotationFormData());
  if (!quote) {
    alert("No quotation preview found.");
    return;
  }
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generatePdfDocument(quote, settings);
}

// Helper: Convert Image URL or local file path to Base64 Data URL for html2canvas
async function urlToBase64(url) {
  if (!url) return '';
  if (typeof url === 'string' && url.startsWith('data:image/')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (err) {
          resolve(url);
        }
      };
      img.onerror = function() {
        resolve(url);
      };
      img.src = url;
    });
  }
}

async function generatePdfDocument(quote, settings) {
  if (typeof html2pdf === 'undefined') {
    printQuotationDocument();
    return;
  }

  const safeSettings = sanitizeQuotationSettings(settings);
  const safeQuote = {
    ...quote,
    terms: sanitizeQuotationTerms(quote.terms || safeSettings.default_terms),
    bank_details: quote.bank_details ? sanitizeQuotationSettings(quote.bank_details) : safeSettings
  };

  // Clone and pre-convert image URLs to Base64 to ensure immediate synchronous render in html2canvas
  const clonedQuote = JSON.parse(JSON.stringify(safeQuote));
  if (clonedQuote.items && Array.isArray(clonedQuote.items)) {
    for (let it of clonedQuote.items) {
      if (it.image_url) {
        try {
          const b64 = await urlToBase64(it.image_url);
          if (b64) it.image_url = b64;
        } catch (e) {}
      }
    }
  }

  const clonedSettings = { ...safeSettings };
  if (clonedSettings.company_logo) {
    try {
      const logoB64 = await urlToBase64(clonedSettings.company_logo);
      if (logoB64) clonedSettings.company_logo = logoB64;
    } catch (e) {}
  }

  // Create container in normal DOM flow so html2canvas renders complete PDF document without blank page clipping
  const container = document.createElement('div');
  container.id = 'sasi-pdf-export-temp-container';
  container.style.width = '730px';
  container.style.margin = '0 auto';
  container.style.background = '#ffffff';
  container.style.boxSizing = 'border-box';
  container.style.padding = '0';
  container.innerHTML = generateQuotationPaperHTML(clonedQuote, clonedSettings);
  document.body.appendChild(container);

  // Wait for all images in container to load completely
  const imgEls = container.querySelectorAll('img');
  await Promise.all(Array.from(imgEls).map(img => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise(res => {
      img.onload = res;
      img.onerror = res;
      setTimeout(res, 600);
    });
  }));
  await new Promise(r => setTimeout(r, 200));

  const cleanNum = (safeQuote.quote_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const opt = {
    margin: [4, 4, 4, 4],
    filename: `${cleanNum}_${getLocalDateStr()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("html2pdf failed, falling back to print:", err);
    printQuotationDocument();
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

// ================= 8. QUOTATION SETTINGS MODAL =================

async function openQuotationSettingsModal() {
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  const modal = document.getElementById('quotation-settings-modal');
  if (!modal) return;

  document.getElementById('cfg-company-name').value = settings.company_name || '';
  document.getElementById('cfg-company-tagline').value = settings.company_tagline || '';
  document.getElementById('cfg-company-gstin').value = settings.company_gstin || '';
  document.getElementById('cfg-company-address').value = settings.company_address || '';
  document.getElementById('cfg-company-phone').value = settings.company_phone || '';
  document.getElementById('cfg-company-email').value = settings.company_email || '';
  document.getElementById('cfg-company-logo').value = settings.company_logo || 'img/sasi-logo.png';

  document.getElementById('cfg-bank-name').value = settings.bank_name || '';
  document.getElementById('cfg-bank-holder').value = settings.account_holder || '';
  document.getElementById('cfg-bank-acc').value = settings.account_number || '';
  document.getElementById('cfg-bank-ifsc').value = settings.ifsc_code || '';
  document.getElementById('cfg-bank-branch').value = settings.branch_name || '';
  document.getElementById('cfg-bank-upi').value = settings.upi_id || '';

  const terms = (Array.isArray(settings.default_terms) && settings.default_terms.length > 0)
    ? settings.default_terms.join('\n')
    : OFFICIAL_COMPANY_TERMS.join('\n');
  document.getElementById('cfg-default-terms').value = terms;

  modal.classList.remove('hidden');
}

function closeQuotationSettingsModal() {
  const modal = document.getElementById('quotation-settings-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleCompanyLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const optimized = await fileToOptimizedDataUrl(file, 600, 0.9);
  if (optimized) {
    document.getElementById('cfg-company-logo').value = optimized;
  }
  try {
    const cloudUrl = await uploadToCloudinary(file);
    if (cloudUrl) {
      document.getElementById('cfg-company-logo').value = cloudUrl;
    }
  } catch (e) {}
}

async function handleSaveQuotationSettings(event) {
  event.preventDefault();
  const rawTerms = document.getElementById('cfg-default-terms').value;
  const termsArray = rawTerms.split('\n').map(t => t.trim()).filter(t => t.length > 0);

  const newSettings = {
    company_name: document.getElementById('cfg-company-name').value.trim(),
    company_tagline: document.getElementById('cfg-company-tagline').value.trim(),
    company_gstin: document.getElementById('cfg-company-gstin').value.trim(),
    company_address: document.getElementById('cfg-company-address').value.trim(),
    company_phone: document.getElementById('cfg-company-phone').value.trim(),
    company_email: document.getElementById('cfg-company-email').value.trim(),
    company_logo: document.getElementById('cfg-company-logo').value.trim() || 'img/sasi-logo.png',
    bank_name: document.getElementById('cfg-bank-name').value.trim(),
    account_holder: document.getElementById('cfg-bank-holder').value.trim(),
    account_number: document.getElementById('cfg-bank-acc').value.trim(),
    ifsc_code: document.getElementById('cfg-bank-ifsc').value.trim(),
    branch_name: document.getElementById('cfg-bank-branch').value.trim(),
    upi_id: document.getElementById('cfg-bank-upi').value.trim(),
    default_terms: termsArray
  };

  activeQuotationSettings = await dbSaveQuotationSettings(newSettings);
  closeQuotationSettingsModal();
  alert("Quotation & Bank settings saved successfully!");
}


function openNewInquiryModal() {
  activeModalType = 'inquiry';
  editingItemId = null;

  document.getElementById('crud-modal-title').textContent = 'Add Manual Quotation Lead';
  document.getElementById('crud-modal-subtitle').textContent = 'Record a direct phone inquiry, email lead, or workshop walk-in client RFQ.';

  document.getElementById('crud-form-fields').innerHTML = `
    <!-- Lead Date & Project Type -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-orange-400 mr-1"></i> Lead Date <span class="text-orange-500">*</span></label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'inquiry_date\\']').value = getLocalDateStr()" class="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="inquiry_date" required value="${getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold text-xs mb-1">Project Type <span class="text-orange-500">*</span></label>
        <select name="project_type" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold text-xs">
          <option value="Industrial Sheds">Industrial Sheds</option>
          <option value="Warehouse PEB">Warehouse PEB</option>
          <option value="Custom Steel Fabrication">Custom Steel Fabrication</option>
          <option value="Storage Racks & Mezzanine">Storage Racks & Mezzanine</option>
          <option value="Steel Staircase & Railings">Steel Staircase & Railings</option>
          <option value="Other Fabrication Work">Other Fabrication Work</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Client / Company Name *</label>
        <input type="text" name="client_name" required placeholder="e.g. Anil Construction Pvt Ltd" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Phone / WhatsApp *</label>
        <input type="text" name="client_phone" required placeholder="+91 98480 12345" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Project Scope / Dimensions</label>
        <input type="text" name="project_scope" placeholder="e.g. 40x80 ft Warehouse Industrial Shed" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Estimated Rate / Budget (₹)</label>
        <input type="text" name="estimated_cost" placeholder="e.g. ₹4,50,000 or 15L - 18L" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold text-emerald-400" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Email Address (Optional)</label>
        <input type="email" name="client_email" placeholder="client@company.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Status</label>
        <select name="status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Quoted">Quoted</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Client Notes / Requirement Details</label>
      <textarea name="message" rows="2" placeholder="Site location, crane access, delivery timeline, specific steel grade..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500"></textarea>
    </div>
  `;

  document.getElementById('crud-modal').classList.remove('hidden');
}

// ================= 2. CUSTOMER ORDERS & COMPANY-WISE LEDGER ENGINE =================
let currentSelectedOrderCompany = 'ALL';

async function loadOrders() {
  const tbody = document.getElementById('table-orders');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading orders & company ledgers...</td></tr>`;

  try {
    const orders = await dbGetOrders();
    allOrdersRecords = orders || [];
    populateCompanyFilterOptions();
    filterOrdersData();
  } catch (err) {
    console.error("Error in loadOrders:", err);
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400">Failed to load orders.</td></tr>`;
  }
}

function populateCompanyFilterOptions() {
  const selectEl = document.getElementById('order-filter-company');
  const pillsEl = document.getElementById('order-company-pills');
  if (!selectEl) return;

  // Extract distinct company names
  const companyCounts = {};
  (allOrdersRecords || []).forEach(o => {
    const name = (o.company_name && o.company_name.trim()) ? o.company_name.trim() : ((o.customer_name && o.customer_name.trim()) || 'General Client');
    companyCounts[name] = (companyCounts[name] || 0) + 1;
  });

  const companyList = Object.keys(companyCounts).sort();
  const curVal = currentSelectedOrderCompany || selectEl.value || 'ALL';

  // Populate Dropdown
  let optionsHtml = `<option value="ALL" ${curVal === 'ALL' ? 'selected' : ''}>🏢 All Companies (Combined Totals & Overview)</option>`;
  companyList.forEach(comp => {
    const count = companyCounts[comp];
    optionsHtml += `<option value="${comp}" ${curVal === comp ? 'selected' : ''}>🏢 ${comp} (${count} ${count === 1 ? 'order' : 'orders'})</option>`;
  });
  selectEl.innerHTML = optionsHtml;

  // Populate Quick Pills
  if (pillsEl) {
    const totalOrdersCount = (allOrdersRecords || []).length;
    let pillsHtml = `
      <button onclick="onCompanyFilterChange('ALL')" class="company-pill ${curVal === 'ALL' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer">
        All Companies <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${curVal === 'ALL' ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'}">${totalOrdersCount}</span>
      </button>
    `;

    companyList.forEach(comp => {
      const isSelected = curVal === comp;
      const count = companyCounts[comp];
      pillsHtml += `
        <button onclick="onCompanyFilterChange('${comp.replace(/'/g, "\\'")}')" class="company-pill ${isSelected ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5">
          <i class="fa-solid fa-building text-[10px] opacity-70"></i>
          <span>${comp}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'}">${count}</span>
        </button>
      `;
    });
    pillsEl.innerHTML = pillsHtml;
  }
}

function onCompanyFilterChange(compName) {
  currentSelectedOrderCompany = compName || 'ALL';
  const selectEl = document.getElementById('order-filter-company');
  if (selectEl) selectEl.value = currentSelectedOrderCompany;

  populateCompanyFilterOptions();
  filterOrdersData();
}

function renderOrdersList(list) {
  const tbody = document.getElementById('table-orders');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-emerald-400">
            <i class="fa-solid fa-cart-shopping"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No orders match your filter.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Select another company, adjust dates, or create a new order.</p>
          <button onclick="openOrderModal()" class="btn-orange-pill text-xs px-4 py-2 cursor-pointer">
            <i class="fa-solid fa-plus mr-1"></i> Create Manual Order
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map(ord => {
    const rawPhone = (ord.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneLink = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? '91' + rawPhone : '');
    const orderDate = ord.order_date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN') : 'Recent');
    const companyName = (ord.company_name && ord.company_name.trim()) ? ord.company_name.trim() : (ord.customer_name || 'General Client');
    const customerName = ord.customer_name || 'Valued Client';
    
    const totalAmount = parseFloat(ord.total_amount) || 0;
    const paidAmount = parseFloat(ord.paid_amount !== undefined ? ord.paid_amount : (ord.payment_status === 'Paid' ? totalAmount : 0)) || 0;
    const pendingDue = Math.max(0, totalAmount - paidAmount);

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-white font-mono text-xs text-orange-400">${ord.order_number || ('ORD-' + ord.id)}</div>
          <div class="text-[11px] text-slate-300 font-mono font-semibold flex items-center gap-1 mt-0.5">
            <i class="fa-regular fa-calendar text-orange-400"></i> ${formatDisplayDate(ord.order_date || ord.created_at)}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-black uppercase tracking-wider">
              <i class="fa-solid fa-building text-[9px] mr-0.5"></i> ${companyName}
            </span>
          </div>
          <div class="text-xs text-slate-200 font-semibold mt-1 flex items-center gap-1">
            <i class="fa-solid fa-user text-slate-400 text-[10px]"></i> ${customerName}
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">${ord.customer_phone || 'No phone'}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200">${ord.item_name}</div>
          <div class="text-[10px] text-slate-400">${ord.category || 'Standard Stock'}</div>
        </td>
        <td class="py-3 px-4 font-bold text-cyan-400 font-mono text-xs">
          ${ord.quantity} <span class="text-[10px] text-slate-400 font-normal">${ord.unit || 'Units'}</span>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white font-mono">₹${Math.round(totalAmount).toLocaleString('en-IN')}</div>
          <div class="text-[10px] text-slate-400">@ ₹${(parseFloat(ord.unit_price) || 0).toLocaleString('en-IN')}/${ord.unit || 'Unit'}</div>
        </td>
        <td class="py-3 px-4">
          <div class="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
            <i class="fa-solid fa-circle-check text-[10px]"></i> Paid: ₹${Math.round(paidAmount).toLocaleString('en-IN')}
          </div>
          <div class="text-xs font-bold ${pendingDue > 0 ? 'text-amber-400' : 'text-slate-500'} font-mono flex items-center gap-1 mt-0.5">
            <i class="fa-solid ${pendingDue > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'} text-[10px]"></i> Due: ₹${Math.round(pendingDue).toLocaleString('en-IN')}
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
            ord.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            ord.payment_status === 'Partial' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }">${ord.payment_status || (pendingDue === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'))}</span>
        </td>
        <td class="py-3 px-4">
          <select onchange="handleOrderStatusChange('${ord.id}', this.value)" class="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer">
            <option value="Pending" ${ord.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Confirmed" ${ord.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Processing" ${ord.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Delivered" ${ord.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${ord.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          ${phoneLink ? `
            <a href="https://api.whatsapp.com/send?phone=${phoneLink}&text=Hello%20${encodeURIComponent(customerName)},%20this%20is%20SASI%20Steel%20Engineering%20regarding%20Order%20${encodeURIComponent(ord.order_number || '')}%20(${encodeURIComponent(companyName)}).%20Total:%20₹${Math.round(totalAmount)},%20Paid:%20₹${Math.round(paidAmount)},%20Pending%20Balance:%20₹${Math.round(pendingDue)}." target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer" title="Chat on WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </a>` : ''}
          <button onclick="openOrderModal('${ord.id}')" class="px-2 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-white text-[11px] cursor-pointer" title="Edit Order">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteOrderItem('${ord.id}')" class="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px] cursor-pointer" title="Delete Order">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrdersMetrics(currentFilteredList = allOrdersRecords) {
  const targetCompany = currentSelectedOrderCompany || document.getElementById('order-filter-company')?.value || 'ALL';
  
  // Calculate on currently filtered dataset for accurate real-time company & date metrics
  const totalCount = currentFilteredList.length;
  const totalQty = currentFilteredList.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
  
  const validOrders = currentFilteredList.filter(o => o.order_status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const totalPaid = validOrders.reduce((sum, o) => {
    const tot = parseFloat(o.total_amount) || 0;
    const paid = parseFloat(o.paid_amount !== undefined ? o.paid_amount : (o.payment_status === 'Paid' ? tot : 0)) || 0;
    return sum + paid;
  }, 0);
  const totalPending = Math.max(0, totalRevenue - totalPaid);

  const activeCount = currentFilteredList.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
  const deliveredCount = currentFilteredList.filter(o => o.order_status === 'Delivered').length;

  // Update DOM metric cards
  const badgeEl = document.getElementById('badge-orders-count');
  if (badgeEl) badgeEl.textContent = activeCount;

  const totalEl = document.getElementById('orders-total-count');
  if (totalEl) totalEl.textContent = totalCount;

  const qtyEl = document.getElementById('orders-total-quantity');
  if (qtyEl) qtyEl.textContent = totalQty % 1 === 0 ? totalQty.toLocaleString('en-IN') : totalQty.toFixed(1);

  const revenueEl = document.getElementById('orders-total-revenue');
  if (revenueEl) revenueEl.textContent = `₹${Math.round(totalRevenue).toLocaleString('en-IN')}`;

  const paidEl = document.getElementById('orders-paid-amount');
  if (paidEl) paidEl.textContent = `₹${Math.round(totalPaid).toLocaleString('en-IN')}`;

  const pendingEl = document.getElementById('orders-pending-amount');
  if (pendingEl) pendingEl.textContent = `₹${Math.round(totalPending).toLocaleString('en-IN')}`;

  const activeEl = document.getElementById('orders-active-count');
  if (activeEl) activeEl.textContent = activeCount;

  const deliveredEl = document.getElementById('orders-delivered-count');
  if (deliveredEl) deliveredEl.textContent = deliveredCount;

  // Active Company Label & Badge
  const activeBadgeLabel = document.getElementById('company-active-label');
  if (activeBadgeLabel) {
    if (targetCompany === 'ALL') {
      activeBadgeLabel.textContent = `Showing All Companies Combined (${totalCount} Orders)`;
    } else {
      activeBadgeLabel.innerHTML = `Active Company: <strong class="text-white">${targetCompany}</strong> (${totalCount} Orders | Balance Due: <strong class="text-amber-400">₹${Math.round(totalPending).toLocaleString('en-IN')}</strong>)`;
    }
  }
}

function setOrderDatePreset(preset) {
  setDateFilterPreset('order', preset);
}

function filterOrdersData() {
  const companyVal = currentSelectedOrderCompany || document.getElementById('order-filter-company')?.value || 'ALL';
  const searchVal = (document.getElementById('order-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('order-filter-status')?.value || 'ALL';
  const paymentVal = document.getElementById('order-filter-payment')?.value || 'ALL';
  const fromVal = document.getElementById('order-filter-from')?.value || '';
  const toVal = document.getElementById('order-filter-to')?.value || '';

  const filtered = (allOrdersRecords || []).filter(ord => {
    // 1. Company Filter
    if (companyVal !== 'ALL') {
      const ordComp = ((ord.company_name && ord.company_name.trim()) ? ord.company_name.trim() : (ord.customer_name || 'General Client')).toLowerCase();
      if (ordComp !== companyVal.toLowerCase().trim()) return false;
    }

    // 2. Order Status Filter
    if (statusVal !== 'ALL' && ord.order_status !== statusVal) return false;

    // 3. Payment Status Filter
    if (paymentVal !== 'ALL') {
      const tot = parseFloat(ord.total_amount) || 0;
      const pd = parseFloat(ord.paid_amount !== undefined ? ord.paid_amount : (ord.payment_status === 'Paid' ? tot : 0)) || 0;
      const due = Math.max(0, tot - pd);
      let calculatedPaymentStatus = ord.payment_status || (due === 0 ? 'Paid' : (pd > 0 ? 'Partial' : 'Pending'));
      
      if (paymentVal === 'Paid' && calculatedPaymentStatus !== 'Paid') return false;
      if (paymentVal === 'Partial' && calculatedPaymentStatus !== 'Partial') return false;
      if (paymentVal === 'Pending' && (calculatedPaymentStatus !== 'Pending' && due <= 0)) return false;
    }
    
    // 4. Date Comparison
    const oDate = getRecordDateStr(ord.order_date || ord.created_at);
    if (fromVal && oDate < fromVal) return false;
    if (toVal && oDate > toVal) return false;

    // 5. Search Text
    if (searchVal) {
      const matchNum = (ord.order_number || '').toLowerCase().includes(searchVal);
      const matchComp = (ord.company_name || '').toLowerCase().includes(searchVal);
      const matchCust = (ord.customer_name || '').toLowerCase().includes(searchVal);
      const matchPhone = (ord.customer_phone || '').toLowerCase().includes(searchVal);
      const matchItem = (ord.item_name || '').toLowerCase().includes(searchVal);
      const matchNotes = (ord.notes || '').toLowerCase().includes(searchVal);
      const cleanSearch = searchVal.replace(/[^a-z0-9]/g, '');
      const cleanNum = (ord.order_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchClean = cleanSearch ? cleanNum.includes(cleanSearch) : false;

      if (!matchNum && !matchComp && !matchCust && !matchPhone && !matchItem && !matchNotes && !matchClean) return false;
    }
    return true;
  });

  updateOrdersMetrics(filtered);
  renderOrdersList(filtered);
}

async function handleOrderStatusChange(id, newStatus) {
  await dbUpdateOrderStatus(id, newStatus);
  await loadOrders();
  await loadInventory();
  await loadProducts();
  loadInitialCounts();
}

function resetOrdersFilter() {
  currentSelectedOrderCompany = 'ALL';
  const compSelect = document.getElementById('order-filter-company');
  const searchInput = document.getElementById('order-filter-search');
  const statusSelect = document.getElementById('order-filter-status');
  const paymentSelect = document.getElementById('order-filter-payment');

  if (compSelect) compSelect.value = 'ALL';
  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  if (paymentSelect) paymentSelect.value = 'ALL';

  populateCompanyFilterOptions();
  setDateFilterPreset('order', 'all');
}

// -------------------------------------------------------------
// EXPORT COMPANY ORDERS STATEMENT TO EXCEL (EXCELJS)
// -------------------------------------------------------------
async function exportCompanyOrdersExcel(specificCompany = null) {
  const targetCompany = specificCompany || currentSelectedOrderCompany || document.getElementById('order-filter-company')?.value || 'ALL';
  const fromVal = document.getElementById('order-filter-from')?.value || '';
  const toVal = document.getElementById('order-filter-to')?.value || '';

  if (!allOrdersRecords || allOrdersRecords.length === 0) {
    allOrdersRecords = (await dbGetOrders()) || [];
  }

  // Filter orders in current scope
  const exportList = allOrdersRecords.filter(ord => {
    if (targetCompany !== 'ALL') {
      const ordComp = ((ord.company_name && ord.company_name.trim()) ? ord.company_name.trim() : (ord.customer_name || 'General Client')).toLowerCase();
      if (ordComp !== targetCompany.toLowerCase().trim()) return false;
    }
    const oDate = getRecordDateStr(ord.order_date || ord.created_at);
    if (fromVal && oDate < fromVal) return false;
    if (toVal && oDate > toVal) return false;
    return true;
  });

  if (exportList.length === 0) {
    alert(`No orders found for ${targetCompany === 'ALL' ? 'the selected date range' : targetCompany}.`);
    return;
  }

  // Calculation totals
  const totalOrders = exportList.length;
  const totalQty = exportList.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
  const totalAmount = exportList.filter(o => o.order_status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const totalPaid = exportList.filter(o => o.order_status !== 'Cancelled').reduce((sum, o) => {
    const t = parseFloat(o.total_amount) || 0;
    const p = parseFloat(o.paid_amount !== undefined ? o.paid_amount : (o.payment_status === 'Paid' ? t : 0)) || 0;
    return sum + p;
  }, 0);
  const totalPendingDue = Math.max(0, totalAmount - totalPaid);

  if (typeof ExcelJS === 'undefined') {
    // Fallback to CSV
    exportOrdersCSV();
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SASI STEEL ENGINEERING';
  const sheet = workbook.addWorksheet(targetCompany === 'ALL' ? 'All Companies Statement' : targetCompany.substring(0, 30));

  sheet.views = [{ showGridLines: true }];

  // Column definitions
  sheet.columns = [
    { key: 'sno', width: 6 },
    { key: 'order_no', width: 16 },
    { key: 'order_date', width: 14 },
    { key: 'company', width: 26 },
    { key: 'customer', width: 22 },
    { key: 'item_name', width: 30 },
    { key: 'qty', width: 10 },
    { key: 'unit', width: 10 },
    { key: 'unit_price', width: 14 },
    { key: 'total_amount', width: 16 },
    { key: 'paid_amount', width: 16 },
    { key: 'pending_due', width: 16 },
    { key: 'payment_status', width: 14 },
    { key: 'order_status', width: 14 },
    { key: 'notes', width: 24 }
  ];

  const colorNavy = '1E293B';
  const colorOrange = 'EA580C';
  const colorHeaderBg = 'F1F5F9';
  const colorGreenBg = 'DCFCE7';
  const colorAmberBg = 'FEF3C7';
  const solidBorder = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } }
  };

  // Row 1: Header Banner
  sheet.mergeCells('A1:O1');
  const h1 = sheet.getCell('A1');
  h1.value = 'SASI STEEL ENGINEERING & WELDING WORKS';
  h1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  h1.alignment = { vertical: 'middle', horizontal: 'center' };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorNavy } };
  sheet.getRow(1).height = 30;

  // Row 2: Subtitle & Statement Scope
  sheet.mergeCells('A2:O2');
  const h2 = sheet.getCell('A2');
  h2.value = `OFFICIAL COMPANY ORDER & ACCOUNT STATEMENT — ${targetCompany.toUpperCase()}`;
  h2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  h2.alignment = { vertical: 'middle', horizontal: 'center' };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorOrange } };
  sheet.getRow(2).height = 22;

  // Row 3: Period & Date
  sheet.mergeCells('A3:O3');
  const h3 = sheet.getCell('A3');
  const periodText = (fromVal || toVal) ? `Period: ${fromVal || 'Start'} to ${toVal || 'Today'}` : 'Period: All Time Ledger';
  h3.value = `${periodText}  |  Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}  |  GSTIN: 37AUCPA2925Q1ZG`;
  h3.font = { name: 'Calibri', size: 9.5, italic: true };
  h3.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(3).height = 18;

  // Row 5-6: Statement Metrics Summary Table
  sheet.getRow(5).values = ['', 'STATEMENT SUMMARY', '', 'TOTAL ORDERS', 'TOTAL QUANTITY', 'TOTAL VALUE (INR)', 'PAID AMOUNT (INR)', 'PENDING DUE BALANCE (INR)'];
  sheet.mergeCells('B5:C5');
  sheet.getCell('B5').font = { name: 'Calibri', size: 10, bold: true };
  sheet.getCell('D5').font = { name: 'Calibri', size: 10, bold: true };
  sheet.getCell('E5').font = { name: 'Calibri', size: 10, bold: true };
  sheet.getCell('F5').font = { name: 'Calibri', size: 10, bold: true };
  sheet.getCell('G5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: '166534' } };
  sheet.getCell('H5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: '9A3412' } };

  sheet.getRow(6).values = ['', targetCompany, '', totalOrders, totalQty, totalAmount, totalPaid, totalPendingDue];
  sheet.mergeCells('B6:C6');
  sheet.getCell('B6').font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };
  sheet.getCell('D6').font = { name: 'Calibri', size: 12, bold: true };
  sheet.getCell('E6').font = { name: 'Calibri', size: 12, bold: true };
  sheet.getCell('F6').font = { name: 'Calibri', size: 12, bold: true };
  sheet.getCell('G6').font = { name: 'Calibri', size: 12, bold: true, color: { argb: '166534' } };
  sheet.getCell('H6').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'B91C1C' } };

  sheet.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGreenBg } };
  sheet.getCell('H6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorAmberBg } };

  for (let c = 2; c <= 8; c++) {
    sheet.getRow(5).getCell(c).border = solidBorder;
    sheet.getRow(6).getCell(c).border = solidBorder;
  }
  sheet.getRow(5).height = 20;
  sheet.getRow(6).height = 24;

  // Row 8: Table Header
  const tableHeaders = ['S.No', 'Order #', 'Order Date', 'Company Name', 'Customer / Contact', 'Item Description', 'Qty', 'Unit', 'Rate/Unit (₹)', 'Total Amount (₹)', 'Paid (₹)', 'Pending Due (₹)', 'Payment Status', 'Order Status', 'Notes'];
  const headerRow = sheet.getRow(8);
  headerRow.height = 24;
  tableHeaders.forEach((th, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = th;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorHeaderBg } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 6 || idx === 7 || idx === 12 || idx === 13 ? 'center' : (idx >= 8 && idx <= 11 ? 'right' : 'left') };
    cell.border = solidBorder;
  });

  // Rows 9 to N: Order Rows
  let curRowIdx = 9;
  exportList.forEach((ord, i) => {
    const row = sheet.getRow(curRowIdx);
    row.height = 20;

    const tot = parseFloat(ord.total_amount) || 0;
    const pd = parseFloat(ord.paid_amount !== undefined ? ord.paid_amount : (ord.payment_status === 'Paid' ? tot : 0)) || 0;
    const due = Math.max(0, tot - pd);

    row.getCell(1).value = i + 1;
    row.getCell(2).value = ord.order_number || `ORD-${ord.id}`;
    row.getCell(3).value = formatDisplayDate(ord.order_date || ord.created_at);
    row.getCell(4).value = (ord.company_name && ord.company_name.trim()) ? ord.company_name.trim() : (ord.customer_name || 'General Client');
    row.getCell(5).value = `${ord.customer_name || ''} ${ord.customer_phone ? '(' + ord.customer_phone + ')' : ''}`.trim();
    row.getCell(6).value = ord.item_name || '';
    row.getCell(7).value = parseFloat(ord.quantity) || 1;
    row.getCell(8).value = ord.unit || 'Units';
    row.getCell(9).value = parseFloat(ord.unit_price) || 0;
    row.getCell(10).value = tot;
    row.getCell(11).value = pd;
    row.getCell(12).value = due;
    row.getCell(13).value = ord.payment_status || (due === 0 ? 'Paid' : (pd > 0 ? 'Partial' : 'Pending'));
    row.getCell(14).value = ord.order_status || 'Confirmed';
    row.getCell(15).value = ord.notes || '';

    // Alignments & formats
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 15; c++) {
      row.getCell(c).border = solidBorder;
      row.getCell(c).font = { name: 'Calibri', size: 9.5 };
    }

    if (due > 0) {
      row.getCell(12).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'B91C1C' } };
    }

    curRowIdx++;
  });

  // Grand Totals Row
  const totalRow = sheet.getRow(curRowIdx);
  totalRow.height = 24;
  sheet.mergeCells(`A${curRowIdx}:F${curRowIdx}`);
  totalRow.getCell(1).value = 'GRAND TOTAL:';
  totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };

  totalRow.getCell(7).value = totalQty;
  totalRow.getCell(7).font = { name: 'Calibri', size: 11, bold: true };
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

  totalRow.getCell(10).value = totalAmount;
  totalRow.getCell(10).font = { name: 'Calibri', size: 11, bold: true };
  totalRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

  totalRow.getCell(11).value = totalPaid;
  totalRow.getCell(11).font = { name: 'Calibri', size: 11, bold: true, color: { argb: '166534' } };
  totalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

  totalRow.getCell(12).value = totalPendingDue;
  totalRow.getCell(12).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'B91C1C' } };
  totalRow.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };

  for (let c = 1; c <= 15; c++) {
    totalRow.getCell(c).border = solidBorder;
    totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
  }

  const cleanCompanyName = targetCompany.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `SASI_Steels_${cleanCompanyName}_Statement_${getLocalDateStr()}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  if (typeof saveAs !== 'undefined') {
    saveAs(blob, fileName);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  }
}

// -------------------------------------------------------------
// EXPORT COMPANY ORDERS STATEMENT TO PDF
// -------------------------------------------------------------
async function exportCompanyOrdersPDF(specificCompany = null) {
  const targetCompany = specificCompany || currentSelectedOrderCompany || document.getElementById('order-filter-company')?.value || 'ALL';
  const fromVal = document.getElementById('order-filter-from')?.value || '';
  const toVal = document.getElementById('order-filter-to')?.value || '';

  if (!allOrdersRecords || allOrdersRecords.length === 0) {
    allOrdersRecords = (await dbGetOrders()) || [];
  }

  const exportList = allOrdersRecords.filter(ord => {
    if (targetCompany !== 'ALL') {
      const ordComp = ((ord.company_name && ord.company_name.trim()) ? ord.company_name.trim() : (ord.customer_name || 'General Client')).toLowerCase();
      if (ordComp !== targetCompany.toLowerCase().trim()) return false;
    }
    const oDate = getRecordDateStr(ord.order_date || ord.created_at);
    if (fromVal && oDate < fromVal) return false;
    if (toVal && oDate > toVal) return false;
    return true;
  });

  if (exportList.length === 0) {
    alert(`No orders found for ${targetCompany === 'ALL' ? 'the selected date range' : targetCompany}.`);
    return;
  }

  const totalOrders = exportList.length;
  const totalQty = exportList.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
  const totalAmount = exportList.filter(o => o.order_status !== 'Cancelled').reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const totalPaid = exportList.filter(o => o.order_status !== 'Cancelled').reduce((sum, o) => {
    const t = parseFloat(o.total_amount) || 0;
    const p = parseFloat(o.paid_amount !== undefined ? o.paid_amount : (o.payment_status === 'Paid' ? t : 0)) || 0;
    return sum + p;
  }, 0);
  const totalPendingDue = Math.max(0, totalAmount - totalPaid);

  const printContainer = document.createElement('div');
  printContainer.id = 'company-statement-print-container';
  printContainer.style.fontFamily = "'Inter', Arial, sans-serif";
  printContainer.style.color = "#0f172a";
  printContainer.style.background = "#ffffff";
  printContainer.style.padding = "24px";

  const periodText = (fromVal || toVal) ? `Period: ${fromVal || 'Start'} to ${toVal || 'Today'}` : 'All Time Ledger';

  printContainer.innerHTML = `
    <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ea580c; letter-spacing: 0.5px;">SASI STEEL ENGINEERING & WELDING WORKS</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">128-56/4, Guntur Amaravathi Road, Gorantla, Guntur, A.P. | Ph: +91 98480 12345</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #0f172a;">GSTIN: 37AUCPA2925Q1ZG</p>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background: #ea580c; color: #ffffff; padding: 4px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">Company Account Statement</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <!-- Scope Info -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between;">
        <div>
          <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Company Name:</span>
          <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${targetCompany}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">${periodText}</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Statement Status:</span>
          <div style="font-size: 14px; font-weight: bold; color: ${totalPendingDue > 0 ? '#ea580c' : '#166534'};">${totalPendingDue > 0 ? 'Pending Balance Due' : 'All Clear / Fully Settled'}</div>
        </div>
      </div>

      <!-- 5 Metric Boxes -->
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
          <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Orders</div>
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${totalOrders}</div>
        </div>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
          <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Quantity</div>
          <div style="font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 2px;">${totalQty.toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
          <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Total Order Value</div>
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">₹${Math.round(totalAmount).toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #dcfce7; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #86efac;">
          <div style="font-size: 10px; color: #166534; font-weight: bold; text-transform: uppercase;">Paid Amount</div>
          <div style="font-size: 16px; font-weight: 800; color: #166534; margin-top: 2px;">₹${Math.round(totalPaid).toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #fef3c7; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #fcd34d;">
          <div style="font-size: 10px; color: #9a3412; font-weight: bold; text-transform: uppercase;">Pending Due</div>
          <div style="font-size: 16px; font-weight: 800; color: #b91c1c; margin-top: 2px;">₹${Math.round(totalPendingDue).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <!-- Orders Item Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; text-align: left;">
            <th style="padding: 6px 8px; border: 1px solid #0f172a;">S.No</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a;">Order #</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a;">Date</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a;">Material / Item</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; text-align: center;">Qty</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; text-align: right;">Total (₹)</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; text-align: right;">Paid (₹)</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; text-align: right;">Due (₹)</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${exportList.map((ord, idx) => {
            const tot = parseFloat(ord.total_amount) || 0;
            const pd = parseFloat(ord.paid_amount !== undefined ? ord.paid_amount : (ord.payment_status === 'Paid' ? tot : 0)) || 0;
            const due = Math.max(0, tot - pd);
            return `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${ord.order_number || ('ORD-' + ord.id)}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${formatDisplayDate(ord.order_date || ord.created_at)}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${ord.item_name}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${ord.quantity} ${ord.unit || 'Units'}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${Math.round(tot).toLocaleString('en-IN')}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; color: #166534; font-weight: bold;">₹${Math.round(pd).toLocaleString('en-IN')}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; color: ${due > 0 ? '#b91c1c' : '#475569'}; font-weight: bold;">₹${Math.round(due).toLocaleString('en-IN')}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: bold;">${ord.order_status || 'Confirmed'}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background: #e2e8f0; font-weight: bold;">
            <td colspan="4" style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">GRAND TOTAL:</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${totalQty}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">₹${Math.round(totalAmount).toLocaleString('en-IN')}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #166534;">₹${Math.round(totalPaid).toLocaleString('en-IN')}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${Math.round(totalPendingDue).toLocaleString('en-IN')}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;"></td>
          </tr>
        </tbody>
      </table>

      <!-- Footer & Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1;">
        <div style="font-size: 10px; color: #64748b;">
          This is a computer-generated company account ledger.<br>
          For queries: Call +91 98480 12345 or email info@sasisteels.com
        </div>
        <div style="text-align: center;">
          <div style="border-top: 1px dashed #475569; width: 180px; margin-bottom: 4px;"></div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a;">For SASI STEEL ENGINEERING</div>
          <div style="font-size: 9px; color: #64748b;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  `;

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `SASI_Steels_${targetCompany.replace(/[^a-zA-Z0-9]/g, '_')}_Statement_${getLocalDateStr()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printContainer).save();
  } else {
    // Print window fallback
    const printWin = window.open('', '_blank');
    printWin.document.write(`<html><head><title>Company Statement - ${targetCompany}</title></head><body>${printContainer.innerHTML}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  }
}

async function exportOrdersCSV() {
  if (!allOrdersRecords || allOrdersRecords.length === 0) {
    allOrdersRecords = (await dbGetOrders()) || [];
  }

  const headers = ['Order #', 'Order Date', 'Company Name', 'Customer Name', 'Customer Phone', 'Item / Product', 'Category', 'Quantity', 'Unit', 'Unit Price (INR)', 'Total Amount (INR)', 'Paid Amount (INR)', 'Pending Due (INR)', 'Payment Status', 'Order Status', 'Delivery Address', 'Notes'];
  const rows = allOrdersRecords.map(ord => {
    const tot = parseFloat(ord.total_amount) || 0;
    const pd = parseFloat(ord.paid_amount !== undefined ? ord.paid_amount : (ord.payment_status === 'Paid' ? tot : 0)) || 0;
    const due = Math.max(0, tot - pd);
    return [
      ord.order_number || `ORD-${ord.id}`,
      ord.order_date || '',
      ord.company_name || ord.customer_name || 'General Client',
      ord.customer_name || '',
      ord.customer_phone || '',
      ord.item_name || '',
      ord.category || '',
      ord.quantity || 1,
      ord.unit || 'Units',
      ord.unit_price || 0,
      tot,
      pd,
      due,
      ord.payment_status || (due === 0 ? 'Paid' : 'Pending'),
      ord.order_status || 'Confirmed',
      ord.delivery_address || '',
      ord.notes || ''
    ];
  });
  const dateStr = getLocalDateStr();
  downloadCSV(`SASI_Steels_Orders_Ledger_${dateStr}.csv`, headers, rows);
}

function onOrderItemSelect(itemId) {
  const stockBadge = document.getElementById('order-stock-available');
  const itemNameInput = document.querySelector('#crud-form-fields input[name="item_name"]');
  const categoryInput = document.querySelector('#crud-form-fields input[name="category"]');
  const unitSelect = document.querySelector('#crud-form-fields select[name="unit"]');
  const priceInput = document.querySelector('#crud-form-fields input[name="unit_price"]');
  const inventoryIdInput = document.querySelector('#crud-form-fields input[name="inventory_item_id"]');

  if (!itemId || itemId === 'custom') {
    if (inventoryIdInput) inventoryIdInput.value = '';
    if (stockBadge) stockBadge.classList.add('hidden');
    return;
  }

  const match = (allInventoryRecords || []).find(i => String(i.id) === String(itemId));
  if (match) {
    if (inventoryIdInput) inventoryIdInput.value = match.id;
    if (itemNameInput) itemNameInput.value = match.item_name;
    if (categoryInput) categoryInput.value = match.category;
    if (unitSelect) unitSelect.value = match.unit || 'Units';
    if (priceInput) priceInput.value = match.unit_price || 0;

    const qty = parseFloat(match.quantity) || 0;
    let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    let statusIcon = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
    if (qty <= 0) {
      badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';
      statusIcon = '<i class="fa-solid fa-triangle-exclamation text-red-400"></i>';
    } else if (qty <= (parseFloat(match.min_reorder_level) || 5)) {
      badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      statusIcon = '<i class="fa-solid fa-circle-exclamation text-amber-400"></i>';
    }

    if (stockBadge) {
      stockBadge.className = `p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${badgeColor}`;
      stockBadge.innerHTML = `
        <div class="flex items-center gap-2">
          ${statusIcon}
          <span>Current In-Stock: <strong class="font-bold text-white">${qty} ${match.unit || 'Units'}</strong> (${match.storage_location || 'Main Yard'})</span>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-900/60">${match.status || (qty > 0 ? 'In Stock' : 'Out of Stock')}</span>
      `;
      stockBadge.classList.remove('hidden');
    }
    calculateOrderTotal();
  }
}

function calculateOrderTotal() {
  const qtyInput = document.querySelector('#crud-form-fields input[name="quantity"]');
  const priceInput = document.querySelector('#crud-form-fields input[name="unit_price"]');
  const totalInput = document.querySelector('#crud-form-fields input[name="total_amount"]');
  const paidInput = document.querySelector('#crud-form-fields input[name="paid_amount"]');
  const paymentSelect = document.querySelector('#crud-form-fields select[name="payment_status"]');
  const balanceBadge = document.getElementById('order-balance-badge');
  const selectEl = document.getElementById('order-product-select');
  const warningEl = document.getElementById('order-stock-warning');

  if (qtyInput && priceInput && totalInput) {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    const total = Math.round(q * p);
    totalInput.value = total;

    // Paid & Balance check
    let paid = paidInput ? (parseFloat(paidInput.value) || 0) : 0;
    const balanceDue = Math.max(0, total - paid);

    if (balanceBadge) {
      if (balanceDue === 0 && total > 0) {
        balanceBadge.className = 'mt-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1';
        balanceBadge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> Fully Paid (₹${total.toLocaleString('en-IN')})`;
      } else {
        balanceBadge.className = 'mt-1.5 text-xs font-bold text-amber-400 flex items-center gap-1';
        balanceBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Pending Due Balance: ₹${balanceDue.toLocaleString('en-IN')}`;
      }
    }

    // Auto update payment_status select if not manually adjusted
    if (paymentSelect) {
      if (paid >= total && total > 0) {
        paymentSelect.value = 'Paid';
      } else if (paid > 0 && paid < total) {
        paymentSelect.value = 'Partial';
      } else {
        paymentSelect.value = 'Pending';
      }
    }

    // Stock sufficiency check
    if (selectEl && selectEl.value && selectEl.value !== 'custom') {
      const match = (allInventoryRecords || []).find(i => String(i.id) === String(selectEl.value));
      if (match) {
        const available = parseFloat(match.quantity) || 0;
        if (warningEl) {
          if (q > available) {
            warningEl.textContent = `⚠️ Ordered quantity (${q}) exceeds available stock (${available} ${match.unit}). Placing this order will reduce stock to 0 and mark item Out of Stock.`;
            warningEl.classList.remove('hidden');
          } else {
            warningEl.classList.add('hidden');
          }
        }
      }
    } else if (warningEl) {
      warningEl.classList.add('hidden');
    }
  }
}

async function openOrderModal(id = null) {
  activeModalType = 'order';
  editingItemId = id;

  if (!allInventoryRecords || allInventoryRecords.length === 0) {
    allInventoryRecords = (await dbGetInventory()) || [];
  }

  let existing = null;
  if (id) {
    existing = (allOrdersRecords || []).find(o => String(o.id) === String(id));
  }

  // Extract distinct company names for autocomplete datalist
  const existingCompanies = Array.from(new Set((allOrdersRecords || [])
    .map(o => (o.company_name && o.company_name.trim()) ? o.company_name.trim() : (o.customer_name ? o.customer_name.trim() : ''))
    .filter(Boolean))).sort();

  const companyDatalistOptions = existingCompanies.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Order #${existing.order_number || existing.id}` : 'Create Company Customer Order';
  document.getElementById('crud-modal-subtitle').textContent = 'Record company-wise orders with real-time stock sync and payment ledger calculations.';

  // Build options list for Product / Inventory dropdown
  const productOptions = (allInventoryRecords || []).map(item => {
    const isSelected = existing && (
      String(existing.inventory_item_id) === String(item.id) ||
      (existing.item_name && existing.item_name.toLowerCase().trim() === (item.item_name || '').toLowerCase().trim())
    );
    return `<option value="${item.id}" ${isSelected ? 'selected' : ''}>
      ${item.item_name} — (Stock: ${item.quantity} ${item.unit} | ₹${item.unit_price}/${item.unit})
    </option>`;
  }).join('');

  const selectedInventoryId = existing ? existing.inventory_item_id : (allInventoryRecords.length > 0 ? allInventoryRecords[0].id : '');
  const initialItem = (allInventoryRecords || []).find(i => String(i.id) === String(selectedInventoryId)) || (allInventoryRecords.length > 0 ? allInventoryRecords[0] : null);

  const initialItemName = existing ? existing.item_name : (initialItem ? initialItem.item_name : '');
  const initialCategory = existing ? existing.category : (initialItem ? initialItem.category : 'Structural Steel');
  const initialUnit = existing ? existing.unit : (initialItem ? initialItem.unit : 'Tons');
  const initialPrice = existing ? existing.unit_price : (initialItem ? initialItem.unit_price : 0);
  const initialQty = existing ? existing.quantity : 1;
  const initialTotal = existing ? existing.total_amount : (initialPrice * initialQty);
  const initialPaid = existing ? (existing.paid_amount !== undefined ? existing.paid_amount : (existing.payment_status === 'Paid' ? initialTotal : 0)) : 0;
  const initialCompany = existing ? (existing.company_name || existing.customer_name || '') : (currentSelectedOrderCompany !== 'ALL' ? currentSelectedOrderCompany : '');

  document.getElementById('crud-form-fields').innerHTML = `
    <!-- 1. COMPULSORY COMPANY NAME & CUSTOMER NAME -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-orange-950/20 border border-orange-500/30">
      <div>
        <label class="block text-orange-400 font-bold mb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <i class="fa-solid fa-building"></i> Company Name <span class="text-red-500">* Compulsory</span>
        </label>
        <input type="text" name="company_name" list="company-datalist" required value="${initialCompany}" placeholder="e.g. Navayuga Engineering / Balaji Builders" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border-2 border-orange-500/60 focus:border-orange-500 text-white font-bold focus:outline-none placeholder-slate-500" />
        <datalist id="company-datalist">
          ${companyDatalistOptions}
        </datalist>
        <span class="text-[10px] text-slate-400 mt-1 block">Orders will be grouped and calculated under this company ledger.</span>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">
          <i class="fa-solid fa-user text-orange-400 mr-1"></i> Contact Person / Customer Name <span class="text-orange-500">*</span>
        </label>
        <input type="text" name="customer_name" required value="${existing ? existing.customer_name : ''}" placeholder="e.g. M. Rama Krishna (Site Incharge)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- 2. Product Selection Dropdown -->
    <div>
      <label class="block text-slate-300 font-bold mb-1 text-xs">
        <i class="fa-solid fa-boxes-stacked text-cyan-400 mr-1"></i> Select Product / Inventory Material <span class="text-orange-500">*</span>
      </label>
      <select id="order-product-select" onchange="onOrderItemSelect(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold text-xs cursor-pointer">
        <option value="">-- Choose a Product from Inventory --</option>
        ${productOptions}
        <option value="custom" ${existing && !existing.inventory_item_id ? 'selected' : ''}>+ Custom / Non-Catalog Steel Item</option>
      </select>
      <input type="hidden" name="inventory_item_id" value="${selectedInventoryId || ''}" />
    </div>

    <!-- Live Available Stock Badge -->
    <div id="order-stock-available" class="hidden"></div>
    <div id="order-stock-warning" class="hidden p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold"></div>

    <!-- Item Name & Category -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Item Description / Name <span class="text-orange-500">*</span></label>
        <input type="text" name="item_name" required value="${initialItemName}" placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Category</label>
        <input type="text" name="category" value="${initialCategory}" placeholder="e.g. Structural Steel" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- Customer Contact & WhatsApp -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs"><i class="fa-solid fa-phone text-emerald-400 mr-1"></i> Customer Phone / WhatsApp <span class="text-slate-500 font-normal text-[10px]">(Optional)</span></label>
        <input type="text" name="customer_phone" value="${existing ? (existing.customer_phone || '') : ''}" placeholder="+91 98480 12345 (Optional)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs"><i class="fa-solid fa-envelope text-cyan-400 mr-1"></i> Customer Email</label>
        <input type="email" name="customer_email" value="${existing && existing.customer_email ? existing.customer_email : ''}" placeholder="client@company.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- Quantity & Unit & Unit Price -->
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Quantity <span class="text-orange-500">*</span></label>
        <input type="number" step="0.1" min="0.1" name="quantity" required oninput="calculateOrderTotal()" value="${initialQty}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold text-orange-400" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Unit</label>
        <select name="unit" class="w-full px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 text-xs font-semibold cursor-pointer">
          <option value="Tons" ${initialUnit === 'Tons' ? 'selected' : ''}>Tons</option>
          <option value="Sheets" ${initialUnit === 'Sheets' ? 'selected' : ''}>Sheets</option>
          <option value="Units" ${initialUnit === 'Units' ? 'selected' : ''}>Units</option>
          <option value="Meters" ${initialUnit === 'Meters' ? 'selected' : ''}>Meters</option>
          <option value="Kgs" ${initialUnit === 'Kgs' ? 'selected' : ''}>Kgs</option>
          <option value="Boxes" ${initialUnit === 'Boxes' ? 'selected' : ''}>Boxes</option>
          <option value="Nos" ${initialUnit === 'Nos' ? 'selected' : ''}>Nos</option>
          <option value="Sq.Ft" ${initialUnit === 'Sq.Ft' ? 'selected' : ''}>Sq.Ft</option>
          <option value="Bundles" ${initialUnit === 'Bundles' ? 'selected' : ''}>Bundles</option>
          <option value="Pcs" ${initialUnit === 'Pcs' ? 'selected' : ''}>Pcs</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Unit Price (₹)</label>
        <input type="number" step="0.5" name="unit_price" required oninput="calculateOrderTotal()" value="${initialPrice}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold" />
      </div>
    </div>

    <!-- 3. REAL-TIME PAYMENT & LEDGER CALCULATOR -->
    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-700">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-slate-300 font-bold mb-1 text-xs">Total Amount (₹)</label>
          <input type="number" name="total_amount" required oninput="calculateOrderTotal()" value="${initialTotal}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-400 font-black text-sm focus:outline-none" />
        </div>
        <div>
          <label class="block text-emerald-400 font-bold mb-1 text-xs">Paid Amount (₹)</label>
          <input type="number" step="1" name="paid_amount" oninput="calculateOrderTotal()" value="${initialPaid}" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/60 text-emerald-300 font-black text-sm focus:outline-none focus:border-emerald-400" />
        </div>
        <div>
          <label class="block text-slate-300 font-bold mb-1 text-xs">Payment Status</label>
          <select name="payment_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer">
            <option value="Paid" ${existing && existing.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Partial" ${existing && existing.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
            <option value="Pending" ${!existing || existing.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
          </select>
        </div>
      </div>
      <div id="order-balance-badge" class="mt-2 text-xs font-bold text-amber-400">
        <!-- Live JS calculation -->
      </div>
    </div>

    <!-- Order Status & Dates -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Order Status</label>
        <select name="order_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer">
          <option value="Confirmed" ${!existing || existing.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Processing" ${existing && existing.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Delivered" ${existing && existing.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Pending" ${existing && existing.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Cancelled" ${existing && existing.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-orange-400 mr-1"></i> Order Date <span class="text-orange-500">*</span></label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'order_date\\']').value = getLocalDateStr()" class="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="order_date" required value="${existing && existing.order_date ? existing.order_date : getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar-check text-emerald-400 mr-1"></i> Delivery Date</label>
        </div>
        <input type="date" name="expected_delivery" value="${existing && existing.expected_delivery ? existing.expected_delivery : ''}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
    </div>

    <!-- Delivery Address & Notes -->
    <div>
      <label class="block text-slate-300 font-bold mb-1 text-xs">Delivery Address & Site Location</label>
      <input type="text" name="delivery_address" value="${existing && existing.delivery_address ? existing.delivery_address : ''}" placeholder="Site location, crane access, gate entry notes..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1 text-xs">Internal Order & Company Notes</label>
      <input type="text" name="notes" value="${existing && existing.notes ? existing.notes : ''}" placeholder="Specific fabrication requirements, dispatch vehicle no..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
  `;

  document.getElementById('crud-modal').classList.remove('hidden');

  // Trigger initial item selection and payment balance calculation
  if (selectedInventoryId) {
    onOrderItemSelect(selectedInventoryId);
  } else {
    calculateOrderTotal();
  }
}

async function deleteOrderItem(id) {
  if (confirm("Are you sure you want to delete this order? Active stock will be restored automatically to Inventory.")) {
    await dbDeleteOrder(id);
    await loadOrders();
    await loadInventory();
    await loadProducts();
    loadInitialCounts();
  }
}

async function handleDeleteAllOrders() {
  if (confirm("⚠️ Are you sure you want to delete ALL customer orders? Active stocks will be restored to Inventory. This cannot be undone.")) {
    await dbDeleteAllOrders();
    allOrdersRecords = [];
    populateCompanyFilterOptions();
    filterOrdersData();
    await loadInventory();
    await loadProducts();
    loadInitialCounts();
  }
}

// ================= 3. EMPLOYEES & STAFF DIRECTORY =================
async function loadEmployees() {
  const tbody = document.getElementById('table-employees');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading staff directory...</td></tr>`;

  try {
    const employees = await dbGetEmployees();
    allEmployeesRecords = employees || [];
    filterEmployeesData();
  } catch (err) {
    console.error("Error in loadEmployees:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Failed to load staff list.</td></tr>`;
  }
}

const WORKSHOP_EMPLOYEE_ROLES = [
  'Manager',
  'Computer',
  'Powder coating mestri',
  'Powder coating helper',
  'Welding mestri',
  'Welding helper',
  'Polished mestri',
  'Polished helpers',
  'Helpers',
  'Pvd mestri',
  'Pvd helpers'
];

function getRoleBadgeClass(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('manager')) return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
  if (r.includes('computer')) return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
  if (r.includes('welding mestri')) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
  if (r.includes('welding helper')) return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  if (r.includes('powder coating mestri')) return 'bg-pink-500/20 text-pink-300 border border-pink-500/30';
  if (r.includes('powder coating helper')) return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
  if (r.includes('polished mestri')) return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
  if (r.includes('polished helper')) return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
  if (r.includes('pvd mestri')) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  if (r.includes('pvd helper')) return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
  if (r.includes('helper')) return 'bg-slate-700 text-slate-300 border border-slate-600';
  if (r.includes('mestri')) return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
  return 'bg-slate-800 text-cyan-300 border border-slate-700';
}

function handleRoleSelectChange(selectEl) {
  const container = document.getElementById('custom-role-container');
  const customInput = document.getElementById('employee-custom-role');
  if (!container) return;
  if (selectEl.value === '__CUSTOM__') {
    container.classList.remove('hidden');
    if (customInput) customInput.focus();
  } else {
    container.classList.add('hidden');
  }
}
window.handleRoleSelectChange = handleRoleSelectChange;

function filterEmployeesData() {
  const tbody = document.getElementById('table-employees');
  if (!tbody) return;

  const searchVal = (document.getElementById('employee-filter-search')?.value || '').toLowerCase().trim();
  const roleVal = document.getElementById('employee-filter-role')?.value || 'ALL';
  const statusVal = document.getElementById('employee-filter-status')?.value || 'ALL';

  const filtered = allEmployeesRecords.filter(emp => {
    if (roleVal !== 'ALL') {
      if (roleVal === '__CUSTOM__') {
        if (WORKSHOP_EMPLOYEE_ROLES.includes(emp.role)) return false;
      } else if (emp.role !== roleVal) {
        return false;
      }
    }
    if (statusVal !== 'ALL' && emp.status !== statusVal) return false;
    if (searchVal) {
      const matchName = (emp.name || '').toLowerCase().includes(searchVal);
      const matchPhone = (emp.phone || '').toLowerCase().includes(searchVal);
      const matchRole = (emp.role || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchPhone && !matchRole) return false;
    }
    return true;
  });

  // Calculate summary counts
  const activeCount = allEmployeesRecords.filter(e => e.status === 'Active').length;
  const mestrisCount = allEmployeesRecords.filter(e => /mestri|manager|welding|powder|pvd|polished/i.test(e.role || '')).length;

  const countBadge = document.getElementById('badge-employees-count');
  if (countBadge) countBadge.textContent = activeCount;

  const countEl = document.getElementById('employees-total-count');
  if (countEl) countEl.textContent = activeCount;

  const weldersEl = document.getElementById('employees-welders-count');
  if (weldersEl) weldersEl.textContent = mestrisCount;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-cyan-400">
            <i class="fa-solid fa-users-slash"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No employees found.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Click below to add your first worker or reset the search filters.</p>
          <button onclick="openEmployeeModal()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-user-plus mr-1"></i> Add Employee
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(emp => {
    const rawPhone = (emp.phone || '').replace(/[^0-9]/g, '');
    const phoneLink = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? '91' + rawPhone : '');
    
    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-white">${emp.name}</div>
          <div class="text-[11px] text-slate-400">${emp.notes || 'Workshop Staff'}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${getRoleBadgeClass(emp.role)}">${emp.role}</span>
        </td>
        <td class="py-3 px-4 text-slate-300 font-mono text-xs">
          ${emp.phone ? `<span>${emp.phone}</span>` : '<span class="text-slate-600">N/A</span>'}
        </td>
        <td class="py-3 px-4 font-bold text-emerald-400">₹${(parseFloat(emp.daily_wage) || 0).toLocaleString('en-IN')} / day</td>
        <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${emp.join_date || 'N/A'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
            emp.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
            emp.status === 'On Leave' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
          }">${emp.status || 'Active'}</span>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          ${phoneLink ? `
            <a href="https://api.whatsapp.com/send?phone=${phoneLink}&text=Hello%20${encodeURIComponent(emp.name)},%20this%20is%20SASI%20Steel%20Engineering." target="_blank" class="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[11px] font-bold inline-flex items-center gap-1">
              <i class="fa-brands fa-whatsapp"></i>
            </a>` : ''}
          <button onclick="openEmployeeModal('${emp.id}')" class="px-2 py-1 rounded-lg bg-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-white text-[11px]">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteEmployeeItem('${emp.id}')" class="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px]">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function resetEmployeesFilter() {
  const searchInput = document.getElementById('employee-filter-search');
  const roleSelect = document.getElementById('employee-filter-role');
  const statusSelect = document.getElementById('employee-filter-status');
  if (searchInput) searchInput.value = '';
  if (roleSelect) roleSelect.value = 'ALL';
  if (statusSelect) statusSelect.value = 'ALL';
  filterEmployeesData();
}

function exportEmployeesCSV() {
  const headers = ['Employee Name', 'Role', 'Contact Phone', 'Daily Wage (INR)', 'Join Date', 'Status', 'Notes'];
  const rows = allEmployeesRecords.map(emp => [
    emp.name || '',
    emp.role || '',
    emp.phone || '',
    emp.daily_wage || 0,
    emp.join_date || '',
    emp.status || 'Active',
    emp.notes || ''
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Staff_Directory_${dateStr}.csv`, headers, rows);
}

function openEmployeeModal(id = null) {
  activeModalType = 'employee';
  editingItemId = id;

  let existing = null;
  if (id) {
    existing = allEmployeesRecords.find(e => String(e.id) === String(id));
  }

  const currentRole = existing ? (existing.role || '') : 'Welding mestri';
  const isCustomRole = currentRole && !WORKSHOP_EMPLOYEE_ROLES.includes(currentRole);
  const selectedRoleOption = isCustomRole ? '__CUSTOM__' : (currentRole || 'Welding mestri');

  const roleOptionsHtml = WORKSHOP_EMPLOYEE_ROLES.map(role => `
    <option value="${role}" ${selectedRoleOption === role ? 'selected' : ''}>${role}</option>
  `).join('') + `
    <option value="__CUSTOM__" ${selectedRoleOption === '__CUSTOM__' ? 'selected' : ''}>+ Other / Manual Entry</option>
  `;

  document.getElementById('crud-modal-title').textContent = existing ? 'Edit Employee Details' : 'Add New Employee / Worker';
  document.getElementById('crud-modal-subtitle').textContent = 'Manage workshop employee role, phone number, and daily wage rate.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Full Name</label>
      <input type="text" name="name" required value="${existing ? existing.name : ''}" placeholder="e.g. Ramesh Kumar" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Role / Designation</label>
        <select name="role" id="employee-role-select" onchange="handleRoleSelectChange(this)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500">
          ${roleOptionsHtml}
        </select>
        <div id="custom-role-container" class="${selectedRoleOption === '__CUSTOM__' ? 'mt-2' : 'hidden mt-2'}">
          <input type="text" name="custom_role" id="employee-custom-role" value="${isCustomRole ? currentRole : ''}" placeholder="Type custom role (e.g. Lathe Mestri)" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500" />
        </div>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Daily Wage Rate (₹)</label>
        <input type="number" name="daily_wage" required value="${existing ? existing.daily_wage : '850'}" placeholder="e.g. 850" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Phone / WhatsApp</label>
        <input type="text" name="phone" value="${existing && existing.phone ? existing.phone : ''}" placeholder="+91 98480 12345" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Status</label>
        <select name="status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500">
          <option value="Active" ${!existing || existing.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="On Leave" ${existing && existing.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
          <option value="Inactive" ${existing && existing.status === 'Inactive' ? 'selected' : ''}>Inactive / Left</option>
        </select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-cyan-400 mr-1"></i> Joining Date</label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'join_date\\']').value = getLocalDateStr()" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="join_date" value="${existing && existing.join_date ? existing.join_date : getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Emergency Contact</label>
        <input type="text" name="emergency_contact" value="${existing && existing.emergency_contact ? existing.emergency_contact : ''}" placeholder="Contact / Relation" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
      </div>
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Notes / Skill Details</label>
      <input type="text" name="notes" value="${existing && existing.notes ? existing.notes : ''}" placeholder="e.g. Expert in SS TIG welding, heavy truss erection" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteEmployeeItem(id) {
  if (confirm("Delete this employee record from staff directory?")) {
    await dbDeleteEmployee(id);
    loadEmployees();
    loadInitialCounts();
  }
}

async function handleDeleteAllEmployees() {
  if (confirm("⚠️ Are you sure you want to delete ALL employee records from the staff directory? This cannot be undone.")) {
    await dbDeleteAllEmployees();
    allEmployeesRecords = [];
    filterEmployeesData();
    loadInitialCounts();
  }
}

// ================= 3. ATTENDANCE =================
async function loadAttendance() {
  const tbody = document.getElementById('table-attendance');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading attendance...</td></tr>`;

  try {
    const records = await dbGetAttendance();
    allAttendanceRecords = records || [];
    filterAttendanceData();
  } catch (err) {
    console.error("Error in loadAttendance:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No attendance records found. Click 'Mark Attendance' above.</td></tr>`;
  }
}

function filterAttendanceData() {
  const tbody = document.getElementById('table-attendance');
  if (!tbody) return;

  const fromVal = document.getElementById('attendance-filter-from')?.value || '';
  const toVal = document.getElementById('attendance-filter-to')?.value || '';
  const statusVal = document.getElementById('attendance-filter-status')?.value || 'ALL';

  const filtered = allAttendanceRecords.filter(r => {
    if (statusVal !== 'ALL' && r.status !== statusVal) return false;

    // Accurate date comparison using normalized YYYY-MM-DD
    const rDate = getRecordDateStr(r.attendance_date || r.date || r.created_at);
    if (fromVal && rDate < fromVal) return false;
    if (toVal && rDate > toVal) return false;

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-blue-400">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No attendance records found for this date range.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Click Reset to view all dates.</p>
          <button onclick="resetAttendanceFilter()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-rotate-right mr-1"></i> Reset Date Filter
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr class="hover:bg-slate-800/50 transition-colors">
      <td class="py-3 px-4 text-slate-300 font-mono text-[11px] font-semibold">
        <div class="flex items-center gap-1"><i class="fa-regular fa-calendar text-blue-400"></i> ${formatDisplayDate(r.attendance_date || r.date || r.created_at)}</div>
      </td>
      <td class="py-3 px-4 font-bold text-white">${r.employee_name}</td>
      <td class="py-3 px-4 text-slate-300">${r.role}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          r.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' :
          r.status === 'Absent' ? 'bg-red-500/20 text-red-400' :
          r.status === 'Overtime' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
        }">${r.status}</span>
      </td>
      <td class="py-3 px-4 text-slate-300">${r.hours_worked || 8} hrs</td>
      <td class="py-3 px-4 text-amber-400 font-bold">${r.overtime_hours || 0} hrs</td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="deleteAttendanceItem('${r.id}')" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function setAttendanceDatePreset(preset) {
  setDateFilterPreset('attendance', preset);
}

function resetAttendanceFilter() {
  const statusSelect = document.getElementById('attendance-filter-status');
  if (statusSelect) statusSelect.value = 'ALL';

  setDateFilterPreset('attendance', 'all');
}

async function exportAttendanceCSV() {
  if (!allAttendanceRecords || allAttendanceRecords.length === 0) {
    allAttendanceRecords = await dbGetAttendance() || [];
  }

  const fromVal = document.getElementById('attendance-filter-from')?.value || '';
  const toVal = document.getElementById('attendance-filter-to')?.value || '';
  const statusVal = document.getElementById('attendance-filter-status')?.value || 'ALL';

  let exportList = allAttendanceRecords.filter(r => {
    if (statusVal !== 'ALL' && r.status !== statusVal) return false;
    if (fromVal && r.attendance_date < fromVal) return false;
    if (toVal && r.attendance_date > toVal) return false;
    return true;
  });

  if (exportList.length === 0) exportList = allAttendanceRecords;

  const headers = ['Date', 'Employee Name', 'Role', 'Status', 'Hours Worked', 'Overtime Hours'];
  const rows = exportList.map(r => [
    r.attendance_date || '',
    r.employee_name || '',
    r.role || '',
    r.status || '',
    r.hours_worked || 8,
    r.overtime_hours || 0
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Attendance_${dateStr}.csv`, headers, rows);
}

function onAttendanceEmpSelect(empName) {
  const nameInput = document.querySelector('#crud-form-fields input[name="employee_name"]');
  const roleSelect = document.querySelector('#crud-form-fields select[name="role"]');
  const customRoleContainer = document.getElementById('custom-role-container');
  const customRoleInput = document.getElementById('employee-custom-role');

  if (!empName) {
    if (nameInput) nameInput.value = '';
    return;
  }

  if (empName === '__CUSTOM_WORKER__') {
    if (nameInput) {
      nameInput.value = '';
      nameInput.placeholder = 'Type custom worker / helper name...';
      nameInput.focus();
    }
    if (roleSelect) {
      roleSelect.value = '__CUSTOM__';
      handleRoleSelectChange(roleSelect);
      if (customRoleInput) {
        customRoleInput.value = '';
        customRoleInput.placeholder = 'e.g. Daily Helper / Fabricator / Welder';
      }
    }
    return;
  }

  if (nameInput) nameInput.value = empName;

  const match = (allEmployeesRecords || []).find(e => e.name === empName);
  if (match) {
    if (roleSelect) {
      if (WORKSHOP_EMPLOYEE_ROLES.includes(match.role)) {
        roleSelect.value = match.role;
        handleRoleSelectChange(roleSelect);
      } else {
        roleSelect.value = '__CUSTOM__';
        handleRoleSelectChange(roleSelect);
        if (customRoleInput) customRoleInput.value = match.role;
      }
    }
  }
}

async function openAttendanceModal() {
  activeModalType = 'attendance';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Mark Worker Attendance';
  document.getElementById('crud-modal-subtitle').textContent = 'Record daily presence & overtime hours for workshop crew.';

  if (!allEmployeesRecords || allEmployeesRecords.length === 0) {
    allEmployeesRecords = (await dbGetEmployees()) || [];
  }

  const empOptions = (allEmployeesRecords || [])
    .filter(e => e.status === 'Active')
    .map(e => `<option value="${e.name}">${e.name} (${e.role})</option>`)
    .join('');

  const roleOptionsHtml = WORKSHOP_EMPLOYEE_ROLES.map(role => `
    <option value="${role}">${role}</option>
  `).join('') + `
    <option value="__CUSTOM__">+ Other / Custom Role</option>
  `;

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Quick Select Registered Staff</label>
      <select onchange="onAttendanceEmpSelect(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500 mb-2 cursor-pointer">
        <option value="">-- Choose from Registered Staff --</option>
        ${empOptions}
        <option value="__CUSTOM_WORKER__" class="text-orange-400 font-bold">+ Other / Custom Worker (Unregistered)</option>
      </select>
      <label class="block text-slate-300 font-bold mb-1">Employee / Worker Name <span class="text-orange-500">*</span></label>
      <input type="text" name="employee_name" required placeholder="e.g. Ramesh Kumar (or custom worker name)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Role / Designation</label>
        <select name="role" id="employee-role-select" onchange="handleRoleSelectChange(this)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 cursor-pointer">
          ${roleOptionsHtml}
        </select>
        <div id="custom-role-container" class="hidden mt-2">
          <input type="text" name="custom_role" id="employee-custom-role" placeholder="Type custom role (e.g. Daily Helper)..." class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-orange-500 text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 placeholder:text-slate-500" />
        </div>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Status</label>
        <select name="status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Present">Present</option>
          <option value="Overtime">Overtime</option>
          <option value="Half Day">Half Day</option>
          <option value="Absent">Absent</option>
        </select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-blue-400 mr-1"></i> Attendance Date <span class="text-orange-500">*</span></label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'attendance_date\\']').value = getLocalDateStr()" class="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="attendance_date" required value="${getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Overtime (Hours)</label>
        <input type="number" step="0.5" name="overtime_hours" value="0" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteAttendanceItem(id) {
  if (confirm("Delete this attendance record?")) {
    await dbDeleteAttendance(id);
    loadAttendance();
  }
}

async function handleDeleteAllAttendance() {
  if (confirm("⚠️ Are you sure you want to delete ALL attendance records? This cannot be undone.")) {
    await dbDeleteAllAttendance();
    allAttendanceRecords = [];
    filterAttendanceData();
  }
}

// ================= 3. INVENTORY =================
async function loadInventory() {
  const tbody = document.getElementById('table-inventory');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading inventory...</td></tr>`;

  try {
    const items = await dbGetInventory();
    allInventoryRecords = items || [];
    filterInventoryData();
  } catch (err) {
    console.error("Error in loadInventory:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No stock items found. Click 'Add Stock Item' above.</td></tr>`;
  }
}

function filterInventoryData() {
  const tbody = document.getElementById('table-inventory');
  if (!tbody) return;

  const searchVal = (document.getElementById('inventory-filter-search')?.value || '').toLowerCase().trim();
  const catVal = document.getElementById('inventory-filter-category')?.value || 'ALL';

  const filtered = allInventoryRecords.filter(item => {
    if (catVal !== 'ALL' && item.category !== catVal) return false;
    if (searchVal) {
      const matchName = (item.item_name || '').toLowerCase().includes(searchVal);
      const matchLoc = (item.storage_location || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchLoc) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-amber-400">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No inventory items match the filter.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Click Reset to view all stock items.</p>
          <button onclick="resetInventoryFilter()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-rotate-right mr-1"></i> Reset Filters
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="hover:bg-slate-800/50 transition-colors">
      <td class="py-3 px-4 font-bold text-white">${item.item_name}</td>
      <td class="py-3 px-4 text-slate-300">${item.category}</td>
      <td class="py-3 px-4 font-bold text-orange-400 font-mono">${item.quantity} ${item.unit}</td>
      <td class="py-3 px-4 text-emerald-400 font-bold">₹${(parseFloat(item.unit_price) || 0).toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-slate-400">${item.storage_location || 'Main Yard'}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          item.quantity <= 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          item.quantity <= (item.min_reorder_level || 5) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }">${item.status || (item.quantity <= 0 ? 'Out of Stock' : (item.quantity <= (item.min_reorder_level || 5) ? 'Low Stock' : 'In Stock'))}</span>
      </td>
      <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
        <button onclick="openInventoryModal('${item.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-white text-xs font-bold transition-all" title="Edit Stock / Price / Location">
          <i class="fa-solid fa-pen-to-square mr-1"></i> Edit Stock
        </button>
        <button onclick="deleteInventoryItem('${item.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition-all" title="Delete Item">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function setInventoryCategoryFilter(cat) {
  const catSelect = document.getElementById('inventory-filter-category');
  if (catSelect) {
    catSelect.value = cat;
  }
  
  const pills = {
    'ALL': 'inv-pill-all',
    'Custom Fabrication': 'inv-pill-custom',
    'Storage Systems': 'inv-pill-storage',
    'Structural Steel': 'inv-pill-structural',
    'Stainless Steel': 'inv-pill-ss'
  };

  Object.entries(pills).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      if (key === cat) {
        el.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all bg-orange-600 text-white shadow';
      } else {
        el.className = key === 'Custom Fabrication' 
          ? 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
          : 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300';
      }
    }
  });

  filterInventoryData();
}

function resetInventoryFilter() {
  const searchInput = document.getElementById('inventory-filter-search');
  const catSelect = document.getElementById('inventory-filter-category');
  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = 'ALL';
  setInventoryCategoryFilter('ALL');
}

async function exportInventoryCSV() {
  if (!allInventoryRecords || allInventoryRecords.length === 0) {
    allInventoryRecords = await dbGetInventory() || [];
  }

  const searchVal = (document.getElementById('inventory-filter-search')?.value || '').toLowerCase().trim();
  const catVal = document.getElementById('inventory-filter-category')?.value || 'ALL';

  let exportList = allInventoryRecords.filter(item => {
    if (catVal !== 'ALL' && item.category !== catVal) return false;
    if (searchVal) {
      const matchName = (item.item_name || '').toLowerCase().includes(searchVal);
      const matchLoc = (item.storage_location || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchLoc) return false;
    }
    return true;
  });

  if (exportList.length === 0) exportList = allInventoryRecords;

  const headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Unit Price (INR)', 'Location', 'Status'];
  const rows = exportList.map(item => [
    item.item_name || '',
    item.category || '',
    item.quantity || 0,
    item.unit || '',
    item.unit_price || 0,
    item.storage_location || 'Main Yard',
    item.quantity <= (item.min_reorder_level || 5) ? 'Low Stock' : 'In Stock'
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Inventory_${dateStr}.csv`, headers, rows);
}

function toggleInventoryCustomCategory(val) {
  const wrap = document.getElementById('inventory-custom-category-wrap');
  if (wrap) {
    if (val === 'CUSTOM') {
      wrap.classList.remove('hidden');
      const input = wrap.querySelector('input');
      if (input) input.focus();
    } else {
      wrap.classList.add('hidden');
    }
  }
}

function toggleInventoryCustomUnit(val) {
  const wrap = document.getElementById('inventory-custom-unit-wrap');
  if (wrap) {
    if (val === 'CUSTOM_UNIT') {
      wrap.classList.remove('hidden');
      const input = wrap.querySelector('input');
      if (input) input.focus();
    } else {
      wrap.classList.add('hidden');
    }
  }
}

function openInventoryModal(id = null) {
  activeModalType = 'inventory';
  editingItemId = id;

  let existing = null;
  if (id) {
    existing = allInventoryRecords.find(i => String(i.id) === String(id));
  }

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Stock: ${existing.item_name}` : 'Add New Inventory Stock Item';
  document.getElementById('crud-modal-subtitle').textContent = 'Enter quantity, rate per unit, storage yard location and minimum reorder alert level.';

  const standardCats = ['Structural Steel', 'Stainless Steel', 'Pipes & Tubes', 'Plates & Sheets', 'Storage Systems', 'Custom Fabrication', 'Consumables', 'Hardware'];
  const cat = existing ? existing.category : 'Structural Steel';
  const isCustomCat = existing && !standardCats.includes(cat);

  const standardUnits = ['Tons', 'Sheets', 'Units', 'Meters', 'Kgs', 'Boxes', 'Nos', 'Sq.Ft', 'Bundles', 'Pcs'];
  const unit = existing ? existing.unit : 'Tons';
  const isCustomUnit = existing && !standardUnits.includes(unit);

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Item / Material Name <span class="text-orange-500">*</span></label>
      <input type="text" name="item_name" required value="${existing ? existing.item_name : ''}" placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold" />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <select name="category" onchange="toggleInventoryCustomCategory(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
          <option value="Custom Fabrication" ${cat === 'Custom Fabrication' ? 'selected' : ''}>✨ Custom Fabrication</option>
          <option value="Storage Systems" ${cat === 'Storage Systems' ? 'selected' : ''}>Storage Systems & Racks</option>
          <option value="Structural Steel" ${cat === 'Structural Steel' ? 'selected' : ''}>Structural Steel</option>
          <option value="Stainless Steel" ${cat === 'Stainless Steel' ? 'selected' : ''}>Stainless Steel</option>
          <option value="Pipes & Tubes" ${cat === 'Pipes & Tubes' ? 'selected' : ''}>Pipes & Tubes</option>
          <option value="Plates & Sheets" ${cat === 'Plates & Sheets' ? 'selected' : ''}>Plates & Sheets</option>
          <option value="Consumables" ${cat === 'Consumables' ? 'selected' : ''}>Consumables & Rods</option>
          <option value="Hardware" ${cat === 'Hardware' ? 'selected' : ''}>Hardware & Fasteners</option>
          <option value="CUSTOM" ${isCustomCat ? 'selected' : ''}>+ Other Custom Category...</option>
        </select>
        <div id="inventory-custom-category-wrap" class="${isCustomCat ? '' : 'hidden'} mt-2">
          <input type="text" name="custom_category" value="${isCustomCat ? cat : ''}" placeholder="Type custom category name..." class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/70 text-amber-300 text-xs font-semibold focus:outline-none focus:border-amber-400" />
        </div>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Current Stock Quantity & Unit <span class="text-orange-500">*</span></label>
        <div class="flex gap-2">
          <input type="number" step="0.1" name="quantity" required value="${existing ? existing.quantity : ''}" placeholder="Available Qty" class="w-1/2 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-orange-400 font-bold focus:outline-none focus:border-orange-500" />
          <select name="unit" onchange="toggleInventoryCustomUnit(this.value)" class="w-1/2 px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold text-xs">
            <option value="Tons" ${unit === 'Tons' ? 'selected' : ''}>Tons</option>
            <option value="Sheets" ${unit === 'Sheets' ? 'selected' : ''}>Sheets</option>
            <option value="Units" ${unit === 'Units' ? 'selected' : ''}>Units</option>
            <option value="Meters" ${unit === 'Meters' ? 'selected' : ''}>Meters</option>
            <option value="Kgs" ${unit === 'Kgs' ? 'selected' : ''}>Kgs</option>
            <option value="Boxes" ${unit === 'Boxes' ? 'selected' : ''}>Boxes</option>
            <option value="Nos" ${unit === 'Nos' ? 'selected' : ''}>Nos</option>
            <option value="Sq.Ft" ${unit === 'Sq.Ft' ? 'selected' : ''}>Sq.Ft</option>
            <option value="Bundles" ${unit === 'Bundles' ? 'selected' : ''}>Bundles</option>
            <option value="CUSTOM_UNIT" ${isCustomUnit ? 'selected' : ''}>+ Custom Unit...</option>
          </select>
        </div>
        <div id="inventory-custom-unit-wrap" class="${isCustomUnit ? '' : 'hidden'} mt-2">
          <input type="text" name="custom_unit" value="${isCustomUnit ? unit : ''}" placeholder="Type custom unit (e.g. Rolls, Packs, Ft)..." class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-orange-500/70 text-orange-400 text-xs font-semibold focus:outline-none focus:border-orange-400" />
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit Rate (₹)</label>
        <input type="number" step="0.5" name="unit_price" value="${existing ? existing.unit_price : ''}" placeholder="Rate / unit" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Yard / Warehouse Location</label>
        <input type="text" name="storage_location" value="${existing && existing.storage_location ? existing.storage_location : 'Main Yard - Bay 1'}" placeholder="e.g. Yard A - Bay 3" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Min Reorder Alert Level</label>
        <input type="number" step="1" name="min_reorder_level" value="${existing && existing.min_reorder_level ? existing.min_reorder_level : 5}" placeholder="Alert at Qty" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteInventoryItem(id) {
  if (confirm("Delete this inventory stock record?")) {
    await dbDeleteInventory(id);
    loadInventory();
  }
}

// ================= 4. FINANCE (INCOME & EXPENSES) =================
async function loadFinance() {
  const tbody = document.getElementById('table-finance');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading finance book...</td></tr>`;

  try {
    const entries = await dbGetFinance();
    allFinanceRecords = entries || [];
    filterFinanceData();
  } catch (err) {
    console.error("Error in loadFinance:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No transactions found.</td></tr>`;
  }
}

function filterFinanceData() {
  const tbody = document.getElementById('table-finance');
  if (!tbody) return;

  const fromVal = document.getElementById('finance-filter-from')?.value || '';
  const toVal = document.getElementById('finance-filter-to')?.value || '';
  const typeVal = document.getElementById('finance-filter-type')?.value || 'ALL';

  const filtered = allFinanceRecords.filter(e => {
    if (typeVal !== 'ALL' && e.entry_type !== typeVal) return false;

    // Accurate date comparison using normalized YYYY-MM-DD
    const eDate = getRecordDateStr(e.transaction_date || e.date || e.created_at);
    if (fromVal && eDate < fromVal) return false;
    if (toVal && eDate > toVal) return false;

    return true;
  });

  // Calculate totals from filtered records
  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach(e => {
    const amt = parseFloat(e.amount) || 0;
    if (e.entry_type === 'Income') totalIncome += amt;
    else totalExpense += amt;
  });

  const incomeEl = document.getElementById('finance-total-income');
  const expenseEl = document.getElementById('finance-total-expense');
  const balanceEl = document.getElementById('finance-net-balance');

  if (incomeEl) incomeEl.textContent = `₹${totalIncome.toLocaleString('en-IN')}`;
  if (expenseEl) expenseEl.textContent = `₹${totalExpense.toLocaleString('en-IN')}`;
  if (balanceEl) balanceEl.textContent = `₹${(totalIncome - totalExpense).toLocaleString('en-IN')}`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-emerald-400">
            <i class="fa-solid fa-wallet"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No income or expense records found for this date range.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Click Reset to view all records, or record a new transaction.</p>
          <button onclick="resetFinanceFilter()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-rotate-right mr-1"></i> Reset Date Filter
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => `
    <tr class="hover:bg-slate-800/50 transition-colors">
      <td class="py-3 px-4 font-mono text-[11px] text-slate-300 font-semibold">
        <div class="flex items-center gap-1"><i class="fa-regular fa-calendar text-emerald-400"></i> ${formatDisplayDate(e.transaction_date || e.date || e.created_at)}</div>
      </td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          e.entry_type === 'Income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }">${e.entry_type}</span>
      </td>
      <td class="py-3 px-4 text-slate-200 font-bold">${e.category}</td>
      <td class="py-3 px-4 font-bold ${e.entry_type === 'Income' ? 'text-emerald-400' : 'text-red-400'}">₹${parseFloat(e.amount).toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-slate-400">${e.payment_mode || 'Bank'}</td>
      <td class="py-3 px-4">
        ${e.receipt_url ? `<a href="${e.receipt_url}" target="_blank" class="text-blue-400 hover:underline"><i class="fa-solid fa-receipt"></i> Receipt</a>` : '<span class="text-slate-600">-</span>'}
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteFinanceItem('${e.id}')" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function setFinanceDatePreset(preset) {
  setDateFilterPreset('finance', preset);
}

function resetFinanceFilter() {
  const typeSelect = document.getElementById('finance-filter-type');
  if (typeSelect) typeSelect.value = 'ALL';

  setDateFilterPreset('finance', 'all');
}

async function exportFinanceCSV() {
  if (!allFinanceRecords || allFinanceRecords.length === 0) {
    allFinanceRecords = await dbGetFinance() || [];
  }

  const fromVal = document.getElementById('finance-filter-from')?.value || '';
  const toVal = document.getElementById('finance-filter-to')?.value || '';
  const typeVal = document.getElementById('finance-filter-type')?.value || 'ALL';

  let exportList = allFinanceRecords.filter(e => {
    if (typeVal !== 'ALL' && e.entry_type !== typeVal) return false;
    if (fromVal && e.transaction_date < fromVal) return false;
    if (toVal && e.transaction_date > toVal) return false;
    return true;
  });

  if (exportList.length === 0) exportList = allFinanceRecords;

  const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Payment Mode', 'Notes', 'Receipt URL'];
  const rows = exportList.map(e => [
    e.transaction_date || '',
    e.entry_type || '',
    e.category || '',
    e.amount || 0,
    e.payment_mode || 'Bank',
    e.description || '',
    e.receipt_url || ''
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Finance_Report_${dateStr}.csv`, headers, rows);
}

function openFinanceModal() {
  activeModalType = 'finance';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Add Income or Expense';
  document.getElementById('crud-modal-subtitle').textContent = 'Record client payments, raw material bills, or wage payouts.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Transaction Type</label>
        <select name="entry_type" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Income">Income (Client Payment)</option>
          <option value="Expense">Expense (Cost / Purchase)</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Amount (₹)</label>
        <input type="number" name="amount" required placeholder="e.g. 50000" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-emerald-400 mr-1"></i> Transaction Date <span class="text-orange-500">*</span></label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'transaction_date\\']').value = getLocalDateStr()" class="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="transaction_date" required value="${getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Category</label>
        <input type="text" name="category" required placeholder="e.g. Steel Purchase, Client Advance" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1 text-xs">Payment Mode</label>
        <select name="payment_mode" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Upload Receipt (Cloudinary)</label>
      <input type="file" id="finance-receipt-file" accept="image/*,application/pdf" class="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-500" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Description / Notes</label>
      <textarea name="description" rows="2" placeholder="Project name, invoice number, party details..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500"></textarea>
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteFinanceItem(id) {
  if (confirm("Delete this financial record?")) {
    await dbDeleteFinance(id);
    loadFinance();
  }
}

async function handleDeleteAllFinance() {
  if (confirm("⚠️ Are you sure you want to delete ALL income & expense financial records? This cannot be undone.")) {
    await dbDeleteAllFinance();
    allFinanceRecords = [];
    filterFinanceData();
  }
}


// ================= 5. PRODUCTS CATALOG MANAGEMENT =================
async function loadProducts() {
  const tbody = document.getElementById('table-products');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading catalog products...</td></tr>`;

  try {
    const prods = await dbGetProducts();
    allProductsRecords = prods || [];
    filterProductsData();
  } catch (err) {
    console.error("Error in loadProducts:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Failed to load products.</td></tr>`;
  }
}

function updateProductsMetrics() {
  const totalCount = allProductsRecords.length;
  const categoriesCount = new Set(allProductsRecords.map(p => p.category).filter(Boolean)).size;
  const featuredCount = allProductsRecords.filter(p => p.is_featured).length;
  const inStockCount = allProductsRecords.filter(p => {
    const b = (p.badge || '').toLowerCase();
    return b.includes('in stock') || b.includes('demand') || b.includes('seller') || b.includes('bulk');
  }).length;

  const badgeEl = document.getElementById('badge-products-count');
  if (badgeEl) badgeEl.textContent = totalCount;

  const totalEl = document.getElementById('products-total-count');
  if (totalEl) totalEl.textContent = totalCount;

  const catEl = document.getElementById('products-categories-count');
  if (catEl) catEl.textContent = categoriesCount;

  const featEl = document.getElementById('products-featured-count');
  if (featEl) featEl.textContent = featuredCount;

  const instockEl = document.getElementById('products-instock-count');
  if (instockEl) instockEl.textContent = inStockCount;
}

function renderProductsList(list) {
  const tbody = document.getElementById('table-products');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-purple-400">
            <i class="fa-solid fa-boxes-packing"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No products match your filter.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Add a new steel product or reset your search filters.</p>
          <button onclick="openProductModal()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-plus mr-1"></i> Add New Product
          </button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const badgeColor = 
      (p.badge || '').toLowerCase().includes('in stock') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
      (p.badge || '').toLowerCase().includes('demand') ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
      (p.badge || '').toLowerCase().includes('seller') ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
      (p.badge || '').toLowerCase().includes('out') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4">
          <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
            <img src="${p.image_url || 'steel-fabrication.jpg'}" alt="${p.name}" onerror="this.onerror=null;this.src='steel-fabrication.jpg'" class="w-full h-full object-cover" />
          </div>
        </td>
        <td class="py-3 px-4 max-w-xs">
          <div class="font-bold text-white text-xs">${p.name}</div>
          <div class="text-[11px] text-slate-400 truncate mt-0.5"><i class="fa-solid fa-screwdriver-wrench text-orange-400 mr-1"></i>${p.specs || 'Standard Spec'}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold">${p.category}</span>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-emerald-400 font-mono text-xs">${p.price_formatted}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">
            ${p.badge || 'Available'}
          </span>
        </td>
        <td class="py-3 px-4">
          ${p.is_featured ? 
            '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400"><i class="fa-solid fa-star text-xs"></i> Yes</span>' : 
            '<span class="text-slate-500 text-[11px]">No</span>'}
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <a href="products.html" target="_blank" class="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]" title="View on Live Site">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <button onclick="openProductModal('${p.id}')" class="px-2 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-white text-[11px]" title="Edit Product">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteProductItem('${p.id}')" class="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px]" title="Delete Product">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProductsData() {
  updateProductsMetrics();

  const searchVal = (document.getElementById('product-filter-search')?.value || '').toLowerCase().trim();
  const categoryVal = document.getElementById('product-filter-category')?.value || 'ALL';
  const badgeVal = document.getElementById('product-filter-badge')?.value || 'ALL';

  const filtered = allProductsRecords.filter(prod => {
    if (categoryVal !== 'ALL' && prod.category !== categoryVal) return false;
    if (badgeVal !== 'ALL' && prod.badge !== badgeVal) return false;
    if (searchVal) {
      const matchName = (prod.name || '').toLowerCase().includes(searchVal);
      const matchSpecs = (prod.specs || '').toLowerCase().includes(searchVal);
      const matchDesc = (prod.description || '').toLowerCase().includes(searchVal);
      const matchCat = (prod.category || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchSpecs && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  renderProductsList(filtered);
}

function resetProductsFilter() {
  const searchInput = document.getElementById('product-filter-search');
  const catSelect = document.getElementById('product-filter-category');
  const badgeSelect = document.getElementById('product-filter-badge');
  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = 'ALL';
  if (badgeSelect) badgeSelect.value = 'ALL';
  filterProductsData();
}

async function exportProductsCSV() {
  if (!allProductsRecords || allProductsRecords.length === 0) {
    allProductsRecords = await dbGetProducts() || [];
  }

  const headers = ['Product ID', 'Name', 'Category', 'Price Formatted', 'Stock Badge', 'Specifications', 'Description', 'Image URL', 'Featured On Website'];
  const rows = allProductsRecords.map(p => [
    p.id || '',
    p.name || '',
    p.category || '',
    p.price_formatted || '',
    p.badge || '',
    p.specs || '',
    p.description || '',
    p.image_url || '',
    p.is_featured ? 'Yes' : 'No'
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Products_Catalog_${dateStr}.csv`, headers, rows);
}

function openProductModal(id = null) {
  activeModalType = 'product';
  editingItemId = id;

  let existing = null;
  if (id) {
    existing = allProductsRecords.find(p => String(p.id) === String(id));
  }

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Product: ${existing.name}` : 'Add New Website Product';
  document.getElementById('crud-modal-subtitle').textContent = 'Products added or modified here will immediately reflect on the live website catalog.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Product Name</label>
      <input type="text" name="name" required value="${existing ? existing.name : ''}" placeholder="e.g. Heavy-Duty Warehouse Pallet Racks" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Product Category</label>
        <select name="category" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Storage & Racks" ${existing && existing.category === 'Storage & Racks' ? 'selected' : ''}>Storage & Racks</option>
          <option value="Roofing Sheets & Sheds" ${existing && existing.category === 'Roofing Sheets & Sheds' ? 'selected' : ''}>Roofing Sheets & Sheds</option>
          <option value="Structural Steel" ${existing && existing.category === 'Structural Steel' ? 'selected' : ''}>Structural Steel</option>
          <option value="Gates, Grills & Railings" ${existing && existing.category === 'Gates, Grills & Railings' ? 'selected' : ''}>Gates, Grills & Railings</option>
          <option value="Industrial Mezzanines" ${existing && existing.category === 'Industrial Mezzanines' ? 'selected' : ''}>Industrial Mezzanines</option>
          <option value="Fabrication Consumables" ${existing && existing.category === 'Fabrication Consumables' ? 'selected' : ''}>Fabrication Consumables</option>
          <option value="Custom Fabrication" ${existing && existing.category === 'Custom Fabrication' ? 'selected' : ''}>Custom Fabrication</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Catalog Pricing / Rate Display</label>
        <input type="text" name="price_formatted" required value="${existing ? existing.price_formatted : '₹4,200 / Ton'}" placeholder="e.g. ₹4,200 / Ton or ₹380 / Sheet" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold text-emerald-400" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Stock / Availability Badge</label>
        <select name="badge" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
          <option value="In Stock" ${!existing || existing.badge === 'In Stock' ? 'selected' : ''}>In Stock</option>
          <option value="High Demand" ${existing && existing.badge === 'High Demand' ? 'selected' : ''}>High Demand</option>
          <option value="Best Seller" ${existing && existing.badge === 'Best Seller' ? 'selected' : ''}>Best Seller</option>
          <option value="Custom Made" ${existing && existing.badge === 'Custom Made' ? 'selected' : ''}>Custom Made</option>
          <option value="Bulk Supply" ${existing && existing.badge === 'Bulk Supply' ? 'selected' : ''}>Bulk Supply</option>
          <option value="Low Stock" ${existing && existing.badge === 'Low Stock' ? 'selected' : ''}>Low Stock</option>
          <option value="Out of Stock" ${existing && existing.badge === 'Out of Stock' ? 'selected' : ''}>Out of Stock</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Feature on Web Homepage?</label>
        <select name="is_featured" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="true" ${!existing || existing.is_featured ? 'selected' : ''}>Yes - Featured (Star)</option>
          <option value="false" ${existing && !existing.is_featured ? 'selected' : ''}>No - Catalog Only</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Technical Specifications / Key Features</label>
      <input type="text" name="specs" value="${existing && existing.specs ? existing.specs : 'Heavy Load Capacity / IS 2062 Grade Steel / Custom Heights'}" placeholder="e.g. 0.50mm TCT / AZ150 Zinc Coating / Custom Lengths" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Product Photo (Upload to Cloudinary)</label>
      <input type="file" id="product-img-file" accept="image/*" class="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-500 mb-2" />
      <input type="text" name="image_url" value="${existing ? existing.image_url : ''}" placeholder="Or paste Image URL / leave blank for default" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 text-xs focus:outline-none focus:border-orange-500 font-mono" />
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Detailed Description</label>
      <textarea name="description" rows="3" placeholder="Engineered structural steel product designed for heavy industrial warehouses, factories, and commercial installations..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">${existing && existing.description ? existing.description : ''}</textarea>
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteProductItem(id) {
  if (confirm("Are you sure you want to delete this product from the website catalog?")) {
    await dbDeleteProduct(id);
    loadProducts();
  }
}

// ================= 6. GALLERY =================
let allGalleryRecords = [];

async function loadGallery() {
  const grid = document.getElementById('grid-gallery');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-4 py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading gallery...</div>`;

  try {
    const items = await dbGetGallery();
    allGalleryRecords = (items || []).sort((a, b) => {
      const numA = parseInt(a.tag_number, 10);
      const numB = parseInt(b.tag_number, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.tag_number || '').localeCompare(String(b.tag_number || ''));
    });

    if (!allGalleryRecords || allGalleryRecords.length === 0) {
      grid.innerHTML = `
        <div class="col-span-4 py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-orange-400">
            <i class="fa-solid fa-images"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No project photos in gallery yet.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Upload site fabrication photos with Tag Numbers.</p>
          <button onclick="openGalleryModal()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-cloud-arrow-up mr-1"></i> Upload First Photo
          </button>
        </div>`;
      return;
    }

    grid.innerHTML = allGalleryRecords.map(item => `
      <div class="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group aspect-square shadow-lg flex flex-col justify-end">
        <img src="${item.image_url}" alt="${item.title}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent"></div>
        
        <!-- Tag Number Badge on top left -->
        <div class="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-xl bg-orange-600 text-white font-black text-xs shadow-md border border-orange-400/40 flex items-center gap-1">
          <i class="fa-solid fa-tag text-[10px]"></i> Tag No: ${item.tag_number || item.id}
        </div>

        <!-- Action buttons on top right -->
        <div class="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button onclick="openGalleryModal('${item.id}')" title="Edit Photo & Tag No" class="w-7 h-7 rounded-full bg-slate-800/90 hover:bg-cyan-500 text-cyan-400 hover:text-white flex items-center justify-center text-xs shadow backdrop-blur-sm transition-colors">
            <i class="fa-solid fa-pen-to-square text-[10px]"></i>
          </button>
          <button onclick="deleteGalleryItem('${item.id}')" title="Delete Photo" class="w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow backdrop-blur-sm transition-colors">
            <i class="fa-solid fa-trash text-[10px]"></i>
          </button>
        </div>

        <div class="relative z-10 p-3">
          <span class="text-[10px] font-bold text-orange-400 uppercase tracking-wider">${item.category}</span>
          <h4 class="text-xs font-bold text-white leading-tight mt-0.5">${item.title}</h4>
          ${item.location ? `<p class="text-[10px] text-slate-300 mt-1 flex items-center gap-1"><i class="fa-solid fa-location-dot text-orange-400"></i> ${item.location}</p>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error in loadGallery:", err);
    grid.innerHTML = `<div class="col-span-4 py-8 text-center text-slate-400">No photos found.</div>`;
  }
}

function openGalleryModal(id = null) {
  activeModalType = 'gallery';
  editingItemId = id;

  let existing = null;
  if (id) {
    existing = allGalleryRecords.find(g => String(g.id) === String(id));
  }

  // Calculate next suggested Tag Number if adding new
  let nextTag = '1';
  if (!existing && allGalleryRecords.length > 0) {
    const numericTags = allGalleryRecords
      .map(g => parseInt(g.tag_number, 10))
      .filter(n => !isNaN(n));
    if (numericTags.length > 0) {
      nextTag = String(Math.max(...numericTags) + 1);
    } else {
      nextTag = String(allGalleryRecords.length + 1);
    }
  }

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Gallery Photo (Tag No: ${existing.tag_number || existing.id})` : 'Upload New Project Photo';
  document.getElementById('crud-modal-subtitle').textContent = 'Assign a unique Tag Number, title, category, and site fabrication photo.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="sm:col-span-1">
        <label class="block text-slate-300 font-bold mb-1"><i class="fa-solid fa-tag text-orange-400 mr-1"></i> Tag No. <span class="text-orange-500">*</span></label>
        <input type="text" name="tag_number" required value="${existing ? (existing.tag_number || '') : nextTag}" placeholder="e.g. 1, 2, 3..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-orange-500/70 text-orange-400 font-bold text-sm focus:outline-none focus:border-orange-400" />
        <p class="text-[10px] text-slate-400 mt-1">Must be unique (e.g. 1, 2, 3...)</p>
      </div>
      <div class="sm:col-span-2">
        <label class="block text-slate-300 font-bold mb-1">Project Title <span class="text-orange-500">*</span></label>
        <input type="text" name="title" required value="${existing ? existing.title : ''}" placeholder="e.g. 50-Ton Heavy PEB Warehouse Truss Erection" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Division / Category</label>
        <select name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Steel Fabrication" ${existing && existing.category === 'Steel Fabrication' ? 'selected' : ''}>Steel Fabrication</option>
          <option value="Welding Works" ${existing && existing.category === 'Welding Works' ? 'selected' : ''}>Welding Works</option>
          <option value="Storage & Racks" ${existing && existing.category === 'Storage & Racks' ? 'selected' : ''}>Storage & Racks</option>
          <option value="Mezzanine Floors" ${existing && existing.category === 'Mezzanine Floors' ? 'selected' : ''}>Mezzanine Floors</option>
          <option value="Custom Interiors" ${existing && existing.category === 'Custom Interiors' ? 'selected' : ''}>Custom Interiors & Dividers</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Site Location</label>
        <input type="text" name="location" value="${existing && existing.location ? existing.location : ''}" placeholder="e.g. Guntur Industrial Area" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">${existing ? 'Replace Photo (Leave empty to keep current)' : 'Project Photo (Cloudinary / Local) <span class="text-orange-500">*</span>'}</label>
      ${existing && existing.image_url ? `
        <div class="flex items-center gap-3 mb-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
          <img src="${existing.image_url}" alt="Current preview" class="w-12 h-12 rounded-lg object-cover border border-slate-700" />
          <div class="text-xs text-slate-400">Current photo: <span class="text-slate-200 font-mono">${existing.image_url.split('/').pop().slice(0, 30)}</span></div>
        </div>
      ` : ''}
      <input type="file" id="gallery-img-file" ${existing ? '' : 'required'} accept="image/*" class="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white cursor-pointer" />
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteGalleryItem(id) {
  if (confirm("Delete this photo from gallery?")) {
    await dbDeleteGalleryItem(id);
    loadGallery();
  }
}

// ================= COMMON FORM SUBMISSION =================
async function handleCrudSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const btn = document.getElementById('crud-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving to Supabase & Cloudinary...`;

  try {
    if (activeModalType === 'inquiry') {
      let blueprintUrl = formData.get('blueprint_url') || null;
      const fileInput = document.getElementById('inquiry-blueprint-file');
      if (fileInput && fileInput.files[0]) {
        try {
          const uploaded = await uploadToCloudinary(fileInput.files[0]);
          if (uploaded) blueprintUrl = uploaded;
        } catch (e) {}

        if (!blueprintUrl && typeof fileToOptimizedDataUrl === 'function') {
          const directDataUrl = await fileToOptimizedDataUrl(fileInput.files[0], 1200, 0.85);
          if (directDataUrl) blueprintUrl = directDataUrl;
        }
      }

      const inqDate = formData.get('inquiry_date') || getLocalDateStr();
      const inqData = {
        client_name: formData.get('client_name'),
        client_phone: formData.get('client_phone'),
        client_email: formData.get('client_email') || null,
        project_type: formData.get('project_type') || 'Industrial Sheds',
        project_scope: formData.get('project_scope') || 'Direct Inquiry',
        estimated_cost: formData.get('estimated_cost') || 'Contact for Quote',
        blueprint_url: blueprintUrl,
        message: formData.get('message') || '',
        status: formData.get('status') || 'New',
        inquiry_date: inqDate,
        created_at: `${inqDate}T12:00:00.000Z`
      };

      await dbSubmitInquiry(inqData);
      loadQuotations();
    }
    else if (activeModalType === 'order') {
      const compName = (formData.get('company_name') || '').trim();
      const custName = (formData.get('customer_name') || '').trim();
      if (!compName) {
        alert("Company Name is compulsory for booking an order.");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Save Record`;
        return;
      }

      const totalAmt = parseFloat(formData.get('total_amount')) || 0;
      let rawPaid = formData.get('paid_amount');
      let paidAmt = (rawPaid !== null && rawPaid !== undefined && rawPaid !== '') ? (parseFloat(rawPaid) || 0) : 0;
      let payStatus = formData.get('payment_status') || 'Pending';

      if (payStatus === 'Paid' && paidAmt === 0 && totalAmt > 0) {
        paidAmt = totalAmt;
      } else if (paidAmt >= totalAmt && totalAmt > 0) {
        payStatus = 'Paid';
      } else if (paidAmt > 0 && paidAmt < totalAmt) {
        payStatus = 'Partial';
      }

      const orderData = {
        inventory_item_id: formData.get('inventory_item_id') ? parseInt(formData.get('inventory_item_id')) : null,
        company_name: compName,
        customer_name: custName || compName,
        item_name: formData.get('item_name'),
        category: formData.get('category') || 'Structural Steel',
        customer_phone: formData.get('customer_phone') || '',
        customer_email: formData.get('customer_email') || null,
        quantity: parseFloat(formData.get('quantity')) || 1,
        unit: formData.get('unit') || 'Units',
        unit_price: parseFloat(formData.get('unit_price')) || 0,
        total_amount: totalAmt,
        paid_amount: paidAmt,
        payment_status: payStatus,
        order_status: formData.get('order_status') || 'Confirmed',
        order_date: formData.get('order_date') || getLocalDateStr(),
        expected_delivery: formData.get('expected_delivery') || null,
        delivery_address: formData.get('delivery_address') || '',
        notes: formData.get('notes') || ''
      };

      if (editingItemId) {
        await dbUpdateOrder(editingItemId, orderData);
      } else {
        await dbAddOrder(orderData);
      }
      await loadOrders();
      await loadInventory();
      await loadProducts();
      loadInitialCounts();
    }
    else if (activeModalType === 'employee') {
      let role = formData.get('role');
      if (role === '__CUSTOM__') {
        role = (formData.get('custom_role') || '').trim();
        if (!role) role = 'Helpers';
      }
      const empData = {
        name: formData.get('name'),
        role: role,
        daily_wage: parseFloat(formData.get('daily_wage')) || 800,
        phone: formData.get('phone') || '',
        status: formData.get('status') || 'Active',
        join_date: formData.get('join_date') || getLocalDateStr(),
        emergency_contact: formData.get('emergency_contact') || '',
        notes: formData.get('notes') || ''
      };
      if (editingItemId) {
        await dbUpdateEmployee(editingItemId, empData);
      } else {
        await dbAddEmployee(empData);
      }
      loadEmployees();
    }
    else if (activeModalType === 'attendance') {
      let role = formData.get('role');
      if (role === '__CUSTOM__') {
        role = (formData.get('custom_role') || '').trim();
        if (!role) role = 'Helpers';
      }
      const record = {
        employee_name: formData.get('employee_name'),
        role: role,
        attendance_date: formData.get('attendance_date') || getLocalDateStr(),
        status: formData.get('status'),
        overtime_hours: parseFloat(formData.get('overtime_hours')) || 0
      };
      await dbAddAttendance(record);
      loadAttendance();
    } 
    else if (activeModalType === 'inventory') {
      const selectedCat = formData.get('category');
      const customCat = (formData.get('custom_category') || '').trim();
      const finalCategory = (selectedCat === 'CUSTOM' && customCat) ? customCat : (selectedCat === 'CUSTOM' ? 'Custom Fabrication' : (selectedCat || 'Structural Steel'));

      const selectedUnit = formData.get('unit');
      const customUnit = (formData.get('custom_unit') || '').trim();
      const finalUnit = (selectedUnit === 'CUSTOM_UNIT' && customUnit) ? customUnit : (selectedUnit === 'CUSTOM_UNIT' ? 'Units' : (selectedUnit || 'Units'));

      const item = {
        item_name: formData.get('item_name'),
        category: finalCategory,
        quantity: parseFloat(formData.get('quantity')) || 0,
        unit: finalUnit,
        unit_price: parseFloat(formData.get('unit_price')) || 0,
        storage_location: formData.get('storage_location'),
        min_reorder_level: parseFloat(formData.get('min_reorder_level')) || 5
      };
      if (editingItemId) {
        await dbUpdateInventory(editingItemId, item);
      } else {
        await dbAddInventory(item);
      }
      await loadInventory();
      await loadProducts();
    }
    else if (activeModalType === 'finance') {
      let receiptUrl = null;
      const fileInput = document.getElementById('finance-receipt-file');
      if (fileInput && fileInput.files[0]) {
        try {
          receiptUrl = await uploadToCloudinary(fileInput.files[0]);
        } catch (e) {}
        if (!receiptUrl && typeof fileToOptimizedDataUrl === 'function') {
          receiptUrl = await fileToOptimizedDataUrl(fileInput.files[0], 1000, 0.7);
        }
      }

      const entry = {
        transaction_date: formData.get('transaction_date') || getLocalDateStr(),
        entry_type: formData.get('entry_type'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')) || 0,
        payment_mode: formData.get('payment_mode') || 'Cash',
        description: formData.get('description') || '',
        receipt_url: receiptUrl
      };
      await dbAddFinance(entry);
      loadFinance();
    }
    else if (activeModalType === 'product') {
      let imgUrl = formData.get('image_url') || 'product-racks.jpg';
      const fileInput = document.getElementById('product-img-file');
      if (fileInput && fileInput.files[0]) {
        try {
          const uploaded = await uploadToCloudinary(fileInput.files[0]);
          if (uploaded) imgUrl = uploaded;
        } catch (e) {}

        if ((!imgUrl || imgUrl === 'product-racks.jpg') && typeof fileToOptimizedDataUrl === 'function') {
          const directDataUrl = await fileToOptimizedDataUrl(fileInput.files[0], 1200, 0.85);
          if (directDataUrl) imgUrl = directDataUrl;
        }
      }

      const prodData = {
        name: formData.get('name'),
        category: formData.get('category'),
        category_slug: (formData.get('category') || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        price_formatted: formData.get('price_formatted'),
        badge: formData.get('badge') || 'In Stock',
        specs: formData.get('specs') || '',
        description: formData.get('description') || '',
        image_url: imgUrl,
        is_featured: formData.get('is_featured') === 'true'
      };

      if (editingItemId) {
        await dbUpdateProduct(editingItemId, prodData);
      } else {
        await dbAddProduct(prodData);
      }
      loadProducts();
    }
    else if (activeModalType === 'gallery') {
      const tagNumber = (formData.get('tag_number') || '').trim();
      if (!tagNumber) {
        alert("Please enter a Tag Number for this photo.");
        btn.disabled = false;
        btn.innerHTML = `Save Details`;
        return;
      }

      // Check unique tag number validation (must not duplicate existing photo's tag)
      const duplicate = allGalleryRecords.find(g => 
        String(g.tag_number || '').trim().toLowerCase() === tagNumber.toLowerCase() &&
        String(g.id) !== String(editingItemId)
      );
      if (duplicate) {
        alert(`⚠️ Tag Number "${tagNumber}" is already assigned to photo: "${duplicate.title}". Please enter a unique Tag Number.`);
        btn.disabled = false;
        btn.innerHTML = `Save Details`;
        return;
      }

      let existing = editingItemId ? allGalleryRecords.find(g => String(g.id) === String(editingItemId)) : null;
      let imgUrl = existing ? existing.image_url : 'steel-fabrication.jpg';

      const fileInput = document.getElementById('gallery-img-file');
      if (fileInput && fileInput.files[0]) {
        try {
          const uploaded = await uploadToCloudinary(fileInput.files[0]);
          if (uploaded) imgUrl = uploaded;
        } catch (e) {}

        // 100% Reliable Fallback: Convert to optimized WebP/JPEG data URL if Cloudinary fails
        if ((!imgUrl || imgUrl === 'steel-fabrication.jpg' || fileInput.files[0]) && typeof fileToOptimizedDataUrl === 'function') {
          const directDataUrl = await fileToOptimizedDataUrl(fileInput.files[0], 1200, 0.85);
          if (directDataUrl) imgUrl = directDataUrl;
        }
      }

      const galleryItem = {
        tag_number: tagNumber,
        title: formData.get('title'),
        category: formData.get('category'),
        location: formData.get('location') || 'Site Project',
        image_url: imgUrl,
        is_featured: true
      };

      if (editingItemId) {
        await dbUpdateGalleryItem(editingItemId, galleryItem);
      } else {
        await dbAddGalleryItem(galleryItem);
      }
      loadGallery();
    }

    closeCrudModal();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Notice: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `Save Details`;
  }
}

function closeCrudModal() {
  document.getElementById('crud-modal').classList.add('hidden');
}

// Settings Modal
function openSettingsModal() {
  document.getElementById('settings-cloud-name').value = localStorage.getItem('sasi_cloud_name') || BACKEND_CONFIG.CLOUDINARY_CLOUD_NAME;
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
  const val = document.getElementById('settings-cloud-name').value.trim();
  if (val) {
    localStorage.setItem('sasi_cloud_name', val);
    BACKEND_CONFIG.CLOUDINARY_CLOUD_NAME = val;
    alert('Cloudinary Cloud Name updated successfully!');
  }
  closeSettingsModal();
}

// Initialize Admin on DOM Ready
document.addEventListener('DOMContentLoaded', checkAdminAuth);
