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
    return raw !== null ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocalCollection(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data || []));
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

// Smart Local-Remote Collection Merger to guarantee 100% data persistence
function mergeCollections(remoteList, localList, idKey = 'id') {
  if (!remoteList || !Array.isArray(remoteList)) remoteList = [];
  if (!localList || !Array.isArray(localList)) localList = [];

  const remoteIds = new Set(remoteList.map(item => String(item[idKey])));
  const unsyncedLocal = localList.filter(item => {
    if (!item || !item[idKey]) return true;
    return !remoteIds.has(String(item[idKey]));
  });

  return [...unsyncedLocal, ...remoteList];
}

// 2. INQUIRIES & QUOTATIONS CRUD (Cloud-First Sync)
async function dbSubmitInquiry(inquiryData) {
  const client = getSupabaseClient();
  const customDate = inquiryData.inquiry_date || inquiryData.date || inquiryData.created_at;
  const createdAtIso = customDate ? (customDate.includes('T') ? customDate : `${customDate}T12:00:00.000Z`) : new Date().toISOString();

  const newRow = {
    id: Date.now(),
    client_name: inquiryData.name || inquiryData.client_name || 'Anonymous Client',
    client_phone: inquiryData.phone || inquiryData.client_phone || 'N/A',
    client_email: inquiryData.email || inquiryData.client_email || null,
    project_type: inquiryData.projectType || inquiryData.project_type || 'General Fabrication',
    project_scope: inquiryData.scope || inquiryData.project_scope || 'Custom Dimensions',
    estimated_cost: inquiryData.estimatedCost || inquiryData.estimated_cost || 'Contact for Quote',
    blueprint_url: inquiryData.blueprintUrl || inquiryData.blueprint_url || null,
    message: inquiryData.message || null,
    status: inquiryData.status || 'New',
    created_at: createdAtIso
  };

  // Immediate Local Persistence
  const localList = getLocalCollection('sasi_inquiries') || [];
  localList.unshift(newRow);
  saveLocalCollection('sasi_inquiries', localList);

  // Cloud Supabase Sync
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('inquiries').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const currentList = getLocalCollection('sasi_inquiries') || [];
        if (currentList.length > 0 && currentList[0].created_at === createdAtIso) {
          currentList[0].id = data[0].id;
          saveLocalCollection('sasi_inquiries', currentList);
        }
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase insert error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

const DEFAULT_INQUIRIES = [
  {
    id: 1,
    client_name: 'VARMA',
    client_phone: '9949321664',
    client_email: 'varma.goyaz@gmail.com',
    project_type: 'Showroom Display Racks & Boxes',
    project_scope: 'Custom Powder Coated Stad Boxes, Wall Type Boxes, T Tripe & Round Brackets for jewellery showroom fixtures.',
    estimated_cost: '₹ 1,34,562.00',
    blueprint_url: null,
    status: 'Quoted',
    created_at: '2026-09-17T10:30:00.000Z'
  },
  {
    id: 2,
    client_name: 'Ramesh Reddy (Kavitha Infra)',
    client_phone: '+91 98480 88990',
    client_email: 'ramesh@kavithainfra.com',
    project_type: 'Industrial Warehouse Roofing PEB',
    project_scope: '120 Sheets Galvalume Corrugated (0.50mm) + 4 Heavy Commercial Display Racks + Gold Partition.',
    estimated_cost: '₹ 1,25,158.00',
    blueprint_url: null,
    status: 'Contacted',
    created_at: '2026-09-16T14:15:00.000Z'
  },
  {
    id: 3,
    client_name: 'Venkata Rao (Sri Balaji Engg)',
    client_phone: '+91 98480 77665',
    client_email: 'balaji.engg@gmail.com',
    project_type: 'Storage Racks & Mezzanine',
    project_scope: 'Multi-Tier Heavy-Duty Warehouse Pallet Storage Racks (3.5 Ton Capacity) + SS 304 Mirror Trolleys.',
    estimated_cost: '₹ 51,920.00',
    blueprint_url: null,
    status: 'Completed',
    created_at: '2026-09-15T11:00:00.000Z'
  },
  {
    id: 4,
    client_name: 'Srinivas Murthy',
    client_phone: '+91 94401 22334',
    client_email: 'srinivas.m@gmail.com',
    project_type: 'Steel Staircase & Railings',
    project_scope: 'Spiral Metal Staircase with SS 304 Safety Glass Railings for 3-floor residential building.',
    estimated_cost: '₹ 48,000.00',
    blueprint_url: null,
    status: 'New',
    created_at: '2026-09-18T09:30:00.000Z'
  },
  {
    id: 5,
    client_name: 'Anand Kumar (Lakshmi Constructions)',
    client_phone: '+91 83339 91114',
    client_email: 'anand.lakshmi@gmail.com',
    project_type: 'Industrial Sheds',
    project_scope: '3000 sq.ft Heavy Welded Structure Fabrication with Foundation Columns and Truss Systems.',
    estimated_cost: '₹ 3,50,000.00',
    blueprint_url: null,
    status: 'Contacted',
    created_at: '2026-09-17T16:45:00.000Z'
  },
  {
    id: 6,
    client_name: 'K. Rajesh',
    client_phone: '+91 99887 76655',
    client_email: 'rajesh.k@gmail.com',
    project_type: 'Custom Steel Fabrication',
    project_scope: 'Architectural Metal Partition Screens with Integrated Planters (Luxury Gold PVD Coated).',
    estimated_cost: '₹ 35,000.00',
    blueprint_url: null,
    status: 'New',
    created_at: '2026-09-18T08:15:00.000Z'
  }
];

async function dbGetInquiries() {
  let local = getLocalCollection('sasi_inquiries');
  if (local === null) {
    saveLocalCollection('sasi_inquiries', DEFAULT_INQUIRIES);
    local = DEFAULT_INQUIRIES;
  }
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('inquiries').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_inquiries', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch inquiries error:", e);
    }
  }
  return local || [];
}

