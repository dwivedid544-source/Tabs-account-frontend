import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', rtl: true },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
];

export const getLangFromCountry = (countryName) => {
    if (!countryName) return 'en';
    const c = countryName.toLowerCase().trim();

    // Arabic-speaking countries
    if (
        c.includes('saudi') || c.includes('emirates') || c.includes('uae') ||
        c.includes('qatar') || c.includes('kuwait') || c.includes('oman') ||
        c.includes('bahrain') || c.includes('jordan') || c.includes('lebanon') ||
        c.includes('iraq') || c.includes('yemen') || c.includes('egypt') ||
        c.includes('morocco') || c.includes('algeria') || c.includes('tunisia') ||
        c.includes('sudan') || c.includes('libya') || c.includes('palestine') ||
        c.includes('syria') || c.includes('mauritania') || c.includes('somalia') ||
        c.includes('djibouti')
    ) {
        return 'ar';
    }

    // Hindi-speaking country
    if (c.includes('india')) {
        return 'hi';
    }

    // French-speaking countries
    if (
        c.includes('france') || c.includes('belgium') || c.includes('congo') ||
        c.includes('senegal') || c.includes('ivory coast') || c.includes('côte d\'ivoire') ||
        c.includes('cameroon') || c.includes('gabon') || c.includes('mali') ||
        c.includes('niger') || c.includes('burkina') || c.includes('guinea') ||
        c.includes('benin') || c.includes('togo') || c.includes('haiti') ||
        c.includes('monaco') || c.includes('luxembourg')
    ) {
        return 'fr';
    }

    // Spanish-speaking countries
    if (
        c.includes('spain') || c.includes('mexico') || c.includes('argentina') ||
        c.includes('colombia') || c.includes('chile') || c.includes('peru') ||
        c.includes('venezuela') || c.includes('ecuador') || c.includes('guatemala') ||
        c.includes('cuba') || c.includes('bolivia') || c.includes('dominican') ||
        c.includes('honduras') || c.includes('paraguay') || c.includes('el salvador') ||
        c.includes('nicaragua') || c.includes('costa rica') || c.includes('panama') ||
        c.includes('uruguay')
    ) {
        return 'es';
    }

    // German-speaking countries
    if (
        c.includes('germany') || c.includes('austria') || c.includes('liechtenstein') ||
        c.includes('switzerland')
    ) {
        return 'de';
    }

    return 'en';
};

const setGoogTransCookie = (targetLang) => {
    const domain = window.location.hostname;
    const cookieVal = `/en/${targetLang}`;

    // Clear old googtrans cookie variations
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;

    if (targetLang === 'en') {
        document.cookie = `googtrans=/en/en; path=/;`;
        document.cookie = `googtrans=/en/en; path=/; domain=${domain};`;
    } else {
        // Universal path=/ cookie for live HTTPS deployment
        document.cookie = `googtrans=${cookieVal}; path=/;`;
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${domain};`;

        if (domain && domain !== 'localhost' && !domain.includes('127.0.0.1')) {
            const parts = domain.split('.');
            if (parts.length >= 2) {
                const rootDomain = '.' + parts.slice(-2).join('.');
                document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain};`;
            }
        }
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('appLanguageCode') || 'en';
    });

    useEffect(() => {
        const savedLang = localStorage.getItem('appLanguageCode') || 'en';

        // Ensure googtrans cookie is set BEFORE Google Translate script loads
        setGoogTransCookie(savedLang);

        // Apply HTML dir attribute for Arabic layout
        if (savedLang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
            document.body.classList.add('rtl-mode');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', savedLang);
            document.body.classList.remove('rtl-mode');
        }

        // Initialize Google Translate Script safely once with HTTPS URL
        if (!document.getElementById('google-translate-script')) {
            window.googleTranslateElementInit = () => {
                if (window.google && window.google.translate) {
                    new window.google.translate.TranslateElement({
                        pageLanguage: 'en',
                        includedLanguages: 'en,ar,hi,fr,es,de',
                        autoDisplay: false
                    }, 'google_translate_element');
                }
            };

            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.head.appendChild(script);
        }

        // Background interval to clean up Google Translate top banners and icons
        const interval = setInterval(() => {
            const bannerFrame = document.querySelector('.goog-te-banner-frame') || document.querySelector('iframe.goog-te-banner-frame');
            if (bannerFrame) {
                bannerFrame.style.display = 'none';
                bannerFrame.style.visibility = 'hidden';
            }

            const injectedIcons = document.querySelectorAll('.goog-te-gadget-icon, .goog-te-gadget, img[src*="translate.googleapis.com"]');
            injectedIcons.forEach(el => {
                if (el && el.id !== 'tab-accounts-logo' && el.id !== 'zirak-logo') {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            });

            if (document.body && document.body.style.top !== '0px') {
                document.body.style.top = '0px';
            }
        }, 150);

        return () => clearInterval(interval);
    }, []);

    const applyLanguage = (code) => {
        const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === code) ? code : 'en';
        const currentSavedLang = localStorage.getItem('appLanguageCode');

        setLanguageState(targetLang);
        localStorage.setItem('appLanguageCode', targetLang);

        const matchedObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
        if (matchedObj) {
            localStorage.setItem('selectedLanguage', matchedObj.name);
        }

        // Set googtrans cookie across live domain scopes
        setGoogTransCookie(targetLang);

        // Handle RTL layout for Arabic
        if (targetLang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
            document.body.classList.add('rtl-mode');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', targetLang);
            document.body.classList.remove('rtl-mode');
        }

        // Dispatch change event to Google Translate combo box if mounted
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
            combo.value = targetLang;
            combo.dispatchEvent(new Event('change'));
        }

        // Instant refresh on language change to parse new googtrans cookie cleanly on live production
        if (currentSavedLang !== targetLang) {
            window.location.reload();
        }
    };

    const changeLanguageByCountry = (countryName) => {
        const mappedLang = getLangFromCountry(countryName);
        applyLanguage(mappedLang);
    };

    return (
        <LanguageContext.Provider value={{
            language,
            changeLanguage: applyLanguage,
            changeLanguageByCountry,
            supportedLanguages: SUPPORTED_LANGUAGES,
            t: (key) => key
        }}>
            {/* Hidden container for Google Translate element */}
            <div id="google_translate_element" style={{ display: 'none', position: 'absolute', top: '-9999px' }}></div>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        return {
            language: 'en',
            changeLanguage: () => {},
            changeLanguageByCountry: () => {},
            supportedLanguages: SUPPORTED_LANGUAGES,
            t: (key) => key
        };
    }
    return context;
};

export default LanguageContext;
