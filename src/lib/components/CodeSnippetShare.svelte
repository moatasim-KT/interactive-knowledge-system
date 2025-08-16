<script lang="ts">
	import { Button } from './ui';

	interface Props {
		code: string;
		language?: string;
		showLineNumbers?: boolean;
		copyButtonText?: string;
		shareButtonText?: string;
		onCopy?: (detail: { code: string }) => void;
		onShare?: (detail: { code: string; url?: string }) => void;
	}

	let {
		code,
		language = 'javascript',
		showLineNumbers = true,
		copyButtonText = 'Copy Code',
		shareButtonText = 'Share',
		onCopy = () => {},
		onShare = () => {}
	}: Props = $props();

	let copied = $state(false);
	
	// Share data state
	let share_data = $state({
		title: '',
		description: '',
		tags: '',
		isPublic: false
	});
	
	// Existing share data (if updating)
	let existingShare = $state<any>(null);
	
		// Share URL
	let share_url = $state<string | null>(null);
	
	// Additional state variables
    let codeContent = $state({ code, language });
	let is_submitting = $state(false);
	let error = $state<string | null>(null);
	let is_valid = $state(true);
	
	// Function to generate shareable link
	function generate_shareable_link() {
		// TODO: Implement link generation
		return 'https://example.com/share/123';
	}
	
	async function copy_code() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			onCopy({ code });
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			alert('Failed to copy code.');
		}
	}

	async function share_code() {
		if (navigator.share) {
			try {
				await navigator.share({
					title: 'Code Snippet',
					text: code
				});
				onShare({ code });
			} catch (err) {
				console.error('Failed to share code:', err);
			}
		} else {
			// Fallback for browsers that do not support Web Share API
			alert('Web Share API is not supported in your browser. You can copy the code instead.');
			onShare({ code, url: 'unsupported' });
		}
	}

	
	
	// Handle form submission
	function handle_submit(event: Event) {
		event.preventDefault();
		// TODO: Implement share logic
		console.log('Share data:', share_data);
	}
	
	// Handle cancel/close
	function handle_cancel() {
		// TODO: Implement cancel logic
		console.log('Cancel clicked');
	}
</script>

<div
    class="share-modal-overlay"
    role="button"
    tabindex="0"
    onclick={handle_cancel}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handle_cancel()}
