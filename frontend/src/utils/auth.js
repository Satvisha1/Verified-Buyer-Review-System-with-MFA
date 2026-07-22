export const getToken = () => {
  return (
    localStorage.getItem("token") ||
    ""
  );
};

export const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("user");

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

  localStorage.removeItem("user");
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