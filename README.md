# MediaSource-in-Workers Demo
Demo MSE usage from DedicatedWorker context

## Authors:
* Matt Wolenetz @ Google

## References
* [MSE-in-Workers Spec Issue](https://github.com/w3c/media-source/issues/175)
* [Explainer](https://github.com/wicg/media-source/blob/mse-in-workers-using-handle/mse-in-workers-using-handle-explainer.md)
* [Chromium's Implementation-Tracking Issue](https://crbug.com/878133)

## Usage
* Using Chromium 88.0.4300.0 or greater, enable the experimental MSE-in-Workers support:
  * with cmdline option `--enable-experimental-web-platform-features`
  * or enable via `chrome://flags/#enable-experimental-web-platform-features`: select `Enabled` and then `Relaunch`
* TODO(wolenetz): Describe the app and usage (including probable need to first download and host the app and media on a webserver).

## Test Media
Created `test-5seconds.webm` using the following:

`ffmpeg -f lavfi -i testsrc=duration=5:size=1920x1080:rate=30 test-5seconds.webm`
