import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminSnapshot } from '../admin'
import { companySchema } from '../types'
import type { Company } from '../types'

export function CompanyPicker({
  company,
  onChange,
  disabled = false,
}: {
  company: Company | null
  onChange: (company: Company | null) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const id = useId()
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim())
    }, 300)
    return () => {
      clearTimeout(timer)
    }
  }, [query])
  const companies = useQuery({
    queryKey: ['guide-admin', 'company-picker', debounced],
    queryFn: () => adminSnapshot('companies', 1, debounced),
    retry: false,
  })
  const options = companies.data?.rows.map((row) => companySchema.parse(row)) ?? []
  if (company && !options.some((row) => row.id === company.id)) options.unshift(company)
  return (
    <div className="admin-company-picker">
      <label htmlFor={id}>Empresa do catálogo</label>
      <div>
        <input
          type="search"
          aria-label="Buscar empresa pelo nome"
          placeholder="Buscar empresa pelo nome…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          maxLength={150}
          disabled={disabled}
        />
        <select
          id={id}
          value={company?.id ?? ''}
          disabled={disabled || companies.isPending}
          onChange={(event) => {
            onChange(options.find((row) => row.id === event.target.value) ?? null)
          }}
        >
          <option value="">Selecione uma empresa</option>
          {options.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>
      {companies.isError ? (
        <p role="alert">
          Não foi possível carregar as empresas.{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void companies.refetch()
            }}
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        <small>
          {companies.isFetching
            ? 'Buscando empresas…'
            : 'Busque pelo nome para encontrar outras empresas. Rascunhos também aparecem aqui.'}
        </small>
      )}
    </div>
  )
}
