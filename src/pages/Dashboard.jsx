import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Plus, FolderOpen, Calendar, FileText, CheckCircle2,
  AlertCircle, Clock, ChevronRight, Zap, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  sin_archivos: { label: 'Sin archivos', color: 'bg-slate-100 text-slate-600', icon: Clock },
  procesando: { label: 'Procesando', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  con_errores: { label: 'Con errores', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

export default function Dashboard() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Projects.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowNewProject(false);
      setNewProjectName('');
      setNewClientName('');
      setNewNotes('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setConfirmDeleteId(null);
    }
  });

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    createMutation.mutate({
      name: newProjectName.trim(),
      client_name: newClientName.trim() || newProjectName.trim(),
      notes: newNotes.trim(),
      status: 'activo',
      total_files: 0,
      total_rows: 0,
      processing_status: 'sin_archivos'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Auditoría Energética</h1>
              <p className="text-xs text-slate-500">Gestión de facturas y suministros</p>
            </div>
          </div>
          <Button onClick={() => setShowNewProject(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Proyectos</h2>
            <p className="text-sm text-slate-500 mt-0.5">{projects.length} proyectos activos</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay proyectos todavía</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Crea un proyecto para empezar a cargar facturas</p>
            <Button onClick={() => setShowNewProject(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const sc = statusConfig[project.processing_status] || statusConfig.sin_archivos;
              const Icon = sc.icon;
              return (
                <div key={project.id} className={`bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow ${confirmDeleteId === project.id ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate text-sm">{project.name}</h3>
                      {project.client_name && project.client_name !== project.name && (
                        <p className="text-xs text-slate-500 mt-0.5">{project.client_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                      {confirmDeleteId === project.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(project.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                          >
                            {deleteMutation.isPending ? '…' : 'Eliminar'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(project.id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {project.total_files || 0} facturas
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {project.total_rows || 0} suministros
                    </span>
                    {project.created_date && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(project.created_date), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    )}
                  </div>

                  {project.notes && (
                    <p className="text-xs text-slate-400 mb-4 truncate">{project.notes}</p>
                  )}

                  <Link to={`/project/${project.id}`}>
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      Abrir proyecto
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre del proyecto <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej: Ayuntamiento de Valladolid 2024"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente / Ayuntamiento
              </label>
              <Input
                placeholder="Nombre del ayuntamiento"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notas (opcional)
              </label>
              <Input
                placeholder="Notas adicionales"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}