async function dbUpdateInquiryStatus(id, newStatus) {
  const localList = getLocalCollection('sasi_inquiries') || [];
  const idx = localList.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    localList[idx].status = newStatus;
    saveLocalCollection('sasi_inquiries', localList);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const isNum = /^\d+$/.test(String(id));
      await client.from('inquiries').update({ status: newStatus }).eq('id', isNum ? parseInt(id, 10) : id);
    } catch (e) {}
  }
  return true;
}

async function dbDeleteInquiry(id) {
  let localList = getLocalCollection('sasi_inquiries') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_inquiries', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const isNum = /^\d+$/.test(String(id));
      await client.from('inquiries').delete().eq('id', isNum ? parseInt(id, 10) : id);
    } catch (e) {
      console.warn("Supabase delete inquiry error:", e);
    }
  }
  return true;
}

async function dbDeleteAllInquiries() {
  saveLocalCollection('sasi_inquiries', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('inquiries').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('inquiries').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all inquiries error:", e);
    }
  }
  return true;
}

// 3. ATTENDANCE CRUD (Cloud-First Sync)
async function dbGetAttendance(date = null) {
  const localList = getLocalCollection('sasi_attendance') || [];
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('attendance').select('*').order('created_at', { ascending: false });
      if (date) query = query.eq('attendance_date', date);
      const { data, error } = await query;
      if (!error && data) {
        const merged = mergeCollections(data, localList);
        saveLocalCollection('sasi_attendance', merged);
        if (date) return merged.filter(x => x.attendance_date === date);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch attendance error:", e);
    }
  }
  if (date) return localList.filter(x => x.attendance_date === date);
  return localList;
}

async function dbAddAttendance(record) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    employee_name: record.employee_name,
    role: record.role,
    attendance_date: record.attendance_date || new Date().toISOString().split('T')[0],
    status: record.status || 'Present',
    hours_worked: record.status === 'Half Day' ? 4 : (parseFloat(record.hours_worked) || 8),
    overtime_hours: parseFloat(record.overtime_hours) || 0,
    wage_rate: parseFloat(record.wage_rate) || 0,
    notes: record.notes || ''
  };

  const localList = getLocalCollection('sasi_attendance') || [];
  localList.unshift(newRow);
  saveLocalCollection('sasi_attendance', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('attendance').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_attendance') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_attendance', curList);
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase insert attendance error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

async function dbDeleteAttendance(id) {
  let localList = getLocalCollection('sasi_attendance') || [];
  localList = localList.filter(r => String(r.id) !== String(id));
  saveLocalCollection('sasi_attendance', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('attendance').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}

async function dbDeleteAllAttendance() {
  saveLocalCollection('sasi_attendance', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('attendance').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('attendance').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all attendance error:", e);
    }
  }
  return true;
}

const DEFAULT_INVENTORY = [
  { id: 1, item_name: 'Heavy-Duty Warehouse Pallet Racks', category: 'Structural Steel', quantity: 45, unit: 'Tons', unit_price: 4200, min_reorder_level: 10, storage_location: 'Yard A - Bay 1', status: 'In Stock' },
  { id: 2, item_name: 'Galvalume Corrugated Roofing Sheets', category: 'Plates & Sheets', quantity: 350, unit: 'Sheets', unit_price: 380, min_reorder_level: 50, storage_location: 'Shed 2 - Rack B', status: 'In Stock' },
  { id: 3, item_name: 'Architectural Gold Metal Interior Room Divider & Partition Screen', category: 'Custom Fabrication', quantity: 20, unit: 'Units', unit_price: 14500, min_reorder_level: 5, storage_location: 'Showroom Bay', status: 'In Stock' },
  { id: 4, item_name: 'Showroom Saree & Apparel Display Island Racks', category: 'Stainless Steel', quantity: 25, unit: 'Units', unit_price: 12500, min_reorder_level: 5, storage_location: 'Yard B - Bay 3', status: 'In Stock' },
  { id: 5, item_name: 'Commercial Showroom & Apparel Steel Display Racks', category: 'Storage Systems', quantity: 40, unit: 'Units', unit_price: 6500, min_reorder_level: 8, storage_location: 'Yard A - Bay 4', status: 'In Stock' },
  { id: 6, item_name: 'Stainless Steel Showroom Mirror Trolleys & Retail Fixtures', category: 'Stainless Steel', quantity: 18, unit: 'Units', unit_price: 8800, min_reorder_level: 4, storage_location: 'Showroom Bay', status: 'In Stock' },
  { id: 7, item_name: 'Electro-Forged Industrial Steel Gratings', category: 'Plates & Sheets', quantity: 120, unit: 'Meters', unit_price: 1850, min_reorder_level: 20, storage_location: 'Yard C - Heavy Deck', status: 'In Stock' },
  { id: 8, item_name: 'Prefabricated Industrial Steel Staircases', category: 'Structural Steel', quantity: 12, unit: 'Units', unit_price: 28000, min_reorder_level: 2, storage_location: 'Assembly Bay 1', status: 'In Stock' },
  { id: 9, item_name: 'CNC Precision Laser Cut Base Plates & Brackets', category: 'Hardware', quantity: 500, unit: 'Units', unit_price: 95, min_reorder_level: 100, storage_location: 'Parts Bin 12', status: 'In Stock' },
  { id: 10, item_name: 'ISMB 200 Heavy I-Beams', category: 'Structural Steel', quantity: 60, unit: 'Tons', unit_price: 5500, min_reorder_level: 15, storage_location: 'Main Yard - Section 1', status: 'In Stock' },
  { id: 11, item_name: 'MS Hollow Square Pipes 50x50mm', category: 'Pipes & Tubes', quantity: 200, unit: 'Meters', unit_price: 450, min_reorder_level: 30, storage_location: 'Yard B - Pipe Rack', status: 'In Stock' },
  { id: 12, item_name: 'Welding Electrodes E6013 3.15mm', category: 'Consumables', quantity: 80, unit: 'Boxes', unit_price: 650, min_reorder_level: 15, storage_location: 'Consumables Store', status: 'In Stock' }
];

