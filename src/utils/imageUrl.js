export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/')) {
    const backendUrl = import.meta.env.VITE_API_URL || '';
    if (backendUrl) {
      return `${backendUrl.replace(/\/+$/, '')}${url}`;
    }
    return url;
  }
  return url;
};
