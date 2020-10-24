function loadBinaryAsync(url) {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onerror = event => { reject(event); };
    request.onload = () => {
      if (request.status != 200) {
        reject("Unexpected response status code: " + request.status);
      }
      let response = new Uint8Array(request.response);
      resolve(response);
    };
    request.send();
  });
}

// BIG TODO: code that works on either main or worker to fetch and buffer into
// MSE, with a logging callback and a sourceclosed callback.
