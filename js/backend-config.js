// =========================================================
// SASI STEEL ENGINEERING - CENTRAL SUPABASE & CLOUDINARY BACKEND
// =========================================================

const BACKEND_CONFIG = {
  // Supabase Live Production Credentials
  SUPABASE_URL: "https://lgpaxncukijrfpyirgbn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncGF4bmN1a2lqcmZweWlyZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTAxMjAsImV4cCI6MjEwNDc4NjEyMH0.x9O_ow7avcp4cK2hm9xY9W6FZHj5gS7jSPEFjUdEI08",

  // Cloudinary Production Credentials
  CLOUDINARY_API_KEY: "946522679778984",
  CLOUDINARY_API_SECRET: "gI55UHDQ9Y0Ndsq4AuJhHlwuus0",
  CLOUDINARY_CLOUD_NAME: localStorage.getItem('sasi_cloud_name') || "sasi-steels",
  CLOUDINARY_UPLOAD_PRESET: "sasi_steels_preset"
};

// Safe Supabase Client Initializer
function getSupabaseClient() {
  if (window.sasiSupabaseClient) return window.sasiSupabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      window.sasiSupabaseClient = window.supabase.createClient(BACKEND_CONFIG.SUPABASE_URL, BACKEND_CONFIG.SUPABASE_ANON_KEY);
      return window.sasiSupabaseClient;
    } catch (err) {
      console.warn("Supabase init error:", err);
    }
  }
  return null;
}

// LocalStorage helpers for caching
function getLocalCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCollection(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage save error:", e);
  }
}

// SHA-1 Helper for Cloudinary Signed Uploads
async function generateSha1(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Safe Client-Side Image Optimizer & Fallback Converter
function fileToOptimizedDataUrl(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// 1. CLOUDINARY DIRECT UPLOAD
async function uploadToCloudinary(file) {
  if (!file) return null;

  const cloudName = BACKEND_CONFIG.CLOUDINARY_CLOUD_NAME;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const stringToSign = `timestamp=${timestamp}${BACKEND_CONFIG.CLOUDINARY_API_SECRET}`;
  const signature = await generateSha1(stringToSign);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', BACKEND_CONFIG.CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', file);
      fallbackFormData.append('upload_preset', BACKEND_CONFIG.CLOUDINARY_UPLOAD_PRESET);
      const resFallback = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: fallbackFormData
      });
      const dataFallback = await resFallback.json();
      return dataFallback.secure_url || null;
    }
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return null;
  }
}

// 2. INQUIRIES & QUOTATIONS CRUD (Cloud-First Sync)
async function dbSubmitInquiry(inquiryData) {
  const client = getSupabaseClient();
  const newRow = {
    client_name: inquiryData.name || inquiryData.client_name || 'Anonymous Client',
    client_phone: inquiryData.phone || inquiryData.client_phone || 'N/A',
    client_email: inquiryData.email || inquiryData.client_email || null,
    project_type: inquiryData.projectType || inquiryData.project_type || 'General Fabrication',
    project_scope: inquiryData.scope || inquiryData.project_scope || 'Custom Dimensions',
    estimated_cost: inquiryData.estimatedCost || inquiryData.estimated_cost || 'Contact for Quote',
    blueprint_url: inquiryData.blueprintUrl || inquiryData.blueprint_url || null,
    message: inquiryData.message || null,
    status: 'New'
  };

  if (client) {
    try {
      const { data, error } = await client.from('inquiries').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase insert error:", e);
    }
  }

  // Local fallback
  const localList = getLocalCollection('sasi_inquiries');
  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  localList.unshift(newRow);
  saveLocalCollection('sasi_inquiries', localList);
  return { success: true, data: [newRow] };
}

async function dbGetInquiries() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('inquiries').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        saveLocalCollection('sasi_inquiries', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch inquiries error:", e);
    }
  }
  return getLocalCollection('sasi_inquiries');
}

async function dbUpdateInquiryStatus(id, newStatus) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('inquiries').update({ status: newStatus }).eq('id', id);
    } catch (e) {}
  }
  const localList = getLocalCollection('sasi_inquiries');
  const idx = localList.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    localList[idx].status = newStatus;
    saveLocalCollection('sasi_inquiries', localList);
  }
  return true;
}

async function dbDeleteInquiry(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('inquiries').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_inquiries');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_inquiries', localList);
  return true;
}

