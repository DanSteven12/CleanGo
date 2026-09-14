// mobile-conductor/contexts/AlertContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  CleanGoAlert,
  AlertType,
  AlertButton,
} from '../components/ui/CleanGoAlert';

export interface AlertOptions {
  type?: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  badgeText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  buttons?: AlertButton[];
  isDestructive?: boolean;
  isLoading?: boolean;
  dismissible?: boolean;
  customIcon?: React.ReactNode;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  badgeText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isDestructive?: boolean;
  dismissible?: boolean;
  customIcon?: React.ReactNode;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showSuccess: (
    title: string,
    message?: string,
    onConfirm?: () => void | Promise<void>,
    options?: Partial<AlertOptions>
  ) => void;
  showError: (
    title: string,
    message?: string,
    onConfirm?: () => void | Promise<void>,
    options?: Partial<AlertOptions>
  ) => void;
  showWarning: (
    title: string,
    message?: string,
    onConfirm?: () => void | Promise<void>,
    options?: Partial<AlertOptions>
  ) => void;
  showInfo: (
    title: string,
    message?: string,
    onConfirm?: () => void | Promise<void>,
    options?: Partial<AlertOptions>
  ) => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const alertIdRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideAlert = useCallback(() => {
    alertIdRef.current += 1;
    const currentId = alertIdRef.current;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setVisible(false);
    setLoading(false);

    hideTimeoutRef.current = setTimeout(() => {
      if (alertIdRef.current === currentId) {
        setAlertState(null);
      }
    }, 250);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    alertIdRef.current += 1;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setLoading(false);
    setAlertState(options);
    setVisible(true);
  }, []);

  const showSuccess = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void | Promise<void>,
      options?: Partial<AlertOptions>
    ) => {
      showAlert({
        type: 'success',
        title,
        message,
        confirmText: options?.confirmText || 'Aceptar',
        onConfirm: async () => {
          hideAlert();
          if (onConfirm) await onConfirm();
        },
        onClose: () => {
          hideAlert();
          if (onConfirm) onConfirm();
        },
        ...options,
      });
    },
    [showAlert, hideAlert]
  );

  const showError = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void | Promise<void>,
      options?: Partial<AlertOptions>
    ) => {
      showAlert({
        type: 'error',
        title,
        message,
        confirmText: options?.confirmText || 'Entendido',
        onConfirm: async () => {
          hideAlert();
          if (onConfirm) await onConfirm();
        },
        onClose: () => {
          hideAlert();
          if (onConfirm) onConfirm();
        },
        ...options,
      });
    },
    [showAlert, hideAlert]
  );

  const showWarning = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void | Promise<void>,
      options?: Partial<AlertOptions>
    ) => {
      showAlert({
        type: 'warning',
        title,
        message,
        confirmText: options?.confirmText || 'Entendido',
        onConfirm: async () => {
          hideAlert();
          if (onConfirm) await onConfirm();
        },
        onClose: () => {
          hideAlert();
          if (onConfirm) onConfirm();
        },
        ...options,
      });
    },
    [showAlert, hideAlert]
  );

  const showInfo = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void | Promise<void>,
      options?: Partial<AlertOptions>
    ) => {
      showAlert({
        type: 'info',
        title,
        message,
        confirmText: options?.confirmText || 'Aceptar',
        onConfirm: async () => {
          hideAlert();
          if (onConfirm) await onConfirm();
        },
        onClose: () => {
          hideAlert();
          if (onConfirm) onConfirm();
        },
        ...options,
      });
    },
    [showAlert, hideAlert]
  );

  const showConfirm = useCallback(
    (options: ConfirmOptions) => {
      const confirmAlertId = alertIdRef.current + 1;

      showAlert({
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        badgeText: options.badgeText,
        customIcon: options.customIcon,
        isDestructive: options.isDestructive,
        dismissible: options.dismissible !== undefined ? options.dismissible : true,
        onConfirm: async () => {
          try {
            setLoading(true);
            await options.onConfirm();
            // Si el callback no disparó otra alerta (ej: showSuccess), cerramos la modal
            if (alertIdRef.current === confirmAlertId) {
              hideAlert();
            }
          } catch (err) {
            if (alertIdRef.current === confirmAlertId) {
              hideAlert();
            }
            throw err;
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
          if (options.onCancel) options.onCancel();
          hideAlert();
        },
        onClose: () => {
          if (options.onCancel) options.onCancel();
          hideAlert();
        },
      });
    },
    [showAlert, hideAlert]
  );

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        hideAlert,
      }}
    >
      {children}
      {alertState && (
        <CleanGoAlert
          {...alertState}
          visible={visible}
          isLoading={loading || alertState.isLoading}
          onClose={alertState.onClose || hideAlert}
          onCancel={alertState.onCancel || hideAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe utilizarse dentro de un AlertProvider');
  }
  return context;
}
