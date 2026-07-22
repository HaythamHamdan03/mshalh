import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FactoryLang = 'ar' | 'ur';

interface LangState {
  factoryLang: FactoryLang;
  setFactoryLang: (lang: FactoryLang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      factoryLang: 'ar',
      setFactoryLang: (lang) => set({ factoryLang: lang }),
    }),
    { name: 'mshalh-lang' }
  )
);
