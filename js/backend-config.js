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

// Initialize Supabase Client
let supabase = window.supabase ? window.supabase.createClient(BACKEND_CONFIG.SUPABASE_URL, BACKEND_CONFIG.SUPABASE_ANON_KEY) : null;

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
  if (!supabase) return { success: false, error: "Supabase not initialized" };
  const { data, error } = await supabase
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
}

async function dbGetInquiries() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}

async function dbUpdateInquiryStatus(id, newStatus) {
  if (!supabase) return false;
  const { error } = await supabase.from('inquiries').update({ status: newStatus }).eq('id', id);
  return !error;
}

async function dbDeleteInquiry(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('inquiries').delete().eq('id', id);
  return !error;
}

// 3. SUPABASE ATTENDANCE CRUD
async function dbGetAttendance(date = null) {
  if (!supabase) return [];
  let query = supabase.from('attendance').select('*').order('created_at', { ascending: false });
  if (date) query = query.eq('attendance_date', date);
  const { data, error } = await query;
  return error ? [] : data;
}

async function dbAddAttendance(record) {
  if (!supabase) return { success: false };
  const { data, error } = await supabase.from('attendance').insert([record]).select();
  return { success: !error, data, error };
}

async function dbUpdateAttendance(id, updates) {
  if (!supabase) return false;
  const { error } = await supabase.from('attendance').update(updates).eq('id', id);
  return !error;
}

async function dbDeleteAttendance(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return !error;
}

// 4. SUPABASE INVENTORY CRUD
async function dbGetInventory() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inventory').select('*').order('item_name', { ascending: true });
  return error ? [] : data;
}

async function dbAddInventory(item) {
  if (!supabase) return { success: false };
  const { data, error } = await supabase.from('inventory').insert([item]).select();
  return { success: !error, data, error };
}

async function dbUpdateInventory(id, updates) {
  if (!supabase) return false;
  const { error } = await supabase.from('inventory').update(updates).eq('id', id);
  return !error;
}

async function dbDeleteInventory(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  return !error;
}

// 5. SUPABASE FINANCE (INCOME & EXPENSES) CRUD
async function dbGetFinance() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('finance').select('*').order('transaction_date', { ascending: false });
  return error ? [] : data;
}

async function dbAddFinance(entry) {
  if (!supabase) return { success: false };
  const { data, error } = await supabase.from('finance').insert([entry]).select();
  return { success: !error, data, error };
}

async function dbUpdateFinance(id, updates) {
  if (!supabase) return false;
  const { error } = await supabase.from('finance').update(updates).eq('id', id);
  return !error;
}

async function dbDeleteFinance(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('finance').delete().eq('id', id);
  return !error;
}

// 6. SUPABASE PRODUCTS CRUD
async function dbGetProducts() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}

async function dbAddProduct(prod) {
  if (!supabase) return { success: false };
  const { data, error } = await supabase.from('products').insert([prod]).select();
  return { success: !error, data, error };
}

async function dbUpdateProduct(id, updates) {
  if (!supabase) return false;
  const { error } = await supabase.from('products').update(updates).eq('id', id);
  return !error;
}

async function dbDeleteProduct(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('products').delete().eq('id', id);
  return !error;
}

// 7. SUPABASE GALLERY CRUD
async function dbGetGallery() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}

async function dbAddGalleryItem(item) {
  if (!supabase) return { success: false };
  const { data, error } = await supabase.from('gallery').insert([item]).select();
  return { success: !error, data, error };
}

async function dbDeleteGalleryItem(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  return !error;
}
