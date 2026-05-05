export function getApiBaseUrl() {
  if (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof process !== 'undefined' && process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return 'http://localhost:5000';
}
