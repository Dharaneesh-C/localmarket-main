import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Tamil translations ───────────────────────────────────────────────────────
export const translations = {
  en: {
    // Navbar
    logout: 'Logout',
    settings: 'Settings',
    // BuyerPage
    nearbyProducts: 'Nearby Products 📍',
    merchantsNearby: 'Merchants selling in your area right now',
    browseProducts: 'Browse Products',
    myOrders: 'My Orders',
    searchPlaceholder: 'Search products, merchants...',
    filters: 'Filters',
    refresh: 'Refresh',
    category: 'CATEGORY',
    searchRadius: 'SEARCH RADIUS',
    filterByMerchant: 'Filter by Merchant',
    allMerchants: 'All Merchants',
    sortBy: 'Sort By',
    nearestFirst: '📍 Nearest First',
    priceLowHigh: '₹ Price: Low to High',
    priceHighLow: '₹₹ Price: High to Low',
    clearAll: 'Clear All',
    showing: 'Showing',
    of: 'of',
    products: 'products',
    noProductsFound: 'No products found nearby',
    details: 'Details',
    order: 'Order',
    soldOut: 'Sold Out',
    youAreHere: 'You are here',
    // OrderDialog
    placeOrder: 'Place Order',
    quantity: 'Quantity',
    noteToMerchant: 'Note to merchant (optional)',
    noteHint: 'e.g. Please pack separately',
    total: 'Total',
    locationShared: '📍 Your location will be shared with the merchant',
    cancel: 'Cancel',
    placing: 'Placing...',
    // MyOrders
    noOrdersYet: 'No orders yet',
    ordersWillAppear: 'Your placed orders will appear here',
    repeatOrder: 'Repeat Order',
    confirmCashPayment: '💵 Confirm Cash Payment',
    cashPaymentConfirmed: '💵 Cash payment confirmed',
    reviewSubmitted: 'Review submitted! ⭐',
    rateThisOrder: 'RATE THIS ORDER',
    writeComment: 'Write a comment (optional)',
    submitReview: 'Submit Review',
    // MerchantPage
    welcomeMerchant: 'Welcome',
    manageProducts: 'Manage your products and reach buyers nearby',
    myProfile: 'My Profile',
    analytics: 'Analytics',
    postNewProduct: 'Post New Product',
    totalProducts: 'Total Products',
    activeListings: 'Active Listings',
    paused: 'Paused',
    pendingOrders: 'Pending Orders',
    activeDeliveries: 'Active Deliveries',
    liveOrderLocations: '📍 Live Order Locations',
    buyersWaiting: 'buyers waiting for delivery',
    yourListings: 'Your Listings',
    noProductsYet: 'No products yet',
    postFirstProduct: 'Post your first product to start reaching buyers',
    incomingOrders: 'Incoming Orders',
    iArrivedRingBuyer: "🔔 I've Arrived! Ring Buyer",
    markAsCompleted: '✅ Mark as Completed',
    // Settings
    settingsTitle: 'Settings',
    darkMode: 'Dark Mode',
    language: 'Language',
    english: 'English',
    tamil: 'தமிழ்',
    addressBook: 'Address Book',
    savedAddresses: 'Saved Addresses',
    addAddress: 'Add Address',
    homeLabel: 'Home',
    workLabel: 'Work',
    otherLabel: 'Other',
    addressLabel: 'Label (e.g. Home)',
    addressText: 'Address',
    saveAddress: 'Save Address',
    upiId: 'UPI ID',
    upiHint: 'e.g. yourname@upi',
    scanToPay: 'Scan to Pay',
    payAmount: 'Pay ₹',
    // Status
    pending: '⏳ Pending',
    accepted: '✅ Accepted',
    rejected: '❌ Rejected',
    completed: '🎉 Completed',
  },
  ta: {
    // Navbar
    logout: 'வெளியேறு',
    settings: 'அமைப்புகள்',
    // BuyerPage
    nearbyProducts: 'அருகிலுள்ள பொருட்கள் 📍',
    merchantsNearby: 'உங்கள் பகுதியில் இப்போது விற்பனையாளர்கள்',
    browseProducts: 'பொருட்கள் பார்க்க',
    myOrders: 'என் ஆர்டர்கள்',
    searchPlaceholder: 'பொருட்கள், வணிகர்களை தேடுங்கள்...',
    filters: 'வடிகட்டி',
    refresh: 'புதுப்பி',
    category: 'வகை',
    searchRadius: 'தேடல் தூரம்',
    filterByMerchant: 'வணிகரால் வடிகட்டு',
    allMerchants: 'அனைத்து வணிகர்கள்',
    sortBy: 'வரிசைப்படுத்து',
    nearestFirst: '📍 அருகிலிருப்பது முதலில்',
    priceLowHigh: '₹ விலை: குறைவிலிருந்து அதிகம்',
    priceHighLow: '₹₹ விலை: அதிகத்திலிருந்து குறைவு',
    clearAll: 'அனைத்தும் நீக்கு',
    showing: 'காட்டுகிறது',
    of: 'இல்',
    products: 'பொருட்கள்',
    noProductsFound: 'அருகில் பொருட்கள் இல்லை',
    details: 'விவரங்கள்',
    order: 'ஆர்டர்',
    soldOut: 'விற்றுத் தீர்ந்தது',
    youAreHere: 'நீங்கள் இங்கே இருக்கிறீர்கள்',
    // OrderDialog
    placeOrder: 'ஆர்டர் செய்',
    quantity: 'அளவு',
    noteToMerchant: 'வணிகருக்கு குறிப்பு (விரும்பினால்)',
    noteHint: 'எ.கா. தனியே பொட்டலம் செய்யவும்',
    total: 'மொத்தம்',
    locationShared: '📍 உங்கள் இடம் வணிகரிடம் பகிரப்படும்',
    cancel: 'ரத்து செய்',
    placing: 'ஆர்டர் செய்கிறோம்...',
    // MyOrders
    noOrdersYet: 'இன்னும் ஆர்டர்கள் இல்லை',
    ordersWillAppear: 'உங்கள் ஆர்டர்கள் இங்கே தெரியும்',
    repeatOrder: 'மீண்டும் ஆர்டர்',
    confirmCashPayment: '💵 பண பரிவர்த்தனை உறுதிப்படுத்து',
    cashPaymentConfirmed: '💵 பண பரிவர்த்தனை உறுதிப்படுத்தப்பட்டது',
    reviewSubmitted: 'மதிப்பீடு சமர்ப்பிக்கப்பட்டது! ⭐',
    rateThisOrder: 'இந்த ஆர்டரை மதிப்பிடுங்கள்',
    writeComment: 'கருத்து எழுதுங்கள் (விரும்பினால்)',
    submitReview: 'மதிப்பீடு சமர்ப்பி',
    // MerchantPage
    welcomeMerchant: 'வணக்கம்',
    manageProducts: 'உங்கள் பொருட்களை நிர்வகித்து வாங்குபவர்களை அடையுங்கள்',
    myProfile: 'என் சுயவிவரம்',
    analytics: 'பகுப்பாய்வு',
    postNewProduct: 'புதிய பொருள் இடு',
    totalProducts: 'மொத்த பொருட்கள்',
    activeListings: 'செயலில் உள்ளவை',
    paused: 'நிறுத்தப்பட்டவை',
    pendingOrders: 'நிலுவையில் உள்ள ஆர்டர்கள்',
    activeDeliveries: 'செயலில் உள்ள டெலிவரிகள்',
    liveOrderLocations: '📍 நேரடி ஆர்டர் இடங்கள்',
    buyersWaiting: 'வாங்குபவர்கள் டெலிவரிக்காக காத்திருக்கிறார்கள்',
    yourListings: 'உங்கள் பட்டியல்கள்',
    noProductsYet: 'இன்னும் பொருட்கள் இல்லை',
    postFirstProduct: 'வாங்குபவர்களை அடைய உங்கள் முதல் பொருளை இடுங்கள்',
    incomingOrders: 'வரும் ஆர்டர்கள்',
    iArrivedRingBuyer: '🔔 வந்துவிட்டேன்! வாங்குபவரை அழை',
    markAsCompleted: '✅ முடிந்தது என்று குறி',
    // Settings
    settingsTitle: 'அமைப்புகள்',
    darkMode: 'இரவு முறை',
    language: 'மொழி',
    english: 'English',
    tamil: 'தமிழ்',
    addressBook: 'முகவரி புத்தகம்',
    savedAddresses: 'சேமித்த முகவரிகள்',
    addAddress: 'முகவரி சேர்',
    homeLabel: 'வீடு',
    workLabel: 'வேலை',
    otherLabel: 'மற்றவை',
    addressLabel: 'பெயர் (எ.கா. வீடு)',
    addressText: 'முகவரி',
    saveAddress: 'முகவரி சேமி',
    upiId: 'UPI ஐடி',
    upiHint: 'எ.கா. yourname@upi',
    scanToPay: 'ஸ்கேன் செய்து பணம் செலுத்துங்கள்',
    payAmount: '₹ செலுத்துங்கள்',
    // Status
    pending: '⏳ நிலுவையில்',
    accepted: '✅ ஏற்றுக்கொள்ளப்பட்டது',
    rejected: '❌ நிராகரிக்கப்பட்டது',
    completed: '🎉 முடிந்தது',
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children, onThemeChange }) {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem('nearsell_lang') || 'en'
  );
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem('nearsell_dark') === 'true'
  );

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ta' : 'en';
    setLanguage(next);
    localStorage.setItem('nearsell_lang', next);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('nearsell_dark', String(next));
    onThemeChange?.(next);
  };

  return (
    <SettingsContext.Provider value={{ language, darkMode, t, toggleLanguage, toggleDarkMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
