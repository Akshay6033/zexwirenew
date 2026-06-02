import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ConfirmContext = createContext({ confirm: async () => false });

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState({
    open: false,
    message: "",
    title: "Please Confirm",
    resolve: null
  });

  const closeDialog = useCallback((result) => {
    if (dialog.resolve) dialog.resolve(result);
    setDialog({ open: false, message: "", title: "Please Confirm", resolve: null });
  }, [dialog]);

  const confirm = useCallback((message, title = "Please Confirm") => {
    return new Promise((resolve) => {
      setDialog({ open: true, message, title, resolve });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog.open && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">{dialog.title}</h5>
              <button type="button" className="btn-close" onClick={() => closeDialog(false)} />
            </div>
            <p className="confirm-message mb-3">{dialog.message}</p>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => closeDialog(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => closeDialog(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
