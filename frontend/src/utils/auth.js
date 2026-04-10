export const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
};

export const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("authUser");

    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const setAuthData = ({ token, user }) => {
  if (token) {
    localStorage.setItem("token", token);
  }

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
};

export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("jwt");

  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authUser");
};

export const isSubAdmin = () => {
  const user = getStoredUser();
  return user?.role === "sub-admin";
};

export const isAdmin = () => {
  const user = getStoredUser();
  return user?.role === "admin";
};

export const isCustomer = () => {
  const user = getStoredUser();
  return user?.role === "customer";
};