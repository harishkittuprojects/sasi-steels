// =========================================================
// SASI STEEL ENGINEERING - ADMIN DASHBOARD ENGINE (Supabase & Cloudinary)
// =========================================================

let currentActiveTab = 'quotations';
let activeModalType = null;
let editingItemId = null;

// Auth check on load
async function loadInitialCounts() {
  try {
    const inq = await dbGetInquiries();
    if (inq) {
      const unread = inq.filter(i => i.status === 'New').length;
      const b = document.getElementById('badge-inquiries-count');
      if (b) b.textContent = unread;
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
    loadCurrentTab();
    loadInitialCounts();
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value.trim();

  // Master password check
  if ((user === 'admin' || user === 'sasisteels863@gmail.com') && (pass === 'sasi833399' || pass === '833399' || pass === 'admin')) {
    sessionStorage.setItem('sasi_admin_auth', 'true');
    document.getElementById('auth-modal').classList.add('hidden');
    loadCurrentTab();
    loadInitialCounts();
  } else {
    alert('Incorrect credentials! Password is: sasi833399');
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

// Tab Switching
function switchTab(tabName) {
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
let allInquiriesRecords = [];
let allOrdersRecords = [];
let allEmployeesRecords = [];
let allAttendanceRecords = [];
let allInventoryRecords = [];
let allFinanceRecords = [];
let allProductsRecords = [];

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

// ================= 1. QUOTATIONS & LEADS =================
async function loadQuotations() {
  const tbody = document.getElementById('table-inquiries');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching leads from Supabase...</td></tr>`;

  try {
    const inquiries = await dbGetInquiries();
    allInquiriesRecords = inquiries || [];
    filterInquiriesData();
  } catch (err) {
    console.error("Error in loadQuotations:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No quotation inquiries found.</td></tr>`;
  }
}

function filterInquiriesData() {
  const tbody = document.getElementById('table-inquiries');
  if (!tbody) return;

  const searchVal = (document.getElementById('inquiry-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('inquiry-filter-status')?.value || 'ALL';

  const filtered = allInquiriesRecords.filter(item => {
    if (statusVal !== 'ALL' && item.status !== statusVal) return false;
    if (searchVal) {
      const matchName = (item.client_name || '').toLowerCase().includes(searchVal);
      const matchPhone = (item.client_phone || '').toLowerCase().includes(searchVal);
      const matchProject = (item.project_type || '').toLowerCase().includes(searchVal);
      if (!matchName && !matchPhone && !matchProject) return false;
    }
    return true;
  });

  const countBadge = document.getElementById('badge-inquiries-count');
  if (countBadge) countBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-slate-400">
            <i class="fa-solid fa-inbox"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No matching quotation inquiries.</p>
          <p class="text-xs text-slate-500 mt-1">Try resetting the search or status filter.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const rawPhone = (item.client_phone || '').replace(/[^0-9]/g, '');
    const phoneLink = rawPhone.startsWith('91') ? rawPhone : '91' + rawPhone;
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent';

    const fileBtn = item.blueprint_url 
      ? `<a href="${item.blueprint_url}" target="_blank" class="px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-file-pdf"></i> CAD/File</a>`
      : `<span class="text-slate-600 text-[11px]">None</span>`;

    return `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${dateStr}</td>
        <td class="py-3 px-4 font-bold text-white">
          <div>${item.client_name}</div>
          <div class="text-[11px] font-normal text-orange-400">${item.client_phone}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200">${item.project_type}</div>
          <div class="text-[11px] text-slate-400">${item.project_scope || 'Standard'}</div>
        </td>
        <td class="py-3 px-4 font-bold text-emerald-400">${item.estimated_cost || 'N/A'}</td>
        <td class="py-3 px-4">${fileBtn}</td>
        <td class="py-3 px-4">
          <select onchange="handleInquiryStatusChange(${item.id}, this.value)" class="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-semibold">
            <option value="New" ${item.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${item.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Quoted" ${item.status === 'Quoted' ? 'selected' : ''}>Quoted</option>
            <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${item.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <a href="https://api.whatsapp.com/send?phone=${phoneLink}&text=Hello%20${encodeURIComponent(item.client_name)},%20this%20is%20SASI%20Steel%20Engineering%20regarding%20your%20quotation." target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1">
            <i class="fa-brands fa-whatsapp"></i> Chat
          </a>
          <button onclick="handleDeleteInquiry(${item.id})" class="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px]">
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
  filterInquiriesData();
}

function exportInquiriesCSV() {
  const headers = ['Date & Time', 'Client Name', 'Phone', 'Project Type', 'Scope', 'Estimated Rate', 'Status', 'Blueprint URL'];
  const rows = allInquiriesRecords.map(item => {
    const formattedDate = item.created_at 
      ? new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Recent';
    return [
      formattedDate,
      item.client_name || '',
      item.client_phone || '',
      item.project_type || '',
      item.project_scope || '',
      item.estimated_cost || '',
      item.status || '',
      item.blueprint_url || ''
    ];
  });
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`SASI_Steels_Quotations_${dateStr}.csv`, headers, rows);
}

async function handleInquiryStatusChange(id, status) {
  await dbUpdateInquiryStatus(id, status);
}

async function handleDeleteInquiry(id) {
  if (confirm("Are you sure you want to delete this quotation lead?")) {
    await dbDeleteInquiry(id);
    loadQuotations();
  }
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
          <div class="text-[11px] text-slate-400 font-mono">${orderDate}</div>
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
          ${ord.quantity} ${ord.unit || 'Units'}
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-emerald-400 font-mono">₹${(parseFloat(ord.total_amount) || 0).toLocaleString('en-IN')}</div>
          <div class="text-[10px] text-slate-400">@ ₹${(parseFloat(ord.unit_price) || 0).toLocaleString('en-IN')}/${ord.unit || 'unit'}</div>
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

function filterOrdersData() {
  updateOrdersMetrics();

  const searchVal = (document.getElementById('order-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('order-filter-status')?.value || 'ALL';
  const paymentVal = document.getElementById('order-filter-payment')?.value || 'ALL';

  const filtered = allOrdersRecords.filter(ord => {
    if (statusVal !== 'ALL' && ord.order_status !== statusVal) return false;
    if (paymentVal !== 'ALL' && ord.payment_status !== paymentVal) return false;
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
  loadOrders();
  loadInventory();
}

function resetOrdersFilter() {
  const searchInput = document.getElementById('order-filter-search');
  const statusSelect = document.getElementById('order-filter-status');
  const paymentSelect = document.getElementById('order-filter-payment');
  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  if (paymentSelect) paymentSelect.value = 'ALL';
  filterOrdersData();
}

function setOrderDatePreset(preset) {
  updateOrdersMetrics();

  const searchVal = (document.getElementById('order-filter-search')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('order-filter-status')?.value || 'ALL';
  const paymentVal = document.getElementById('order-filter-payment')?.value || 'ALL';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const filtered = allOrdersRecords.filter(ord => {
    if (statusVal !== 'ALL' && ord.order_status !== statusVal) return false;
    if (paymentVal !== 'ALL' && ord.payment_status !== paymentVal) return false;
    if (searchVal) {
      const matchNum = (ord.order_number || '').toLowerCase().includes(searchVal);
      const matchCust = (ord.customer_name || '').toLowerCase().includes(searchVal);
      const matchPhone = (ord.customer_phone || '').toLowerCase().includes(searchVal);
      const matchItem = (ord.item_name || '').toLowerCase().includes(searchVal);
      if (!matchNum && !matchCust && !matchPhone && !matchItem) return false;
    }
    const oDate = ord.order_date || (ord.created_at ? ord.created_at.split('T')[0] : '');
    if (preset === 'today') return oDate === todayStr;
    if (preset === 'this_month') return oDate.startsWith(thisMonthStr);
    return true;
  });

  renderOrdersList(filtered);
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
  if (!itemId) return;
  const match = allInventoryRecords.find(i => String(i.id) === String(itemId));
  if (match) {
    const itemNameInput = document.querySelector('#crud-form-fields input[name="item_name"]');
    const categoryInput = document.querySelector('#crud-form-fields input[name="category"]');
    const unitSelect = document.querySelector('#crud-form-fields select[name="unit"]');
    const priceInput = document.querySelector('#crud-form-fields input[name="unit_price"]');
    const stockBadge = document.getElementById('order-stock-available');

    if (itemNameInput) itemNameInput.value = match.item_name;
    if (categoryInput) categoryInput.value = match.category;
    if (unitSelect && match.unit) unitSelect.value = match.unit;
    if (priceInput && match.unit_price) priceInput.value = match.unit_price;
    if (stockBadge) {
      stockBadge.textContent = `Available in Inventory: ${match.quantity} ${match.unit} (Location: ${match.storage_location || 'Main Yard'})`;
      stockBadge.classList.remove('hidden');
    }
    calculateOrderTotal();
  }
}

function calculateOrderTotal() {
  const qtyInput = document.querySelector('#crud-form-fields input[name="quantity"]');
  const priceInput = document.querySelector('#crud-form-fields input[name="unit_price"]');
  const totalInput = document.querySelector('#crud-form-fields input[name="total_amount"]');

  if (qtyInput && priceInput && totalInput) {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalInput.value = (q * p).toFixed(0);
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
  document.getElementById('crud-modal-subtitle').textContent = 'Order quantity will automatically adjust & synchronize with your steel inventory.';

  const inventoryOptions = allInventoryRecords.map(item => `
    <option value="${item.id}" ${existing && String(existing.inventory_item_id) === String(item.id) ? 'selected' : ''}>
      ${item.item_name} (Stock: ${item.quantity} ${item.unit} - ₹${item.unit_price}/${item.unit})
    </option>
  `).join('');

  document.getElementById('crud-form-fields').innerHTML = `
    <!-- Inventory Item Picker -->
    <div class="bg-slate-950 p-3 rounded-2xl border border-slate-700 space-y-2">
      <label class="block text-slate-300 font-bold text-xs">
        <i class="fa-solid fa-boxes-stacked text-amber-400 mr-1"></i> Select Material / Product from Inventory:
      </label>
      <select onchange="onOrderItemSelect(this.value)" name="inventory_item_id" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-orange-500 text-xs">
        <option value="">-- Choose Stock Item --</option>
        ${inventoryOptions}
      </select>
      <div id="order-stock-available" class="text-[11px] text-emerald-400 font-semibold ${existing ? '' : 'hidden'}">
        ${existing ? `Linked Stock Item ID: ${existing.inventory_item_id || 'Direct Entry'}` : ''}
      </div>
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Item / Product Name</label>
      <input type="text" name="item_name" required value="${existing ? existing.item_name : ''}" placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      <input type="hidden" name="category" value="${existing ? existing.category : 'Structural Steel'}" />
    </div>

    <!-- Customer Details -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Customer Name</label>
        <input type="text" name="customer_name" required value="${existing ? existing.customer_name : ''}" placeholder="e.g. Sri Balaji Builders" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Customer Phone / WhatsApp</label>
        <input type="text" name="customer_phone" required value="${existing ? existing.customer_phone : ''}" placeholder="+91 98480 12345" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <!-- Quantity & Price & Auto-Total -->
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Quantity</label>
        <input type="number" step="0.1" name="quantity" required oninput="calculateOrderTotal()" value="${existing ? existing.quantity : '1'}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold text-orange-400" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit</label>
        <select name="unit" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Tons" ${existing && existing.unit === 'Tons' ? 'selected' : ''}>Tons</option>
          <option value="Sheets" ${existing && existing.unit === 'Sheets' ? 'selected' : ''}>Sheets</option>
          <option value="Meters" ${existing && existing.unit === 'Meters' ? 'selected' : ''}>Meters</option>
          <option value="Kgs" ${existing && existing.unit === 'Kgs' ? 'selected' : ''}>Kgs</option>
          <option value="Units" ${existing && existing.unit === 'Units' ? 'selected' : ''}>Units</option>
          <option value="Boxes" ${existing && existing.unit === 'Boxes' ? 'selected' : ''}>Boxes</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit Price (₹)</label>
        <input type="number" step="0.5" name="unit_price" required oninput="calculateOrderTotal()" value="${existing ? existing.unit_price : '0'}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Total Amount (₹)</label>
        <input type="number" name="total_amount" required value="${existing ? existing.total_amount : '0'}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500 text-emerald-400 font-black focus:outline-none" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Payment Status</label>
        <select name="payment_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Paid" ${existing && existing.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Partial" ${existing && existing.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
          <option value="Pending" ${!existing || existing.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Order Status</label>
        <select name="order_status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Confirmed" ${!existing || existing.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Processing" ${existing && existing.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Delivered" ${existing && existing.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Pending" ${existing && existing.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Cancelled" ${existing && existing.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Order Date</label>
        <input type="date" name="order_date" value="${existing && existing.order_date ? existing.order_date : new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Expected Delivery</label>
        <input type="date" name="expected_delivery" value="${existing && existing.expected_delivery ? existing.expected_delivery : ''}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>

    <div>
      <label class="block text-slate-300 font-bold mb-1">Delivery Address & Site Notes</label>
      <input type="text" name="delivery_address" value="${existing && existing.delivery_address ? existing.delivery_address : ''}" placeholder="Site location, crane access, gate entry notes..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteOrderItem(id) {
  if (confirm("Are you sure you want to delete this order? Active stock will be restored automatically to Inventory.")) {
    await dbDeleteOrder(id);
    loadOrders();
    loadInventory();
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
        <label class="block text-slate-300 font-bold mb-1">Joining Date</label>
        <input type="date" name="join_date" value="${existing && existing.join_date ? existing.join_date : new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Emergency Contact</label>
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
    if (fromVal && r.attendance_date < fromVal) return false;
    if (toVal && r.attendance_date > toVal) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-xl mx-auto mb-2 text-blue-400">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <p class="text-sm font-bold text-slate-300">No attendance records found for this filter.</p>
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
      <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">${r.attendance_date}</td>
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
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const fromInput = document.getElementById('attendance-filter-from');
  const toInput = document.getElementById('attendance-filter-to');

  if (preset === 'today') {
    if (fromInput) fromInput.value = todayStr;
    if (toInput) toInput.value = todayStr;
  } else if (preset === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    if (fromInput) fromInput.value = firstDay;
    if (toInput) toInput.value = todayStr;
  }
  filterAttendanceData();
}

function resetAttendanceFilter() {
  const fromInput = document.getElementById('attendance-filter-from');
  const toInput = document.getElementById('attendance-filter-to');
  const statusSelect = document.getElementById('attendance-filter-status');
  if (fromInput) fromInput.value = '';
  if (toInput) toInput.value = '';
  if (statusSelect) statusSelect.value = 'ALL';
  filterAttendanceData();
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
        <label class="block text-slate-300 font-bold mb-1">Date</label>
        <input type="date" name="attendance_date" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Overtime (Hours)</label>
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
      <td class="py-3 px-4 font-bold text-orange-400">${item.quantity} ${item.unit}</td>
      <td class="py-3 px-4 text-slate-300">₹${item.unit_price}</td>
      <td class="py-3 px-4 text-slate-400">${item.storage_location || 'Main Yard'}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          item.quantity <= (item.min_reorder_level || 5) ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        }">${item.quantity <= (item.min_reorder_level || 5) ? 'Low Stock' : 'In Stock'}</span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="deleteInventoryItem('${item.id}')" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
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

function openInventoryModal() {
  activeModalType = 'inventory';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Add Inventory Item';
  document.getElementById('crud-modal-subtitle').textContent = 'Add raw steel profiles, sheets, plates, or welding consumables.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Item Name</label>
      <input type="text" name="item_name" required placeholder="e.g. ISMB 200 Heavy I-Beams" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <select name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Structural Steel">Structural Steel</option>
          <option value="Stainless Steel">Stainless Steel</option>
          <option value="Pipes & Tubes">Pipes & Tubes</option>
          <option value="Plates & Sheets">Plates & Sheets</option>
          <option value="Consumables">Consumables & Rods</option>
          <option value="Hardware">Hardware & Fasteners</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Quantity & Unit</label>
        <div class="flex gap-2">
          <input type="number" step="0.1" name="quantity" required placeholder="Qty" class="w-2/3 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
          <select name="unit" class="w-1/3 px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
            <option value="Tons">Tons</option>
            <option value="Sheets">Sheets</option>
            <option value="Meters">Meters</option>
            <option value="Kgs">Kgs</option>
            <option value="Boxes">Boxes</option>
          </select>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Unit Price (₹)</label>
        <input type="number" name="unit_price" placeholder="Rate per unit" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Yard Location</label>
        <input type="text" name="storage_location" placeholder="e.g. Yard A - Bay 3" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
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
    if (fromVal && e.transaction_date < fromVal) return false;
    if (toVal && e.transaction_date > toVal) return false;
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
          <p class="text-sm font-bold text-slate-300">No income or expense records found for this period.</p>
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
      <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${e.transaction_date}</td>
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
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const fromInput = document.getElementById('finance-filter-from');
  const toInput = document.getElementById('finance-filter-to');

  if (preset === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    if (fromInput) fromInput.value = firstDay;
    if (toInput) toInput.value = todayStr;
  } else if (preset === 'last_30') {
    const past30 = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    if (fromInput) fromInput.value = past30;
    if (toInput) toInput.value = todayStr;
  }
  filterFinanceData();
}

function resetFinanceFilter() {
  const fromInput = document.getElementById('finance-filter-from');
  const toInput = document.getElementById('finance-filter-to');
  const typeSelect = document.getElementById('finance-filter-type');
  if (fromInput) fromInput.value = '';
  if (toInput) toInput.value = '';
  if (typeSelect) typeSelect.value = 'ALL';
  filterFinanceData();
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
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <input type="text" name="category" required placeholder="e.g. Steel Purchase, Client Advance" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Payment Mode</label>
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
    if (activeModalType === 'order') {
      const orderData = {
        inventory_item_id: formData.get('inventory_item_id') ? parseInt(formData.get('inventory_item_id')) : null,
        item_name: formData.get('item_name'),
        category: formData.get('category') || 'Structural Steel',
        customer_name: formData.get('customer_name'),
        customer_phone: formData.get('customer_phone'),
        quantity: parseFloat(formData.get('quantity')) || 1,
        unit: formData.get('unit') || 'Units',
        unit_price: parseFloat(formData.get('unit_price')) || 0,
        total_amount: parseFloat(formData.get('total_amount')) || 0,
        payment_status: formData.get('payment_status') || 'Pending',
        order_status: formData.get('order_status') || 'Confirmed',
        order_date: formData.get('order_date') || new Date().toISOString().split('T')[0],
        expected_delivery: formData.get('expected_delivery') || null,
        delivery_address: formData.get('delivery_address') || ''
      };

      if (editingItemId) {
        await dbUpdateOrder(editingItemId, orderData);
      } else {
        await dbAddOrder(orderData);
      }
      await loadOrders();
      await loadInventory();
    }
    else if (activeModalType === 'employee') {
      const empData = {
        name: formData.get('name'),
        role: formData.get('role'),
        daily_wage: parseFloat(formData.get('daily_wage')) || 800,
        phone: formData.get('phone') || '',
        status: formData.get('status') || 'Active',
        join_date: formData.get('join_date') || new Date().toISOString().split('T')[0],
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
        attendance_date: formData.get('attendance_date'),
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
        storage_location: formData.get('storage_location')
      };
      await dbAddInventory(item);
      loadInventory();
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
        entry_type: formData.get('entry_type'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')) || 0,
        payment_mode: formData.get('payment_mode'),
        description: formData.get('description'),
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
