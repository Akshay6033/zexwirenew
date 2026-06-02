import { createContext, useCallback, useContext, useMemo, useState } from "react";

function readStoredUser() {
  return {
    firstName: localStorage.getItem("userFirstName") || "",
    lastName: localStorage.getItem("userLastName") || "",
    profileImage: localStorage.getItem("userProfileImage") || "",
    avatarPreview: ""
  };
}

const UserDashboardContext = createContext(null);

export function UserDashboardProvider({ children }) {
  const [headerUser, setHeaderUserState] = useState(readStoredUser);

  const setHeaderUser = useCallback((patch) => {
    setHeaderUserState((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      if (next.firstName !== prev.firstName) {
        localStorage.setItem("userFirstName", next.firstName);
      }
      if (next.lastName !== prev.lastName) {
        localStorage.setItem("userLastName", next.lastName);
      }
      if (next.profileImage !== prev.profileImage) {
        localStorage.setItem("userProfileImage", next.profileImage || "");
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ headerUser, setHeaderUser }), [headerUser, setHeaderUser]);

  return <UserDashboardContext.Provider value={value}>{children}</UserDashboardContext.Provider>;
}

export function useUserDashboard() {
  const ctx = useContext(UserDashboardContext);
  if (!ctx) {
    throw new Error("useUserDashboard must be used within UserDashboardProvider");
  }
  return ctx;
}
