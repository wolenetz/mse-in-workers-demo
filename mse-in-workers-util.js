// Demo's utility methods used to fetch and buffer into MSE. Used by both of
// the demo's video elements, so makes no reliance upon DOM since it could
// be used by either main window context or dedicated worker.

function load_binary_async(url) {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onerror = event => { reject(event); };
    request.onload = () => {
      if (request.status != 200) {
        reject(new Error("Unexpected response status code: " + request.status));
        return;
      }
      let response = new Uint8Array(request.response);
      resolve(response);
    };
    request.send();
  });
}

async function appendChunk(source_buffer, chunk, advance_to_next_chunk_cb) {
  await (() => {
    return new Promise((resolve, reject) => {
      let sb_err_handler = (e) => {
        source_buffer.removeEventListener(sb_err_handler); // BIG TODO continue here...
        reject(new Error(e));
        return;
      };
      let sb_updateend_handler = () => {
        source_buffer.removeEventListener

      source_buffer.addEventListener("error", (e) => reject(new Error(e)), { once: true });

      source_buffer.addEventListener("updateend", () => resolve(), { once: true });

      // We assume naively that MSE won't normally give us a QuotaExceededError
      // exception for this demo. This is probably ok since the media file is
      // small. We do provide for a naive way of just retrying the same append
      // by *not* calling the advance_to_next_chunk_cb if that exception occurs.
    });
  });
}

function fetch_and_append_in_chunks(media_source, media_url, media_type, append_size, object_url_to_revoke, log_cb) {
  return new Promise((resolve, reject) => {
    if (!MediaSource.isTypeSupported(media_type)) {
      throw new Error("MediaSource.isTypeSupported indicated media type " + media_type + " is not supported.");
    }

    media_source.addEventListener(
        "sourceopen",
        () => {
          log_cb("Handling sourceopen event");
          URL.revokeObjectURL(object_url_to_revoke);
          log_cb("Fetching " + media_url);
          load_binary_async(media_url)
              .then(media_bytes => {
                  log_cb("Fetched " + media_bytes.length + " media bytes");
                  let source_buffer = media_source.addSourceBuffer(media_type);
                  log_cb("SourceBuffer created for media type " + media_type);
                  log_cb("Appending to SourceBuffer in chunks of size " + append_size + " bytes");
                  for (i = 0; i < media_bytes.length; /* the advance_to_next_chunk_cb increments i */) {
                    appendChunk(source_buffer, media_bytes.slice(i, i+append_size), () => { i += append_size });
                  }
                  log_cb("Appends completed. Calling endOfStream.");
                  media_source.endOfStream();
                  log_cb("Buffering completed.");
                  resolve();
                })
              .catch(e => { reject(e); });
        }, { once: true });
  });
}
