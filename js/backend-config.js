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
    window.sasiSupabaseClient = window.supabase.createClient(BACKEND_CONFIG.SUPABASE_URL, BACKEND_CONFIG.SUPABASE_ANON_KEY);
    return window.sasiSupabaseClient;
  }
  return null;
}

// SHA-1 Helper for Cloudinary Signed Uploads
async function generateSha1(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
      console.warn("Signed upload failed, trying unsigned fallback preset...", data);
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

// 2. SUPABASE INQUIRIES & QUOTATIONS CRUD
async function dbSubmitInquiry(inquiryData) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "Supabase not loaded" };
  try {
    const { data, error } = await client
      .from('inquiries')
      .insert([{
        client_name: inquiryData.name || inquiryData.client_name,
        client_phone: inquiryData.phone || inquiryData.client_phone,
        client_email: inquiryData.email || inquiryData.client_email || null,
        project_type: inquiryData.projectType || inquiryData.project_type || 'General Fabrication',
        project_scope: inquiryData.scope || inquiryData.project_scope || 'Custom Dimensions',
        estimated_cost: inquiryData.estimatedCost || inquiryData.estimated_cost || 'Contact for Quote',
        blueprint_url: inquiryData.blueprintUrl || inquiryData.blueprint_url || null,
        message: inquiryData.message || null,
        status: 'New'
      }])
      .select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbGetInquiries() {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('inquiries').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Inquiries fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Inquiries error:", e);
    return [];
  }
}

async function dbUpdateInquiryStatus(id, newStatus) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('inquiries').update({ status: newStatus }).eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

async function dbDeleteInquiry(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('inquiries').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

// 3. SUPABASE ATTENDANCE CRUD
async function dbGetAttendance(date = null) {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let query = client.from('attendance').select('*').order('created_at', { ascending: false });
    if (date) query = query.eq('attendance_date', date);
    const { data, error } = await query;
    if (error) {
      console.warn("Attendance fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Attendance error:", e);
    return [];
  }
}

async function dbAddAttendance(record) {
  const client = getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { data, error } = await client.from('attendance').insert([record]).select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbDeleteAttendance(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('attendance').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

// 4. SUPABASE INVENTORY CRUD
async function dbGetInventory() {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('inventory').select('*').order('item_name', { ascending: true });
    if (error) {
      console.warn("Inventory fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Inventory error:", e);
    return [];
  }
}

async function dbAddInventory(item) {
  const client = getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { data, error } = await client.from('inventory').insert([item]).select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbDeleteInventory(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('inventory').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

// 5. SUPABASE FINANCE (INCOME & EXPENSES) CRUD
async function dbGetFinance() {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('finance').select('*').order('transaction_date', { ascending: false });
    if (error) {
      console.warn("Finance fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Finance error:", e);
    return [];
  }
}

async function dbAddFinance(entry) {
  const client = getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { data, error } = await client.from('finance').insert([entry]).select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbDeleteFinance(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('finance').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

// 6. SUPABASE PRODUCTS CRUD
async function dbGetProducts() {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Products fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Products error:", e);
    return [];
  }
}

async function dbAddProduct(prod) {
  const client = getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { data, error } = await client.from('products').insert([prod]).select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbDeleteProduct(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('products').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}

// 7. SUPABASE GALLERY CRUD
async function dbGetGallery() {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('gallery').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Gallery fetch notice:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Gallery error:", e);
    return [];
  }
}

async function dbAddGalleryItem(item) {
  const client = getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { data, error } = await client.from('gallery').insert([item]).select();
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
}

async function dbDeleteGalleryItem(id) {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('gallery').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
}
