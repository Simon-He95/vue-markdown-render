import type { CustomComponents } from '../types'

let customComponents: Record<string, any> | null = null

export function setCustomComponents(_customComponents: Partial<CustomComponents>) {
  customComponents = _customComponents
}

export function getCustomNodeComponents() {
  return customComponents
}
