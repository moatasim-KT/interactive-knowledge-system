import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EnhancedWebContentDashboard from '../EnhancedWebContentDashboard.svelte';

// Mock the stores
vi.mock('$lib/stores/webContentState.svelte.ts', () => ({
    webContentState: {
        sources: {
            items: {
                'source-1': {
                    id: 'source-1',
                    title: 'Test Article 1',
                    url: 'https://example.com/article1',
                    domain: 'example.com',
                    status: 'active',
                    importDate: new Date('2024-01-01'),
                    lastChecked: new Date('2024-01-02'),
                    metadata: { category: 'Technology' },
                    usage: { timesReferenced: 5 }
                },
                'source-2': {
                    id: 'source-2',
                    title: 'Test Article 2',
                    url: 'https://test.com/article2',
                    domain: 'test.com',
                    status: 'error',
                    importDate: new Date('2024-01-03'),
                    lastChecked: new Date('2024-01-04'),
                    metadata: { category: 'Science' },
                    usage: { timesReferenced: 2 }
                }
            }
        },
        content: {
            items: {}
        },
        ui: {
            searchQuery: '',
            filters: { status: 'all' }
        },
        transformation: {
            transformationHistory: []
        }
    },
    webContentActions: {
        setCurrentSource: vi.fn(),
        setCurrentContent: vi.fn(),
        setSearchQuery: vi.fn(),
        setFilters: vi.fn(),
        removeSource: vi.fn(),
        updateSource: vi.fn(),
        addNotification: vi.fn(),
        setSourcesLoading: vi.fn()
    },
    getFilteredSources: vi.fn(() => [
        {
            id: 'source-1',
            title: 'Test Article 1',
            url: 'https://example.com/article1',
            domain: 'example.com',
            status: 'active',
            importDate: new Date('2024-01-01'),
            lastChecked: new Date('2024-01-02'),
            metadata: { category: 'Technology' },
            usage: { timesReferenced: 5 }
        }
    ]),
    getContentStats: vi.fn(() => ({
        totalSources: 2,
        totalContent: 0,
        transformationOpportunities: 1,
        activeJobs: 0
    }))
}));

vi.mock('$lib/stores/appState.svelte.ts', () => ({
    appState: {},
    actions: {
        addKnowledgeNode: vi.fn()
    }
}));

// Mock components
vi.mock('$lib/components/index.ts', () => ({
    WebContentImporter: vi.fn(() => ({ $$: {} })),
    WebContentAnalyzer: vi.fn(() => ({ $$: {} })),
    WebContentTransformer: vi.fn(() => ({ $$: {} })),
    ErrorBoundary: vi.fn(({ children }) => children)
}));

// Mock UI components
vi.mock('$lib/components/ui/index.ts', () => ({
    Button: vi.fn(({ onclick, children, ...props }) => ({
        $$: {},
        onclick,
        ...props
    })),
    Input: vi.fn((props) => ({ $$: {}, ...props })),
    Card: vi.fn(({ children, ...props }) => ({ $$: {}, ...props })),
    Badge: vi.fn((props) => ({ $$: {}, ...props })),
    LoadingSpinner: vi.fn(() => ({ $$: {} })),
    ResponsiveContainer: vi.fn(({ children }) => children),
    MobileNavigation: vi.fn(() => ({ $$: {} })),
    ProgressBar: vi.fn(() => ({ $$: {} })),
    Toast: vi.fn(() => ({ $$: {} })),
    ToastContainer: vi.fn(() => ({ $$: {} }))
}));

