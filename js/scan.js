/* Prep & Progress — barcode scan helpers (BarcodeDetector + lazy ZXing). */
(function (root) {
  const ZXING_SRC = "./vendor/zxing/zxing.min.js";
  const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8"];
  const MAX_SIDE = 1280;
  let zxingPromise = null;
  let reader = null;
  let scanTimer = 0;
  let scanStream = null;
  let scanActive = false;

  function hasBarcodeDetector() {
    return typeof root.BarcodeDetector === "function";
  }

  function canUseCamera() {
    return !!(root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia);
  }

  function permissionMessage(err) {
    const name = (err && (err.name || err.code)) || "";
    const msg = String((err && err.message) || "");
    const denied = /NotAllowedError|PermissionDeniedError|PermissionDismissedError|security/i.test(name + " " + msg);
    const standalone = !!(
      (root.navigator && root.navigator.standalone) ||
      (root.matchMedia && root.matchMedia("(display-mode: standalone)").matches)
    );
    if (denied) {
      if (standalone) {
        return "Camera access is turned off. On iPhone: open Settings, scroll to Prep & Progress, and allow Camera. Then come back and try again — or take a photo of the barcode below.";
      }
      return "Camera access is turned off. On iPhone: open Settings → Safari → Camera and set it to Allow, then try again. You can also take a photo of the barcode below.";
    }
    if (/NotFoundError|OverconstrainedError|DevicesNotFound/i.test(name)) {
      return "No camera was found. Take a photo of the barcode, or type the number instead.";
    }
    if (/NotReadableError|TrackStartError|AbortError/i.test(name)) {
      return "The camera is busy or isn’t available in this window. Take a photo of the barcode, or type the number instead.";
    }
    return "The live camera couldn’t start. Take a photo of the barcode, or type the number under it.";
  }

  function loadZXing() {
    if (root.ZXing) return Promise.resolve(root.ZXing);
    if (zxingPromise) return zxingPromise;
    zxingPromise = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = ZXING_SRC;
      s.async = true;
      s.onload = function () {
        if (root.ZXing) resolve(root.ZXing);
        else reject(new Error("Barcode library loaded but wasn’t available."));
      };
      s.onerror = function () {
        zxingPromise = null;
        reject(new Error("Could not load the barcode library. Check your connection the first time you scan, then it will work offline."));
      };
      document.head.appendChild(s);
    });
    return zxingPromise;
  }

  function zxingHints(ZXing) {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
    ]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    return hints;
  }

  function getReader(ZXing) {
    if (!reader) {
      reader = new ZXing.MultiFormatReader();
      reader.setHints(zxingHints(ZXing));
    }
    return reader;
  }

  function sourceSize(source) {
    return {
      w: source.videoWidth || source.naturalWidth || source.width || 0,
      h: source.videoHeight || source.naturalHeight || source.height || 0,
    };
  }

  function drawToCanvas(source, opts) {
    opts = opts || {};
    const size = sourceSize(source);
    let w = size.w;
    let h = size.h;
    if (!w || !h) throw new Error("That image couldn’t be read.");
    const maxSide = opts.maxSide || MAX_SIDE;
    if (Math.max(w, h) > maxSide) {
      const scale = maxSide / Math.max(w, h);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }
    const sx = opts.sx || 0;
    const sy = opts.sy || 0;
    const sw = opts.sw || source.videoWidth || source.naturalWidth || source.width;
    const sh = opts.sh || source.videoHeight || source.naturalHeight || source.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
    return canvas;
  }

  function invertCanvas(canvas) {
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0);
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function normalizeText(raw) {
    return String(raw || "").replace(/\s+/g, "");
  }

  function detectNative(source) {
    if (!hasBarcodeDetector()) return Promise.resolve(null);
    let detector;
    try {
      detector = new root.BarcodeDetector({ formats: FORMATS });
    } catch (err) {
      return Promise.resolve(null);
    }
    return detector
      .detect(source)
      .then(function (codes) {
        if (codes && codes.length && codes[0].rawValue) {
          return { text: normalizeText(codes[0].rawValue), format: codes[0].format || "", via: "BarcodeDetector" };
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function decodeCanvasWithZXing(canvas) {
    return loadZXing().then(function (ZXing) {
      const r = getReader(ZXing);
      try {
        const source = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
        const result = r.decode(bitmap);
        if (r.reset) r.reset();
        const text = normalizeText(result && (result.getText ? result.getText() : result.text));
        if (!text) return null;
        let format = "";
        try {
          format = result.getBarcodeFormat ? String(result.getBarcodeFormat()) : "";
        } catch (err) {}
        return { text: text, format: format, via: "zxing" };
      } catch (err) {
        if (r && r.reset) r.reset();
        // Second pass with the inverted, un-hybridized path already happens
        // via invertCanvas. Try the other binarizer once on this canvas.
        try {
          const source = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
          const bitmap = new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(source));
          const result = r.decode(bitmap);
          if (r.reset) r.reset();
          const text = normalizeText(result && (result.getText ? result.getText() : result.text));
          if (!text) return null;
          let format = "";
          try {
            format = result.getBarcodeFormat ? String(result.getBarcodeFormat()) : "";
          } catch (err2) {}
          return { text: text, format: format, via: "zxing" };
        } catch (err2) {
          if (r && r.reset) r.reset();
          return null;
        }
      }
    });
  }

  function tryZXingCanvases(canvases) {
    let chain = Promise.resolve(null);
    canvases.forEach(function (canvas) {
      chain = chain.then(function (hit) {
        if (hit) return hit;
        return decodeCanvasWithZXing(canvas).catch(function () {
          return null;
        });
      });
    });
    return chain;
  }

  function canvasesFromSource(source) {
    const full = drawToCanvas(source);
    const size = sourceSize(source);
    const list = [full, invertCanvas(full)];
    // A center band often frames a barcode better in a phone photo.
    if (size.h > 40 && size.w > 40) {
      const band = drawToCanvas(source, {
        sy: Math.round(size.h * 0.28),
        sh: Math.round(size.h * 0.44),
        sx: Math.round(size.w * 0.06),
        sw: Math.round(size.w * 0.88),
        maxSide: MAX_SIDE,
      });
      list.push(band);
    }
    return list;
  }

  function decodeSource(source, tryNative) {
    const start = tryNative === false ? Promise.resolve(null) : detectNative(source);
    return start.then(function (hit) {
      if (hit) return hit;
      try {
        return tryZXingCanvases(canvasesFromSource(source));
      } catch (err) {
        return Promise.reject(err);
      }
    });
  }

  function decodeImage(img) {
    return decodeSource(img, true);
  }

  function decodeBlob(blob) {
    return new Promise(function (resolve, reject) {
      if (!blob) return reject(new Error("No photo selected."));
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        decodeImage(img)
          .then(resolve, reject)
          .then(function () {
            URL.revokeObjectURL(url);
          }, function () {
            URL.revokeObjectURL(url);
          });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("That photo couldn’t be opened. Try another shot, or type the number."));
      };
      img.src = url;
    });
  }

  function decodeUrl(url) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        decodeImage(img).then(resolve, reject);
      };
      img.onerror = function () {
        reject(new Error("Could not load the barcode image."));
      };
      img.src = url;
    });
  }

  function stopVideo() {
    scanActive = false;
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = 0;
    }
    if (scanStream) {
      try {
        scanStream.getTracks().forEach(function (tr) {
          tr.stop();
        });
      } catch (err) {}
      scanStream = null;
    }
  }

  function prepareVideo(video) {
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "true");
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    try {
      video.setAttribute("autoplay", "true");
    } catch (err) {}
  }

  function getStream() {
    const cams = root.navigator.mediaDevices;
    const tries = [
      { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { audio: false, video: { facingMode: "environment" } },
      { audio: false, video: true },
    ];
    let chain = Promise.reject(new Error("No camera constraints"));
    tries.forEach(function (opts) {
      chain = chain.catch(function () {
        return cams.getUserMedia(opts);
      });
    });
    return chain;
  }

  function startVideo(video, opts) {
    opts = opts || {};
    const onCode = opts.onCode || function () {};
    const onError = opts.onError || function () {};
    const onStatus = opts.onStatus || function () {};
    stopVideo();
    if (!video) {
      onError(new Error("Camera view is missing."));
      return Promise.resolve();
    }
    if (!canUseCamera()) {
      onError(new Error("This browser can’t open a live camera. Take a photo of the barcode, or type the number."));
      return Promise.resolve();
    }
    prepareVideo(video);
    scanActive = true;
    onStatus("Starting camera…");
    // Warm the ZXing fallback in the background when BarcodeDetector is missing.
    if (!hasBarcodeDetector()) loadZXing().catch(function () {});
    return getStream()
      .then(function (stream) {
        if (!scanActive) {
          stream.getTracks().forEach(function (tr) {
            tr.stop();
          });
          return;
        }
        scanStream = stream;
        video.srcObject = stream;
        const play = function () {
          const p = video.play();
          if (p && p.catch) {
            p.catch(function () {
              onStatus("Tap Start camera if the preview doesn’t appear.");
            });
          }
        };
        if (video.readyState >= 2) play();
        else video.onloadedmetadata = play;
        onStatus("Point the camera at a barcode.");
        const tick = function () {
          if (!scanActive || !scanStream) return;
          const frame = function () {
            if (!scanActive) return;
            const size = sourceSize(video);
            if (size.w < 16 || size.h < 16) {
              scanTimer = setTimeout(tick, 240);
              return;
            }
            const work = hasBarcodeDetector()
              ? detectNative(video).then(function (hit) {
                  return hit || decodeSource(video, false);
                })
              : decodeSource(video, false);
            work
              .then(function (hit) {
                if (!scanActive) return;
                if (hit && hit.text) {
                  onCode(hit);
                  return;
                }
                scanTimer = setTimeout(tick, 220);
              })
              .catch(function () {
                if (scanActive) scanTimer = setTimeout(tick, 400);
              });
          };
          frame();
        };
        scanTimer = setTimeout(tick, 350);
      })
      .catch(function (err) {
        scanActive = false;
        onError(err);
      });
  }

  root.PPScan = {
    FORMATS: FORMATS,
    ZXING_SRC: ZXING_SRC,
    hasBarcodeDetector: hasBarcodeDetector,
    canUseCamera: canUseCamera,
    permissionMessage: permissionMessage,
    loadZXing: loadZXing,
    decodeImage: decodeImage,
    decodeBlob: decodeBlob,
    decodeUrl: decodeUrl,
    startVideo: startVideo,
    stopVideo: stopVideo,
    prepareVideo: prepareVideo,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
