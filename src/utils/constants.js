export const APP_NAME = 'Enrico Cerrini';
export const APP_DESCRIPTION = 'To\'liq kiyim do\'koni boshqaruv tizimi';

export const CURRENCY = 'UZS';
export const LOCALE = 'uz-UZ';

// Financial constants
export const DEFAULT_DISCOUNT = 0;

// API configuration
export const API_CONFIG = {
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Search and pagination
export const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300,
  DEFAULT_LIMIT: 20,
  // Hard ceiling enforced by the API (`size` is validated as le=100); asking for
  // more makes the request fail validation instead of returning extra rows.
  MAX_LIMIT: 100,
};

// Payment methods
export const PAYMENT_METHODS = {
  FULL: 'full',
  PARTIAL: 'partial',
  DEBT: 'debt',
  CASH: 'cash',
  TRANSFER: 'transfer',
  CARD: 'card',
};

export const PAY_TYPE_LABELS = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };

// Modal sizes
export const MODAL_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge',
};

export const API_ENDPOINTS = {
  AUTH: '/auth',
  PRODUCTS: '/products',
  CLIENTS: '/clients',
  SALES: '/sales',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  FINANCE: '/finance',
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CHECKOUT: '/checkout',
  LOOKUP: '/lookup',
  SALES: '/sales',
  INVENTORY: '/inventory',
  CLIENTS: '/clients',
  FINANCE: '/finance',
  MARKETING: '/marketing',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  DEBTS: '/debts',
  EMPLOYEES: '/employees',
  SETTINGS_CATEGORIES: '/settings/categories',
  SETTINGS_BRANDS: '/settings/brands',
  SETTINGS_COLORS: '/settings/colors',
  SETTINGS_SIZES: '/settings/sizes',
  SETTINGS_SEASONS: '/settings/seasons',
};

// Admins and managers see everything; cashiers (role "user") only sell, manage
// clients and collect debts. The backend enforces the same split.
export const STAFF_ROLES = ['admin', 'manager'];
export const isStaff = (user) => STAFF_ROLES.includes(user?.role);

// Flat list (Header looks titles up by href); `group` drives sidebar sections.
// Items with no group render at the top without a heading.
export const NAVIGATION_ITEMS = [
  { name: 'Analitika', href: ROUTES.DASHBOARD, icon: 'Home', staffOnly: true },
  { name: 'Sotuv', href: ROUTES.CHECKOUT, icon: 'ShoppingCart', group: 'Savdo' },
  { name: 'Mahsulot qidirish', href: ROUTES.LOOKUP, icon: 'ScanSearch', group: 'Savdo' },
  { name: 'Mijozlar', href: ROUTES.CLIENTS, icon: 'Users', group: 'Savdo' },
  { name: 'Qarzdorliklar', href: ROUTES.DEBTS, icon: 'AlertCircle', group: 'Savdo' },
  { name: 'Sotuvlar', href: ROUTES.SALES, icon: 'Receipt', staffOnly: true, group: 'Hisob-kitob' },
  { name: 'Xarajatlar', href: ROUTES.FINANCE, icon: 'DollarSign', staffOnly: true, group: 'Hisob-kitob' },
  { name: 'Hisobotlar', href: ROUTES.REPORTS, icon: 'BarChart3', staffOnly: true, group: 'Hisob-kitob' },
  { name: 'Xodimlar', href: ROUTES.EMPLOYEES, icon: 'UserCheck', staffOnly: true, group: 'Boshqaruv' },
  { name: 'Inventar', href: ROUTES.INVENTORY, icon: 'Package', staffOnly: true, group: 'Boshqaruv' },
  { name: 'Marketing', href: ROUTES.MARKETING, icon: 'MessageSquare', staffOnly: true, group: 'Boshqaruv' },
  { name: 'Sozlamalar', href: ROUTES.SETTINGS, icon: 'Settings', staffOnly: true, group: 'Boshqaruv' },
];

export const SETTINGS_ITEMS = [
  {
    name: 'Sozlamalar',
    action: 'settings',
  },
  {
    name: 'Tizim sozlamalari',
    action: 'systemConfig',
  },
  {
    name: 'Foydalanuvchilarni boshqarish',
    action: 'userManagement',
  },
];

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
};

export const DATE_FORMATS = {
  DISPLAY: 'dd MMMM yyyy',
  SHORT: 'dd.MM.yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd.MM.yyyy HH:mm',
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Serverga ulanishda xatolik. Backend server ishga tushganligini tekshiring.',
  AUTHENTICATION_FAILED: 'Autentifikatsiya muvaffaqiyatsiz',
  VALIDATION_ERROR: 'Ma\'lumotlarni to\'g\'ri kiriting',
  PRODUCT_NOT_FOUND: 'Bu SKU kodiga mos mahsulot topilmadi',
  PRODUCT_OUT_OF_STOCK: 'Bu mahsulot omborda mavjud emas',
  CLIENT_REQUIRED: 'Iltimos, mijozni tanlang yoki yangi mijoz ismini kiriting',
  CART_EMPTY: 'Iltimos, savatga mahsulot qo\'shing',
  PAYMENT_VALIDATION: {
    FULL_PAYMENT_ENTERED: 'To\'liq to\'lov kiritilgan. To\'liq to\'lov usulini tanlang.',
    AMOUNT_REQUIRED: 'Iltimos, to\'langan summani kiriting.',
    CLIENT_DEBT: 'Mijozning mavjud qarzi:',
  },
};

// Success messages
export const SUCCESS_MESSAGES = {
  OPERATION_SUCCESSFUL: 'Operatsiya muvaffaqiyatli',
  SALE_CREATED: 'Sotuv muvaffaqiyatli amalga oshirildi',
  CLIENT_CREATED: 'Mijoz muvaffaqiyatli qo\'shildi',
  PRODUCT_CREATED: 'Mahsulot muvaffaqiyatli qo\'shildi',
}; 
// Uzbek labels for the backend's canonical expense categories. Without these the
// finance filter and table print raw keys like "daily_expenses" to the user.
export const EXPENSE_CATEGORY_LABELS = {
  supplier_costs: 'Yetkazib beruvchi xarajatlari',
  daily_expenses: 'Kunlik xarajatlar',
  salary: 'Ish haqi',
  rent: 'Ijara',
  utilities: 'Kommunal xizmatlar',
  marketing: 'Marketing',
  maintenance: 'Ta\'mirlash',
  other: 'Boshqa',
};

export const expenseCategoryLabel = (key) => EXPENSE_CATEGORY_LABELS[key] || key;
