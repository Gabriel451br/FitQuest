// Ponte única para a camada de UI (Preact + htm vendorizados, sem build).
import { h, render, Fragment } from '../vendor/preact.js';
import { useState, useEffect, useMemo, useRef, useCallback, useReducer } from '../vendor/preact-hooks.js';
import htm from '../vendor/htm.js';

export const html = htm.bind(h);
export { h, render, Fragment, useState, useEffect, useMemo, useRef, useCallback, useReducer };
