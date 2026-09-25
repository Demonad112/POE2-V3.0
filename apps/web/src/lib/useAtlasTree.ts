'use client'

/**
 * Load the Atlas passive tree (generated/atlas-tree.json) once per session.
 *
 * Same artifact shape as the character tree, so it parses with core's
 * PassiveTree; `byName` and each node's subtree (`t`) are read alongside.
 */

import { useEffect, useState } from 'react'
import { PassiveTree, type PassiveTreeData } from '@poe2/core'

const DATA_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/atlas-tree.json`

export interface AtlasTreeData extends PassiveTreeData {
  generatedFrom: string
  byName: Record<string, number[]>
}

export interface AtlasTree {
  tree: PassiveTree
  /** Node name -> ids. Names repeat ("Pack Size"), so every id is kept. */
  byName: Map<string, number[]>
  /** Node id -> subtree ("Ritual", "Breach", "Generic"…). */
  subtree: Map<number, string>
  source: string
}

export type AtlasTreeState =
  | { status: 'loading' }
  | { status: 'ready'; atlas: AtlasTree }
  | { status: 'error'; message: string }

let shared: Promise<AtlasTree> | null = null

function load(): Promise<AtlasTree> {
  shared ??= fetch(DATA_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`the Atlas tree data returned ${res.status}`)
      const data = (await res.json()) as AtlasTreeData
      const subtree = new Map<number, string>()
      for (const [id, raw] of Object.entries(data.nodes)) {
        const t = (raw as { t?: string }).t
        if (t) subtree.set(Number(id), t)
      }
      return {
        tree: new PassiveTree(data),
        byName: new Map(Object.entries(data.byName)),
        subtree,
        source: data.generatedFrom,
      }
    })
    .catch((err: Error) => {
      shared = null
      throw err
    })
  return shared
}

export function useAtlasTree(): AtlasTreeState {
  const [state, setState] = useState<AtlasTreeState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    load()
      .then((atlas) => !cancelled && setState({ status: 'ready', atlas }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
