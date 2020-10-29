// Demo's utility methods used to fetch and buffer into MSE. Used by both of
// the demo's video elements, so makes no reliance upon DOM since it could
// be used by either main window context or dedicated worker.

function loadBinaryAsync(url) {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onerror = event => {
      reject(event);
    };
    request.onload = () => {
      if (request.status != 200) {
        reject(new Error('Unexpected response status code: ' + request.status));
        return;
      }
      let response = new Uint8Array(request.response);
      resolve(response);
    };
    request.send();
  });
}

async function appendChunk(source_buffer, chunk, advance_to_next_chunk_cb) {
  return new Promise((resolve, reject) => {
    let sb_error_handler = (e) => {
      source_buffer.removeEventListener('error', sb_error_handler);
      source_buffer.removeEventListener('updateend', sb_updateend_handler);
      reject(new Error(e));
      return;
    };
    let sb_updateend_handler =
        () => {
          source_buffer.removeEventListener('error', sb_error_handler);
          source_buffer.removeEventListener('updateend', sb_updateend_handler);
          advance_to_next_chunk_cb();
          resolve();
          return;
        }

    try {
      source_buffer.appendBuffer(chunk);
    } catch (e) {
      if (e.code != 22 && e.name != 'QUOTA_EXCEEDED_ERR' &&
          e.name != 'QuotaExceededError') {
        reject(e);
      } else {
        // We assume naively that MSE won't normally give us a
        // QuotaExceededError exception for this demo. This is probably ok since
        // the media file is small. We do provide for a naive way of just
        // retrying the same append (after a brief delay) by *not* calling the
        // advance_to_next_chunk_cb if that exception occurs.
        setTimeout(resolve, 0);
      }
    }
    source_buffer.addEventListener('error', sb_error_handler);
    source_buffer.addEventListener('updateend', sb_updateend_handler);
  });
}

async function whenSourceOpenedThenFetchAndAppendInChunks(
    media_source, media_url, media_type, append_size, object_url_to_revoke,
    log_cb) {
  return new Promise((resolve, reject) => {
    if (!MediaSource.isTypeSupported(media_type)) {
      throw new Error(
          'MediaSource.isTypeSupported indicated media type ' + media_type +
          ' is not supported.');
    }

    media_source.addEventListener('sourceopen', () => {
      log_cb('Handling sourceopen event');
      URL.revokeObjectURL(object_url_to_revoke);
      log_cb('Fetching ' + media_url);
      loadBinaryAsync(media_url)
          .then(async media_bytes => {
            log_cb('Fetched ' + media_bytes.length + ' media bytes');
            let source_buffer = media_source.addSourceBuffer(media_type);
            log_cb('SourceBuffer created for media type ' + media_type);
            log_cb(
                'Appending to SourceBuffer in chunks of size ' + append_size +
                ' bytes');
            for (i = 0; i < media_bytes.length;
                 /* the advance_to_next_chunk_cb increments i */) {
              await appendChunk(
                  source_buffer, media_bytes.slice(i, i + append_size),
                  () => {i += append_size});
            }
            log_cb('Appends completed. Calling endOfStream.');
            media_source.endOfStream();
            log_cb('Buffering completed.');
            resolve();
          })
          .catch(e => {
            reject(e);
          });
    }, {once: true});
  });
}
