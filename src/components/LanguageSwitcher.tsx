import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ur", label: "اردو" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition-colors"
        style={{ color: isDark ? '#d1d5db' : '#475569' }}
        aria-label="Change Language"
      >
        <Globe className="w-5 h-5" />
        <span className="text-sm font-medium uppercase hidden md:block">
          {i18n.language}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-32 rounded-lg shadow-xl overflow-hidden z-50"
            style={{
              background: isDark ? '#111827' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
            }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="w-full text-left px-4 py-2 text-sm transition-colors"
                style={{
                  background: i18n.language === lang.code
                    ? (isDark ? 'rgba(157,108,48,0.2)' : '#f2e2bd')
                    : 'transparent',
                  color: i18n.language === lang.code
                    ? (isDark ? '#e2c17f' : '#8b5e2c')
                    : (isDark ? '#d1d5db' : '#334155'),
                  fontWeight: i18n.language === lang.code ? 600 : 400,
                }}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
