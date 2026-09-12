import React, {
  createContext,
  useContext,
  useState,
  useCallback,
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
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isDestructive?: boolean;
  dismissible?: boolean;
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

  const hideAlert = useCallback(() => {
    setVisible(false);
    setLoading(false);
    // Limpiar estado después del cierre de la animación
    setTimeout(() => {
      setAlertState(null);
    }, 250);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
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
          if (onConfirm) await onConfirm();
          hideAlert();
        },
        onClose: hideAlert,
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
          if (onConfirm) await onConfirm();
          hideAlert();
        },
        onClose: hideAlert,
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
          if (onConfirm) await onConfirm();
          hideAlert();
        },
        onClose: hideAlert,
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
          if (onConfirm) await onConfirm();
          hideAlert();
        },
        onClose: hideAlert,
        ...options,
      });
    },
    [showAlert, hideAlert]
  );

  const showConfirm = useCallback(
    (options: ConfirmOptions) => {
      showAlert({
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        isDestructive: options.isDestructive,
        dismissible: options.dismissible !== undefined ? options.dismissible : true,
        onConfirm: async () => {
          try {
            setLoading(true);
            await options.onConfirm();
          } finally {
            hideAlert();
          }
        },
        onCancel: () => {
          if (options.onCancel) options.onCancel();
          hideAlert();
        },
        onClose: hideAlert,
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
