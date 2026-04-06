import { useNavigationStore } from './model';

export const NavigationHistory = {
  push: useNavigationStore.getState().push,
  goBack: useNavigationStore.getState().goBack,
  goForward: useNavigationStore.getState().goForward,
  canGoBack: useNavigationStore.getState().canGoBack,
  canGoForward: useNavigationStore.getState().canGoForward,
};
