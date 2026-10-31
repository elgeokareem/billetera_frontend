import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage } from "../i18n";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();

  return (
    <div role="group" aria-label={t("common.language")} className="language-switch">
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          aria-pressed={i18n.language === language}
          onClick={() => setLanguage(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