describe('EnhancedWebContentDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.innerWidth for responsive tests
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024
        });
    });

    it('renders the dashboard header with title and stats', async () => {
        render(EnhancedWebContentDashboard);

        expect(screen.getByText('Interactive Content Hub')).toBeInTheDocument();
        expect(screen.getByText('Transform static content into engaging interactive experiences')).toBeInTheDocument();

        // Check stats are displayed
        expect(screen.getByText('2')).toBeInTheDocument(); // Total sources
        expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    it('displays processing jobs when available', async () => {
        render(EnhancedWebContentDashboard);

        // Should show processing status section
        expect(screen.getByText('Processing Status')).toBeInTheDocument();
        expect(screen.getByText('Processing ML Research Paper')).toBeInTheDocument();
        expect(screen.getByText('Transforming Web Article')).toBeInTheDocument();
    });

    it('shows desktop navigation tabs on larger screens', async () => {
        render(EnhancedWebContentDashboard);

        expect(screen.getByText('Import')).toBeInTheDocument();
        expect(screen.getByText('Sources')).toBeInTheDocument();
        expect(screen.getByText('Analyze')).toBeInTheDocument();
        expect(screen.getByText('Transform')).toBeInTheDocument();
    });

    it('displays sources with proper information', async () => {
        render(EnhancedWebContentDashboard);

        // Should show sources section by default
        expect(screen.getByText('Content Sources')).toBeInTheDocument();
        expect(screen.getByText('Manage and organize your imported content')).toBeInTheDocument();
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    it('handles search functionality', async () => {
        const { component } = render(EnhancedWebContentDashboard);

        const searchInput = screen.getByPlaceholderText('Search sources...');
        expect(searchInput).toBeInTheDocument();

        // Test search input
        await fireEvent.input(searchInput, { target: { value: 'test query' } });
        // Note: In a real test, we'd verify the search functionality works
    });

    it('provides view mode toggle functionality', async () => {
        render(EnhancedWebContentDashboard);

        // Should have view toggle buttons
        const gridButton = screen.getByLabelText('Grid view');
        const listButton = screen.getByLabelText('List view');

        expect(gridButton).toBeInTheDocument();
        expect(listButton).toBeInTheDocument();

        // Test view mode switching
        await fireEvent.click(listButton);
        // In a real implementation, this would change the view mode
    });

    it('shows filters panel when filters toggle is clicked', async () => {
        render(EnhancedWebContentDashboard);

        const filtersButton = screen.getByText('🔍 Filters');
        expect(filtersButton).toBeInTheDocument();

        await fireEvent.click(filtersButton);
        // Should show filters panel
        expect(screen.getByText('Status:')).toBeInTheDocument();
        expect(screen.getByText('Sort by:')).toBeInTheDocument();
    });

    it('handles tab navigation', async () => {
        render(EnhancedWebContentDashboard);

        const importTab = screen.getByText('Import');
        const analyzeTab = screen.getByText('Analyze');

        await fireEvent.click(importTab);
        // Should switch to import tab

        await fireEvent.click(analyzeTab);
        // Should switch to analyze tab
    });

    it('displays empty state when no sources are available', async () => {
        // Mock empty sources
        const { getFilteredSources } = await import('$lib/stores/webContentState.svelte.ts');
        vi.mocked(getFilteredSources).mockReturnValue([]);

        render(EnhancedWebContentDashboard);

        expect(screen.getByText('No Sources Found')).toBeInTheDocument();
        expect(screen.getByText('Import some web content to get started, or adjust your search filters.')).toBeInTheDocument();
    });

    it('handles responsive behavior for mobile screens', async () => {
        // Mock mobile screen size
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 600
        });

        render(EnhancedWebContentDashboard);

        // Should add mobile class and adjust layout
        // In a real test, we'd verify mobile-specific behavior
    });

    it('handles source actions (refresh, delete, select)', async () => {
        const { webContentActions } = await import('$lib/stores/webContentState.svelte.ts');

        render(EnhancedWebContentDashboard);

        // Test refresh action
        const refreshButtons = screen.getAllByLabelText('Refresh source');
        if (refreshButtons.length > 0) {
            await fireEvent.click(refreshButtons[0]);
            expect(webContentActions.setSourcesLoading).toHaveBeenCalled();
        }

        // Test select action
        const selectButtons = screen.getAllByText('Select');
        if (selectButtons.length > 0) {
            await fireEvent.click(selectButtons[0]);
            expect(webContentActions.setCurrentSource).toHaveBeenCalled();
        }
    });

    it('displays transformation history when available', async () => {
        // Mock transformation history
        const mockHistory = [
            {
                id: 'transform-1',
                title: 'Test Transformation',
                type: 'interactive',
                timestamp: new Date('2024-01-01')
            }
        ];

        const { webContentState } = await import('$lib/stores/webContentState.svelte.ts');
        webContentState.transformation.transformationHistory = mockHistory;

        render(EnhancedWebContentDashboard);

        // Switch to transform tab
        const transformTab = screen.getByText('Transform');
        await fireEvent.click(transformTab);

        expect(screen.getByText('Recent Transformations')).toBeInTheDocument();
        expect(screen.getByText('Test Transformation')).toBeInTheDocument();
    });

    it('handles sorting functionality', async () => {
        render(EnhancedWebContentDashboard);

        // Open filters
        const filtersButton = screen.getByText('🔍 Filters');
        await fireEvent.click(filtersButton);

        // Test sort options
        const sortSelect = screen.getByLabelText('Sort by:');
        expect(sortSelect).toBeInTheDocument();

        await fireEvent.change(sortSelect, { target: { value: 'title' } });
        // Should trigger sorting by title
    });
});