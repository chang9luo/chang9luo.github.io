This folder holds the optical music recognition code that /score runs in the browser.

homr-f6d0111bbe2c.zip
    The unmodified Python package of homr, https://github.com/liebharc/homr,
    at commit f6d0111bbe2c. Licensed under AGPL-3.0, see LICENSE.

onnxruntime_shim.py, ../omr-worker.mjs
    Glue written for this page, also under AGPL-3.0: homr's Python runs in Pyodide,
    and the shim hands its model calls to onnxruntime-web.

The model weights are homr's released ONNX checkpoints (see homr's LICENSE_FAQ.md
for the licences of their training data).
