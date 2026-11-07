import React, { useState } from 'react'

import {
	Building2,
	CheckSquare,
	ChevronDown,
	HardHat,
	LogOut,
	Shield,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

interface NavbarProps {
	currentTab: 'objects' | 'tasks'
	onTabChange: (tab: 'objects' | 'tasks') => void
	onOpenSqlModal: () => void
	onOpenSupabaseModal: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
	currentTab,
	onTabChange,
	onOpenSqlModal,
	onOpenSupabaseModal,
}) => {
	const {
		user,
		isDirector,
		signOut,
	} = useAuth()
	const [userDropdownOpen, setUserDropdownOpen] = useState(false)

	return (
		<header className='bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-16'>
					{/* Brand & Navigation */}
					<div className='flex items-center gap-6'>
						<div className='flex items-center gap-2.5'>
							<div className='w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs'>
								<HardHat size={20} />
							</div>
							<div>
								<span className='font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5'>
									СтройCRM
								</span>
								<span className='block text-[10px] text-slate-500 font-medium'>
									Строительный контроль
								</span>
							</div>
						</div>

						{/* Navigation Tabs */}
						<nav className='flex items-center gap-1 ml-2'>
							<button
								onClick={() => onTabChange('objects')}
								className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
									currentTab === 'objects'
										? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs'
										: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
								}`}
							>
								<Building2
									size={14}
									className={
										currentTab === 'objects'
											? 'text-indigo-600'
											: 'text-slate-400'
									}
								/>
								<span>Объекты</span>
							</button>

							<button
								onClick={() => onTabChange('tasks')}
								className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
									currentTab === 'tasks'
										? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs'
										: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
								}`}
							>
								<CheckSquare
									size={14}
									className={
										currentTab === 'tasks'
											? 'text-indigo-600'
											: 'text-slate-400'
									}
								/>
								<span>{isDirector ? 'Все задачи' : 'Мои задачи'}</span>
							</button>
						</nav>
					</div>

					{/* Right Action Tools & User Profile */}
					<div className='flex items-center gap-2 sm:gap-3'>
						{/* Supabase Status Button */}

						{/* User Profile */}
						<div className='relative'>
							<button
								onClick={() => setUserDropdownOpen(!userDropdownOpen)}
								className='flex items-center gap-2 p-1 pl-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors'
							>
								<div className='text-left hidden sm:block'>
									<div className='text-xs font-semibold text-slate-800 flex items-center gap-1.5'>
										<span>{user?.full_name || 'Пользователь'}</span>
										<span
											className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
												isDirector
													? 'bg-indigo-100 text-indigo-700'
													: 'bg-amber-100 text-amber-800'
											}`}
										>
											{isDirector ? 'Руководитель' : 'Исполнитель'}
										</span>
									</div>
									<div className='text-[10px] text-slate-500'>
										{user?.email}
									</div>
								</div>

								<div
									className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-white ${isDirector ? 'bg-indigo-600' : 'bg-amber-600'}`}
								>
									{user?.full_name?.[0] || 'U'}
								</div>
								<ChevronDown size={14} className='text-slate-400' />
							</button>

							{/* Dropdown Menu */}
							{userDropdownOpen && (
								<div
									className='absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 z-50 text-xs'
									onClick={() => setUserDropdownOpen(false)}
								>
									<div className='px-3 py-2 border-b border-slate-100'>
										<p className='font-semibold text-slate-800'>
											{user?.full_name}
										</p>
										<p className='text-slate-500 text-[11px]'>{user?.email}</p>
										<div className='mt-1 flex items-center gap-1'>
											<Shield
												size={11}
												className={
													isDirector ? 'text-indigo-600' : 'text-amber-600'
												}
											/>
											<span className='font-medium text-slate-700'>
												Роль:{' '}
												{isDirector ? 'Руководитель (Директор)' : 'Исполнитель'}
											</span>
										</div>
									</div>

									<div className='border-t border-slate-100 mt-1 pt-1'>
										<button
											onClick={signOut}
											className='w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2'
										>
											<LogOut size={13} />
											<span>Выйти из аккаунта</span>
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	)
}
