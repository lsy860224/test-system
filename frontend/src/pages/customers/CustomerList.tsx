import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customersApi, type CustomerListItem } from '@/api/customers'
import Table, { type Column, type SortState } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { toggleSort, sortByKey } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import CustomerForm from './CustomerForm'

const FETCH_SIZE = 1000

export default function CustomerList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const PAGE_SIZE = 20

  const load = () => {
    setLoading(true)
    customersApi.list({ size: FETCH_SIZE, search: search || undefined, company_type: filterType || undefined })
      .then((r) => { setItems(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); load() }, [filterType])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}개사`) }, [total])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load() }

  const openNew = () => navigate('/customers/new')
  const openEdit = (row: CustomerListItem) => { setEditId(row.id); setShowForm(true) }
  const handleSaved = () => { setShowForm(false); load() }

  const sortedItems = sortByKey(items, sort)
  const pageItems = sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<CustomerListItem>[] = [
    {
      key: 'color_hex', header: '', width: 6,
      render: (r) => (
        <div style={{ width: 4, height: 36, borderRadius: 2, background: r.color_hex, margin: '-4px 0' }} />
      ),
    },
    { key: 'name',         header: '업체명',    sortable: true, render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'short_name',   header: '약칭',      width: 100, sortable: true, render: (r) => r.short_name ?? '-' },
    { key: 'company_type', header: '구분',      width: 120, sortable: true, render: (r) => <Badge label={r.company_type} /> },
    { key: 'partner_code', header: '협력사 코드', width: 130, sortable: true, render: (r) => r.partner_code ?? '-' },
    { key: 'is_active',    header: '상태',      width: 80,  sortable: true, render: (r) => <Badge label={r.is_active ? '활성' : '비활성'} color={r.is_active ? '#38A169' : '#718096'} /> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={openNew}>+ 신규 등록</Button>
      </div>

      {/* 분류 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        {['', '완성차', '1차협력사', '납품사_협력사'].map((t) => (
          <button
            key={t}
            onClick={() => { setFilterType(t) }}
            style={{
              padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filterType === t ? 700 : 400,
              color: filterType === t ? 'var(--au-blue)' : 'var(--text-secondary)',
              borderBottom: filterType === t ? '2px solid var(--au-blue)' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {t || '전체'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 6 }}>
          <input
            placeholder="업체명 검색"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 180 }}
          />
          <Button type="submit" variant="secondary" size="sm">검색</Button>
        </form>
      </div>

      <Table
        columns={columns}
        data={pageItems}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        loading={loading}
        emptyText="등록된 업체가 없습니다. '+ 신규 등록'을 눌러 추가하세요."
        sort={sort}
        onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
      />

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span style={{ fontSize: 13, lineHeight: '28px', color: 'var(--text-secondary)' }}>{page} / {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      )}

      {showForm && (
        <CustomerForm
          customerId={editId}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
