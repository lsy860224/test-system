import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehicleModelsApi, type VehicleModel } from '@/api/vehicleModels'
import Table, { type Column } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import { toggleSort } from '@/utils/sort'
import { useUIStore } from '@/stores/uiStore'
import { useListPagination, FETCH_SIZE } from '@/hooks/useListPagination'
import Pagination from '@/components/ui/Pagination'
import VehicleModelForm from './VehicleModelForm'

export default function VehicleModelList() {
  const navigate = useNavigate()
  const { total, loading, page, setPage, sort, setSort, totalPages, pageItems, runLoad } =
    useListPagination<VehicleModel>({ key: 'code', dir: 'asc' })
  const [search, setSearch] = useState('')
  const [formId, setFormId] = useState<number | null | undefined>(undefined)

  const load = () => runLoad(() => vehicleModelsApi.list({ size: FETCH_SIZE, search: search || undefined }))

  useEffect(() => { load() }, [])

  const setPageCountLabel = useUIStore((s) => s.setPageCountLabel)
  useEffect(() => { setPageCountLabel(`총 ${total}건`) }, [total])

  const handleSaved = () => { setFormId(undefined); load() }

  const columns: Column<VehicleModel>[] = [
    { key: 'code', header: '차종 코드', width: 140, sortable: true },
    { key: 'name', header: '차종명', sortable: true, render: (r) => r.name ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
    { key: 'notes', header: '메모', render: (r) => r.notes ?? <span style={{ color: 'var(--text-muted)' }}>-</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--page-fill-h)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button size="sm" onClick={() => navigate('/vehicle-models/new')}>+ 차종 등록</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          placeholder="차종 코드 / 차종명 검색"
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
        emptyText="등록된 차종이 없습니다. 위 '+ 차종 등록' 버튼으로 추가하세요."
        sort={sort}
        onSortChange={(key) => { setSort((prev) => toggleSort(prev, key)); setPage(1) }}
        onRowClick={(r) => setFormId(r.id)}
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {formId !== undefined && (
        <VehicleModelForm
          vehicleModelId={formId}
          onClose={() => setFormId(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