// 4. INVENTORY CRUD (Cloud-First Sync)
async function dbGetInventory() {
  let local = getLocalCollection('sasi_inventory');
  if (local === null) {
    saveLocalCollection('sasi_inventory', DEFAULT_INVENTORY);
    local = DEFAULT_INVENTORY;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('inventory').select('*').order('item_name', { ascending: true });
      if (!error && data && data.length > 0) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_inventory', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch inventory error:", e);
    }
  }
  return local || [];
}

async function dbAddInventory(item) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    item_name: item.item_name,
    category: item.category,
    quantity: parseFloat(item.quantity) || 0,
    unit: item.unit || 'Units',
    min_reorder_level: parseFloat(item.min_reorder_level) || 5,
    unit_price: parseFloat(item.unit_price) || 0,
    storage_location: item.storage_location || 'Main Yard',
    status: (parseFloat(item.quantity) <= 0) ? 'Out of Stock' : ((parseFloat(item.quantity) <= (parseFloat(item.min_reorder_level) || 5)) ? 'Low Stock' : 'In Stock')
  };

  const localList = getLocalCollection('sasi_inventory') || [...DEFAULT_INVENTORY];
  localList.unshift(newRow);
  saveLocalCollection('sasi_inventory', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('inventory').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_inventory') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_inventory', curList);
        return { success: true, data };
      }
    } catch (e) {}
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateInventory(id, updatedData) {
  const q = parseFloat(updatedData.quantity) || 0;
  const minL = parseFloat(updatedData.min_reorder_level) || 5;
  const status = q <= 0 ? 'Out of Stock' : (q <= minL ? 'Low Stock' : 'In Stock');

  const payload = {
    item_name: updatedData.item_name,
    category: updatedData.category,
    quantity: q,
    unit: updatedData.unit || 'Units',
    unit_price: parseFloat(updatedData.unit_price) || 0,
    storage_location: updatedData.storage_location || 'Main Yard',
    min_reorder_level: minL,
    status: status
  };

  let localList = getLocalCollection('sasi_inventory') || [];
  const idx = localList.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    localList[idx] = { ...localList[idx], ...payload };
    saveLocalCollection('sasi_inventory', localList);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('inventory').update(payload).eq('id', id);
    } catch (e) {
      console.warn("Supabase update inventory error:", e);
    }
  }
  return true;
}

async function dbDeleteInventory(id) {
  let localList = getLocalCollection('sasi_inventory') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_inventory', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('inventory').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}

// 5. FINANCE (INCOME & EXPENSES) CRUD (Cloud-First Sync)
async function dbGetFinance() {
  const local = getLocalCollection('sasi_finance') || [];
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('finance').select('*').order('transaction_date', { ascending: false });
      if (!error && data) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_finance', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch finance error:", e);
    }
  }
  return local;
}

async function dbAddFinance(entry) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    transaction_date: entry.transaction_date || new Date().toISOString().split('T')[0],
    entry_type: entry.entry_type || 'Income',
    category: entry.category,
    amount: parseFloat(entry.amount) || 0,
    payment_mode: entry.payment_mode || 'Cash',
    description: entry.description || '',
    receipt_url: entry.receipt_url || null
  };

  const localList = getLocalCollection('sasi_finance') || [];
  localList.unshift(newRow);
  saveLocalCollection('sasi_finance', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('finance').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_finance') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_finance', curList);
        return { success: true, data };
      }
    } catch (e) {}
  }

  return { success: true, data: [newRow] };
}

async function dbDeleteFinance(id) {
  let localList = getLocalCollection('sasi_finance') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_finance', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('finance').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}

async function dbDeleteAllFinance() {
  saveLocalCollection('sasi_finance', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('finance').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('finance').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all finance error:", e);
    }
  }
  return true;
}

// 6. PRODUCTS CRUD (Cloud-First Sync)
async function dbGetProducts() {
  const local = getLocalCollection('sasi_products') || [];
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_products', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch products error:", e);
    }
  }
  return local;
}

async function dbAddProduct(prod) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
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

  const localList = getLocalCollection('sasi_products') || [];
  localList.unshift(newRow);
  saveLocalCollection('sasi_products', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('products').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_products') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_products', curList);
        return { success: true, data };
      }
    } catch (e) {}
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateProduct(id, updatedData) {
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

  const client = getSupabaseClient();
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
  let localList = getLocalCollection('sasi_products') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_products', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('products').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}

// 7. GALLERY CRUD (Cloud-First Sync)
const DEFAULT_GALLERY = [
  { id: 1, tag_number: '1', title: '100,000 Sq.Ft Pre-Engineered Logistics Warehouse', category: 'Steel Fabrication', location: 'Guntur, Andhra Pradesh', image_url: 'gallery-peb-1.jpg', is_featured: true },
  { id: 2, tag_number: '2', title: 'High-Pressure Pipe Welding & NDT Testing', category: 'Welding Works', location: 'Industrial Unit, Andhra Pradesh', image_url: 'gallery-welding-1.jpg', is_featured: true },
  { id: 3, tag_number: '3', title: '4-Tier High-Density Pallet Racking Hub', category: 'Storage & Racks', location: 'E-Commerce Fulfillment Center', image_url: 'gallery-racks-1.jpg', is_featured: true },
  { id: 4, tag_number: '4', title: 'Structural Mezzanine Floor with Office Platform', category: 'Mezzanine Floors', location: 'Manufacturing Plant, Chennai', image_url: 'gallery-mezzanine-1.jpg', is_featured: true },
  { id: 5, tag_number: '5', title: 'CNC Fiber Laser Structural Plate Processing', category: 'Steel Fabrication', location: 'SASI Fabrication Yard', image_url: 'gallery-laser-1.jpg', is_featured: true },
  { id: 6, tag_number: '6', title: 'Multi-Level Industrial Fire Exit Stair Tower', category: 'Steel Fabrication', location: 'Commercial Technology Park', image_url: 'gallery-stairs-1.jpg', is_featured: true }
];

async function dbGetGallery() {
  let local = getLocalCollection('sasi_gallery');
  if (local === null) {
    saveLocalCollection('sasi_gallery', DEFAULT_GALLERY);
    local = DEFAULT_GALLERY;
  }
  
  // Ensure every item has a tag_number if missing from older data
  let updatedLocal = false;
  local = (local || []).map((item, idx) => {
    if (!item.tag_number) {
      item.tag_number = String(idx + 1);
      updatedLocal = true;
    }
    return item;
  });
  if (updatedLocal) {
    saveLocalCollection('sasi_gallery', local);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('gallery').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_gallery', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch gallery error:", e);
    }
  }
  return local || [];
}

