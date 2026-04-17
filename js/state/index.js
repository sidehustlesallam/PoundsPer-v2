/**
 * Global application state — panels read slices; app.js orchestrates updates.
 */

export const state = {
  selection: null,
  loading: false,
  errors: {},
  raw: {},
  normalised: {
    identity: {},
    geo: {},
    address: {},
    epcSearch: {},
    epcCertificate: {},
    ppi: {},
    hpi: {},
    schools: {},
    transport: {},
    broadband: {},
    flood: {},
    radon: {},
  },
};

export function resetState() {
  state.selection = null;
  state.loading = false;
  state.errors = {};
  state.raw = {};
  state.normalised = {
    identity: {},
    geo: {},
    address: {},
    epcSearch: {},
    epcCertificate: {},
    ppi: {},
    hpi: {},
    schools: {},
    transport: {},
    broadband: {},
    flood: {},
    radon: {},
  };
}

export function setSelection(sel) {
  state.selection = sel;
}

export function setLoading(v) {
  state.loading = !!v;
}

export function setError(key, message) {
  if (!message) {
    delete state.errors[key];
  } else {
    state.errors[key] = String(message);
  }
}

export function clearErrors() {
  state.errors = {};
}
