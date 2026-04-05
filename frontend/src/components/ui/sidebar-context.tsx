import * as React from 'react';

export type SidebarContextValue = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean | ((value: boolean) => boolean)) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

export const SidebarContext = React.createContext<SidebarContextValue | null>(null);
