import { createContext } from 'react';

export const AppContext = createContext<{
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (val: boolean) => void;
  isCreateTeamModalOpen: boolean;
  setIsCreateTeamModalOpen: (val: boolean) => void;
}>({
  isUploadModalOpen: false,
  setIsUploadModalOpen: () => {},
  isCreateTeamModalOpen: false,
  setIsCreateTeamModalOpen: () => {}
});
