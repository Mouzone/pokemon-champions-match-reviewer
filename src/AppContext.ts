import { createContext } from 'react';

export const AppContext = createContext<{
  isDrawerOpen: boolean;
  setIsDrawerOpen: (val: boolean) => void;
}>({ isDrawerOpen: false, setIsDrawerOpen: () => {} });