async function dbAddGalleryItem(item) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    tag_number: String(item.tag_number || '').trim(),
    title: item.title,
    category: item.category,
    location: item.location || 'Site Project',
    image_url: item.image_url || 'steel-fabrication.jpg',
    is_featured: true
  };

  const localList = getLocalCollection('sasi_gallery') || [];
  localList.unshift(newRow);
  saveLocalCollection('sasi_gallery', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('gallery').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_gallery') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_gallery', curList);
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase insert gallery error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateGalleryItem(id, updatedFields) {
  let localList = getLocalCollection('sasi_gallery') || [];
  const index = localList.findIndex(x => String(x.id) === String(id));
  if (index !== -1) {
    localList[index] = { ...localList[index], ...updatedFields };
    saveLocalCollection('sasi_gallery', localList);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('gallery').update(updatedFields).eq('id', id);
    } catch (e) {
      console.warn("Supabase update gallery error:", e);
    }
  }
  return true;
}

async function dbDeleteGalleryItem(id) {
  let localList = getLocalCollection('sasi_gallery') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_gallery', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('gallery').delete().eq('id', id);
    } catch (e) {
      console.warn("Supabase delete gallery error:", e);
    }
  }
  return true;
}

// 8. EMPLOYEES & STAFF CRUD (Cloud-First Sync)
const DEFAULT_EMPLOYEES = [
  { id: 1, name: 'Ramesh Kumar', phone: '+91 98480 12345', role: 'Welding mestri', daily_wage: 950, status: 'Active', join_date: '2025-01-10', notes: 'Senior Welding Specialist' },
  { id: 2, name: 'Suresh Rao', phone: '+91 98480 23456', role: 'Powder coating mestri', daily_wage: 900, status: 'Active', join_date: '2025-02-15', notes: 'Powder Coating Lead' },
  { id: 3, name: 'Venkatesh M', phone: '+91 98480 34567', role: 'Manager', daily_wage: 1300, status: 'Active', join_date: '2024-11-01', notes: 'Workshop Operations Manager' },
  { id: 4, name: 'Rajesh V', phone: '+91 98480 45678', role: 'Helpers', daily_wage: 600, status: 'Active', join_date: '2025-03-01', notes: 'Workshop Assistant' }
];

async function dbGetEmployees() {
  let local = getLocalCollection('sasi_employees');
  if (local === null) {
    saveLocalCollection('sasi_employees', DEFAULT_EMPLOYEES);
    local = DEFAULT_EMPLOYEES;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('employees').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_employees', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch employees error:", e);
    }
  }

  return local || [];
}

async function dbAddEmployee(emp) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    name: emp.name,
    phone: emp.phone || '',
    role: emp.role || 'Welding mestri',
    daily_wage: parseFloat(emp.daily_wage) || 800,
    join_date: emp.join_date || new Date().toISOString().split('T')[0],
    status: emp.status || 'Active',
    emergency_contact: emp.emergency_contact || '',
    notes: emp.notes || ''
  };

  const localList = getLocalCollection('sasi_employees') || [...DEFAULT_EMPLOYEES];
  localList.push(newRow);
  saveLocalCollection('sasi_employees', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('employees').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_employees') || [];
        if (curList.length > 0) curList[curList.length - 1].id = data[0].id;
        saveLocalCollection('sasi_employees', curList);
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase add employee error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateEmployee(id, empData) {
  let localList = getLocalCollection('sasi_employees') || [];
  localList = localList.map(emp => {
    if (String(emp.id) === String(id)) {
      return { ...emp, ...empData };
    }
    return emp;
  });
  saveLocalCollection('sasi_employees', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('employees').update(empData).eq('id', id);
    } catch (e) {
      console.warn("Supabase update employee error:", e);
    }
  }

  return true;
}

async function dbDeleteEmployee(id) {
  let localList = getLocalCollection('sasi_employees') || [];
  localList = localList.filter(x => String(x.id) !== String(id));
  saveLocalCollection('sasi_employees', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('employees').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}

async function dbDeleteAllEmployees() {
  saveLocalCollection('sasi_employees', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('employees').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('employees').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all employees error:", e);
    }
  }
  return true;
}

// =========================================================
// 9. ORDERS & INVENTORY INTEGRATION ENGINE
// =========================================================

