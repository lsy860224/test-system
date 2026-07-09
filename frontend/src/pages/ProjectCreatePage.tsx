import { useNavigate } from 'react-router-dom'
import ProjectForm from './ProjectForm'

export default function ProjectCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <ProjectForm
        projectId={null}
        standalone
        onClose={() => navigate('/projects')}
        onSaved={() => navigate('/projects')}
      />
    </div>
  )
}
