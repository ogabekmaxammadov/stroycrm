import React, { useState } from 'react'
import { AlertCircle, Check, Clipboard, Database, X } from 'lucide-react'

import { SUPABASE_MIGRATION_SQL } from '../lib/migrationSql'

interface SqlMigrationModalProps {
	isOpen: boolean
	onClose: () => void
}

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({
	isOpen,
	onClose,
}) => {
	const [copyResult, setCopyResult] = useState<'copied' | 'error' | null>(null)

	if (!isOpen) return null

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL)
			setCopyResult('copied')
		} catch {
			setCopyResult('error')
		}
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto'>
			<div className='relative w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden'>
				<div className='flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50'>
					<div className='flex items-center gap-2.5'>
						<div className='p-2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100'>
							<Database size={18} />
						</div>
						<div>
							<h2 className='text-base font-semibold text-slate-800'>
								SQL-миграция Supabase
							</h2>
							<p className='text-xs text-slate-500'>
								Создайте таблицы и политики базы данных
							</p>
						</div>
					</div>
					<button
						type='button'
						onClick={onClose}
						aria-label='Закрыть'
						className='p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors'
					>
						<X size={18} />
					</button>
				</div>

				<div className='p-6 space-y-4 text-xs'>
					<p className='text-slate-600'>
						Откройте <span className='font-medium'>SQL Editor</span> в панели
						Supabase, вставьте скрипт и нажмите Run.
					</p>

					<textarea
						readOnly
						value={SUPABASE_MIGRATION_SQL}
						aria-label='SQL-скрипт миграции Supabase'
						className='w-full h-72 p-3 border border-slate-300 rounded-md bg-slate-50 text-[11px] text-slate-700 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500'
					/>

					{copyResult && (
						<div
							role='status'
							className={`p-3 rounded-md border flex items-start gap-2 ${
								copyResult === 'copied'
									? 'bg-emerald-50 text-emerald-800 border-emerald-200'
									: 'bg-rose-50 text-rose-800 border-rose-200'
							}`}
						>
							{copyResult === 'copied' ? (
								<Check size={14} className='shrink-0 mt-0.5' />
							) : (
								<AlertCircle size={14} className='shrink-0 mt-0.5' />
							)}
							<span>
								{copyResult === 'copied'
									? 'SQL-скрипт скопирован. Вставьте его в SQL Editor Supabase.'
									: 'Не удалось скопировать автоматически. Выделите текст скрипта и скопируйте вручную.'}
							</span>
						</div>
					)}

					<div className='flex justify-end'>
						<button
							type='button'
							onClick={handleCopy}
							className='py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs'
						>
							<Clipboard size={14} />
							Скопировать SQL
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
