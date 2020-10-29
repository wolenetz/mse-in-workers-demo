// Customize the demo parameters here:

const MEDIA_URL = 'test-5seconds.webm';
const MEDIA_TYPE = 'video/webm; codecs="vp9"';
// Demo is able to show more effectively the main vs worker difference when
// buffering tiny chunks at a time.
const APPEND_SIZE = 1024;
const BUSYWAIT_DURATION_MILLISECONDS = 100;

// End of demo parameters.

// See onload for initialization of these element references.
let button;
let main_div;
let worker_div;
let wait_div;

let wait_counter = 0;
let wait_handle;
let pending_ended_count_before_stopping_busywait = 0;
let worker;
let main_video_tag;
let worker_video_tag;

function startBusyWaiting() {
  let wait_start = performance.now();
  wait_counter++;
  wait_div.innerText = 'Iteration #' + wait_counter + ' of busy-waiting ' +
      BUSYWAIT_DURATION_MILLISECONDS + ' milliseconds on main thread...';

  while (performance.now() - wait_start < BUSYWAIT_DURATION_MILLISECONDS) {
    /* busy-wait */
  }

  wait_div.innerText += 'done';
  wait_handle = setTimeout(startBusyWaiting, 0);
}

function stopBusyWaiting() {
  if (wait_handle != undefined) {
    clearTimeout(wait_handle);
    wait_handle = undefined;
    wait_counter = 0;
    wait_div.innerText =
        'All players have ended or errored. Stopped busy-waiting on main thread.';
  }
}

function log(log_div, entry) {
  let span = document.createElement('span');
  span.innerHTML = entry + '<br>';
  log_div.appendChild(span);
}

function incrementPendingEnded() {
  if (pending_ended_count_before_stopping_busywait == 0)
    startBusyWaiting();

  pending_ended_count_before_stopping_busywait++;
}

function decrementPendingEnded() {
  if (pending_ended_count_before_stopping_busywait > 0) {
    pending_ended_count_before_stopping_busywait--;
    if (pending_ended_count_before_stopping_busywait <= 0)
      stopBusyWaiting();
  }
}

function startMseBufferingInWorker(log_div, video) {
  return new Promise((resolve, reject) => {
    log(log_div, 'Starting worker');
    let handled_error = false;
    worker = new Worker('demo-worker.js');
    worker.onerror = (e) => {
      log(log_div,
          'Error event from worker: message=\'' + e.message +
              '\', filename=' + e.filename + ', lineno=' + e.lineno);
      if (!handled_error) {
        handled_error = true;
        decrementPendingEnded();
      }
      log(log_div, 'Terminating worker due to error');
      worker.terminate();
      worker.onerror = undefined;
      worker.onmessage = undefined;
      worker = undefined;
      reject(e);
      return;
    };

    // Note, we could just have the worker initiate fetch immediately
    // when started (though still await sourceopen to begin buffering),
    // but to help make this demo more reusable without having to hardcode
    // MEDIA_URL and MEDIA_TYPE in the worker code, we provide it with
    // that info via an initial message.
    worker.postMessage({
      media_url: MEDIA_URL,
      media_type: MEDIA_TYPE,
      append_size: APPEND_SIZE
    });

    worker.onmessage = msg => {
      // For debugging:
      // log(log_div, "Received msg from worker: topic=" + msg.data.topic + ",
      // arg=" + msg.data.arg);
      switch (msg.data.topic) {
        case 'objectUrl':
          log(log_div,
              'received objectUrl from worker: ' + msg.data.arg +
                  ', setting video src attr');
          video.src = msg.data.arg;
          video.play().then(resolve).catch(e => reject(e));
          break;
        case 'info':
          log(log_div, 'info message from worker: ' + msg.data.arg);
          break;
        default:
          log(log_div, 'error: Unrecognized topic in message from worker');
          break;
      }
      return;
    };

    return;
  });
}

function startMseBufferingInMain(log_div, video) {
  let media_source = new MediaSource();
  let object_url = URL.createObjectURL(media_source);
  video.src = object_url;
  return Promise.all([
    // Let playback start when ready.
    video.play(),

    // Meanwhile, begin fetching and appending.
    whenSourceOpenedThenFetchAndAppendInChunks(
        media_source, MEDIA_URL, MEDIA_TYPE, APPEND_SIZE,
        object_url /* sourceopen handler in utility script will revoke this url
                    */
        ,
        logmsg => {
          log(log_div, logmsg);
        })
  ]);
}

