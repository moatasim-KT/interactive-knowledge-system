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

	const createdModule = await contentStorage.createModule(module_data);
	console.log('Created module:', createdModule.title);

	// 2. Create user settings
	const userId = 'user-123';
	const userSettings = await settingsStorage.createDefaultSettings(
		userId,
		'John Doe',
		'john.doe@example.com'
	);
	console.log('Created user settings for:', userSettings.profile.name);

	// 3. Update user preferences
	await settingsStorage.updatePreferences(userId, {
		theme: 'dark',
		learningStyle: 'visual',
		difficulty: 3
	});
	console.log('Updated user preferences');

	// 4. Start learning the module
	await progressStorage.startModule(userId, createdModule.id);
	console.log('Started module for user');

	// 5. Simulate some learning time
	await progressStorage.addTimeSpent(userId, createdModule.id, 30);
	console.log('Added 30 minutes of study time');

	// 6. Bookmark the module
	const isBookmarked = await progressStorage.toggleBookmark(userId, createdModule.id);
	console.log('Module bookmarked:', isBookmarked);

	// 7. Complete the module with a score
	await progressStorage.completeModule(userId, createdModule.id, 88);
	console.log('Completed module with score: 88');

	// 8. Update the module content
	const updatedModule = {
		...createdModule,
		title: 'Introduction to TypeScript - Updated',
		blocks: [
			...createdModule.blocks,
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

	await contentStorage.updateModule(updatedModule, 'Added code example');
	console.log('Updated module with new content');

	// 9. Search for modules
	const searchResults = await contentStorage.searchModulesByTag('typescript');
	console.log('Found modules with TypeScript tag:', searchResults.length);

	// 10. Get user progress summary
	const userProgress = await progressStorage.getUserProgress(userId);
	const completedModules = await progressStorage.getCompletedModules(userId);
	const bookmarkedModules = await progressStorage.getBookmarkedModules(userId);

	console.log('User progress summary:');
	console.log('- Total modules:', userProgress.length);
	console.log('- Completed modules:', completedModules.length);
	console.log('- Bookmarked modules:', bookmarkedModules.length);

	// 11. Get module version history
	const moduleHistory = await contentStorage.getModuleHistory(createdModule.id);
	console.log('Module has', moduleHistory.length, 'versions');

	// 12. Get recently accessed modules
	const recentModules = await progressStorage.getRecentlyAccessed(userId, 5);
	console.log('Recently accessed modules:', recentModules.length);

	return {
		module: updatedModule,
		userSettings: userSettings,
		progress: userProgress,
		history: moduleHistory
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
	const allModules = await contentStorage.getAllModules();
	console.log('Total modules in database:', allModules.length);

	return allModules;
}

/**
 * Example: Error handling and recovery
 */
export async function exampleErrorHandling() {
	try {
		await initializeStorage();

		// Try to get a non-existent module
		const nonExistentModule = await contentStorage.getModule('does-not-exist');
		console.log('Non-existent module result:', nonExistentModule); // Should be undefined

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
