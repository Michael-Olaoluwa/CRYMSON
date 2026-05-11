const AUTH_SESSION_KEY = 'crymson_auth_session';

const getStorage = () => {
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
};

export const getAuthToken = () => {
  const storage = getStorage();

  if (!storage) {
    return '';
  }

  try {
    const raw = storage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw);
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch (error) {
    return '';
  }
};

export const setAuthToken = (token) => {
  const storage = getStorage();

  if (!storage || typeof token !== 'string' || !token) {
    return;
  }

  storage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token }));
};

export const clearAuthSession = () => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_SESSION_KEY);
};
