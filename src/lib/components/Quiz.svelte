<script lang="ts">
	interface Option {
		label: string;
		isCorrect: boolean;
	}
	interface Props {
		question: string;
		options: Option[];
		shuffle?: boolean;
	}
	let { question, options, shuffle = true }: Props = $props();

	let answered = $state(false);
	let selectedIndex = $state<number | null>(null);
	let feedback = $state<string>('');
	let shuffledOptions = $state<Option[]>([]);

	$effect(() => {
		const base = [...options];
		shuffledOptions = shuffle ? base.sort(() => Math.random() - 0.5) : base;
		answered = false;
		selectedIndex = null;
		feedback = '';
	});

	function submit() {
		if (selectedIndex == null) return;
		answered = true;
		feedback = shuffledOptions[selectedIndex].isCorrect ? '✅ Correct!' : '❌ Try again';
	}
</script>

<div class="quiz">
	<div class="prompt">
		<h4 class="question">{question}</h4>
	</div>
	<div class="options" role="radiogroup" aria-label="Quiz options">
		{#each shuffledOptions as opt, i (i)}
			<label class="option" class:correct={answered && opt.isCorrect} class:incorrect={answered && selectedIndex===i && !opt.isCorrect}>
				<input type="radio" name="quiz" value={i} bind:group={selectedIndex} />
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
	<div class="actions">
		<button class="submit" onclick={submit} disabled={answered || selectedIndex==null} type="button">Submit</button>
		{#if answered}
			<span class="feedback">{feedback}</span>
		{/if}
	</div>
</div>

<style>
	.quiz { border: 1px solid var(--border-color,#e1e5e9); border-radius: 8px; padding: 1rem; background: var(--bg-color,#fff); }
	.prompt { margin-bottom: 0.75rem; }
	.question { margin: 0; font-size: 1.1rem; }
	.options { display: grid; gap: 0.5rem; margin-bottom: 0.75rem; }
	.option { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid var(--border-light,#e9ecef); border-radius: 6px; }
	.option.correct { background: #ecfdf5; border-color: #10b981; }
	.option.incorrect { background: #fef2f2; border-color: #ef4444; }
	.actions { display: flex; align-items: center; gap: 0.75rem; }
	.submit { background: #0066cc; color: #fff; border: 0; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; }
	.submit:disabled { opacity: 0.6; cursor: not-allowed; }
	.feedback { font-weight: 600; }
</style>