async function adjustInventoryStock(inventoryItemId, itemName, deltaQty) {
  if (!deltaQty || isNaN(deltaQty) || deltaQty === 0) return;
  const client = getSupabaseClient();
  let localInventory = getLocalCollection('sasi_inventory') || [];
  if (localInventory.length === 0) {
    localInventory = (typeof DEFAULT_INVENTORY !== 'undefined') ? [...DEFAULT_INVENTORY] : [];
  }
  
  let targetItem = null;
  if (inventoryItemId) {
    targetItem = localInventory.find(x => String(x.id) === String(inventoryItemId));
  }
  if (!targetItem && itemName) {
    const cleanName = itemName.toLowerCase().trim();
    targetItem = localInventory.find(x => x.item_name && x.item_name.toLowerCase().trim() === cleanName) ||
                 localInventory.find(x => x.item_name && (x.item_name.toLowerCase().includes(cleanName) || cleanName.includes(x.item_name.toLowerCase())));
  }

  if (targetItem) {
    const currentQty = parseFloat(targetItem.quantity) || 0;
    const newQty = Math.max(0, currentQty + parseFloat(deltaQty));
    targetItem.quantity = Math.round(newQty * 100) / 100;
    
    // Auto-update stock status
    const minLevel = parseFloat(targetItem.min_reorder_level) || 5;
    targetItem.status = targetItem.quantity <= 0 ? 'Out of Stock' : (targetItem.quantity <= minLevel ? 'Low Stock' : 'In Stock');

    saveLocalCollection('sasi_inventory', localInventory);

    if (client && targetItem.id) {
      try {
        await client.from('inventory').update({
          quantity: targetItem.quantity,
          status: targetItem.status
        }).eq('id', targetItem.id);
      } catch (e) {
        console.warn("Supabase stock update error:", e);
      }
    }

    // Synchronize website products catalog badge if matching product exists
    try {
      let localProducts = getLocalCollection('sasi_products') || [];
      const prodMatch = localProducts.find(p => p.name && (p.name.toLowerCase().includes(targetItem.item_name.toLowerCase()) || targetItem.item_name.toLowerCase().includes(p.name.toLowerCase())));
      if (prodMatch) {
        prodMatch.badge = targetItem.status;
        saveLocalCollection('sasi_products', localProducts);
        if (client && prodMatch.id) {
          await client.from('products').update({ badge: targetItem.status }).eq('id', prodMatch.id);
        }
      }
    } catch (e) {}
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
  let local = getLocalCollection('sasi_orders');
  if (local === null) {
    saveLocalCollection('sasi_orders', DEFAULT_ORDERS);
    local = DEFAULT_ORDERS;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const merged = mergeCollections(data, local);
        saveLocalCollection('sasi_orders', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch orders error:", e);
    }
  }

  return local || [];
}

async function dbAddOrder(order) {
  const orderNum = order.order_number || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const qty = parseFloat(order.quantity) || 1;
  const unitPrice = parseFloat(order.unit_price) || 0;
  const total = parseFloat(order.total_amount) || (qty * unitPrice);

  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
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

  const localList = getLocalCollection('sasi_orders') || [...DEFAULT_ORDERS];
  localList.unshift(newRow);
  saveLocalCollection('sasi_orders', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('orders').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_orders') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_orders', curList);
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase add order error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateOrderStatus(id, newStatus) {
  let localList = getLocalCollection('sasi_orders') || [];
  const existing = localList.find(x => String(x.id) === String(id));

  if (existing) {
    const oldStatus = existing.order_status;
    const qty = parseFloat(existing.quantity) || 0;

    // Automatic stock restoration / deduction on status transition
    if (oldStatus !== 'Cancelled' && newStatus === 'Cancelled') {
      await adjustInventoryStock(existing.inventory_item_id, existing.item_name, qty);
    } else if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      await adjustInventoryStock(existing.inventory_item_id, existing.item_name, -qty);
    }

    existing.order_status = newStatus;
    saveLocalCollection('sasi_orders', localList);
  }

  const client = getSupabaseClient();
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
      const diff = oldQty - newQty;
      await adjustInventoryStock(updatedData.inventory_item_id || oldOrder.inventory_item_id, updatedData.item_name || oldOrder.item_name, diff);
    }

    localList[existingIndex] = { ...oldOrder, ...updatedData };
    saveLocalCollection('sasi_orders', localList);
  }

  const client = getSupabaseClient();
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
  let localList = getLocalCollection('sasi_orders') || [];
  const target = localList.find(x => String(x.id) === String(id) || String(x.order_number) === String(id));

  if (target) {
    if (target.order_status !== 'Cancelled') {
      const qty = parseFloat(target.quantity) || 0;
      await adjustInventoryStock(target.inventory_item_id, target.item_name, qty);
    }
  }

  localList = localList.filter(x => String(x.id) !== String(id) && String(x.order_number) !== String(id));
  saveLocalCollection('sasi_orders', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const isNum = /^\d+$/.test(String(id));
      if (isNum) {
        await client.from('orders').delete().eq('id', parseInt(id, 10));
      } else {
        await client.from('orders').delete().eq('order_number', String(id));
      }
    } catch (e) {
      console.warn("Supabase delete order error:", e);
    }
  }
  return true;
}

async function dbDeleteAllOrders() {
  let localList = getLocalCollection('sasi_orders') || [];

  for (const ord of localList) {
    if (ord.order_status !== 'Cancelled') {
      const qty = parseFloat(ord.quantity) || 0;
      await adjustInventoryStock(ord.inventory_item_id, ord.item_name, qty);
    }
  }

  saveLocalCollection('sasi_orders', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('orders').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('orders').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all orders error:", e);
    }
  }
  return true;
}

// =========================================================
// 10. PROFESSIONAL QUOTATIONS MANAGEMENT ENGINE
// =========================================================

const DEFAULT_QUOTATION_SETTINGS = {
  company_name: 'SASI STEEL ENGINEERING & WELDING WORKS',
  company_tagline: '',
  company_logo: 'img/sasi-logo.png',
  company_address: '128-56/4, guntur amaravathi road, gorantla,guntur,a.p',
  company_phone: 'PH: 9949321664, OFFICE: 8333991114(OR)5',
  company_email: 'sasisteels863@gmail.com',
  company_gstin: '37AUCPA2925Q1ZG,CODE :37.',
  bank_name: 'STATE BANK OF INDIA, Arundalpet',
  account_holder: 'SASI STEEL ENGINEERING & WELDING WORKS',
  account_number: '42384233004',
  ifsc_code: 'SBIN0001234',
  branch_name: 'Arundalpet, Guntur',
  upi_id: '9949321664@upi',
  default_terms: [
    'Items will be ready within 30-45 working days form the date of Approval.',
    'Price ex-works, 60% Advance along with Work Order, 30% against delivery, balance 10% payment after installation',
    'Above rates are excluding of GST, will be applicable @ 18%',
    'Installation/Mechanic/oil of above fixtures on site is not in our scope of work, If it is then it will be charge extra 6-8% on base value for above one lakh, Rs2000 per head below one lakh.',
    'Above rates are excluding of loading, unloading & transportation Charges, It will be charge extra at actuals, Packing charges 4% extra.',
    'Above rates are approximately and are likely to be change, according to the (Market/Rawmaterials) conditions.',
    'This Quotation is valid for 15days from the date of issue.'
  ]
};