>
    <div
        class="share-modal"
        role="dialog"
        aria-modal="true"
        tabindex="0"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                handle_cancel();
            }
        }}
    >
		<div class="modal-header">
			<h3>{existingShare ? 'Update' : 'Share'} Code Snippet</h3>
			<button onclick={handle_cancel} class="close-btn">✖️</button>
		</div>

		<form onsubmit={handle_submit} class="share-form">
			<div class="form-group">
				<label for="title">Title *</label>
				<input
					id="title"
					type="text"
					bind:value={share_data.title}
					placeholder="Enter a descriptive title"
					required
					class="form-input"
				/>
			</div>

			<div class="form-group">
				<label for="description">Description *</label>
				<textarea
					id="description"
					bind:value={share_data.description}
					placeholder="Describe what this code does"
					required
					rows="3"
					class="form-textarea"
				></textarea>
			</div>

			<div class="form-group">
				<label for="tags">Tags</label>
				<input
					id="tags"
					type="text"
					bind:value={share_data.tags}
					placeholder="javascript, tutorial, example (comma-separated)"
					class="form-input"
				/>
				<small class="form-help">Separate tags with commas</small>
			</div>

			<div class="form-group">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={share_data.isPublic} class="form-checkbox" />
					Make this snippet public
				</label>
				<small class="form-help">
					{share_data.isPublic
						? 'Anyone can view and search for this snippet'
						: 'Only you and people with the link can view this snippet'}
				</small>
			</div>

			<!-- Code Preview -->
			<div class="code-preview">
				<div class="preview-header">
                    <span class="preview-label">Code Preview</span>
                    <span class="language-badge">{codeContent.language}</span>
				</div>
                <pre class="preview-code"><code>{codeContent.code}</code></pre>
			</div>

			{#if error}
				<div class="error-message">
					❌ {error}
				</div>
			{/if}

			<div class="form-actions">
				<button
					type="button"
					onclick={handle_cancel}
					class="btn btn-secondary"
					disabled={is_submitting}
				>
					Cancel
				</button>

				{#if !existingShare}
					<button
						type="button"
						onclick={() => {
							const temp_url = generate_shareable_link();
							navigator.clipboard.writeText(temp_url);
						}}
						class="btn btn-outline"
						disabled={is_submitting}
					>
						📋 Copy Temp Link
					</button>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={!is_valid || is_submitting}>
					{#if is_submitting}
						⏳ {existingShare ? 'Updating...' : 'Sharing...'}
					{:else}
						🚀 {existingShare ? 'Update' : 'Share'}
					{/if}
				</button>
			</div>
		</form>

		{#if existingShare && share_url}
			<div class="share-info">
				<div class="share-stats">
					<div class="stat">
						<span class="stat-value">{existingShare.views}</span>
						<span class="stat-label">Views</span>
					</div>
					<div class="stat">
						<span class="stat-value">{existingShare.likes}</span>
						<span class="stat-label">Likes</span>
					</div>
					<div class="stat">
						<span class="stat-value">{existingShare.forks}</span>
						<span class="stat-label">Forks</span>
					</div>
				</div>

				<div class="share-url">
                    <label for="share-url-input">Share URL:</label>
                    <div class="url-input-group">
                        <input id="share-url-input" type="text" value={share_url} readonly class="url-input" />
                        <button type="button" onclick={() => navigator.clipboard.writeText(share_url)} class="copy-btn" title="Copy URL">
                            📋
                        </button>
                    </div>
                </div>
			</div>
		{/if}
	</div>
</div>

<style>
	.share-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.share-modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h3 {
		margin: 0;
		color: #333;
		font-size: 1.25rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.share-form {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.form-textarea {
		resize: vertical;
		font-family: inherit;
	}

	.form-help {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: #666;
	}

	.checkbox-label {
		display: flex !important;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: normal !important;
	}

	.form-checkbox {
		width: auto !important;
		margin: 0;
	}

	.code-preview {
		margin-bottom: 1.5rem;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}

	.preview-label {
		font-weight: 600;
		color: #333;
		font-size: 0.9rem;
	}

	.language-badge {
		background: #007bff;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.preview-code {
		margin: 0;
		padding: 1rem;
		background: #f8f9fa;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.9rem;
		line-height: 1.4;
		overflow-x: auto;
		max-height: 200px;
		overflow-y: auto;
	}

	.error-message {
		padding: 0.75rem;
		background: #fff5f5;
		border: 1px solid #fed7d7;
		border-radius: 4px;
		color: #e53e3e;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: 1px solid;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #007bff;
		border-color: #007bff;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0056b3;
		border-color: #0056b3;
	}

	.btn-secondary {
		background: #6c757d;
		border-color: #6c757d;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #545b62;
		border-color: #545b62;
	}

	.btn-outline {
		background: transparent;
		border-color: #007bff;
		color: #007bff;
	}

	.btn-outline:hover:not(:disabled) {
		background: #007bff;
		color: white;
	}

	.share-info {
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
	}

	.share-stats {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		color: #007bff;
	}

	.stat-label {
		display: block;
		font-size: 0.8rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.share-url label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	.url-input-group {
		display: flex;
		gap: 0.5rem;
	}

	.url-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		font-family: monospace;
		font-size: 0.9rem;
	}

	.copy-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #007bff;
		background: #007bff;
		color: white;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.copy-btn:hover {
		background: #0056b3;
		border-color: #0056b3;
	}
</style>