// 3. ATTENDANCE CRUD (Cloud-First Sync)
async function dbGetAttendance(date = null) {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('attendance').select('*').order('created_at', { ascending: false });
      if (date) query = query.eq('attendance_date', date);
      const { data, error } = await query;
      if (!error && data) {
        saveLocalCollection('sasi_attendance', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch attendance error:", e);
    }
  }
  let localList = getLocalCollection('sasi_attendance');
  if (date) return localList.filter(x => x.attendance_date === date);
  return localList;
}

async function dbAddAttendance(record) {
  const client = getSupabaseClient();
  const newRow = {
    employee_name: record.employee_name,
    role: record.role,
    attendance_date: record.attendance_date || new Date().toISOString().split('T')[0],
    status: record.status || 'Present',
    hours_worked: record.status === 'Half Day' ? 4 : (parseFloat(record.hours_worked) || 8),
    overtime_hours: parseFloat(record.overtime_hours) || 0,
    wage_rate: parseFloat(record.wage_rate) || 0,
    notes: record.notes || ''
  };

  if (client) {
    try {
      const { data, error } = await client.from('attendance').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase insert attendance error:", e);
    }
  }

  // Local fallback
  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_attendance');
  localList.unshift(newRow);
  saveLocalCollection('sasi_attendance', localList);
  return { success: true, data: [newRow] };
}

async function dbDeleteAttendance(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('attendance').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_attendance');
  localList = localList.filter(r => String(r.id) !== String(id));
  saveLocalCollection('sasi_attendance', localList);
  return true;
}

// 4. INVENTORY CRUD (Cloud-First Sync)
async function dbGetInventory() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('inventory').select('*').order('item_name', { ascending: true });
      if (!error && data) {
        saveLocalCollection('sasi_inventory', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch inventory error:", e);
    }
  }
  return getLocalCollection('sasi_inventory');
}

async function dbAddInventory(item) {
  const client = getSupabaseClient();
  const newRow = {
    item_name: item.item_name,
    category: item.category,
    quantity: parseFloat(item.quantity) || 0,
    unit: item.unit || 'Units',
    min_reorder_level: item.min_reorder_level || 5,
    unit_price: parseFloat(item.unit_price) || 0,
    storage_location: item.storage_location || 'Main Yard',
    status: (parseFloat(item.quantity) <= (parseFloat(item.min_reorder_level) || 5)) ? 'Low Stock' : 'In Stock'
  };

  if (client) {
    try {
      const { data, error } = await client.from('inventory').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {}
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_inventory');
  localList.unshift(newRow);
  saveLocalCollection('sasi_inventory', localList);
  return { success: true, data: [newRow] };
}

async function dbDeleteInventory(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('inventory').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_inventory');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_inventory', localList);
  return true;
}

// 5. FINANCE (INCOME & EXPENSES) CRUD (Cloud-First Sync)
async function dbGetFinance() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('finance').select('*').order('transaction_date', { ascending: false });
      if (!error && data) {
        saveLocalCollection('sasi_finance', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch finance error:", e);
    }
  }
  return getLocalCollection('sasi_finance');
}

async function dbAddFinance(entry) {
  const client = getSupabaseClient();
  const newRow = {
    transaction_date: entry.transaction_date || new Date().toISOString().split('T')[0],
    entry_type: entry.entry_type || 'Income',
    category: entry.category,
    amount: parseFloat(entry.amount) || 0,
    payment_mode: entry.payment_mode || 'Cash',
    description: entry.description || '',
    receipt_url: entry.receipt_url || null
  };

  if (client) {
    try {
      const { data, error } = await client.from('finance').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {}
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_finance');
  localList.unshift(newRow);
  saveLocalCollection('sasi_finance', localList);
  return { success: true, data: [newRow] };
}

async function dbDeleteFinance(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('finance').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_finance');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_finance', localList);
  return true;
}

// 6. PRODUCTS CRUD (Cloud-First Sync)
async function dbGetProducts() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        saveLocalCollection('sasi_products', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch products error:", e);
    }
  }
  return getLocalCollection('sasi_products');
}

