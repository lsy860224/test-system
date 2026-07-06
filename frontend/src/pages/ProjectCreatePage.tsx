import { useNavigate } from 'react-router-dom'
import ProjectForm from './ProjectForm'

export default function ProjectCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>프로젝트 등록</h2>
      <ProjectForm
        projectId={null}
        standalone
        onClose={() => navigate('/projects')}
        onSaved={() => navigate('/projects')}
      />
    </div>
  )
}
