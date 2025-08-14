<script lang="ts">
	import {
		createDataManagementService,
		type ExportOptions,
		type ImportOptions,
		DEFAULT_EXPORT_OPTIONS,
		DEFAULT_IMPORT_OPTIONS
	} from '../services/dataManagementService.js';
	import type { BackupMetadata, RestoreOptions } from '../utils/backupUtils.js';

	// Service instance
	const data_service = createDataManagementService();

	// State (reactive)
	let active_tab = $state<'export' | 'import' | 'backups'>('export');
	let is_loading = $state(false);
	let message = $state('');
	let message_type = $state<'info' | 'success' | 'warning' | 'error'>('info');

	// Export state
	let export_options = $state({ ...DEFAULT_EXPORT_OPTIONS });
	let export_filename = $state('');

	// Import state
	let import_options = $state({ ...DEFAULT_IMPORT_OPTIONS });
	let import_file = $state<File | null>(null);
	let import_content = $state('');

	// Backup state
	let backups: BackupMetadata[] = $state([]);
	let selected_backup = $state(null);
	let backup_name = $state('');
	let backup_description = $state('');
	let restore_options = $state({
		overwriteExisting: false,
		mergeWithExisting: true,
		restoreProgress: true,
		restoreSettings: false,
		createBackupBeforeRestore: true
	});

	// Load backups on component mount
	$effect(() => {
		load_backups();
	});

	function load_backups() {
		try {
			backups = data_service.listBackups();
		} catch (error) {
			show_message('Failed to load backups', 'error');
		}
	}

	async function handle_export() {
		if (!export_filename) {
			show_message('Please enter a filename', 'error');
			return;
		}

		is_loading = true;
		try {
			const result = await data_service.exportData(export_options);

			if (result.success && result.data) {
				const mime_type =
					export_options.format === 'json'
						? 'application/json'
						: export_options.format === 'markdown'
							? 'text/markdown'
							: export_options.format === 'csv'
								? 'text/csv'
								: 'application/octet-stream';

				const filename = export_filename.includes('.')
					? export_filename
					: `${export_filename}.${export_options.format}`;

				data_service.downloadData(result.data, filename, mime_type);
				show_message('Export completed successfully', 'success');
			} else {
				show_message(result.error || 'Export failed', 'error');
			}
		} catch (error) {
			show_message(
				`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		} finally {
			is_loading = false;
		}
	}

	async function handle_import() {
		if (!import_file && !import_content) {
			show_message('Please select a file or enter content to import', 'error');
			return;
		}

		is_loading = true;
		try {
			const content = import_file || import_content;
			const result = await data_service.importData(content, import_options);

			if (result.success) {
				show_message(
					`Import completed: ${result.stats.modulesImported} modules imported`,
					'success'
				);
				if (result.warnings.length > 0) {
					// Log warnings for debugging
					result.warnings.forEach((warning) => show_message(warning, 'info'));
				}
			} else {
				show_message(`Import failed: ${result.errors.join(', ')}`, 'error');
			}
		} catch (error) {
			show_message(
				`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		} finally {
			is_loading = false;
		}
	}

	async function handle_create_backup() {
		if (!backup_name) {
			show_message('Please enter a backup name', 'error');
			return;
		}

		is_loading = true;
		try {
			const result = await data_service.createBackup(backup_name, backup_description);

			if (result.success) {
				show_message(
					`Backup created successfully (${(result.size / 1024).toFixed(1)} KB)`,
					'success'
				);
				backup_name = '';
				backup_description = '';
				load_backups();
			} else {
				show_message(`Backup failed: ${result.errors.join(', ')}`, 'error');
			}
		} catch (error) {
			show_message(
				`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		} finally {
			is_loading = false;
		}
	}

	async function handle_restore_backup() {
		if (!selected_backup) {
			show_message('Please select a backup to restore', 'error');
			return;
		}

		is_loading = true;
		try {
			const result = await data_service.restoreBackup(selected_backup, restore_options);

			if (result.success) {
				show_message(
					`Restore completed: ${result.restoredItems.modules} modules restored`,
					'success'
				);
				if (result.warnings.length > 0) {
					// Log warnings for debugging
					result.warnings.forEach((warning) => show_message(warning, 'info'));
				}
			} else {
				show_message(`Restore failed: ${result.errors.join(', ')}`, 'error');
			}
		} catch (error) {
			show_message(
				`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		} finally {
			is_loading = false;
		}
	}

	async function handle_delete_backup(backup_id) {
		if (!confirm('Are you sure you want to delete this backup?')) {
			return;
		}

		try {
			const success = data_service.deleteBackup(backup_id);
			if (success) {
				show_message('Backup deleted successfully', 'success');
				load_backups();
			} else {
				show_message('Failed to delete backup', 'error');
			}
		} catch (error) {
			show_message(
				`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		}
	}

	function handle_file_select(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			import_file = target.files[0];
			// Auto-detect format from file extension
			const extension = import_file.name.split('.').pop()?.toLowerCase();
			if (extension && ['json', 'md', 'csv', 'xml', 'opml'].includes(extension)) {
				import_options.format = extension === 'md' ? 'markdown' : (extension as any);
			}
		}
	}

	function show_message(text: string, type: 'success' | 'error' | 'info' = 'info') {
		message = text;
		message_type = type;
		setTimeout(() => {
			message = '';
		}, 5000);
	}

	function format_file_size(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function format_date(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<div class="data-manager">
	<div class="header">
		<h2>Data Management</h2>
		<p>Export, import, backup, and restore your knowledge base data</p>
	</div>

	{#if message}
		<div class="message {message_type}">
			{message}
		</div>
	{/if}

	<div class="tabs">
		<button
			class="tab {active_tab === 'export' ? 'active' : ''}"
			onclick={() => (active_tab = 'export')}
		>
			Export
		</button>
		<button
			class="tab {active_tab === 'import' ? 'active' : ''}"
			onclick={() => (active_tab = 'import')}
		>
			Import
		</button>
		<button
			class="tab {active_tab === 'backups' ? 'active' : ''}"
			onclick={() => (active_tab = 'backups')}
		>
			Backup & Restore
		</button>
	</div>

	<div class="tab-content">
		{#if active_tab === 'export'}
			<div class="export-panel">
				<h3>Export Data</h3>

				<div class="form-group">
					<label for="export-format">Format:</label>
					<select id="export-format" bind:value={export_options.format}>
						<option value="json">JSON</option>
						<option value="markdown">Markdown</option>
						<option value="csv">CSV</option>
						<option value="scorm">SCORM Package</option>
					</select>
				</div>

				<div class="form-group">
					<label for="export-filename">Filename:</label>
					<input
						id="export-filename"
						type="text"
						bind:value={export_filename}
						placeholder="knowledge-base-export"
					/>
				</div>

				<div class="checkbox-group">
					<label>
						<input type="checkbox" bind:checked={export_options.includeProgress} />
						Include user progress
					</label>
					<label>
						<input type="checkbox" bind:checked={export_options.includeSettings} />
						Include user settings
					</label>
					<label>
						<input type="checkbox" bind:checked={export_options.includeMedia} />
						Include media files
					</label>
				</div>

				<button class="primary-button" onclick={handle_export} disabled={is_loading}>
					{is_loading ? 'Exporting...' : 'Export Data'}
				</button>
			</div>
		{:else if active_tab === 'import'}
			<div class="import-panel">
				<h3>Import Data</h3>

				<div class="form-group">
					<label for="import-format">Format:</label>
					<select id="import-format" bind:value={import_options.format}>
						<option value="json">JSON</option>
						<option value="markdown">Markdown</option>
						<option value="csv">CSV</option>
						<option value="xml">XML</option>
						<option value="opml">OPML</option>
					</select>
				</div>

				<div class="form-group">
					<label for="import-file">Select File:</label>
					<input
						id="import-file"
						type="file"
						onchange={handle_file_select}
						accept=".json,.md,.csv,.xml,.opml"
					/>
				</div>

				<div class="form-group">
					<label for="import-content">Or paste content:</label>
					<textarea
						id="import-content"
						bind:value={import_content}
						placeholder="Paste your data here..."
						rows="6"
					></textarea>
				</div>

				<div class="checkbox-group">
					<label>
						<input type="checkbox" bind:checked={import_options.mergeWithExisting} />
						Merge with existing data
					</label>
					<label>
						<input type="checkbox" bind:checked={import_options.overwriteExisting} />
						Overwrite existing items
					</label>
					<label>
						<input type="checkbox" bind:checked={import_options.createBackup} />
						Create backup before import
					</label>
				</div>

				<button class="primary-button" onclick={handle_import} disabled={is_loading}>
					{is_loading ? 'Importing...' : 'Import Data'}
				</button>
			</div>
		{:else if active_tab === 'backups'}
			<div class="backup-panel">
				<div class="backup-create">
					<h3>Create Backup</h3>

					<div class="form-group">
						<label for="backup-name">Backup Name:</label>
						<input id="backup-name" type="text" bind:value={backup_name} placeholder="My Backup" />
					</div>

					<div class="form-group">
						<label for="backup-description">Description (optional):</label>
						<textarea
							id="backup-description"
							bind:value={backup_description}
							placeholder="Description of this backup..."
							rows="3"
						></textarea>
					</div>

					<button class="primary-button" onclick={handle_create_backup} disabled={is_loading}>
						{is_loading ? 'Creating...' : 'Create Backup'}
					</button>
				</div>

				<div class="backup-list">
					<h3>Available Backups</h3>

					{#if backups.length === 0}
						<p class="no-backups">No backups available</p>
					{:else}
						<div class="backup-items">
							{#each backups as backup (backup.id)}
								<div class="backup-item {selected_backup === backup.id ? 'selected' : ''}">
									<div class="backup-info">
										<div class="backup-header">
											<h4>{backup.name}</h4>
											<span class="backup-type">{backup.type}</span>
										</div>
										<p class="backup-description">{backup.description}</p>
										<div class="backup-meta">
											<span>Created: {format_date(backup.created)}</span>
											<span>Size: {format_file_size(backup.size)}</span>
											<span>Version: {backup.version}</span>
										</div>
									</div>
									<div class="backup-actions">
										<button
											class="select-button {selected_backup === backup.id ? 'selected' : ''}"
											onclick={() =>
												(selected_backup = selected_backup === backup.id ? null : backup.id)}
										>
											{selected_backup === backup.id ? 'Selected' : 'Select'}
										</button>
										<button class="delete-button" onclick={() => handle_delete_backup(backup.id)}>
											Delete
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				{#if selected_backup}
					<div class="restore-options">
						<h3>Restore Options</h3>

						<div class="checkbox-group">
							<label>
								<input type="checkbox" bind:checked={restore_options.overwriteExisting} />
								Overwrite existing data
							</label>
							<label>
								<input type="checkbox" bind:checked={restore_options.mergeWithExisting} />
								Merge with existing data
							</label>
							<label>
								<input type="checkbox" bind:checked={restore_options.restoreProgress} />
								Restore user progress
							</label>
							<label>
								<input type="checkbox" bind:checked={restore_options.restoreSettings} />
								Restore user settings
							</label>
							<label>
								<input type="checkbox" bind:checked={restore_options.createBackupBeforeRestore} />
								Create backup before restore
							</label>
						</div>

						<button class="primary-button" onclick={handle_restore_backup} disabled={is_loading}>
							{is_loading ? 'Restoring...' : 'Restore Backup'}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.data-manager {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	.header {
		text-align: center;
		margin-bottom: 30px;
	}

	.header h2 {
		margin: 0 0 10px 0;
		color: #333;
	}

	.header p {
		margin: 0;
		color: #666;
	}

	.message {
		padding: 12px 16px;
		border-radius: 6px;
		margin-bottom: 20px;
		font-weight: 500;
	}

	.message.success {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.message.error {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.message.info {
		background-color: #d1ecf1;
		color: #0c5460;
		border: 1px solid #bee5eb;
	}

	.tabs {
		display: flex;
		border-bottom: 2px solid #e9ecef;
		margin-bottom: 30px;
	}

	.tab {
		background: none;
		border: none;
		padding: 12px 24px;
		cursor: pointer;
		font-size: 16px;
		font-weight: 500;
		color: #666;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
	}

	.tab:hover {
		color: #333;
		background-color: #f8f9fa;
	}

	.tab.active {
		color: #007bff;
		border-bottom-color: #007bff;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-weight: 500;
		color: #333;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 14px;
		transition: border-color 0.2s ease;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.checkbox-group {
		margin: 20px 0;
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
		font-weight: normal;
		cursor: pointer;
	}

	.checkbox-group input[type='checkbox'] {
		width: auto;
		margin-right: 8px;
	}

	.primary-button {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 12px 24px;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.primary-button:hover:not(:disabled) {
		background-color: #0056b3;
	}

	.primary-button:disabled {
		background-color: #6c757d;
		cursor: not-allowed;
	}

	.backup-create {
		background-color: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 30px;
	}

	.backup-list h3 {
		margin-bottom: 20px;
	}

	.no-backups {
		text-align: center;
		color: #666;
		font-style: italic;
		padding: 40px 0;
	}

	.backup-items {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.backup-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border: 1px solid #ddd;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.backup-item:hover {
		border-color: #007bff;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
	}

	.backup-item.selected {
		border-color: #007bff;
		background-color: #f8f9ff;
	}

	.backup-info {
		flex: 1;
	}

	.backup-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.backup-header h4 {
		margin: 0;
		color: #333;
	}

	.backup-type {
		background-color: #e9ecef;
		color: #495057;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
		text-transform: uppercase;
	}

	.backup-description {
		margin: 0 0 8px 0;
		color: #666;
		font-size: 14px;
	}

	.backup-meta {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: #888;
	}

	.backup-actions {
		display: flex;
		gap: 8px;
	}

	.select-button,
	.delete-button {
		padding: 6px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.select-button:hover {
		border-color: #007bff;
		color: #007bff;
	}

	.select-button.selected {
		background-color: #007bff;
		color: white;
		border-color: #007bff;
	}

	.delete-button:hover {
		border-color: #dc3545;
		color: #dc3545;
	}

	.restore-options {
		background-color: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		margin-top: 20px;
	}

	.restore-options h3 {
		margin-top: 0;
		margin-bottom: 20px;
	}
</style>