async function dbAddProduct(prod) {
  const client = getSupabaseClient();
  const newRow = {
    name: prod.name,
    category: prod.category,
    category_slug: prod.category_slug || (prod.category || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
    price_formatted: prod.price_formatted,
    badge: prod.badge || 'Standard',
    specs: prod.specs || 'Custom Dimensions Available',
    description: prod.description || '',
    image_url: prod.image_url || 'product-racks.jpg',
    is_featured: true
  };

  if (client) {
    try {
      const { data, error } = await client.from('products').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {}
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_products');
  localList.unshift(newRow);
  saveLocalCollection('sasi_products', localList);
  return { success: true, data: [newRow] };
}

async function dbUpdateProduct(id, updatedData) {
  const client = getSupabaseClient();
  let localList = getLocalCollection('sasi_products') || [];
  const existingIndex = localList.findIndex(x => String(x.id) === String(id));

  const payload = {
    name: updatedData.name,
    category: updatedData.category,
    category_slug: updatedData.category_slug || (updatedData.category || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
    price_formatted: updatedData.price_formatted,
    badge: updatedData.badge || 'Standard',
    specs: updatedData.specs || 'Custom Dimensions Available',
    description: updatedData.description || '',
    is_featured: updatedData.is_featured !== undefined ? updatedData.is_featured : true
  };

  if (updatedData.image_url) {
    payload.image_url = updatedData.image_url;
  }

  if (existingIndex !== -1) {
    localList[existingIndex] = { ...localList[existingIndex], ...payload };
    saveLocalCollection('sasi_products', localList);
  }

  if (client) {
    try {
      await client.from('products').update(payload).eq('id', id);
    } catch (e) {
      console.warn("Supabase update product error:", e);
    }
  }
  return true;
}

async function dbDeleteProduct(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('products').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_products');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_products', localList);
  return true;
}

// 7. GALLERY CRUD (Cloud-First Sync)
async function dbGetGallery() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('gallery').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        saveLocalCollection('sasi_gallery', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch gallery error:", e);
    }
  }
  return getLocalCollection('sasi_gallery');
}

async function dbAddGalleryItem(item) {
  const client = getSupabaseClient();
  const newRow = {
    title: item.title,
    category: item.category,
    location: item.location,
    image_url: item.image_url || 'welding-works.jpg',
    is_featured: true
  };

  if (client) {
    try {
      const { data, error } = await client.from('gallery').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {}
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_gallery');
  localList.unshift(newRow);
  saveLocalCollection('sasi_gallery', localList);
  return { success: true, data: [newRow] };
}

async function dbDeleteGalleryItem(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('gallery').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_gallery');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_gallery', localList);
  return true;
}

// 8. EMPLOYEES & STAFF CRUD (Cloud-First Sync)
const DEFAULT_EMPLOYEES = [
  { id: 1, name: 'Ramesh Kumar', phone: '+91 98480 12345', role: 'Fabricator', daily_wage: 950, status: 'Active', join_date: '2025-01-10', notes: 'Lead Structural Fabricator' },
  { id: 2, name: 'Suresh Rao', phone: '+91 98480 23456', role: 'Welder', daily_wage: 850, status: 'Active', join_date: '2025-02-15', notes: 'TIG / MIG Specialist' },
  { id: 3, name: 'Venkatesh M', phone: '+91 98480 34567', role: 'Supervisor', daily_wage: 1200, status: 'Active', join_date: '2024-11-01', notes: 'Shop Floor Master' },
  { id: 4, name: 'Rajesh V', phone: '+91 98480 45678', role: 'Helper', daily_wage: 600, status: 'Active', join_date: '2025-03-01', notes: 'Workshop Assistant' }
];

async function dbGetEmployees() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('employees').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        saveLocalCollection('sasi_employees', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch employees error:", e);
    }
  }

  let local = getLocalCollection('sasi_employees');
  if (!local || local.length === 0) {
    saveLocalCollection('sasi_employees', DEFAULT_EMPLOYEES);
    local = DEFAULT_EMPLOYEES;
  }
  return local;
}

async function dbAddEmployee(emp) {
  const client = getSupabaseClient();
  const newRow = {
    name: emp.name,
    phone: emp.phone || '',
    role: emp.role || 'Fabricator',
    daily_wage: parseFloat(emp.daily_wage) || 800,
    join_date: emp.join_date || new Date().toISOString().split('T')[0],
    status: emp.status || 'Active',
    emergency_contact: emp.emergency_contact || '',
    notes: emp.notes || ''
  };

  if (client) {
    try {
      const { data, error } = await client.from('employees').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase add employee error:", e);
    }
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_employees');
  localList.push(newRow);
  saveLocalCollection('sasi_employees', localList);
  return { success: true, data: [newRow] };
}

async function dbUpdateEmployee(id, empData) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('employees').update(empData).eq('id', id);
    } catch (e) {
      console.warn("Supabase update employee error:", e);
    }
  }

  let localList = getLocalCollection('sasi_employees');
  localList = localList.map(emp => {
    if (String(emp.id) === String(id)) {
      return { ...emp, ...empData };
    }
    return emp;
  });
  saveLocalCollection('sasi_employees', localList);
  return true;
}

