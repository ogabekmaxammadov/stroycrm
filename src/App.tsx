import { useCallback, useEffect, useState } from 'react'

import { LoginView } from './components/LoginView'
import { Navbar } from './components/Navbar'
import { ObjectDetailView } from './components/ObjectDetailView'
import { ObjectFormModal } from './components/ObjectFormModal'
import { ObjectsView } from './components/ObjectsView'
import { SqlMigrationModal } from './components/SqlMigrationModal'
import { SupabaseConfigModal } from './components/SupabaseConfigModal'
import { TaskDetailModal } from './components/TaskDetailModal'
import { TaskFormModal } from './components/TaskFormModal'
import { TasksView } from './components/TasksView'
import { AuthProvider, useAuth } from './context/AuthContext'
import { dataService } from './services/dataService'
import { ConstructionObject, Task } from './types'

function MainApp() {
	const { user, isLoading } = useAuth()

	// Navigation state
	const [currentTab, setCurrentTab] = useState<'objects' | 'tasks'>('objects')
	const [selectedObject, setSelectedObject] =
		useState<ConstructionObject | null>(null)

	// Data state
	const [objects, setObjects] = useState<ConstructionObject[]>([])
	const [tasks, setTasks] = useState<Task[]>([])
	const [loadingData, setLoadingData] = useState<boolean>(false)

	// Modals state
	const [selectedTask, setSelectedTask] = useState<Task | null>(null)
	const [taskDetailOpen, setTaskDetailOpen] = useState(false)

	const [taskFormOpen, setTaskFormOpen] = useState(false)
	const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
	const [defaultObjectIdForNewTask, setDefaultObjectIdForNewTask] = useState<
		string | undefined
	>()

	const [objectFormOpen, setObjectFormOpen] = useState(false)
	const [objectToEdit, setObjectToEdit] = useState<ConstructionObject | null>(
		null,
	)

	const [sqlModalOpen, setSqlModalOpen] = useState(false)
	const [supabaseModalOpen, setSupabaseModalOpen] = useState(false)

	const loadAllData = useCallback(async () => {
		if (!user) return
		setLoadingData(true)
		try {
			const [fetchedObjects, fetchedTasks] = await Promise.all([
				dataService.getObjects(),
				dataService.getTasks(),
			])
			setObjects(fetchedObjects)
			setTasks(fetchedTasks)

			// If viewing an object detail, update the reference
			if (selectedObject) {
				const updatedObj = fetchedObjects.find(o => o.id === selectedObject.id)
				if (updatedObj) {
					setSelectedObject(updatedObj)
				}
			}

			// If viewing a task detail, update the reference
			if (selectedTask) {
				const updatedTask = fetchedTasks.find(t => t.id === selectedTask.id)
				if (updatedTask) {
					setSelectedTask(updatedTask)
				}
			}
		} catch (err) {
			console.error('Error fetching data:', err)
		} finally {
			setLoadingData(false)
		}
	}, [user, selectedObject, selectedTask])

	useEffect(() => {
		if (user) {
			loadAllData()
		}
	}, [user])

	if (isLoading) {
		return (
			<div className='min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500'>
				<div className='flex flex-col items-center gap-3'>
					<div className='w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin'></div>
					<span>Инициализация системы СтройCRM...</span>
				</div>
			</div>
		)
	}

	// Not logged in -> show login screen
	if (!user) {
		return (
			<>
				<LoginView
					onOpenSupabaseConfig={() => setSupabaseModalOpen(true)}
					onOpenSqlModal={() => setSqlModalOpen(true)}
				/>
				<SupabaseConfigModal
					isOpen={supabaseModalOpen}
					onClose={() => setSupabaseModalOpen(false)}
					onConfigChanged={() => {}}
				/>
				<SqlMigrationModal
					isOpen={sqlModalOpen}
					onClose={() => setSqlModalOpen(false)}
				/>
			</>
		)
	}

	// Handlers
	const handleOpenTaskDetail = (task: Task) => {
		setSelectedTask(task)
		setTaskDetailOpen(true)
	}

	const handleOpenCreateTask = (objectId?: string) => {
		setTaskToEdit(null)
		setDefaultObjectIdForNewTask(objectId)
		setTaskFormOpen(true)
	}

	const handleOpenEditTask = (task: Task) => {
		setTaskDetailOpen(false)
		setTaskToEdit(task)
		setTaskFormOpen(true)
	}

	const handleOpenCreateObject = () => {
		setObjectToEdit(null)
		setObjectFormOpen(true)
	}

	const handleOpenEditObject = (obj: ConstructionObject) => {
		setObjectToEdit(obj)
		setObjectFormOpen(true)
	}

	return (
		<div className='min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased'>
			{/* Top Navigation */}
			<Navbar
				currentTab={currentTab}
				onTabChange={tab => {
					setCurrentTab(tab)
					if (tab === 'objects') {
						setSelectedObject(null)
					}
				}}
				onOpenSqlModal={() => setSqlModalOpen(true)}
				onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
			/>

			{/* Main Container */}
			<main className='flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'>
				{currentTab === 'objects' ? (
					selectedObject ? (
						<ObjectDetailView
							object={selectedObject}
							tasks={tasks.filter(t => t.object_id === selectedObject.id)}
							loading={loadingData}
							onBack={() => setSelectedObject(null)}
							onSelectTask={handleOpenTaskDetail}
							onOpenCreateTask={handleOpenCreateTask}
						/>
					) : (
						<ObjectsView
							objects={objects}
							loading={loadingData}
							onRefresh={loadAllData}
							onSelectObject={obj => setSelectedObject(obj)}
							onOpenCreateObject={handleOpenCreateObject}
							onEditObject={handleOpenEditObject}
						/>
					)
				) : (
					<TasksView
						tasks={tasks}
						objects={objects}
						loading={loadingData}
						onRefresh={loadAllData}
						onSelectTask={handleOpenTaskDetail}
						onOpenCreateTask={() => handleOpenCreateTask()}
					/>
				)}
			</main>

			{/* Modals */}
			<TaskDetailModal
				task={selectedTask}
				isOpen={taskDetailOpen}
				onClose={() => {
					setTaskDetailOpen(false)
					setSelectedTask(null)
				}}
				onTaskUpdated={loadAllData}
				onEditTask={handleOpenEditTask}
			/>

			<TaskFormModal
				isOpen={taskFormOpen}
				onClose={() => {
					setTaskFormOpen(false)
					setTaskToEdit(null)
				}}
				onSaved={loadAllData}
				taskToEdit={taskToEdit}
				defaultObjectId={defaultObjectIdForNewTask}
			/>

			<ObjectFormModal
				isOpen={objectFormOpen}
				onClose={() => {
					setObjectFormOpen(false)
					setObjectToEdit(null)
				}}
				onSaved={loadAllData}
				objectToEdit={objectToEdit}
			/>

			<SqlMigrationModal
				isOpen={sqlModalOpen}
				onClose={() => setSqlModalOpen(false)}
			/>

			<SupabaseConfigModal
				isOpen={supabaseModalOpen}
				onClose={() => setSupabaseModalOpen(false)}
				onConfigChanged={loadAllData}
			/>
		</div>
	)
}

export default function App() {
	return (
		<AuthProvider>
			<MainApp />
		</AuthProvider>
	)
}
