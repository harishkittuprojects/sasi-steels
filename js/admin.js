// =========================================================
// SASI STEEL ENGINEERING - ADMIN DASHBOARD ENGINE (Supabase & Cloudinary)
// =========================================================

let currentActiveTab = 'quotations';
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
    updateAllLockBadges();
    
    // Check if initial tab is locked
    if (PROTECTED_SECTIONS.includes(currentActiveTab) && sectionLockState[currentActiveTab]) {
      // By default prompt for unlock on protected landing or switch to unlocked section
      openPinLockModal(currentActiveTab);
    } else {
      loadCurrentTab();
    }
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
    if (PROTECTED_SECTIONS.includes(currentActiveTab) && sectionLockState[currentActiveTab]) {
      openPinLockModal(currentActiveTab);
    } else {
      loadCurrentTab();
    }
    loadInitialCounts();
  } else {
    alert('Incorrect credentials! Please enter the correct password.');
  }
}

function adminLogout() {
  sessionStorage.removeItem('sasi_admin_auth');
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
  let sectionDesc = 'Enter your 4-digit master security PIN to access this section.';
  let iconClass = 'fa-solid fa-lock';

  if (targetTab === 'quotations') {
    sectionDisplayName = 'Quotations & Leads';
    sectionDesc = 'Official company proposals, client pricing, and RFQ inquiries are protected.';
    iconClass = 'fa-solid fa-file-invoice text-orange-500';
  } else if (targetTab === 'orders') {
    sectionDisplayName = 'Orders & Bookings';
    sectionDesc = 'Customer purchase orders, delivery statuses, and payments are protected.';
    iconClass = 'fa-solid fa-cart-shopping text-emerald-400';
  } else if (targetTab === 'finance') {
    sectionDisplayName = 'Income & Expenses (Finance)';
    sectionDesc = 'Workshop revenues, raw material expenses, wages, and audit logs are protected.';
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
      
      // Auto-relock all other protected sections
      PROTECTED_SECTIONS.forEach(sec => {
        if (sec !== targetTab) {
          sectionLockState[sec] = true;
          updateSectionLockIcon(sec, true);
        }
      });

      // Unlock only the selected target section
      sectionLockState[targetTab] = false;
      updateSectionLockIcon(targetTab, false);
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
      unlockBtn.innerHTML = `<i class="fa-solid fa-lock-open mr-2"></i> Unlock Section`;
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

// Tab Switching Interceptor with Auto-Relock on navigation
function switchTab(tabName) {
  // Whenever navigating away from any protected section, automatically re-lock it immediately!
  if (PROTECTED_SECTIONS.includes(currentActiveTab) && currentActiveTab !== tabName) {
    sectionLockState[currentActiveTab] = true;
    updateSectionLockIcon(currentActiveTab, true);
  }

  // If target section is protected and locked, intercept and show PIN modal
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
  const monthBtn = document.getElementById(`${prefix}-preset-month`);

  [allBtn, todayBtn, monthBtn].forEach(b => {
    if (b) {
      b.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300';
    }
  });

  const activeBtn = document.getElementById(`${prefix}-preset-${activePreset === 'this_month' ? 'month' : activePreset}`);
  if (activeBtn) {
    activeBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all bg-orange-600 text-white shadow';
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
          <select onchange="handleQuotationStatusChange('${q.id || q.quote_number}', this.value)" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-orange-500">
            <option value="Draft" ${q.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Sent" ${q.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option value="Approved" ${q.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${q.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            <option value="Completed" ${q.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
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

async function handleQuotationStatusChange(id, newStatus) {
  await dbUpdateQuotation(id, { status: newStatus });
  loadQuotations();
}

async function handleDeleteQuotation(id) {
  if (confirm("Are you sure you want to delete this quotation record?")) {
    await dbDeleteQuotation(id);
    await loadQuotations();
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

      activeQuotationTerms = (existing.terms && Array.isArray(existing.terms) && existing.terms.length > 0)
        ? JSON.parse(JSON.stringify(existing.terms))
        : (settings.default_terms || [...DEFAULT_QUOTATION_SETTINGS.default_terms]);
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

    activeQuotationTerms = settings.default_terms || [...DEFAULT_QUOTATION_SETTINGS.default_terms];
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

  if (!quoteNumber || !customerName || !phone) {
    alert("Please fill required fields: Quotation Number, Customer Name, and Phone Number.");
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

  closeQuotationModal();
  loadQuotations();
}

// ================= 5. CORPORATE LIVE A4 PREVIEW ENGINE (MATCHING REFERENCE IMAGE) =================

function generateQuotationPaperHTML(quote, settings) {
  const companyName = settings.company_name || 'SASI STEEL ENGINEERING & WELDING WORKS';
  const companyAddress = settings.company_address || '128-56/4, guntur amaravathi road, gorantla,guntur,a.p';
  const companyGstin = settings.company_gstin || '37AUCPA2925Q1ZG,CODE :37.';
  const companyLogo = settings.company_logo || 'img/sasi-logo.png';
  const bank = quote.bank_details || settings;
  const termsList = Array.isArray(quote.terms) && quote.terms.length > 0 ? quote.terms : (settings.default_terms || []);

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
      ? `<img src="${it.image_url}" alt="Product" style="max-height: 65px; max-width: 80px; object-fit: contain; margin: 0 auto; display: block;" onerror="this.style.display='none'" />`
      : `<div style="height: 40px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px;"></div>`;

    return `
      <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
        <td style="border: 1px solid #333333; padding: 6px 3px; text-align: center; font-weight: 500; font-size: 10.5px;">${idx + 1}</td>
        <td style="border: 1px solid #333333; padding: 4px 3px; text-align: center; width: 95px; background: #fafafa;">${imgTag}</td>
        <td style="border: 1px solid #333333; padding: 6px 6px; text-align: center; font-weight: 700; font-size: 10.5px; text-transform: uppercase;">${it.description || ''}</td>
        <td style="border: 1px solid #333333; padding: 6px 6px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase;">${it.finish || 'POWDER COATING'}</td>
        <td style="border: 1px solid #333333; padding: 6px 3px; text-align: center; font-weight: 600; font-size: 10.5px;">${q}</td>
        <td style="border: 1px solid #333333; padding: 6px 4px; text-align: center; font-weight: 600; font-size: 10.5px;">${r.toLocaleString('en-IN')}</td>
        <td style="border: 1px solid #333333; padding: 6px 6px; text-align: right; font-weight: 700; font-size: 10.5px; white-space: nowrap;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="width: 100%; max-width: 740px; margin: 0 auto; background: #ffffff; color: #000000; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5px; border: 1px solid #333333; box-sizing: border-box;">
      
      <!-- 1. TOP HEADER BANNER (STEEL SLATE BLUE WITH OFFICIAL BRAND LOGO) -->
      <div style="background: #8EA9DB; color: #000000; padding: 8px 14px; border-bottom: 1px solid #333333; display: flex; align-items: center; justify-content: center; gap: 12px; page-break-inside: avoid;">
        <img src="${companyLogo}" alt="SASI Steels Logo" style="height: 52px; max-width: 75px; object-fit: contain; border-radius: 6px; background: #ffffff; padding: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); flex-shrink: 0;" onerror="this.style.display='none'" />
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 13.5px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase;">${companyName}</div>
          <div style="font-size: 10.5px; font-weight: 600; margin-top: 1px;">${companyAddress}</div>
          <div style="font-size: 10.5px; font-weight: 700; margin-top: 1px;">GSTIN/UIN : ${companyGstin}</div>
        </div>
      </div>

      <!-- 2. DATE & CLIENT DETAILS BAR -->
      <div style="display: grid; grid-template-columns: 2fr 1.2fr 2.8fr; border-bottom: 1px solid #333333; background: #FCE4D6; font-size: 10.5px; line-height: 1.3; page-break-inside: avoid;">
        <div style="padding: 5px 8px; font-weight: 700; border-right: 1px solid #333333; display: flex; align-items: center;">
          Date : ${displayDate}
        </div>
        <div style="border-right: 1px solid #333333; background: #FCE4D6;"></div>
        <div style="padding: 5px 8px; font-weight: 700; font-size: 10px;">
          <div>Client : ${quote.customer_name}${quote.company_name ? ' (' + quote.company_name + ')' : ''}</div>
          <div style="font-weight: 600; text-transform: uppercase;">${quote.customer_address || 'KHAMMAM'}</div>
        </div>
      </div>

      <!-- 3. PRODUCT TABLE -->
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 10.5px;">
        <thead>
          <tr style="background: #E2E8F0; font-weight: 800; font-size: 10.5px; text-transform: uppercase; page-break-inside: avoid;">
            <th style="border: 1px solid #333333; padding: 5px 3px; width: 40px;">S.No</th>
            <th style="border: 1px solid #333333; padding: 5px 3px; width: 100px;">IMAGES</th>
            <th style="border: 1px solid #333333; padding: 5px 5px;">DESCRIPTION</th>
            <th style="border: 1px solid #333333; padding: 5px 5px; width: 130px;">FINISH</th>
            <th style="border: 1px solid #333333; padding: 5px 3px; width: 45px;">QTY</th>
            <th style="border: 1px solid #333333; padding: 5px 5px; width: 85px;">RATE/UNIT</th>
            <th style="border: 1px solid #333333; padding: 5px 6px; width: 105px; text-align: center;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}

          <!-- BANK DETAILS ROW 1 + TOTAL -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="5" style="border: 1px solid #333333; padding: 5px 8px; text-align: center; font-weight: 800; text-transform: uppercase; background: #E2E8F0;">
              COMPANY BANK DETAILS
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 800; text-align: center; text-transform: uppercase;">
              TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 800; text-align: right; white-space: nowrap;">
              ₹ ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- BANK DETAILS ROW 2 + PACKING CHARGES -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="3" style="border: 1px solid #333333; padding: 5px 8px; text-align: center; font-weight: 700; font-size: 10px;">
              Bank Name : ${bank.bank_name || 'STATE BANK OF INDIA, Arundalpet'}
            </td>
            <td colspan="2" style="border: 1px solid #333333; padding: 5px 8px; text-align: center; font-weight: 700; font-size: 9.5px;">
              ${bank.company_phone || settings.company_phone || 'PH: 9949321664, OFFICE: 8333991114(OR)5'}
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 700; text-align: center; background: #FCE4D6; font-size: 9.5px; text-transform: uppercase;">
              PACKING CHARGES ${packingCharges > 0 ? (Math.round((packingCharges / subTotal) * 100) || 2) + '%' : '2%'}
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 600; text-align: right; white-space: nowrap;">
              ₹ ${packingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- BANK DETAILS ROW 3 + AFTER PACKING TOTAL -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="3" style="border: 1px solid #333333; padding: 5px 8px; text-align: center; font-weight: 800; font-size: 10.5px;">
              A/C NO: ${bank.account_number || '42384233004'}
            </td>
            <td colspan="2" style="border: 1px solid #333333; padding: 5px 8px; text-align: center; font-weight: 600; font-size: 9.5px;">
              ${bank.ifsc_code ? 'IFSC: ' + bank.ifsc_code : ''} ${bank.upi_id ? '• UPI: ' + bank.upi_id : ''}
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 800; text-align: center; background: #FCE4D6; font-size: 9px; text-transform: uppercase; line-height: 1.2;">
              AFTER PACKING CHARGES TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 800; text-align: right; white-space: nowrap;">
              ₹ ${afterPacking.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- TERMS HEADER + GST -->
          <tr style="border: 1px solid #333333; page-break-inside: avoid;">
            <td colspan="5" style="border: 1px solid #333333; padding: 4px 8px; text-align: left; font-weight: 800; text-transform: uppercase; background: #C6EFCE; font-size: 10px; color: #276A3C;">
              TERMS & CONDITIONS
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 700; text-align: center; text-transform: uppercase;">
              GST ${gstRate}%
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 700; text-align: right; white-space: nowrap;">
              ₹ ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- TERMS ROW 1 + GRAND TOTAL -->
          <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
            <td style="border: 1px solid #333333; padding: 3px 3px; text-align: center; font-weight: 600;">1</td>
            <td colspan="4" style="border: 1px solid #333333; padding: 3px 6px; text-align: left; font-size: 9.5px; line-height: 1.25;">
              ${termsList[0] || 'Items will be ready within 30-45 working days form the date of Approval.'}
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 900; text-align: center; background: #FCE4D6; text-transform: uppercase; font-size: 10.5px;">
              GRAND TOTAL
            </td>
            <td style="border: 1px solid #333333; padding: 5px 6px; font-weight: 900; text-align: right; white-space: nowrap; font-size: 10.5px;">
              ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          <!-- SUBSEQUENT TERMS ROWS (2 TO END) -->
          ${termsList.slice(1).map((t, idx) => {
            const isLast = idx === termsList.length - 2;
            return `
              <tr style="border: 1px solid #333333; vertical-align: middle; page-break-inside: avoid;">
                <td style="border: 1px solid #333333; padding: 3px 3px; text-align: center; font-weight: 600;">${idx + 2}</td>
                <td colspan="4" style="border: 1px solid #333333; padding: 3px 6px; text-align: left; font-size: 9.5px; line-height: 1.25;">
                  ${t}
                </td>
                ${isLast ? `
                  <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: 800; text-align: center; font-size: 9.5px; text-transform: uppercase;">
                    GRAND TOTAL
                  </td>
                  <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: 800; text-align: right; white-space: nowrap; font-size: 10px;">
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

  const modal = document.getElementById('quotation-preview-modal');
  if (modal) modal.classList.remove('hidden');
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
    const termsList = Array.isArray(quote.terms) && quote.terms.length > 0 ? quote.terms : (settings.default_terms || []);

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
  const quote = allQuotationsRecords.find(q => String(q.id) === String(quoteId) || String(q.quote_number) === String(quoteId));
  if (!quote) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generatePdfDocument(quote, settings);
}

async function downloadCurrentQuotationPDF() {
  const quote = previewingQuotationData || (await getQuotationFormData());
  if (!quote) return;
  const settings = activeQuotationSettings || (await dbGetQuotationSettings());
  await generatePdfDocument(quote, settings);
}

async function downloadPreviewPDF() {
  if (previewingQuotationData) {
    const settings = activeQuotationSettings || (await dbGetQuotationSettings());
    await generatePdfDocument(previewingQuotationData, settings);
  }
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

  // Clone and pre-convert image URLs to Base64 to ensure immediate synchronous render in html2canvas
  const clonedQuote = JSON.parse(JSON.stringify(quote));
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

  const clonedSettings = { ...settings };
  if (clonedSettings.company_logo) {
    try {
      const logoB64 = await urlToBase64(clonedSettings.company_logo);
      if (logoB64) clonedSettings.company_logo = logoB64;
    } catch (e) {}
  }

  // Create isolated container in DOM flow (do NOT use position: absolute with top:0/left:0 which causes html2canvas blank page offset bug)
  const container = document.createElement('div');
  container.id = 'sasi-pdf-export-temp-container';
  container.style.width = '780px';
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
      setTimeout(res, 800);
    });
  }));
  await new Promise(r => setTimeout(r, 200));

  const cleanNum = (quote.quote_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const opt = {
    margin: [5, 5, 5, 5],
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

  const terms = Array.isArray(settings.default_terms) ? settings.default_terms.join('\n') : '';
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

// ================= 2. CUSTOMER ORDERS & BOOKINGS (AUTO-INVENTORY SYNC) =================
async function loadOrders() {
  const tbody = document.getElementById('table-orders');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading orders & bookings...</td></tr>`;

  try {
    const orders = await dbGetOrders();
    allOrdersRecords = orders || [];
    filterOrdersData();
  } catch (err) {
    console.error("Error in loadOrders:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">Failed to load orders.</td></tr>`;
  }
}

function renderOrdersList(list) {
  const tbody = document.getElementById('table-orders');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-emerald-400">
            <i class="fa-solid fa-cart-shopping"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No orders match your filter.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Create a manual customer order or reset your filters.</p>
          <button onclick="openOrderModal()" class="btn-orange-pill text-xs px-4 py-2">
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

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-white font-mono text-xs text-orange-400">${ord.order_number || ('ORD-' + ord.id)}</div>
          <div class="text-[11px] text-slate-300 font-mono font-semibold flex items-center gap-1 mt-0.5"><i class="fa-regular fa-calendar text-orange-400"></i> ${formatDisplayDate(ord.order_date || ord.created_at)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${ord.customer_name}</div>
          <div class="text-[11px] text-slate-400">${ord.customer_phone || 'No phone'}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200">${ord.item_name}</div>
          <div class="text-[10px] text-slate-400">${ord.category || 'Standard Stock'}</div>
        </td>
        <td class="py-3 px-4 font-bold text-cyan-400">
          ${ord.quantity}
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-emerald-400 font-mono">₹${(parseFloat(ord.total_amount) || 0).toLocaleString('en-IN')}</div>
          <div class="text-[10px] text-slate-400">@ ₹${(parseFloat(ord.unit_price) || 0).toLocaleString('en-IN')}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
            ord.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' :
            ord.payment_status === 'Partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
          }">${ord.payment_status || 'Pending'}</span>
        </td>
        <td class="py-3 px-4">
          <select onchange="handleOrderStatusChange('${ord.id}', this.value)" class="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold">
            <option value="Pending" ${ord.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Confirmed" ${ord.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Processing" ${ord.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Delivered" ${ord.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${ord.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          ${phoneLink ? `
            <a href="https://api.whatsapp.com/send?phone=${phoneLink}&text=Hello%20${encodeURIComponent(ord.customer_name)},%20this%20is%20SASI%20Steel%20Engineering%20regarding%20your%20Order%20${encodeURIComponent(ord.order_number || '')}." target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[11px] font-bold inline-flex items-center gap-1">
              <i class="fa-brands fa-whatsapp"></i>
            </a>` : ''}
          <button onclick="openOrderModal('${ord.id}')" class="px-2 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-white text-[11px]" title="Edit Order">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteOrderItem('${ord.id}')" class="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px]" title="Delete Order">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrdersMetrics() {
  const totalCount = allOrdersRecords.length;
  const activeCount = allOrdersRecords.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
  const deliveredCount = allOrdersRecords.filter(o => o.order_status === 'Delivered').length;
  const totalRevenue = allOrdersRecords
    .filter(o => o.order_status !== 'Cancelled')
    .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

  const badgeEl = document.getElementById('badge-orders-count');
  if (badgeEl) badgeEl.textContent = activeCount;

  const totalEl = document.getElementById('orders-total-count');
  if (totalEl) totalEl.textContent = totalCount;

  const activeEl = document.getElementById('orders-active-count');
  if (activeEl) activeEl.textContent = activeCount;

  const deliveredEl = document.getElementById('orders-delivered-count');
  if (deliveredEl) deliveredEl.textContent = deliveredCount;

  const revenueEl = document.getElementById('orders-total-revenue');
  if (revenueEl) revenueEl.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
}

function setOrderDatePreset(preset) {
  setDateFilterPreset('order', preset);
}

function filterOrdersData() {
  updateOrdersMetrics();

  const searchVal = (document.getElementById('order-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('order-filter-status')?.value || 'ALL';
  const paymentVal = document.getElementById('order-filter-payment')?.value || 'ALL';
  const fromVal = document.getElementById('order-filter-from')?.value || '';
  const toVal = document.getElementById('order-filter-to')?.value || '';

  const filtered = allOrdersRecords.filter(ord => {
    if (statusVal !== 'ALL' && ord.order_status !== statusVal) return false;
    if (paymentVal !== 'ALL' && ord.payment_status !== paymentVal) return false;
    
    // Accurate date comparison using normalized YYYY-MM-DD
    const oDate = getRecordDateStr(ord.order_date || ord.created_at);
    if (fromVal && oDate < fromVal) return false;
    if (toVal && oDate > toVal) return false;

    if (searchVal) {
      const matchNum = (ord.order_number || '').toLowerCase().includes(searchVal);
      const matchCust = (ord.customer_name || '').toLowerCase().includes(searchVal);
      const matchPhone = (ord.customer_phone || '').toLowerCase().includes(searchVal);
      const matchItem = (ord.item_name || '').toLowerCase().includes(searchVal);
      if (!matchNum && !matchCust && !matchPhone && !matchItem) return false;
    }
    return true;
  });

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
  const searchInput = document.getElementById('order-filter-search');
  const statusSelect = document.getElementById('order-filter-status');
  const paymentSelect = document.getElementById('order-filter-payment');
  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  if (paymentSelect) paymentSelect.value = 'ALL';

  setDateFilterPreset('order', 'all');
}

async function exportOrdersCSV() {
  if (!allOrdersRecords || allOrdersRecords.length === 0) {
    allOrdersRecords = await dbGetOrders() || [];
  }

  const headers = ['Order #', 'Order Date', 'Customer Name', 'Customer Phone', 'Item / Product', 'Category', 'Quantity', 'Unit', 'Unit Price (INR)', 'Total Amount (INR)', 'Payment Status', 'Order Status', 'Delivery Address', 'Notes'];
  const rows = allOrdersRecords.map(ord => [
    ord.order_number || `ORD-${ord.id}`,
    ord.order_date || '',
    ord.customer_name || '',
    ord.customer_phone || '',
    ord.item_name || '',
    ord.category || '',
    ord.quantity || 1,
    ord.unit || 'Units',
    ord.unit_price || 0,
    ord.total_amount || 0,
    ord.payment_status || 'Pending',
    ord.order_status || 'Confirmed',
    ord.delivery_address || '',
    ord.notes || ''
  ]);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Orders_${dateStr}.csv`, headers, rows);
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
  const selectEl = document.getElementById('order-product-select');
  const warningEl = document.getElementById('order-stock-warning');

  if (qtyInput && priceInput && totalInput) {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalInput.value = Math.round(q * p);

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
    allInventoryRecords = await dbGetInventory();
  }

  let existing = null;
  if (id) {
    existing = allOrdersRecords.find(o => String(o.id) === String(id));
  }

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Order #${existing.order_number || existing.id}` : 'Create Manual Customer Order';
  document.getElementById('crud-modal-subtitle').textContent = 'Select product & quantity. Stock inventory will automatically adjust in real-time.';

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

  document.getElementById('crud-form-fields').innerHTML = `
    <!-- Product Selection Dropdown -->
    <div>
      <label class="block text-slate-300 font-bold mb-1">
        <i class="fa-solid fa-boxes-stacked text-orange-500 mr-1"></i> Select Product / Inventory Material <span class="text-orange-500">*</span>
      </label>
      <select id="order-product-select" onchange="onOrderItemSelect(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold text-xs">
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
        <label class="block text-slate-300 font-bold mb-1">Item Description / Name</label>
        <input type="text" name="item_name" required value="${initialItemName}" placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <input type="text" name="category" value="${initialCategory}" placeholder="e.g. Structural Steel" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- Customer Details -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Customer / Client Name <span class="text-orange-500">*</span></label>
        <input type="text" name="customer_name" required value="${existing ? existing.customer_name : ''}" placeholder="e.g. Sri Balaji Builders" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Customer Phone / WhatsApp <span class="text-orange-500">*</span></label>
        <input type="text" name="customer_phone" required value="${existing ? existing.customer_phone : ''}" placeholder="+91 98480 12345" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- Quantity & Unit & Unit Price -->
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Quantity <span class="text-orange-500">*</span></label>
        <input type="number" step="0.1" min="0.1" name="quantity" required oninput="calculateOrderTotal()" value="${initialQty}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold text-orange-400" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit</label>
        <select name="unit" class="w-full px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Tons" ${initialUnit === 'Tons' ? 'selected' : ''}>Tons</option>
          <option value="Sheets" ${initialUnit === 'Sheets' ? 'selected' : ''}>Sheets</option>
          <option value="Units" ${initialUnit === 'Units' ? 'selected' : ''}>Units</option>
          <option value="Meters" ${initialUnit === 'Meters' ? 'selected' : ''}>Meters</option>
          <option value="Kgs" ${initialUnit === 'Kgs' ? 'selected' : ''}>Kgs</option>
          <option value="Boxes" ${initialUnit === 'Boxes' ? 'selected' : ''}>Boxes</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit Price (₹)</label>
        <input type="number" step="0.5" name="unit_price" required oninput="calculateOrderTotal()" value="${initialPrice}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold" />
      </div>
    </div>

    <!-- Total Amount & Statuses -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Total Amount (₹)</label>
        <input type="number" name="total_amount" required value="${initialTotal}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-emerald-400 font-black text-sm focus:outline-none" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Payment Status</label>
        <select name="payment_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
          <option value="Paid" ${existing && existing.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Partial" ${existing && existing.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
          <option value="Pending" ${!existing || existing.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Order Status</label>
        <select name="order_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
          <option value="Confirmed" ${!existing || existing.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Processing" ${existing && existing.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Delivered" ${existing && existing.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Pending" ${existing && existing.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Cancelled" ${existing && existing.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
    </div>

    <!-- Dates -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar text-orange-400 mr-1"></i> Order Date <span class="text-orange-500">*</span></label>
          <button type="button" onclick="document.querySelector('#crud-form-fields input[name=\\'order_date\\']').value = getLocalDateStr()" class="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer">Set Today</button>
        </div>
        <input type="date" name="order_date" required value="${existing && existing.order_date ? existing.order_date : getLocalDateStr()}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-slate-300 font-bold text-xs"><i class="fa-regular fa-calendar-check text-emerald-400 mr-1"></i> Expected Delivery Date</label>
        </div>
        <input type="date" name="expected_delivery" value="${existing && existing.expected_delivery ? existing.expected_delivery : ''}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 cursor-pointer" onclick="if(this.showPicker) this.showPicker()" />
      </div>
    </div>

    <!-- Delivery Address & Notes -->
    <div>
      <label class="block text-slate-300 font-bold mb-1">Delivery Address & Site Location</label>
      <input type="text" name="delivery_address" value="${existing && existing.delivery_address ? existing.delivery_address : ''}" placeholder="Site location, crane access, gate entry notes..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Internal Order Notes</label>
      <input type="text" name="notes" value="${existing && existing.notes ? existing.notes : ''}" placeholder="Specific fabrication requirements, dispatch vehicle no..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
  `;

  document.getElementById('crud-modal').classList.remove('hidden');

  // Trigger initial item selection preview
  if (selectedInventoryId) {
    onOrderItemSelect(selectedInventoryId);
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

function filterEmployeesData() {
  const tbody = document.getElementById('table-employees');
  if (!tbody) return;

  const searchVal = (document.getElementById('employee-filter-search')?.value || '').toLowerCase().trim();
  const roleVal = document.getElementById('employee-filter-role')?.value || 'ALL';
  const statusVal = document.getElementById('employee-filter-status')?.value || 'ALL';

  const filtered = allEmployeesRecords.filter(emp => {
    if (roleVal !== 'ALL' && emp.role !== roleVal) return false;
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
  const weldersCount = allEmployeesRecords.filter(e => e.role === 'Welder' || e.role === 'Fabricator').length;

  const countBadge = document.getElementById('badge-employees-count');
  if (countBadge) countBadge.textContent = activeCount;

  const countEl = document.getElementById('employees-total-count');
  if (countEl) countEl.textContent = activeCount;

  const weldersEl = document.getElementById('employees-welders-count');
  if (weldersEl) weldersEl.textContent = weldersCount;

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
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
            emp.role === 'Welder' ? 'bg-orange-500/20 text-orange-400' :
            emp.role === 'Fabricator' ? 'bg-cyan-500/20 text-cyan-400' :
            emp.role === 'Supervisor' ? 'bg-purple-500/20 text-purple-400' :
            emp.role === 'Site Engineer' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
          }">${emp.role}</span>
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
        <select name="role" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500">
          <option value="Fabricator" ${existing && existing.role === 'Fabricator' ? 'selected' : ''}>Fabricator</option>
          <option value="Welder" ${existing && existing.role === 'Welder' ? 'selected' : ''}>Welder</option>
          <option value="Helper" ${existing && existing.role === 'Helper' ? 'selected' : ''}>Helper / Assistant</option>
          <option value="Supervisor" ${existing && existing.role === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
          <option value="Site Engineer" ${existing && existing.role === 'Site Engineer' ? 'selected' : ''}>Site Engineer</option>
          <option value="Machine Operator" ${existing && existing.role === 'Machine Operator' ? 'selected' : ''}>Machine Operator</option>
        </select>
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
  if (!empName) return;
  const nameInput = document.querySelector('#crud-form-fields input[name="employee_name"]');
  if (nameInput) nameInput.value = empName;

  const match = allEmployeesRecords.find(e => e.name === empName);
  if (match) {
    const roleSelect = document.querySelector('#crud-form-fields select[name="role"]');
    if (roleSelect) roleSelect.value = match.role;
  }
}

async function openAttendanceModal() {
  activeModalType = 'attendance';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Mark Worker Attendance';
  document.getElementById('crud-modal-subtitle').textContent = 'Record daily presence & overtime hours for workshop crew.';

  if (!allEmployeesRecords || allEmployeesRecords.length === 0) {
    allEmployeesRecords = await dbGetEmployees();
  }

  const empOptions = allEmployeesRecords
    .filter(e => e.status === 'Active')
    .map(e => `<option value="${e.name}">${e.name} (${e.role})</option>`)
    .join('');

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Quick Select Registered Staff</label>
      <select onchange="onAttendanceEmpSelect(this.value)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500 mb-2">
        <option value="">-- Choose from Registered Staff --</option>
        ${empOptions}
      </select>
      <label class="block text-slate-300 font-bold mb-1">Employee Name</label>
      <input type="text" name="employee_name" required placeholder="e.g. Ramesh Kumar" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Role</label>
        <select name="role" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Fabricator">Fabricator</option>
          <option value="Welder">Welder</option>
          <option value="Helper">Helper / Assistant</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Site Engineer">Site Engineer</option>
          <option value="Machine Operator">Machine Operator</option>
        </select>
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

function resetInventoryFilter() {
  const searchInput = document.getElementById('inventory-filter-search');
  const catSelect = document.getElementById('inventory-filter-category');
  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = 'ALL';
  filterInventoryData();
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

function openInventoryModal(id = null) {
  activeModalType = 'inventory';
  editingItemId = id;

  let existing = null;
  if (id) {
    existing = allInventoryRecords.find(i => String(i.id) === String(id));
  }

  document.getElementById('crud-modal-title').textContent = existing ? `Edit Stock: ${existing.item_name}` : 'Add New Inventory Stock Item';
  document.getElementById('crud-modal-subtitle').textContent = 'Enter quantity, rate per unit, storage yard location and minimum reorder alert level.';

  const cat = existing ? existing.category : 'Structural Steel';
  const unit = existing ? existing.unit : 'Tons';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Item / Material Name <span class="text-orange-500">*</span></label>
      <input type="text" name="item_name" required value="${existing ? existing.item_name : ''}" placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold" />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <select name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
          <option value="Structural Steel" ${cat === 'Structural Steel' ? 'selected' : ''}>Structural Steel</option>
          <option value="Stainless Steel" ${cat === 'Stainless Steel' ? 'selected' : ''}>Stainless Steel</option>
          <option value="Pipes & Tubes" ${cat === 'Pipes & Tubes' ? 'selected' : ''}>Pipes & Tubes</option>
          <option value="Plates & Sheets" ${cat === 'Plates & Sheets' ? 'selected' : ''}>Plates & Sheets</option>
          <option value="Storage Systems" ${cat === 'Storage Systems' ? 'selected' : ''}>Storage Systems</option>
          <option value="Custom Fabrication" ${cat === 'Custom Fabrication' ? 'selected' : ''}>Custom Fabrication</option>
          <option value="Consumables" ${cat === 'Consumables' ? 'selected' : ''}>Consumables & Rods</option>
          <option value="Hardware" ${cat === 'Hardware' ? 'selected' : ''}>Hardware & Fasteners</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Current Stock Quantity & Unit <span class="text-orange-500">*</span></label>
        <div class="flex gap-2">
          <input type="number" step="0.1" name="quantity" required value="${existing ? existing.quantity : ''}" placeholder="Available Qty" class="w-2/3 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-orange-400 font-bold focus:outline-none focus:border-orange-500" />
          <select name="unit" class="w-1/3 px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-semibold">
            <option value="Tons" ${unit === 'Tons' ? 'selected' : ''}>Tons</option>
            <option value="Sheets" ${unit === 'Sheets' ? 'selected' : ''}>Sheets</option>
            <option value="Units" ${unit === 'Units' ? 'selected' : ''}>Units</option>
            <option value="Meters" ${unit === 'Meters' ? 'selected' : ''}>Meters</option>
            <option value="Kgs" ${unit === 'Kgs' ? 'selected' : ''}>Kgs</option>
            <option value="Boxes" ${unit === 'Boxes' ? 'selected' : ''}>Boxes</option>
          </select>
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
async function loadGallery() {
  const grid = document.getElementById('grid-gallery');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-4 py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading gallery...</div>`;

  try {
    const items = await dbGetGallery();
    if (!items || items.length === 0) {
      grid.innerHTML = `
        <div class="col-span-4 py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-pink-400">
            <i class="fa-solid fa-images"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No project photos in gallery yet.</p>
          <p class="text-xs text-slate-500 mt-1 mb-4">Upload site fabrication photos.</p>
          <button onclick="openGalleryModal()" class="btn-orange-pill text-xs px-4 py-2">
            <i class="fa-solid fa-cloud-arrow-up mr-1"></i> Upload First Photo
          </button>
        </div>`;
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group aspect-square">
        <img src="${item.image_url}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3">
          <span class="text-[10px] font-bold text-orange-400 uppercase">${item.category}</span>
          <h4 class="text-xs font-bold text-white leading-tight">${item.title}</h4>
        </div>
        <button onclick="deleteGalleryItem('${item.id}')" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow">
          <i class="fa-solid fa-trash text-[10px]"></i>
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error in loadGallery:", err);
    grid.innerHTML = `<div class="col-span-4 py-8 text-center text-slate-400">No photos found.</div>`;
  }
}

function openGalleryModal() {
  activeModalType = 'gallery';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Upload Project Photo (Cloudinary)';
  document.getElementById('crud-modal-subtitle').textContent = 'Add real site fabrication photos to the company showcase.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Project Title</label>
      <input type="text" name="title" required placeholder="e.g. 50-Ton Heavy PEB Warehouse Truss Erection" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Division / Category</label>
      <select name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
        <option value="Steel Fabrication">Steel Fabrication</option>
        <option value="Welding Works">Welding Works</option>
        <option value="Storage & Racks">Storage & Racks</option>
        <option value="Mezzanine Floors">Mezzanine Floors</option>
        <option value="Custom Interiors">Custom Interiors & Dividers</option>
      </select>
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Project Photo (Cloudinary)</label>
      <input type="file" id="gallery-img-file" required accept="image/*" class="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Site Location</label>
      <input type="text" name="location" placeholder="e.g. Guntur Industrial Area" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
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
      const orderData = {
        inventory_item_id: formData.get('inventory_item_id') ? parseInt(formData.get('inventory_item_id')) : null,
        item_name: formData.get('item_name'),
        category: formData.get('category') || 'Structural Steel',
        customer_name: formData.get('customer_name'),
        customer_phone: formData.get('customer_phone'),
        customer_email: formData.get('customer_email') || null,
        quantity: parseFloat(formData.get('quantity')) || 1,
        unit: formData.get('unit') || 'Units',
        unit_price: parseFloat(formData.get('unit_price')) || 0,
        total_amount: parseFloat(formData.get('total_amount')) || 0,
        payment_status: formData.get('payment_status') || 'Pending',
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
      const empData = {
        name: formData.get('name'),
        role: formData.get('role'),
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
      const record = {
        employee_name: formData.get('employee_name'),
        role: formData.get('role'),
        attendance_date: formData.get('attendance_date') || getLocalDateStr(),
        status: formData.get('status'),
        overtime_hours: parseFloat(formData.get('overtime_hours')) || 0
      };
      await dbAddAttendance(record);
      loadAttendance();
    } 
    else if (activeModalType === 'inventory') {
      const item = {
        item_name: formData.get('item_name'),
        category: formData.get('category'),
        quantity: parseFloat(formData.get('quantity')) || 0,
        unit: formData.get('unit'),
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
      let imgUrl = 'steel-fabrication.jpg';
      const fileInput = document.getElementById('gallery-img-file');
      if (fileInput && fileInput.files[0]) {
        try {
          const uploaded = await uploadToCloudinary(fileInput.files[0]);
          if (uploaded) imgUrl = uploaded;
        } catch (e) {}

        // 100% Reliable Fallback: Convert to optimized WebP/JPEG data URL if Cloudinary fails
        if ((!imgUrl || imgUrl === 'steel-fabrication.jpg') && typeof fileToOptimizedDataUrl === 'function') {
          const directDataUrl = await fileToOptimizedDataUrl(fileInput.files[0], 1200, 0.85);
          if (directDataUrl) imgUrl = directDataUrl;
        }
      }

      const galleryItem = {
        title: formData.get('title'),
        category: formData.get('category'),
        location: formData.get('location') || 'Site Project',
        image_url: imgUrl,
        is_featured: true
      };
      await dbAddGalleryItem(galleryItem);
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
