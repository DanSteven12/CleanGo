import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmVariant } from '../components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export interface ConfirmProviderProps {
  children: ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolver: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolver: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        options,
        resolver: () => resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(true);
    }
    setDialogState({
      open: false,
      options: null,
      resolver: null,
    });
  }, [dialogState.resolver]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(false);
    }
    setDialogState({
      open: false,
      options: null,
      resolver: null,
    });
  }, [dialogState.resolver]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState.options && (
        <ConfirmDialog
          open={dialogState.open}
          title={dialogState.options.title}
          message={dialogState.options.message}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          variant={dialogState.options.variant || 'danger'}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFunction => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe ser utilizado dentro de un ConfirmProvider');
  }
  return context;
};
