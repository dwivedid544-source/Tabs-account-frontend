// A simple event emitter-like service to control the loader globally
let subscribers = [];
let pendingRequests = 0;

export const loaderService = {
  subscribe: (callback) => {
    subscribers.push(callback);
    return () => {
      subscribers = subscribers.filter(sub => sub !== callback);
    };
  },
  show: () => {
    pendingRequests++;
    subscribers.forEach(callback => callback(true));
  },
  hide: () => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    if (pendingRequests === 0) {
      subscribers.forEach(callback => callback(false));
    }
  }
};
