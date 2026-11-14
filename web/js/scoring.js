// Rotation scoring. Rules: docs/data_contract.md, section "Scoring".
// TODO (Lane B, with Lane A checking the agronomy): implement feasibility filters,
// sub-scores, weighted total, explanations, and gaps/risks.

/**
 * @param {object} site      site JSON (see data contract)
 * @param {object[]} crops   crops.json
 * @param {string[]} rotation crop ids in order
 * @param {object} weights   priority weights 0-5
 * @returns {{rotation: string[], feasible: boolean, total: number,
 *            subscores: object, reasons: string[], gaps: string[]}}
 */
export function scoreRotation(site, crops, rotation, weights) {
  return {
    rotation,
    feasible: true,
    total: 0,
    subscores: {},
    reasons: ["scoring not implemented yet"],
    gaps: ["Soil type, local pests, markets, and irrigation are not in the data. Confirm with a local expert."],
  };
}
