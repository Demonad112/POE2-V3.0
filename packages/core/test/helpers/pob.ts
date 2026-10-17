import { decodePobExport, readPlayerStats } from '../../src/pob/export.js'
import type { CharModel } from '../../src/model/types.js'

/** The PlayerStat table of a model's attached Path of Building export. */
export async function analyzePob(model: Pick<CharModel, 'pathOfBuildingExport'>): Promise<Record<string, number>> {
  const xml = await decodePobExport(model.pathOfBuildingExport!)
  return readPlayerStats(xml)
}
