import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// Dictionary: English (with intuitive Pakistani Roman Urdu industrial terms) & authentic Nastaleeq Urdu
export const TRANSLATIONS = {
  // Navigation & Branding
  brand_title: {
    en: "Rana Shahab Marble Factory",
    ur: "رانا شہاب ماربل فیکٹری"
  },
  brand_subtitle: {
    en: "Granite & Tiles ERP",
    ur: "گرینائٹ و ٹائلز مینجمنٹ"
  },
  nav_dashboard: {
    en: "Dashboard (Karkhana)",
    ur: "ڈیش بورڈ (کارخانہ جائزہ)"
  },
  nav_billing: {
    en: "Naya Bill (POS)",
    ur: "نیا بل بک (سیلز)"
  },
  nav_invoices: {
    en: "Bill Book & Invoices",
    ur: "بل بک ریکارڈ و ہسٹری"
  },
  nav_stock: {
    en: "Marble & Tiles Stock",
    ur: "ماربل و ٹائلز اسٹاک"
  },
  nav_stock_sheet: {
    en: "Stock Sheet & Audit",
    ur: "اسٹاک لیجر و آڈٹ"
  },
  nav_customers: {
    en: "Digital Khata (Customers)",
    ur: "ڈیجیٹل کھاتہ (گاہک)"
  },
  nav_gate_pass: {
    en: "Rickshaw Gate Pass",
    ur: "رکشہ گیٹ پاس و ڈسپیچ"
  },
  nav_expenses: {
    en: "Rozana Kharch (Expenses)",
    ur: "روزانہ اخراجات و کیش"
  },
  nav_sales_reports: {
    en: "Sales & Munafa Reports",
    ur: "سیلز رپورٹس و منافع"
  },
  nav_employees: {
    en: "Workers & 10% Increment",
    ur: "ملازمین، تنخواہ و سالانہ اضافہ"
  },
  nav_zakat: {
    en: "Mahana Zakat Fund",
    ur: "ماہانہ زکوٰۃ فنڈ"
  },
  nav_suppliers: {
    en: "Supplier Purchases",
    ur: "سپلائر مال آمد"
  },
  nav_returns: {
    en: "Wapsi & Factory Wastage",
    ur: "واپسی مال و کٹائی نقصان"
  },
  nav_settings: {
    en: "Factory Settings",
    ur: "فیکٹری ترتیبات و بیک اپ"
  },

  // Header
  header_clock: {
    en: "Live Factory Time",
    ur: "فیکٹری وقت"
  },
  header_cash_in_hand: {
    en: "Draz Cash (In Hand)",
    ur: "دراز کیش (موجودہ)"
  },
  btn_new_bill: {
    en: "Naya Bill (F2)",
    ur: "نیا بل (F2)"
  },
  btn_backup: {
    en: "Data Backup",
    ur: "ڈیٹا بیک اپ"
  },
  btn_dark: {
    en: "Dark",
    ur: "ڈارک موڈ"
  },
  btn_light: {
    en: "Light",
    ur: "لائٹ موڈ"
  },
  user_admin: {
    en: "Munshi / Admin",
    ur: "منشی / ایڈمن"
  },
  btn_logout: {
    en: "Sign Out",
    ur: "لاگ آؤٹ"
  },

  // Dashboard Specific
  dash_badge: {
    en: "RANA SHAHAB FACTORY",
    ur: "رانا شہاب ماربل فیکٹری"
  },
  dash_title: {
    en: "Marble Karkhana Overview",
    ur: "ماربل کارخانہ لائیو آپریشنز"
  },
  dash_subtitle: {
    en: "Live sales, Roznamcha drawer cash, Udhar receivables & low stock alerts.",
    ur: "روزانہ سیلز، دراز کیش، ادھار بقایا جات اور اسٹاک الرٹس کا فوری جائزہ۔"
  },

  // Quick Action Buttons (Fitts's Law)
  action_new_sale: {
    en: "Naya Bill (POS)",
    ur: "نیا بل بک"
  },
  action_new_sale_sub: {
    en: "Branded Marble / Tile Sale",
    ur: "فیکٹری بل جاری کریں"
  },
  action_add_expense: {
    en: "Rozana Kharch",
    ur: "روزانہ خرچ درج کریں"
  },
  action_add_expense_sub: {
    en: "Khana, Petrol, Advance",
    ur: "کھانا، ایندھن، پیشگی"
  },
  action_gate_pass: {
    en: "Rickshaw Gate Pass",
    ur: "رکشہ گیٹ پاس"
  },
  action_gate_pass_sub: {
    en: "Mal Dispatch Slip",
    ur: "ڈسپیچ پرچی بنائیں"
  },
  action_khata_wasooli: {
    en: "Khata Wasooli",
    ur: "ادھار وصولی"
  },
  action_khata_wasooli_sub: {
    en: "Customer Udhar Recovery",
    ur: "گاہک سے وصولی درج کریں"
  },

  // 4 Primary KPI Cards
  kpi_total_sales: {
    en: "Kul Factory Sales",
    ur: "کل فیکٹری سیلز"
  },
  kpi_total_sales_sub: {
    en: "Total Billed Turnover",
    ur: "کل جاری کردہ بل"
  },
  kpi_cash_received: {
    en: "Kul Wasooli (Cash In)",
    ur: "کل وصولی (کیش آمد)"
  },
  kpi_cash_received_sub: {
    en: "Cash & Bank Recoveries",
    ur: "کیش و بینک ادائیگی"
  },
  kpi_udhar_due: {
    en: "Udhar Baqaya (Receivables)",
    ur: "کل ادھار بقایا (واجب الوصول)"
  },
  kpi_udhar_due_sub: {
    en: "Active Customer Dues",
    ur: "مارکیٹ بقایا کھاتہ"
  },
  kpi_yard_stock: {
    en: "Karkhana Yard Stock",
    ur: "کارخانہ یارڈ اسٹاک"
  },
  kpi_yard_stock_sub: {
    en: "Estimated Yard Valuation",
    ur: "تخمینہ شدہ مالیت"
  },

  // Roznamcha / Live Drawer Widget
  drawer_title: {
    en: "Roznamcha: Live Cash Drawer",
    ur: "روزنامچہ: کیش دراز لائیو حساب"
  },
  drawer_opening: {
    en: "Subah Ka Cash (Opening)",
    ur: "صبح کا کیش (اوپننگ)"
  },
  drawer_sales_cash: {
    en: "Aaj Ki Naqad Sale",
    ur: "آج کی نقد سیل"
  },
  drawer_wasooli: {
    en: "Udhar Wasooli (Today)",
    ur: "آج کی ادھار وصولی"
  },
  drawer_expenses: {
    en: "Aaj Ka Kharch (Expenses)",
    ur: "آج کا کل خرچ"
  },
  drawer_live_total: {
    en: "Draz Mein Mojood Cash",
    ur: "دراز میں موجود نقد رقم"
  },
  drawer_status_active: {
    en: "Cash In Drawer Reconciled",
    ur: "کیش دراز کا بیلنس درست ہے"
  },

  // Tables
  table_recent_invoices: {
    en: "Taza Tareen Bills (Recent)",
    ur: "تازہ ترین بل بک ریکارڈ"
  },
  table_btn_view_all: {
    en: "Puri List Dekhein",
    ur: "تمام بل دیکھیں"
  },
  table_col_inv: {
    en: "Bill #",
    ur: "بل نمبر"
  },
  table_col_customer: {
    en: "Gahak (Customer)",
    ur: "نام گاہک"
  },
  table_col_total: {
    en: "Kul Raqam",
    ur: "کل رقم"
  },
  table_col_paid: {
    en: "Wasool Shuda",
    ur: "وصول شدہ"
  },
  table_col_balance: {
    en: "Udhar Baqaya",
    ur: "بقایا ادھار"
  },
  table_col_status: {
    en: "Status",
    ur: "کیفیت"
  },
  table_col_print: {
    en: "Print",
    ur: "پرنٹ"
  },
  table_empty_invoices: {
    en: "Abhi koi bill nahi bana. Naya Bill banayein.",
    ur: "ابھی تک کوئی بل ریکارڈ نہیں ہوا۔ نیا بل بنائیں۔"
  },

  // Low Stock
  table_low_stock: {
    en: "Khatam Honay Wala Maal (Alert)",
    ur: "کم اسٹاک الرٹس (فوری طلب)"
  },
  table_btn_all_stock: {
    en: "Stock Sheet",
    ur: "اسٹاک شیٹ"
  },
  alert_all_healthy: {
    en: "Karkhana stock bilkul theek hai!",
    ur: "تمام ماربل اور ٹائلز اسٹاک تسلی بخش ہے!"
  },
  tag_min_alert: {
    en: "Kam az kam limit:",
    ur: "کم از کم حد:"
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('app_language', language);

    if (language === 'ur') {
      document.body.classList.add('lang-ur');
    } else {
      document.body.classList.remove('lang-ur');
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ur' : 'en'));
  };

  const t = (key, fallback = '') => {
    if (TRANSLATIONS[key] && TRANSLATIONS[key][language]) {
      return TRANSLATIONS[key][language];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