async function dbDeleteEmployee(id) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('employees').delete().eq('id', id);
    } catch (e) {}
  }
  let localList = getLocalCollection('sasi_employees');
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_employees', localList);
  return true;
}

// =========================================================
// 9. ORDERS & INVENTORY INTEGRATION ENGINE
// =========================================================

// Helper: Adjust Inventory Stock by quantity delta (+delta adds stock, -delta reduces stock)
async function adjustInventoryStock(inventoryItemId, itemName, deltaQty) {
  if (!deltaQty || isNaN(deltaQty) || deltaQty === 0) return;
  const client = getSupabaseClient();
  let localInventory = getLocalCollection('sasi_inventory') || [];
  
  let targetItem = null;
  if (inventoryItemId) {
    targetItem = localInventory.find(x => String(x.id) === String(inventoryItemId));
  }
  if (!targetItem && itemName) {
    targetItem = localInventory.find(x => x.item_name && x.item_name.toLowerCase().trim() === itemName.toLowerCase().trim());
  }

  if (targetItem) {
    const currentQty = parseFloat(targetItem.quantity) || 0;
    const newQty = Math.max(0, currentQty + parseFloat(deltaQty));
    targetItem.quantity = newQty;
    
    // Auto-update stock status
    const minLevel = parseFloat(targetItem.min_reorder_level) || 5;
    targetItem.status = newQty <= 0 ? 'Out of Stock' : (newQty <= minLevel ? 'Low Stock' : 'In Stock');

    saveLocalCollection('sasi_inventory', localInventory);

    if (client && targetItem.id) {
      try {
        await client.from('inventory').update({
          quantity: newQty,
          status: targetItem.status
        }).eq('id', targetItem.id);
      } catch (e) {
        console.warn("Supabase stock update error:", e);
      }
    }
  }
}

const DEFAULT_ORDERS = [
  {
    id: 1,
    order_number: 'ORD-1001',
    customer_name: 'Kavitha Infra Projects',
    customer_phone: '+91 98480 88990',
    item_name: 'Galvalume Corrugated Roofing Sheets',
    category: 'Plates & Sheets',
    quantity: 50,
    unit: 'Sheets',
    unit_price: 380,
    total_amount: 19000,
    payment_status: 'Paid',
    order_status: 'Processing',
    order_date: new Date().toISOString().split('T')[0],
    notes: 'Urgent delivery for factory roof repair'
  },
  {
    id: 2,
    order_number: 'ORD-1002',
    customer_name: 'Sri Balaji Engineering',
    customer_phone: '+91 98480 77665',
    item_name: 'Heavy-Duty Warehouse Pallet Racks',
    category: 'Structural Steel',
    quantity: 4,
    unit: 'Tons',
    unit_price: 4200,
    total_amount: 16800,
    payment_status: 'Partial',
    order_status: 'Confirmed',
    order_date: new Date().toISOString().split('T')[0],
    notes: 'Guntur bypass site delivery'
  }
];

async function dbGetOrders() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        saveLocalCollection('sasi_orders', data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch orders error:", e);
    }
  }

  let local = getLocalCollection('sasi_orders');
  if (!local || local.length === 0) {
    saveLocalCollection('sasi_orders', DEFAULT_ORDERS);
    local = DEFAULT_ORDERS;
  }
  return local;
}

