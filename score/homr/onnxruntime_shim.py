"""Stands in for the onnxruntime package: the models run in onnxruntime-web, outside Python."""
import os
import numpy as np
from pyodide.ffi import run_sync, to_js
import omr_js

_TYPES = {"float32": "float32", "int64": "int64", "int32": "int32", "uint8": "uint8", "bool": "bool", "float16": "float16"}


class OrtValue:
    def __init__(self, tensor=None, array=None):
        self._tensor = tensor
        self._array = array

    @staticmethod
    def ortvalue_from_numpy(array, *_args):
        return OrtValue(array=array)

    def numpy(self):
        if self._array is None:
            dims = tuple(self._tensor.dims.to_py())
            self._array = np.asarray(self._tensor.data.to_py()).reshape(dims)
        return self._array

    def js(self):
        if self._tensor is None:
            a = np.ascontiguousarray(self._array)
            self._tensor = omr_js.tensor(_TYPES[a.dtype.name], to_js(a.reshape(-1)), to_js(list(a.shape)))
        return self._tensor


class _Binding:
    def __init__(self, session):
        self._session = session
        self._inputs = {}
        self._outputs = {}
        self._results = []

    def bind_cpu_input(self, name, array):
        self._inputs[name] = OrtValue(array=array)

    def bind_ortvalue_input(self, name, value):
        self._inputs[name] = value

    def bind_output(self, name, *_args):
        self._outputs[name] = True

    def get_outputs(self):
        return self._results


class InferenceSession:
    def __init__(self, path, providers=None, **_kwargs):
        self._name = os.path.basename(path)
        self._id = run_sync(omr_js.create(self._name))

    def io_binding(self):
        return _Binding(self)

    def get_providers(self):
        return ["CPUExecutionProvider"]

    def _run(self, inputs, names):
        keys = list(inputs)
        out = run_sync(omr_js.run(self._id, to_js(keys), to_js([inputs[k].js() for k in keys]), to_js(names)))
        return [OrtValue(tensor=t) for t in out]

    def run_with_iobinding(self, iobinding=None, **_kwargs):
        iobinding._results = self._run(iobinding._inputs, list(iobinding._outputs))

    def run(self, names, inputs):
        values = {k: OrtValue(array=np.asarray(v)) for k, v in inputs.items()}
        return [v.numpy() for v in self._run(values, list(names) if names else None)]


def get_available_providers():
    return ["CPUExecutionProvider"]


def set_default_logger_severity(_level):
    pass


def preload_dlls():
    pass
