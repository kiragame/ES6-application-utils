// IE define EventTarget from: https://developer.mozilla.org/
class EventTarget {
  constructor() {
    this.listeners = {};
  }
}
EventTarget.prototype.listeners = null;
EventTarget.prototype.addEventListener = function(type, callback) {
  if (!(type in this.listeners)) {
    this.listeners[type] = [];
  }
  this.listeners[type].push(callback);
};
EventTarget.prototype.removeEventListener = function(type, callback) {
  if (!(type in this.listeners)) {
    return;
  }
  const stack = this.listeners[type];
  for (let i = 0, l = stack.length; i < l; i++) {
    if (stack[i] === callback) {
      stack.splice(i, 1);
      return this.removeEventListener(type, callback);
    }
  }
};
EventTarget.prototype.dispatchEvent = function(event) {
  if (!(event.type in this.listeners)) {
    return;
  }
  const stack = this.listeners[event.type];
  event.target = this;
  for (let i = 0, l = stack.length; i < l; i++) {
    stack[i].call(this, event);
  }
};

// IE signal
class AbortSignalIE extends EventTarget {
  constructor() {
    super();
    this.ie = true;
    this.aborted = false;
    this.readyaborted = false;
  }
}
// IE AbortController
export function AbortControllerIE() {
  this.signal = new AbortSignalIE();
  this.abort = () => {
    return new Promise(resolve => {
      this.signal.readyaborted = true;
      // waiting signal.aborted = true;
      this.signal.addEventListener("ieabort", () => {
        console.log("waiting for abort");
        this.signal.aborted = true;
        resolve();
      });
    });
  };
}

// Promise request using XMLTTPRequest
export default function xmlHttp(url, params) {
  const { method, body, headers, signal } = params;

  function connections(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open(method || "GET", url);
    xhr.onreadystatechange = () => {

      if (xhr.readyState !== 4) {
        // abort
        if (signal && signal.readyaborted) {
          xhr.abort();
        }
        return;
      }

      if (xhr.status) {
        const { response, status, statusText } = xhr;

        const res = new Response(response, {
          status,
          statusText,
          url,
          headers: {},
        });
        resolve(res);
      } else {
        reject(new Error(xhr));
      }
    };

    // aborted
    xhr.onabort = () => {
      console.log("xhr aborted");
      signal.dispatchEvent({ type: "ieabort" });
      reject();
    };

    // put headers
    if (headers && Object.keys(headers).length !== 0) {
      Object.keys(headers).forEach(key => {
        if (key === "Content-Length") {
          return;
        }
        xhr.setRequestHeader(key, headers[key]);
      });
    }

    // judge http method
    if (method && method === "POST") {
      xhr.send(body);
    } else {
      xhr.send();
    }
  }
  return new Promise(connections);
}
