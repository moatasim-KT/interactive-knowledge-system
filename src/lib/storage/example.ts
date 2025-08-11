/**
 * Example usage of the storage layer
 * This file demonstrates how to use the IndexedDB storage system
 */
import { initializeStorage, contentStorage, progressStorage, settingsStorage } from './index.js';
import type { ContentModule } from '../types/content.js';

/**
 * Example: Complete workflow for creating and managing content
 */
export async function exampleWorkflow() {
	// Initialize the storage system
	await initializeStorage();
	console.log('Storage initialized');

	// 1. Create a new content module
	const module_data = {
		id: 'example-module-1',
		title: 'Introduction to TypeScript',
		description: 'Learn the basics of TypeScript programming',
		blocks: [
			{
				id: 'block-1',
				type: 'text' as const,
				content: 'TypeScript is a typed superset of JavaScript...',
				metadata: {
					created: new Date(),
					modified: new Date(),
					version: 1
				}
			}
		],
		metadata: {
			tags: ['typescript', 'programming', 'beginner'],
			difficulty: 2,
			estimatedTime: 45,
			prerequisites: ['javascript-basics'],
			language: 'en'
		},
		relationships: {
			prerequisites: ['javascript-basics'],
			dependents: [],
			related: ['javascript-advanced']
		},
		analytics: {
			views: 0,
			completions: 0,
			averageScore: 0,
			averageTime: 0
		}
	};

	const created_module = await contentStorage.createModule(module_data);
	console.log('Created module:', created_module.title);

	// 2. Create user settings
	const user_id = 'user-123';
	const user_settings = await settingsStorage.createDefaultSettings(
		user_id,
		'John Doe',
		'john.doe@example.com'
	);
	console.log('Created user settings for:', user_settings.profile.name);

	// 3. Update user preferences
	await settingsStorage.updatePreferences(user_id, {
		theme: 'dark',
		learningStyle: 'visual',
		difficulty: 3
	});
	console.log('Updated user preferences');

	// 4. Start learning the module
	await progressStorage.startModule(user_id, created_module.id);
	console.log('Started module for user');

	// 5. Simulate some learning time
	await progressStorage.addTimeSpent(user_id, created_module.id, 30);
	console.log('Added 30 minutes of study time');

	// 6. Bookmark the module
	const is_bookmarked = await progressStorage.toggleBookmark(user_id, created_module.id);
	console.log('Module bookmarked:', is_bookmarked);

	// 7. Complete the module with a score
	await progressStorage.completeModule(user_id, created_module.id, 88);
	console.log('Completed module with score: 88');

	// 8. Update the module content
	const updated_module = {
		...created_module,
		title: 'Introduction to TypeScript - Updated',
		blocks: [
			...created_module.blocks,
			{
				id: 'block-2',
				type: 'code' as const,
				content: 'const greeting: string = "Hello, TypeScript!";',
				metadata: {
					created: new Date(),
					modified: new Date(),
					version: 1
				}
			}
		]
	};

	await contentStorage.updateModule(updated_module, 'Added code example');
	console.log('Updated module with new content');

	// 9. Search for modules
	const search_results = await contentStorage.searchModulesByTag('typescript');
	console.log('Found modules with TypeScript tag:', search_results.length);

	// 10. Get user progress summary
	const user_progress = await progressStorage.getUserProgress(user_id);
	const completed_modules = await progressStorage.getCompletedModules(user_id);
	const bookmarked_modules = await progressStorage.getBookmarkedModules(user_id);

	console.log('User progress summary:');
	console.log('- Total modules:', user_progress.length);
	console.log('- Completed modules:', completed_modules.length);
	console.log('- Bookmarked modules:', bookmarked_modules.length);

	// 11. Get module version history
	const module_history = await contentStorage.getModuleHistory(created_module.id);
	console.log('Module has', module_history.length, 'versions');

	// 12. Get recently accessed modules
	const recent_modules = await progressStorage.getRecentlyAccessed(user_id, 5);
	console.log('Recently accessed modules:', recent_modules.length);

	return {
		module: updated_module,
		userSettings: user_settings,
		progress: user_progress,
		history: module_history
	};
}

/**
 * Example: Batch operations for importing content
 */
export async function exampleBatchImport() {
	await initializeStorage();

	const modules = [
		{
			id: 'batch-1',
			title: 'HTML Fundamentals',
			description: 'Learn HTML basics',
			tags: ['html', 'web', 'beginner'],
			difficulty: 1
		},
		{
			id: 'batch-2',
			title: 'CSS Styling',
			description: 'Learn CSS for styling',
			tags: ['css', 'web', 'beginner'],
			difficulty: 2
		},
		{
			id: 'batch-3',
			title: 'JavaScript Basics',
			description: 'Learn JavaScript programming',
			tags: ['javascript', 'programming', 'beginner'],
			difficulty: 2
		}
	];

	console.log('Starting batch import...');

	for (const module_data of modules) {
		const full_module_data = {
			...module_data,
			blocks: [],
			metadata: {
				tags: module_data.tags,
				difficulty: module_data.difficulty,
				estimatedTime: 30,
				prerequisites: [],
				language: 'en'
			},
			relationships: {
				prerequisites: [],
				dependents: [],
				related: []
			},
			analytics: {
				views: 0,
				completions: 0,
				averageScore: 0,
				averageTime: 0
			}
		};

		await contentStorage.createModule(full_module_data);
		console.log('Imported:', module_data.title);
	}

	console.log('Batch import completed');

	// Verify import
	const all_modules = await contentStorage.getAllModules();
	console.log('Total modules in database:', all_modules.length);

	return all_modules;
}

/**
 * Example: Error handling and recovery
 */
export async function exampleErrorHandling() {
	try {
		await initializeStorage();

		// Try to get a non-existent module
		const non_existent_module = await contentStorage.getModule('does-not-exist');
		console.log('Non-existent module result:', non_existent_module); // Should be undefined

		// Try to update settings for non-existent user
		try {
			await settingsStorage.updatePreferences('non-existent-user', { theme: 'dark' });
		} catch (error) {
			console.log('Expected error for non-existent user:', error.message);
		}

		// Try to restore a non-existent version
		try {
			await contentStorage.restoreModuleVersion('non-existent-module', 999);
		} catch (error) {
			console.log('Expected error for non-existent version:', error.message);
		}

		console.log('Error handling examples completed');
	} catch (error) {
		console.error('Unexpected error:', error);
		throw error;
	}
}

// Export for use in other parts of the application
export { initializeStorage, contentStorage, progressStorage, settingsStorage };