const DEFAULT_QUOTATIONS = [
  {
    id: 1,
    quote_number: 'SS/QTN/2026/001',
    quote_date: '2026-09-17',
    validity_days: 15,
    customer_name: 'VARMA',
    company_name: 'a unit of goyaz jewellery pvt ltd',
    customer_phone: '9949321664',
    customer_email: 'varma.goyaz@gmail.com',
    customer_address: 'KHAMMAM',
    customer_gst: '',
    items: [
      {
        sno: 1,
        image_url: 'product-display-racks.png',
        description: 'STAD TYPE BOX',
        finish: 'POWDER COATING',
        quantity: 2,
        rate: 20000,
        amount: 40000
      },
      {
        sno: 2,
        image_url: 'product-display-racks.png',
        description: 'WALL TYPE BOX',
        finish: 'POWDER COATING',
        quantity: 3,
        rate: 15000,
        amount: 45000
      },
      {
        sno: 3,
        image_url: '',
        description: 'T TRIPE',
        finish: 'POWDER COATING',
        quantity: 16,
        rate: 425,
        amount: 6800
      },
      {
        sno: 4,
        image_url: '',
        description: 'ROUND BRACKETS',
        finish: 'POWDER COATING /SS',
        quantity: 80,
        rate: 250,
        amount: 20000
      }
    ],
    sub_total: 111800,
    packing_charges: 2236,
    gst_rate: 18,
    gst_amount: 20526.48,
    other_charges: 0,
    other_charges_desc: '',
    grand_total: 134562.48,
    amount_in_words: 'Rupees One Lakh Thirty Four Thousand Five Hundred Sixty Two and Forty Eight Paise Only',
    bank_details: {
      bank_name: 'STATE BANK OF INDIA, Arundalpet',
      account_holder: 'SASI STEEL ENGINEERING & WELDING WORKS',
      account_number: '42384233004',
      ifsc_code: 'SBIN0001234',
      branch_name: 'Arundalpet, Guntur',
      company_phone: 'PH: 9949321664,  OFFICE: 8333991114(OR)5',
      upi_id: '9949321664@upi'
    },
    terms: [
      'Items will be ready within 30-45 working days form the date of Approval.',
      'Price ex-works, 60% Advance along with Work Order, 30% against delivery, balance 10% payment after installation',
      'Above rates are excluding of GST, will be applicable @ 18%',
      'Installation/Mechanic/oil of above fixtures on site is not in our scope of work, If it is then it will be charge extra 6-8% on base value for above one lakh, Rs2000 per head below one lakh.',
      'Above rates are excluding of loading, unloading & transportation Charges, It will be charge extra at actuals, Packing charges 4% extra.',
      'Above rates are approximately and are likely to be change, according to the (Market/Rawmaterials) conditions.',
      'This Quotation is valid for 15days from the date of issue.'
    ],
    status: 'Sent',
    notes: 'Official Quotation generated for VARMA (Goyaz Jewellery Pvt Ltd), Khammam.',
    created_at: '2026-09-17T10:00:00.000Z'
  },
  {
    id: 2,
    quote_number: 'SS/QTN/2026/002',
    quote_date: new Date().toISOString().split('T')[0],
    validity_days: 15,
    customer_name: 'Venkata Rao',
    company_name: 'Sri Balaji Engineering Works',
    customer_phone: '+91 98480 77665',
    customer_email: 'balaji.engg@gmail.com',
    customer_address: 'Bypass Road, Guntur, AP 522001',
    customer_gst: '37AADSB5678K1ZQ',
    items: [
      {
        sno: 1,
        image_url: 'product-racks.jpg',
        description: 'Multi-Tier Heavy-Duty Warehouse Pallet Storage Racks (3.5 Ton Capacity per Bay)',
        finish: 'INDUSTRIAL EPOXY POWDER COATING',
        quantity: 6,
        rate: 4200,
        amount: 25200
      },
      {
        sno: 2,
        image_url: 'product-ss-display-mirror.png',
        description: 'Stainless Steel Showroom Mirror Trolleys & Retail Fixtures (Grade 304)',
        finish: 'SS 304 MIRROR POLISH',
        quantity: 2,
        rate: 8800,
        amount: 17600
      }
    ],
    sub_total: 42800,
    packing_charges: 1200,
    gst_rate: 18,
    gst_amount: 7920,
    other_charges: 0,
    other_charges_desc: '',
    grand_total: 51920,
    amount_in_words: 'Rupees Fifty One Thousand Nine Hundred Twenty Only',
    bank_details: {
      bank_name: 'STATE BANK OF INDIA, Arundalpet',
      account_holder: 'SASI STEEL ENGINEERING & WELDING WORKS',
      account_number: '42384233004',
      ifsc_code: 'SBIN0001234',
      branch_name: 'Arundalpet, Guntur',
      company_phone: 'PH: 9949321664, OFFICE: 8333991114(OR)5',
      upi_id: '9949321664@upi'
    },
    terms: [
      'Items will be ready within 30-45 working days form the date of Approval.',
      'Price ex-works, 60% Advance along with Work Order, 30% against delivery, balance 10% payment after installation',
      'Above rates are excluding of GST, will be applicable @ 18%',
      'Installation/Mechanic/oil of above fixtures on site is not in our scope of work, If it is then it will be charge extra 6-8% on base value for above one lakh, Rs2000 per head below one lakh.',
      'Above rates are excluding of loading, unloading & transportation Charges, It will be charge extra at actuals, Packing charges 4% extra.',
      'Above rates are approximately and are likely to be change, according to the (Market/Rawmaterials) conditions.',
      'This Quotation is valid for 15days from the date of issue.'
    ],
    status: 'Approved',
    notes: 'Approved by client. Workshop fabrication scheduled.',
    created_at: new Date().toISOString()
  }
];

