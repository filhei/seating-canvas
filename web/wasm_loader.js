// NOTE: the Makefile will generate the file 'wasm_loader.js' from this file,
// replacing WasmModule with the value defined in the Makefile.

// Initialize the WASM module
var wasmModule = null;

// Global functions that will be called from Dart
window.solve = null;

WasmModule().then(function (Module) {
  wasmModule = Module;
  // Make it globally accessible
  // TODO: can we define the "window.wasmModule" name in just one place?
  window.wasmModule = wasmModule;
  console.log('WASM module loaded successfully');

  // cwrap(method_name, return_type, argument_types)
  const solveFaq = Module.cwrap('solve_faq', 'number', [
    'number',  // int64_t *x
    'number',  // double *A
    'number',  // double *B
    'number',  // intptr_t dim
    'number',  // bool maximize (0 or 1)
    'number',  // int64_t *partial_match
    'number',  // intptr_t len_partial_match
    'number',  // intptr_t maxiter
    'number',  // double tol
    'number'   // double *score
  ]);

  
  // Create wrapper functions and make them globally accessible
  // TODO: can we define the function name in just one place?
  window.solve = function(
    A, 
    B, 
    dim, 
    maximize, 
    partialMatch, 
    lengthPartialMatch,
    maxiter,
    tol,
  ) {
    const xPtr = Module._malloc(dim * 8);
    const APtr = Module._malloc(A.length * 8);
    const BPtr = Module._malloc(B.length * 8);
    const partialMatchPtr = Module._malloc(partialMatch.length * 8);
    const scorePtr = Module._malloc(8);
    
    Module.HEAPF64.set(A, APtr / 8);
    Module.HEAPF64.set(B, BPtr / 8);
    Module.HEAP64.set(new BigInt64Array(partialMatch.map(v => BigInt(v))), partialMatchPtr / 8);
    
    const iterations = solveFaq(
      xPtr, APtr, BPtr, dim, maximize,
      partialMatchPtr, lengthPartialMatch,
      maxiter, tol, scorePtr
    );
    
    const x = Array.from(new BigInt64Array(Module.HEAP64.buffer, xPtr, dim))
                        .map(v => Number(v));
    const score = Module.HEAPF64[scorePtr / 8];
    
    Module._free(xPtr);
    Module._free(APtr);
    Module._free(BPtr);
    Module._free(partialMatchPtr);
    Module._free(scorePtr);
    
    return {
      solution: x,
      score: score,
      iterations: iterations,
    };
  };

  console.log('WASM functions are now available globally');
}).catch(function (err) {
  console.error('Failed to load WASM module:', err);
});