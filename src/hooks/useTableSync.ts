import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeQueryTable } from '../lib/table-sync'

export function useTableSync(table: string, queryPrefix: string) {
  const client = useQueryClient()
  useEffect(() => subscribeQueryTable(client, table, queryPrefix), [client, table, queryPrefix])
}
