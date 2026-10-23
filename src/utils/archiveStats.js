import { CARD_TYPES } from "../data/cardTypes"

export function getArchiveStats(sites) {
  const governorates = new Set(
    sites.map((site) => site.governorate).filter(Boolean)
  )

  return {
    cards: sites.length,
    types: CARD_TYPES.length,
    governorates: governorates.size,
    models: sites.filter((site) => site.hasModel).length,
  }
}

export const formatCount = (number) =>
  String(number).padStart(2, "0")