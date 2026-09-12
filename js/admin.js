// =========================================================
// SASI STEEL ENGINEERING - ADMIN DASHBOARD ENGINE (Supabase & Cloudinary)
// =========================================================

let currentActiveTab = 'quotations';
let activeModalType = null;
let editingItemId = null;

// Auth check on load
function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('sasi_admin_auth');
  const authModal = document.getElementById('auth-modal');
  if (!isAuth) {
    if (authModal) authModal.classList.remove('hidden');
  } else {
    if (authModal) authModal.classList.add('hidden');
    loadCurrentTab();
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
  } else {
    alert('Incorrect credentials! Default password is: sasi833399');
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
    case 'attendance': loadAttendance(); break;
    case 'inventory': loadInventory(); break;
    case 'finance': loadFinance(); break;
    case 'products': loadProducts(); break;
    case 'gallery': loadGallery(); break;
  }
}

// ================= 1. QUOTATIONS & LEADS =================
async function loadQuotations() {
  const tbody = document.getElementById('table-inquiries');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading leads from Supabase...</td></tr>`;

  const inquiries = await dbGetInquiries();
  const countBadge = document.getElementById('badge-inquiries-count');
  if (countBadge) countBadge.textContent = inquiries.length;

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500 font-medium">No inquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map(item => {
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

async function handleInquiryStatusChange(id, status) {
  await dbUpdateInquiryStatus(id, status);
}

async function handleDeleteInquiry(id) {
  if (confirm("Are you sure you want to delete this quotation lead?")) {
    await dbDeleteInquiry(id);
    loadQuotations();
  }
}

// ================= 2. ATTENDANCE =================
async function loadAttendance() {
  const tbody = document.getElementById('table-attendance');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading attendance...</td></tr>`;

  const records = await dbGetAttendance();
  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500">No attendance records found. Click 'Mark Attendance' above.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
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
        <button onclick="editAttendanceItem(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="text-slate-400 hover:text-white text-xs"><i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="deleteAttendanceItem(${r.id})" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openAttendanceModal() {
  activeModalType = 'attendance';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Mark Worker Attendance';
  document.getElementById('crud-modal-subtitle').textContent = 'Record daily presence & overtime hours for workshop crew.';
  
  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Employee Name</label>
      <input type="text" name="employee_name" required placeholder="e.g. Ramesh Kumar" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Role</label>
        <select name="role" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Welder">Welder</option>
          <option value="Fabricator">Fabricator</option>
          <option value="Helper">Helper / Assistant</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Site Engineer">Site Engineer</option>
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
  tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading inventory from Supabase...</td></tr>`;

  const items = await dbGetInventory();
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500">No stock items found. Click 'Add Stock Item' above.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
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
        <button onclick="editInventoryItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-slate-400 hover:text-white text-xs"><i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="deleteInventoryItem(${item.id})" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
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
          <option value="Raw Steel">Raw Structural Steel</option>
          <option value="Plates & Sheets">Plates & Sheets</option>
          <option value="Pipes & Tubes">Pipes & Tubes</option>
          <option value="Welding Consumables">Welding Consumables</option>
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

  const entries = await dbGetFinance();
  let totalIncome = 0;
  let totalExpense = 0;

  entries.forEach(e => {
    const amt = parseFloat(e.amount) || 0;
    if (e.entry_type === 'Income') totalIncome += amt;
    else totalExpense += amt;
  });

  document.getElementById('finance-total-income').textContent = `₹${totalIncome.toLocaleString('en-IN')}`;
  document.getElementById('finance-total-expense').textContent = `₹${totalExpense.toLocaleString('en-IN')}`;
  document.getElementById('finance-net-balance').textContent = `₹${(totalIncome - totalExpense).toLocaleString('en-IN')}`;

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500">No transactions recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(e => `
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
        <button onclick="deleteFinanceItem(${e.id})" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
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

// ================= 5. PRODUCTS =================
async function loadProducts() {
  const grid = document.getElementById('grid-products');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-3 py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading products from Supabase...</div>`;

  const products = await dbGetProducts();
  if (products.length === 0) {
    grid.innerHTML = `<div class="col-span-3 py-12 text-center text-slate-500">No products found. Click 'Add New Product' above.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group flex flex-col justify-between">
      <div class="relative h-44 w-full bg-slate-950 overflow-hidden">
        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        <span class="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${p.badge || p.category}</span>
        <span class="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">${p.price_formatted}</span>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-white text-sm leading-snug">${p.name}</h4>
          <p class="text-xs text-slate-400 mt-1 line-clamp-2">${p.description}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span class="text-[10px] text-slate-500">${p.category}</span>
          <button onclick="deleteProductItem(${p.id})" class="text-red-400 hover:text-red-300 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openProductModal() {
  activeModalType = 'products';
  editingItemId = null;
  document.getElementById('crud-modal-title').textContent = 'Add New Product to Website';
  document.getElementById('crud-modal-subtitle').textContent = 'Upload product image to Cloudinary and display on live catalog.';

  document.getElementById('crud-form-fields').innerHTML = `
    <div>
      <label class="block text-slate-300 font-bold mb-1">Product Title</label>
      <input type="text" name="name" required placeholder="e.g. Modern Stainless Steel Trial Mirror" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Category</label>
        <select name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500">
          <option value="Custom Fabrication">Custom Fabrication</option>
          <option value="Storage Systems">Storage Systems</option>
          <option value="PEB & Roofing">PEB & Roofing</option>
          <option value="Structural Steel">Structural Steel</option>
          <option value="Walkways & Flooring">Walkways & Flooring</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Price Display</label>
        <input type="text" name="price_formatted" required placeholder="e.g. ₹12,500 / unit" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-slate-300 font-bold mb-1">Badge Tag</label>
        <input type="text" name="badge" placeholder="e.g. SS 304 Polished" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
      </div>
      <div>
        <label class="block text-slate-300 font-bold mb-1">Image (Upload or URL)</label>
        <input type="file" id="product-img-file" accept="image/*" class="w-full text-slate-400 text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-orange-600 file:text-white" />
      </div>
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Technical Specs</label>
      <input type="text" name="specs" placeholder="Material Grade | Dimensions | Coating" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500" />
    </div>
    <div>
      <label class="block text-slate-300 font-bold mb-1">Product Description</label>
      <textarea name="description" rows="2" placeholder="Full product description for catalog..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500"></textarea>
    </div>
  `;
  document.getElementById('crud-modal').classList.remove('hidden');
}

async function deleteProductItem(id) {
  if (confirm("Delete this product from catalog?")) {
    await dbDeleteProduct(id);
    loadProducts();
  }
}

// ================= 6. GALLERY =================
async function loadGallery() {
  const grid = document.getElementById('grid-gallery');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-4 py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading gallery...</div>`;

  const items = await dbGetGallery();
  if (items.length === 0) {
    grid.innerHTML = `<div class="col-span-4 py-12 text-center text-slate-500">No project photos in gallery. Click 'Upload New Project Photo' above.</div>`;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group aspect-square">
      <img src="${item.image_url}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3">
        <span class="text-[10px] font-bold text-orange-400 uppercase">${item.category}</span>
        <h4 class="text-xs font-bold text-white leading-tight">${item.title}</h4>
      </div>
      <button onclick="deleteGalleryItem(${item.id})" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow">
        <i class="fa-solid fa-trash text-[10px]"></i>
      </button>
    </div>
  `).join('');
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
    if (activeModalType === 'attendance') {
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
        receiptUrl = await uploadToCloudinary(fileInput.files[0]);
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
    else if (activeModalType === 'products') {
      let imgUrl = 'product-racks.jpg';
      const fileInput = document.getElementById('product-img-file');
      if (fileInput && fileInput.files[0]) {
        const uploaded = await uploadToCloudinary(fileInput.files[0]);
        if (uploaded) imgUrl = uploaded;
      }

      const category = formData.get('category');
      const prod = {
        name: formData.get('name'),
        category: category,
        category_slug: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        price_formatted: formData.get('price_formatted'),
        badge: formData.get('badge') || 'Standard',
        specs: formData.get('specs') || 'Standard Specifications',
        description: formData.get('description') || '',
        image_url: imgUrl,
        is_featured: true
      };
      await dbAddProduct(prod);
      loadProducts();
    }
    else if (activeModalType === 'gallery') {
      let imgUrl = 'welding-works.jpg';
      const fileInput = document.getElementById('gallery-img-file');
      if (fileInput && fileInput.files[0]) {
        const uploaded = await uploadToCloudinary(fileInput.files[0]);
        if (uploaded) imgUrl = uploaded;
      }

      const galleryItem = {
        title: formData.get('title'),
        category: formData.get('category'),
        location: formData.get('location'),
        image_url: imgUrl,
        is_featured: true
      };
      await dbAddGalleryItem(galleryItem);
      loadGallery();
    }

    closeCrudModal();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Error saving to database: " + err.message);
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
