importScripts('mse-in-workers-util.js');

let media_url;
let media_type;
let append_size;

function log_to_main(msg) {
  postMessage({ topic: "info", arg: msg });
}

onmessage = (e) => {
  // The only message this demo is expecting here is an object containing
  // parameters necessary to start fetching and buffering.
  media_url = e.data.media_url;
  media_type = e.data.media_type;
  append_size = e.data.append_size;

  log_to_main("media_url=" + media_url + ", media_type=" + media_type + ",append_size=" + append_size);
  let media_source = new MediaSource();
  let object_url = URL.createObjectURL(media_source);

  // Send the MediaSource objectURL to the main thread for use in attaching to
  // the main thread media element that will play the content being buffered
  // here in the worker.
  postMessage({ topic: "objectUrl", arg: object_url });

  // Install the sourceopen handler, fetch the media, create a
  // SourceBuffer, and buffer the media into it in tiny chunks. 
  fetch_and_append_in_chunks(media_source,
      media_url,
      media_type,
      append_size,
      object_url /* sourceopen handler in utility script will revoke this url */,
      logmsg => { log_to_main(logmsg); });

  return;
};


