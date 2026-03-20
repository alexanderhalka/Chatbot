import React, { createContext, useContext, useState, useCallback } from 'react';
import './ConfirmModal.css';

const ConfirmDialogContext = createContext(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return ctx.confirm;
};

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    const {
      title = 'Confirm',
      message,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      danger = false,
    } = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmLabel,
        cancelLabel,
        danger,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          className="confirm-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
          >
            <h2 id="confirm-modal-title" className="confirm-modal-title">
              {dialog.title}
            </h2>
            <p id="confirm-modal-desc" className="confirm-modal-message">
              {dialog.message}
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn confirm-modal-btn-cancel"
                onClick={() => close(false)}
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`confirm-modal-btn confirm-modal-btn-confirm${dialog.danger ? ' danger' : ''}`}
                onClick={() => close(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}
