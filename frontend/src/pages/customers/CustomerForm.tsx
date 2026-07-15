import React, { type ReactNode, type CSSProperties, useEffect, useRef, useState } from 'react'
import { customersApi, type Customer, type Contact, type Attachment } from '@/api/customers'
import Button from '@/components/ui/Button'
import { FileDropZone } from '@/components/ui/FileDropZone'
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog'
import { useFormState } from '@/hooks/useFormState'
import { useUnsavedFormGuard } from '@/hooks/useUnsavedFormGuard'
import { getErrorMessage } from '@/utils/errorMessage'
import { validateRequired } from '@/utils/validateRequired'

interface Props {
  customerId: number | null
  onClose: () => void
  onSaved: () => void
  standalone?: boolean
}

type Tab = 'info' | 'contacts' | 'attachments'

const COMPANY_TYPES = ['완성차', '1차협력사', '납품사_협력사']
const COLOR_PRESETS = ['#2B2F82', '#1565C0', '#29ABE2', '#003087', '#E53E3E', '#38A169', '#D69E2E', '#718096']

const emptyInfo = {
  name: '', short_name: '', company_type: '1차협력사',
  business_reg_number: '', homepage: '', address: '',
  color_hex: '#2B2F82', partner_code: '', notes: '',
}

export default function CustomerForm({ customerId, onClose, onSaved, standalone }: Props) {
  const isEdit = customerId !== null
  const [tab, setTab] = useState<Tab>('info')
  const [info, setInfo, setField] = useFormState({ ...emptyInfo })
  const [contacts, setContacts] = useState<Partial<Contact>[]>([{ name: '', title: '', phone: '', email: '', is_primary: true }])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ file: File; docType: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedCustomerId, setSavedCustomerId] = useState<number | null>(customerId)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { confirmOpen, requestClose, confirmDiscard, confirmCancel, markClean } = useUnsavedFormGuard(
    { info, contacts, pendingFilesCount: pendingFiles.length },
    !loading,
  )
  const handleClose = () => requestClose(onClose)

  useEffect(() => {
    if (!isEdit || !customerId) return
    customersApi.get(customerId).then((c: Customer) => {
      setInfo({
        name: c.name, short_name: c.short_name ?? '',
        company_type: c.company_type, business_reg_number: c.business_reg_number ?? '',
        homepage: c.homepage ?? '', address: c.address ?? '',
        color_hex: c.color_hex, partner_code: c.partner_code ?? '', notes: c.notes ?? '',
      })
      setContacts(c.contacts.length > 0 ? (c.contacts as unknown as Partial<Contact>[]) : [{ name: '', title: '', phone: '', email: '', is_primary: true }])
      setAttachments(c.attachments)
    }).finally(() => setLoading(false))
  }, [customerId])


  const addContact = () => setContacts((prev) => [...prev, { name: '', title: '', phone: '', email: '', is_primary: false }])
  const removeContact = (idx: number) => setContacts((prev) => prev.filter((_, i) => i !== idx))
  const setContact = (idx: number, key: string, value: string | boolean) =>
    setContacts((prev) => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c))

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setPendingFiles((prev) => [...prev, ...files.map((f) => ({ file: f, docType: '기타' }))])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPendingFiles((prev) => [...prev, ...files.map((f) => ({ file: f, docType: '기타' }))])
    e.target.value = ''
  }

  const removePending = (idx: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    const error = validateRequired([[!info.name.trim(), '업체명을 입력하세요']])
    if (error) { alert(error); return }
    setSaving(true)
    try {
      let cid = savedCustomerId
      if (!isEdit || !cid) {
        const created = await customersApi.create({ ...info, contacts: contacts.filter((c) => c.name?.trim()) })
        cid = created.id
        setSavedCustomerId(cid)
      } else {
        await customersApi.update(cid, info)
        // sync contacts: only add new ones (no id)
        for (const c of contacts) {
          if (!c.id && c.name?.trim()) await customersApi.addContact(cid, c)
        }
      }
      // upload pending files
      for (const { file, docType } of pendingFiles) {
        await customersApi.uploadAttachment(cid!, file, docType)
      }
      markClean()
      onSaved()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '저장 중 오류가 발생했습니다')
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!customerId) return
    if (!confirm('이 업체를 비활성화하시겠습니까?')) return
    await customersApi.deactivate(customerId)
    onSaved()
  }

  const handleDeleteAttachment = async (attId: number) => {
    if (!customerId) return
    await customersApi.deleteAttachment(customerId, attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  if (loading) return <Modal onClose={onClose} standalone={standalone}><div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div></Modal>

  return (
    <Modal onClose={handleClose} standalone={standalone}>
      {/* header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{isEdit ? '업체 수정' : '신규 업체 등록'}</h3>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['info', 'contacts', 'attachments'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--au-blue)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--au-blue)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>
              {t === 'info' ? '업체 정보' : t === 'contacts' ? `담당자 (${contacts.filter(c => c.name?.trim()).length})` : `첨부파일 (${attachments.length + pendingFiles.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(80vh - 160px)' }}>
        {tab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="업체명 *" span={2}>
              <input value={info.name} onChange={(e) => setField('name', e.target.value)} style={inputStyle} placeholder="(주)AU Inc." />
            </Field>
            <Field label="약칭">
              <input value={info.short_name} onChange={(e) => setField('short_name', e.target.value)} style={inputStyle} placeholder="AU" />
            </Field>
            <Field label="구분 *">
              <select value={info.company_type} onChange={(e) => setField('company_type', e.target.value)} style={inputStyle}>
                {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="사업자등록번호">
              <input value={info.business_reg_number} onChange={(e) => setField('business_reg_number', e.target.value)} style={inputStyle} placeholder="000-00-00000" />
            </Field>
            <Field label="협력사 코드">
              <input value={info.partner_code} onChange={(e) => setField('partner_code', e.target.value)} style={inputStyle} placeholder="HKMC 협력사 코드" />
            </Field>
            <Field label="홈페이지" span={2}>
              <input value={info.homepage} onChange={(e) => setField('homepage', e.target.value)} style={inputStyle} placeholder="https://" />
            </Field>
            <Field label="주소" span={2}>
              <input value={info.address} onChange={(e) => setField('address', e.target.value)} style={inputStyle} placeholder="경기도 성남시 ..." />
            </Field>
            <Field label="대표 색상" span={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={info.color_hex} onChange={(e) => setField('color_hex', e.target.value)}
                  style={{ width: 40, height: 32, border: '1px solid var(--border)', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} onClick={() => setField('color_hex', c)}
                      style={{ width: 22, height: 22, borderRadius: 4, background: c, border: info.color_hex === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.color_hex}</span>
              </div>
            </Field>
            <Field label="메모" span={2}>
              <textarea value={info.notes} onChange={(e) => setField('notes', e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="특이사항, 계약 조건 등" />
            </Field>
          </div>
        )}

        {tab === 'contacts' && (
          <div>
            {contacts.map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>담당자 {i + 1}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginRight: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!c.is_primary}
                      onChange={(e) => setContact(i, 'is_primary', e.target.checked)} />
                    주 담당자
                  </label>
                  {contacts.length > 1 && (
                    <button onClick={() => removeContact(i)}
                      style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>삭제</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="이름 *">
                    <input value={c.name ?? ''} onChange={(e) => setContact(i, 'name', e.target.value)} style={inputStyle} placeholder="홍길동" />
                  </Field>
                  <Field label="직책">
                    <input value={c.title ?? ''} onChange={(e) => setContact(i, 'title', e.target.value)} style={inputStyle} placeholder="구매팀 차장" />
                  </Field>
                  <Field label="연락처">
                    <input value={c.phone ?? ''} onChange={(e) => setContact(i, 'phone', e.target.value)} style={inputStyle} placeholder="010-0000-0000" />
                  </Field>
                  <Field label="이메일">
                    <input value={c.email ?? ''} onChange={(e) => setContact(i, 'email', e.target.value)} style={inputStyle} placeholder="name@company.com" />
                  </Field>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addContact}>+ 담당자 추가</Button>
          </div>
        )}

        {tab === 'attachments' && (
          <div>
            {/* drag-drop zone */}
            <FileDropZone
              isDragOver={isDragOver}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              fileInputRef={fileRef}
              onFileSelect={handleFileSelect}
              hint="사업자등록증, 계약서, 인증서 등"
              accentColor="var(--au-blue)"
            />

            {/* pending new files */}
            {pendingFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>첨부 예정 (저장 시 업로드)</div>
                {pendingFiles.map((pf, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, flex: 1 }}>{pf.file.name}</span>
                    <select value={pf.docType} onChange={(e) => {
                      const v = e.target.value
                      setPendingFiles((prev) => prev.map((f, j) => j === i ? { ...f, docType: v } : f))
                    }} style={{ fontSize: 12, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 6 }}>
                      {['사업자등록증', '계약서', '인증서', 'NDA', '기타'].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(pf.file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* existing attachments */}
            {attachments.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>업로드된 파일</div>
                {attachments.map((att) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg)', borderRadius: 4, color: 'var(--text-muted)' }}>{att.doc_type ?? '기타'}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{att.file_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ''}</span>
                    <button onClick={() => handleDeleteAttachment(att.id)}
                      style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: 13 }}>삭제</button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length === 0 && pendingFiles.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>첨부된 파일이 없습니다</div>
            )}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isEdit && (
          <Button variant="danger" size="sm" onClick={handleDeactivate}>비활성화</Button>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={handleClose}>취소</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>
          {isEdit ? '수정 저장' : '등록'}
        </Button>
      </div>

      {confirmOpen && (
        <UnsavedChangesDialog saving={saving} onSave={handleSave} onDiscard={confirmDiscard} onCancel={confirmCancel} />
      )}
    </Modal>
  )
}

function Modal({ children, onClose, standalone }: { children: ReactNode; onClose: () => void; standalone?: boolean }) {
  if (standalone) {
    return (
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: 680, maxWidth: '95vw',
        margin: '0 auto', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
      }}>
        {children}
      </div>
    )
  }
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: 680, maxWidth: '95vw',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, span }: { label: string; children: ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
