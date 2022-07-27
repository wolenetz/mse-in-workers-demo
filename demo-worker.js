importScripts('mse-in-workers-util.js');

let media_url;
let media_type;
let append_size;

function logToMain(msg) {
  postMessage({topic: 'info', arg: msg});
}

onmessage = (e) => {
  // The only message this demo is expecting here is an object containing
  // parameters necessary to start fetching and buffering.
  media_url = e.data.media_url;
  media_type = e.data.media_type;
  append_size = e.data.append_size;

  logToMain(
      'media_url=' + media_url + ', media_type=' + media_type +
      ',append_size=' + append_size);
  let media_source = new MediaSource();
  let handle = media_source.handle;

  // Transfer the MediaSourceHandle to the main thread for use in attaching to
  // the main thread media element that will play the content being buffered
  // here in the worker.
  postMessage({topic: 'handle', arg: handle}, [handle]);

  // Install the sourceopen handler, fetch the media, create a
  // SourceBuffer, and buffer the media into it in tiny chunks.
  whenSourceOpenedThenFetchAndAppendInChunks(
      media_source, media_url, media_type, append_size,
      null /* sourceopen handler in utility script will not need to revoke an object URL */
      ,
      logmsg => {
        logToMain(logmsg);
      });

  return;
};
