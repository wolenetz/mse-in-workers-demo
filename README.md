# MediaSource in Workers Demo
Demo MSE usage from DedicatedWorker context

## Authors:
* Matt Wolenetz @ Google

## References
* [MSE-in-Workers Spec Issue](https://github.com/w3c/media-source/issues/175)
* [Explainer](https://github.com/wicg/media-source/blob/mse-in-workers-using-handle/mse-in-workers-using-handle-explainer.md)
* [Chromium's Implementation-Tracking Issue](https://crbug.com/878133)

## Demo description

* Demonstration of how usage of Media Source Extensions API from a dedicated
  worker context can avoid "buffering jank" when the main window context is
  very busy, even though the media element playing the buffered media is still
  on that main thread.
* Presents a side-by-side comparison of two players, one fetching and buffering
  to its media element solely on the main window context, and the other player
  relying on a dynamically created dedicated worker to fetch and buffer the same
  media into a MediaSource owned by that worker's context, yet attached to the
  main window context's media element via the otherwise normal MediaSource
  object URL. This demo communicates that URL to the main window context to
  accomplish the attachment.
* A scenario where the main thread is under heavy contention is achieved by
  frequently busy-waiting on it while both players are fetching, buffering and
  playing. Furthermore, asynchronous appendBuffer operations are performed (on
  each of the main and worker MSE demos) in small chunks to enable rapid
  appearance of "buffering jank" on the player being buffered via MSE on the
  main thread versus a much better experience on the player being buffered via
  MSE on the worker thread, even though the media stream is short.
* In practice, main thread (aka Window context) contention can result from many
  sources, though commonly it is from complex and frequent task execution
  demands made by the application on the Window execution context, and is made
  worse when the platform has less execution capacity available. The DOM and
  associated application javascript operate in the Window execution context.
  DedicatedWorkers run in a concurrent execution context with respect to the
  Window execution context. Even with concurrent buffering and smoother playback
  by using MSE on a dedicated worker context, observe that the video element for
  the MSE-in-Worker player can still have poor controls response time when the
  Window context is under high contention. This is because that element (and its
  controls) can only execute on the Window context and their event handlers can
  have high scheduling latency.

## Usage
* Using Chromium 88.0.4300.0 or greater, enable the experimental MSE-in-Workers
  support:
  * with cmdline option `--enable-experimental-web-platform-features`
  * or enable via `chrome://flags/#enable-experimental-web-platform-features`:
    select `Enabled` and then `Relaunch`
* Clone this repo and host its contents in a sandbox webserver.
* Try the demo by navigating to the `mse-in-workers-demo.html` page on your
  server.

## Test Media
Created `test-5seconds.webm` using the following:

`ffmpeg -f lavfi -i testsrc=duration=5:size=1920x1080:rate=30 test-5seconds.webm`
