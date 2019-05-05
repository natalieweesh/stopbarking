let heading = document.getElementById("header");
heading.textContent = "CLICK TO START";
heading.onclick = init;

//document.body.onclick = init;
//document.addEventListener("click", init);
heading.addEventListener("touchstart", init);
setTimeout(() => {
  heading.click();
}, 1000);
function init() {
  heading.textContent = "Stop Barking Dingle!";

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      // First get ahold of the legacy getUserMedia, if present
      var getUserMedia =
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(
          new Error("getUserMedia is not implemented in this browser")
        );
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes

  let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (audioCtx.createJavaScriptNode) {
    audioNode = audioCtx.createJavaScriptNode(2048, 1, 1);
  } else if (audioCtx.createScriptProcessor) {
    audioNode = audioCtx.createScriptProcessor(2048, 1, 1);
  } else {
    throw "WebAudio not supported!";
  }
  audioNode.connect(audioCtx.destination);

  let source;
  let sayNoTimeout = false;

  //set up the different audio nodes we will use for the app

  let analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  let distortion = audioCtx.createWaveShaper();
  let gainNode = audioCtx.createGain();
  let biquadFilter = audioCtx.createBiquadFilter();
  let convolver = audioCtx.createConvolver();

  // set up canvas context for visualizer

  let canvas = document.querySelector(".visualizer");
  let canvasCtx = canvas.getContext("2d");

  let intendedWidth = document.querySelector(".wrapper").clientWidth;

  canvas.setAttribute("width", intendedWidth);

  let drawVisual;
  let audios = [
    document.getElementById("nono1"),
    document.getElementById("nono2"),
    document.getElementById("nono3"),
    document.getElementById("nono4"),
    document.getElementById("nono5"),
    document.getElementById("nono6")
  ];
  audios.forEach(audio => {
    audio.load();
    audio.addEventListener("ended", () => {
      sayNoTimeout = false;
    });
  });

  //main block for doing the audio recording

  if (navigator.mediaDevices.getUserMedia) {
    let constraints = { audio: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(stream) {
        source = audioCtx.createMediaStreamSource(stream);

        source.connect(distortion);

        distortion.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        convolver.connect(gainNode);

        gainNode.connect(analyser);


        visualize();
      })
      .catch(function(err) {
        console.log("The following gUM error occured: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    analyser.fftSize = 256;
    let bufferLengthAlt = analyser.frequencyBinCount;
    let dataArrayAlt = new Uint8Array(bufferLengthAlt);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    let drawAlt = function() {
      drawVisual = requestAnimationFrame(drawAlt);

      analyser.getByteFrequencyData(dataArrayAlt);
      if (dataArrayAlt.includes(120)) {
        if (!sayNoTimeout) {
          sayNoTimeout = true;
          audios[Math.floor(Math.random() * 6)].play();
        }
      }

      canvasCtx.fillStyle = "rgb(0, 0, 0)";
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      let barWidth = WIDTH / bufferLengthAlt * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLengthAlt; i++) {
        barHeight = dataArrayAlt[i];

        canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
        canvasCtx.fillRect(
          x,
          HEIGHT - barHeight / 2,
          barWidth,
          barHeight / 2
        );

        x += barWidth + 1;
      }
    };

    drawAlt();
  }
}