async function dbAddOrder(order) {
  const client = getSupabaseClient();
  const orderNum = order.order_number || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const qty = parseFloat(order.quantity) || 1;
  const unitPrice = parseFloat(order.unit_price) || 0;
  const total = parseFloat(order.total_amount) || (qty * unitPrice);

  const newRow = {
    order_number: orderNum,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone || 'N/A',
    customer_email: order.customer_email || null,
    delivery_address: order.delivery_address || null,
    inventory_item_id: order.inventory_item_id ? parseInt(order.inventory_item_id) : null,
    item_name: order.item_name,
    category: order.category || 'General',
    quantity: qty,
    unit: order.unit || 'Units',
    unit_price: unitPrice,
    total_amount: total,
    payment_status: order.payment_status || 'Pending',
    order_status: order.order_status || 'Confirmed',
    order_date: order.order_date || new Date().toISOString().split('T')[0],
    expected_delivery: order.expected_delivery || null,
    notes: order.notes || ''
  };

  // Auto-deduct stock if order is active
  if (newRow.order_status !== 'Cancelled') {
    await adjustInventoryStock(newRow.inventory_item_id, newRow.item_name, -qty);
  }

  if (client) {
    try {
      const { data, error } = await client.from('orders').insert([newRow]).select();
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase add order error:", e);
    }
  }

  newRow.id = Date.now();
  newRow.created_at = new Date().toISOString();
  const localList = getLocalCollection('sasi_orders');
  localList.unshift(newRow);
  saveLocalCollection('sasi_orders', localList);
  return { success: true, data: [newRow] };
}

async function dbUpdateOrderStatus(id, newStatus) {
  const client = getSupabaseClient();
  let localList = getLocalCollection('sasi_orders') || [];
  const existing = localList.find(x => String(x.id) === String(id));

  if (existing) {
    const oldStatus = existing.order_status;
    const qty = parseFloat(existing.quantity) || 0;

    // Automatic stock restoration / deduction on status transition
    if (oldStatus !== 'Cancelled' && newStatus === 'Cancelled') {
      // Order cancelled: RESTORE stock (+qty)
      await adjustInventoryStock(existing.inventory_item_id, existing.item_name, qty);
    } else if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      // Re-activated: DEDUCT stock (-qty)
      await adjustInventoryStock(existing.inventory_item_id, existing.item_name, -qty);
    }

    existing.order_status = newStatus;
    saveLocalCollection('sasi_orders', localList);
  }

  if (client) {
    try {
      await client.from('orders').update({ order_status: newStatus }).eq('id', id);
    } catch (e) {
      console.warn("Supabase update order status error:", e);
    }
  }
  return true;
}

async function dbUpdateOrder(id, updatedData) {
  const client = getSupabaseClient();
  let localList = getLocalCollection('sasi_orders') || [];
  const existingIndex = localList.findIndex(x => String(x.id) === String(id));

  if (existingIndex !== -1) {
    const oldOrder = localList[existingIndex];
    const oldQty = parseFloat(oldOrder.quantity) || 0;
    const newQty = parseFloat(updatedData.quantity) || oldQty;
    const oldStatus = oldOrder.order_status;
    const newStatus = updatedData.order_status || oldStatus;

    // Handle stock quantity adjustments
    if (oldStatus !== 'Cancelled' && newStatus === 'Cancelled') {
      await adjustInventoryStock(oldOrder.inventory_item_id, oldOrder.item_name, oldQty);
    } else if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      await adjustInventoryStock(updatedData.inventory_item_id || oldOrder.inventory_item_id, updatedData.item_name || oldOrder.item_name, -newQty);
    } else if (oldStatus !== 'Cancelled' && newStatus !== 'Cancelled') {
      // Adjust difference
      const diff = oldQty - newQty; // If newQty > oldQty, diff is negative, stock reduces
      await adjustInventoryStock(updatedData.inventory_item_id || oldOrder.inventory_item_id, updatedData.item_name || oldOrder.item_name, diff);
    }

    localList[existingIndex] = { ...oldOrder, ...updatedData };
    saveLocalCollection('sasi_orders', localList);
  }

  if (client) {
    try {
      await client.from('orders').update(updatedData).eq('id', id);
    } catch (e) {
      console.warn("Supabase update order error:", e);
    }
  }
  return true;
}

async function dbDeleteOrder(id) {
  const client = getSupabaseClient();
  let localList = getLocalCollection('sasi_orders') || [];
  const target = localList.find(x => String(x.id) === String(id));

  if (target) {
    // If deleted order was active (not cancelled), restore the stock (+qty)
    if (target.order_status !== 'Cancelled') {
      const qty = parseFloat(target.quantity) || 0;
      await adjustInventoryStock(target.inventory_item_id, target.item_name, qty);
    }
  }

  if (client) {
    try {
      await client.from('orders').delete().eq('id', id);
    } catch (e) {}
  }

  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_orders', localList);
  return true;
}