function startDemoPlayer(div, use_worker) {
  div.innerText = '';
  div.appendChild(document.createElement('hr'));
  const video = document.createElement('video');
  video.style.width = '100%';
  video.controls = true;
  div.appendChild(video);
  video.load();

  const log_div = document.createElement('div');
  div.appendChild(log_div);
  log(log_div,
      'Starting demo of MSE ' +
          (use_worker ? ' usage from worker' : ' usage from main thread'));

  let handled_decrement = false;
  incrementPendingEnded();
  if (wait_handle != undefined) {
    log(log_div, 'Ensured busy-waiting has started');
  } else {
    // This case should never occur, unless code has changed.
    log(log_div, 'Error: busy-waiting should have started. Aborting.');
    decrementPendingEnded();
    return;
  }

  if (window.MediaSource == undefined) {
    log(log_div,
        'Error: MediaSource API is unavailable from main/Window context.');
    decrementPendingEnded();
    return;
  }

  if (use_worker &&
      (!MediaSource.hasOwnProperty('canConstructInDedicatedWorker') ||
       MediaSource.canConstructInDedicatedWorker !== true)) {
    log(log_div,
        'Error: MediaSource API is unavailable from DedicatedWorker context.');
    decrementPendingEnded();
    return;
  }

  video.onerror = () => {
    log(log_div,
        'Video Element Error: code=' + video.error.code +
            ', message=' + video.error.message);
    if (!handled_decrement) {
      handled_decrement = true;
      decrementPendingEnded();
    }
    return;
  };

  video.onended = () => {
    log(log_div, 'Video Element \'ended\'');
    if (!handled_decrement) {
      handled_decrement = true;
      decrementPendingEnded();
    }
    return;
  };

  let player_promise;
  if (use_worker) {
    worker_video_tag = video;
    player_promise = startMseBufferingInWorker(log_div, video);
  } else {
    main_video_tag = video;
    player_promise = startMseBufferingInMain(log_div, video);
  }

  player_promise.catch(e => {
    if (!handled_decrement) {
      handled_decrement = true;
      decrementPendingEnded();
    }
    log(log_div, e);
    return;
  });
}

// We use a button's onclick to start the demo to satisfy autoplay user gesture
// requirement.
function startBothDemoPlayers() {
  updateButton('Starting', '', 'gray');
  wait_div.innerText = '';
  startDemoPlayer(main_div, false /* don't use_worker */);
  startDemoPlayer(worker_div, true /* do use_worker */);
  updateButton('Stop', stopDemoPlayers, 'white');
}

function stopDemoPlayers() {
  if (main_video_tag != undefined) {
    main_video_tag.removeAttribute('src');
    main_video_tag.load();
    main_video_tag = undefined;
    log(main_div, 'Stopped MSE usage on main thread demo');
  }
  if (worker != undefined) {
    log(worker_div, 'Terminating the worker context');
    worker.terminate();
    worker.onerror = undefined;
    worker.onmessage = undefined;
    worker = undefined;
  }
  if (worker_video_tag != undefined) {
    worker_video_tag.removeAttribute('src');
    worker_video_tag.load();
    worker_video_tag = undefined;
    log(worker_div, 'Stopped MSE usage in worker thread demo');
  }

  // Play promise rejection handling and MediaSource API usage after being
  // closed can also stop the busy-waiting. decrementPendingEnded() takes
  // care not to over-decrement. This is just a catch-all to ensure busy-waiting
  // stops.
  while (pending_ended_count_before_stopping_busywait > 0)
    decrementPendingEnded();

  updateButton('Start Demo', startBothDemoPlayers, 'white');
}

function updateButton(label, onclick, color) {
  button.innerText = label;
  button.onclick = onclick;
  button.style.backgroundColor = color;
}

function populateParametersTable() {
  document.querySelector('.media-url').innerText = MEDIA_URL;
  document.querySelector('.media-type').innerText = MEDIA_TYPE;
  document.querySelector('.append-size').innerText = APPEND_SIZE;
  document.querySelector('.busywait-duration').innerText =
      BUSYWAIT_DURATION_MILLISECONDS;
}

window.onload = () => {
  button = document.querySelector('.start-stop');
  main_div = document.querySelector('div.main .player');
  worker_div = document.querySelector('div.worker .player');
  wait_div = document.querySelector('.top');
  populateParametersTable();
  updateButton('Start Demo', startBothDemoPlayers, 'white');
  wait_div.innerText = 'Awaiting Start';
  return;
};
