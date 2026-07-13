import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { itemsApi, type Item } from '@/api/items'
import Table, { type Column } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import { toggleSort } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import Pagination from '@/components/ui/Pagination'
import ItemForm from './ItemForm'

export default function ItemList() {
  const navigate = useNavigate()
  const { total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<Item>({ key: 'name', dir: 'asc' })
  const [search, setSearch] = useState('')
  const [formItemId, setFormItemId] = useState<number | null | undefined>(undefined)

  const load = () => runLoad(() => itemsApi.list({ size: FETCH_SIZE, search: search || undefined }))

  useEffect(() => { load() }, [])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}건`) }, [total])

  const handleSaved = () => { setFormItemId(undefined); load() }

  const columns: Column<Item>[] = [
    { key: 'item_code', header: '아이템 코드', width: 130, sortable: true, render: (r) => r.item_code ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'name', header: '아이템명', sortable: true },
    { key: 'category', header: '분류', width: 140, sortable: true, render: (r) => r.category ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'spec', header: '사양/설명', render: (r) => r.spec ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={() => navigate('/items/new')}>+ 아이템 등록</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          placeholder="아이템 코드 / 아이템명 검색"
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 220 }}
        />
        <Button variant="secondary" size="sm" onClick={load}>검색</Button>
      </div>

      <Table
        columns={columns}
        data={pageItems}
        rowKey={(r) => r.id}
        loading={loading}
        emptyText="등록된 아이템이 없습니다. 위 '+ 아이템 등록' 버튼으로 추가하세요."
        sort={sort}
        onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
        onRowClick={(r) => setFormItemId(r.id)}
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {formItemId !== undefined && (
        <ItemForm
          itemId={formItemId}
          onClose={() => setFormItemId(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