// Helper: Convert Number to Indian English Currency Words
function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rupees Zero Only';
  const amount = parseFloat(num);
  if (amount === 0) return 'Rupees Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n) {
    if (n === 0) return '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += ones[hundred] + ' Hundred';
    if (rest > 0) str += (str ? ' ' : '') + convertTwoDigits(rest);
    return str;
  }

  const [rupeesPartStr, paisePartStr] = amount.toFixed(2).split('.');
  let rupees = parseInt(rupeesPartStr, 10);
  const paise = parseInt(paisePartStr, 10);

  if (rupees === 0 && paise > 0) {
    return `Rupees Zero and ${convertTwoDigits(paise)} Paise Only`;
  }

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  const hundred = rupees;

  let result = '';
  if (crore > 0) result += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigits(thousand) + ' Thousand ';
  if (hundred > 0) result += convertThreeDigits(hundred) + ' ';

  result = 'Rupees ' + result.trim();
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only';

  return result.replace(/\s+/g, ' ');
}

// Helper: Generate next Quotation Number (SS/QTN/YYYY/001)
function generateNextQuoteNumber(existingQuotations = []) {
  const currentYear = new Date().getFullYear();
  const prefix = `SS/QTN/${currentYear}/`;
  let highestNum = 0;

  if (Array.isArray(existingQuotations)) {
    existingQuotations.forEach(q => {
      if (q && q.quote_number && typeof q.quote_number === 'string') {
        if (q.quote_number.startsWith(prefix)) {
          const numPart = parseInt(q.quote_number.replace(prefix, ''), 10);
          if (!isNaN(numPart) && numPart > highestNum) {
            highestNum = numPart;
          }
        }
      }
    });
  }

  const nextNum = highestNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// Helper to ensure official 7 terms are always preserved
function sanitizeQuotationTerms(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return [...DEFAULT_QUOTATION_SETTINGS.default_terms];
  }
  const isOldOutdated = terms.some(t => typeof t === 'string' && (
    t.includes('Prices are valid for 15 days from the date of quotation') ||
    t.includes('drawing approval') ||
    t.includes('Guntur jurisdiction only')
  ));
  if (isOldOutdated || terms.length < 7) {
    return [...DEFAULT_QUOTATION_SETTINGS.default_terms];
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

// Quotation Settings CRUD
async function dbGetQuotationSettings() {
  let local = getLocalCollection('sasi_quotation_settings');
  if (!local) {
    saveLocalCollection('sasi_quotation_settings', DEFAULT_QUOTATION_SETTINGS);
    local = DEFAULT_QUOTATION_SETTINGS;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('quotation_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const merged = sanitizeQuotationSettings({ ...DEFAULT_QUOTATION_SETTINGS, ...local, ...data[0] });
        saveLocalCollection('sasi_quotation_settings', merged);
        return merged;
      }
    } catch (e) {
      console.warn("Supabase fetch quotation_settings error:", e);
    }
  }

  const sanitized = sanitizeQuotationSettings(local || DEFAULT_QUOTATION_SETTINGS);
  saveLocalCollection('sasi_quotation_settings', sanitized);
  return sanitized;
}

async function dbSaveQuotationSettings(settings) {
  const current = await dbGetQuotationSettings();
  const updated = sanitizeQuotationSettings({ ...current, ...settings, updated_at: new Date().toISOString() });
  saveLocalCollection('sasi_quotation_settings', updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('quotation_settings').select('id').limit(1);
      if (data && data.length > 0) {
        await client.from('quotation_settings').update(updated).eq('id', data[0].id);
      } else {
        await client.from('quotation_settings').insert([updated]);
      }
    } catch (e) {
      console.warn("Supabase save quotation_settings error:", e);
    }
  }

  return updated;
}

// Quotations List CRUD (Cloud-First Sync)
async function dbGetQuotations() {
  let local = getLocalCollection('sasi_quotations');
  if (local === null) {
    saveLocalCollection('sasi_quotations', DEFAULT_QUOTATIONS);
    local = DEFAULT_QUOTATIONS;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('quotations').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        // De-duplicate remote items
        const cleanRemote = [];
        const seenRemote = new Set();
        for (const item of data) {
          const key = item.quote_number || String(item.id);
          if (!seenRemote.has(key)) {
            seenRemote.add(key);
            cleanRemote.push(item);
          }
        }
        const merged = mergeCollections(cleanRemote, local, 'quote_number');
        const finalQuotes = [];
        const finalSeen = new Set();
        for (const q of merged) {
          const key = q.quote_number || String(q.id);
          if (!finalSeen.has(key)) {
            finalSeen.add(key);
            finalQuotes.push({
              ...q,
              terms: sanitizeQuotationTerms(q.terms)
            });
          }
        }
        saveLocalCollection('sasi_quotations', finalQuotes);
        return finalQuotes;
      }
    } catch (e) {
      console.warn("Supabase fetch quotations error:", e);
    }
  }

  // Deduplicate local
  const finalLocal = [];
  const seenL = new Set();
  (local || []).forEach(q => {
    const key = q.quote_number || String(q.id);
    if (!seenL.has(key)) {
      seenL.add(key);
      finalLocal.push({
        ...q,
        terms: sanitizeQuotationTerms(q.terms)
      });
    }
  });
  return finalLocal;
}

