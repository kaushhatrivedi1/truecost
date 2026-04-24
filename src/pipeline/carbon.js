// carbon.js — Carbon and water footprint estimator

/**
 * Energy consumption per 1000 tokens in Wh, per model.
 * Source: Luccioni et al. 2023, arXiv:2311.16863
 */
const MODEL_ENERGY_TABLE = {
  'gpt-4':             0.0029,
  'gpt-4o':            0.0021,
  'gpt-4o-mini':       0.0012,
  'gpt-3.5-turbo':     0.0017,
  'claude-3-opus':     0.0031,
  'claude-3-sonnet':   0.0022,
  'claude-3-haiku':    0.0009,
  'claude-3-5-sonnet': 0.0020,
  'gemini-1.5-pro':    0.0026,
  'gemini-1.5-flash':  0.0011,
  'gemini-2.0':        0.0018,
  'mistral-large':     0.0024,
  'mistral-small':     0.0013,
  'default':           0.0021,
};

// IEA World Energy Outlook 2023: global average grid carbon intensity
const GRID_INTENSITY_G_PER_KWH = 475;

// Li et al. 2023, arXiv:2304.03271: water consumption per token
const WATER_ML_PER_TOKEN = 0.0106;

/**
 * Returns the energy per 1000 tokens (Wh) for the given model ID.
 * Falls back to the 'default' entry for unknown model IDs.
 *
 * @param {string} modelId
 * @returns {number} Wh per 1000 tokens
 */
function getEnergyPerToken(modelId) {
  return Object.prototype.hasOwnProperty.call(MODEL_ENERGY_TABLE, modelId)
    ? MODEL_ENERGY_TABLE[modelId]
    : MODEL_ENERGY_TABLE['default'];
}

/**
 * Estimates the carbon footprint of a prompt in milligrams CO₂e.
 *
 * Formula: ((tokens / 1000) * whPer1000 / 1000) * 475 * 1_000_000
 *
 * @param {number} tokens
 * @param {string} modelId
 * @returns {{ mg: number, isEstimate: true }}
 */
function estimateCarbon(tokens, modelId) {
  const whPer1000 = getEnergyPerToken(modelId);
  const carbonMg = ((tokens / 1000) * whPer1000 / 1000) * GRID_INTENSITY_G_PER_KWH * 1_000_000;
  return { mg: carbonMg, isEstimate: true };
}

/**
 * Estimates the water consumption of a prompt in millilitres.
 *
 * @param {number} tokens
 * @returns {{ ml: number, isEstimate: true }}
 */
function estimateWater(tokens) {
  return { ml: tokens * WATER_ML_PER_TOKEN, isEstimate: true };
}

/**
 * Computes human-readable equivalences for a given carbon footprint and token count.
 *
 * @param {number} carbonMg  Carbon footprint in milligrams CO₂e
 * @param {number} tokens    Token count
 * @returns {{ phoneChargeSeconds: number, googleSearches: number, wordsEquivalent: number }}
 */
function computeEquivalences(carbonMg, tokens) {
  return {
    phoneChargeSeconds: carbonMg * 2.1,
    googleSearches: carbonMg / 200,
    wordsEquivalent: tokens * 0.75,
  };
}

export {
  MODEL_ENERGY_TABLE,
  getEnergyPerToken,
  estimateCarbon,
  estimateWater,
  computeEquivalences,
};