async function dbAddQuotation(quote) {
  const newRow = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    quote_number: quote.quote_number,
    quote_date: quote.quote_date || new Date().toISOString().split('T')[0],
    validity_days: parseInt(quote.validity_days, 10) || 15,
    customer_name: quote.customer_name,
    company_name: quote.company_name || '',
    customer_phone: quote.customer_phone || '',
    customer_email: quote.customer_email || '',
    customer_address: quote.customer_address || '',
    customer_gst: quote.customer_gst || '',
    items: Array.isArray(quote.items) ? quote.items : [],
    sub_total: parseFloat(quote.sub_total) || 0,
    packing_charges: parseFloat(quote.packing_charges) || 0,
    gst_rate: parseFloat(quote.gst_rate) || 0,
    gst_amount: parseFloat(quote.gst_amount) || 0,
    other_charges: parseFloat(quote.other_charges) || 0,
    other_charges_desc: quote.other_charges_desc || '',
    grand_total: parseFloat(quote.grand_total) || 0,
    amount_in_words: quote.amount_in_words || numberToIndianWords(quote.grand_total),
    bank_details: quote.bank_details || null,
    terms: Array.isArray(quote.terms) ? quote.terms : [],
    status: quote.status || 'Draft',
    notes: quote.notes || '',
    created_by: 'Admin'
  };

  const localList = getLocalCollection('sasi_quotations') || [...DEFAULT_QUOTATIONS];
  localList.unshift(newRow);
  saveLocalCollection('sasi_quotations', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { id, ...supabaseRow } = newRow;
      const { data, error } = await client.from('quotations').insert([supabaseRow]).select();
      if (!error && data && data.length > 0) {
        newRow.id = data[0].id;
        const curList = getLocalCollection('sasi_quotations') || [];
        if (curList.length > 0) curList[0].id = data[0].id;
        saveLocalCollection('sasi_quotations', curList);
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Supabase add quotation error:", e);
    }
  }

  return { success: true, data: [newRow] };
}

async function dbUpdateQuotation(id, updatedData) {
  let localList = getLocalCollection('sasi_quotations') || [];
  const existingIndex = localList.findIndex(x => String(x.id) === String(id) || String(x.quote_number) === String(id));

  if (existingIndex !== -1) {
    localList[existingIndex] = {
      ...localList[existingIndex],
      ...updatedData,
      updated_at: new Date().toISOString()
    };
    saveLocalCollection('sasi_quotations', localList);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const isNum = /^\d+$/.test(String(id));
      if (isNum) {
        await client.from('quotations').update(updatedData).eq('id', parseInt(id, 10));
      } else {
        await client.from('quotations').update(updatedData).eq('quote_number', String(id));
      }
    } catch (e) {
      console.warn("Supabase update quotation error:", e);
    }
  }
  return true;
}

async function dbDeleteQuotation(id) {
  let localList = getLocalCollection('sasi_quotations') || [];
  localList = localList.filter(x => String(x.id) !== String(id) && String(x.quote_number) !== String(id));
  saveLocalCollection('sasi_quotations', localList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const isNum = /^\d+$/.test(String(id));
      if (isNum) {
        await client.from('quotations').delete().eq('id', parseInt(id, 10));
      } else {
        await client.from('quotations').delete().eq('quote_number', String(id));
      }
    } catch (e) {
      console.warn("Supabase delete quotation error:", e);
    }
  }
  return true;
}

async function dbDeleteAllQuotations() {
  saveLocalCollection('sasi_quotations', []);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('quotations').select('id');
      if (data && data.length > 0) {
        const ids = data.map(x => x.id);
        await client.from('quotations').delete().in('id', ids);
      }
    } catch (e) {
      console.warn("Supabase delete all quotations error:", e);
    }
  }
  return true;
}

// =========================================================
// 10. CRYPTOGRAPHIC SECURITY PIN AUTHENTICATION ENGINE
// =========================================================

const PIN_SALT = "sasi_steels_secure_salt_v1_2026_";

// Compute salted SHA-256 hash using native Web Crypto API
async function hashSecurityPin(pin) {
  if (!pin) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + String(pin).trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let DEFAULT_PIN_HASH = null;
async function getDefaultPinHash() {
  if (!DEFAULT_PIN_HASH) {
    DEFAULT_PIN_HASH = await hashSecurityPin("1234");
  }
  return DEFAULT_PIN_HASH;
}

// Get the current persistent PIN Hash (from Supabase or persistent local storage)
async function dbGetSecurityPinHash() {
  const local = localStorage.getItem('sasi_security_pin_hash');
  const client = getSupabaseClient();
  
  if (client) {
    try {
      const { data, error } = await client.from('quotation_settings').select('security_pin_hash').limit(1);
      if (!error && data && data.length > 0 && data[0].security_pin_hash) {
        localStorage.setItem('sasi_security_pin_hash', data[0].security_pin_hash);
        return data[0].security_pin_hash;
      }
    } catch (e) {
      console.warn("Supabase fetch pin hash error:", e);
    }
  }

  if (local) return local;

  const defaultHash = await getDefaultPinHash();
  localStorage.setItem('sasi_security_pin_hash', defaultHash);
  return defaultHash;
}

// Verify entered PIN against stored hash
async function dbVerifySecurityPin(enteredPin) {
  if (!enteredPin) return false;
  const inputHash = await hashSecurityPin(enteredPin);
  const storedHash = await dbGetSecurityPinHash();
  return inputHash === storedHash;
}

// Change PIN after verifying current PIN
async function dbChangeSecurityPin(currentPin, newPin) {
  const isValidCurrent = await dbVerifySecurityPin(currentPin);
  if (!isValidCurrent) {
    throw new Error("Current PIN is incorrect. Please try again.");
  }

  const cleanNew = String(newPin || '').trim();
  if (cleanNew.length < 4 || cleanNew.length > 8) {
    throw new Error("New PIN must be between 4 and 8 digits.");
  }

  if (!/^\d+$/.test(cleanNew)) {
    throw new Error("PIN must contain numbers only.");
  }

  const newHash = await hashSecurityPin(cleanNew);
  localStorage.setItem('sasi_security_pin_hash', newHash);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('quotation_settings').select('id').limit(1);
      if (data && data.length > 0) {
        await client.from('quotation_settings').update({ security_pin_hash: newHash, updated_at: new Date().toISOString() }).eq('id', data[0].id);
      } else {
        await client.from('quotation_settings').insert([{ security_pin_hash: newHash, updated_at: new Date().toISOString() }]);
      }
    } catch (e) {
      console.warn("Supabase save pin hash error:", e);
    }
  }

  return true;
}
