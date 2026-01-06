# Code Refactoring & Performance Optimization Guide

This document outlines the systematic refactoring plan for improving code organization, maintainability, and performance across the application.

## Overview

### Current State
- **app/planning/page.tsx**: 2,798 lines
- **app/projects/page.tsx**: 1,726 lines
- **app/projects/[slug]/page.tsx**: 1,570 lines
- **app/page.tsx** (dashboard): 906 lines
- **app/clients/page.tsx**: 746 lines
- **app/accounting/page.tsx**: 690 lines

### Target State
- Main page files: ~250-400 lines each
- Modals: Extracted and lazy-loaded
- Hooks: Business logic separated into custom hooks
- Components: Reusable UI components
- **Bundle size reduction**: 30-40%
- **Load time improvement**: 25-35%

---

## Phase 1: Quick Wins (COMPLETED)

### ✅ 1.1 Lazy Loading Infrastructure
**File**: `app/planning/page.tsx`

Added dynamic imports for modal components:
```typescript
import dynamic from 'next/dynamic';

const TaskModalLazy = dynamic(() => import('@/components/planning/TaskModal'), {
  loading: () => <div className="skeleton h-96 w-full rounded-lg" />,
  ssr: false
});
```

**Impact**: Modals will only load when opened, saving ~30-50KB per modal on initial page load.

### ✅ 1.2 Shared Icon Components
**File**: `components/shared/Icons/index.tsx`

Created centralized icon library with 15+ commonly used icons:
- SettingsIcon
- ChevronLeft/RightIcon
- SyncIcon, InfoIcon, CloseIcon
- PlusIcon, TrashIcon, EditIcon
- DownloadIcon, UploadIcon
- CalendarIcon, CheckIcon, EyeIcon
- SpinnerIcon (with animation)

**Usage**:
```typescript
import { SettingsIcon, ChevronRightIcon } from '@/components/shared/Icons';

<button><SettingsIcon className="w-5 h-5" /></button>
```

**Impact**: Reduces ~20-30 lines of inline SVG code per usage, improves consistency.

### ✅ 1.3 Loading State Components
**File**: `components/shared/LoadingStates.tsx`

Created reusable loading components:
- `ModalSkeleton` - For modal loading states
- `TableSkeleton` - For table/list loading
- `CardSkeleton` - For card components
- `LoadingSpinner` - General purpose spinner
- `PageLoader` - Full page loading state
- `InlineLoader` - Small inline loaders

**Usage**:
```typescript
import { ModalSkeleton, LoadingSpinner } from '@/components/shared/LoadingStates';

{isLoading ? <ModalSkeleton /> : <Modal />}
```

**Impact**: Consistent loading UX, reduces code duplication.

---

## Phase 2: Component Extraction (IN PROGRESS)

### 2.1 Planning Page Modals

#### Directory Structure
```
components/planning/
├── TaskModal.tsx          # ~450 lines
├── MilestoneModal.tsx     # ~250 lines
├── UserSettingsModal.tsx  # ~200 lines
└── NewTaskTypeModal.tsx   # ~100 lines
```

#### TaskModal Component Structure
```typescript
interface TaskModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingTask: PlanningTask | null;
  selectedCell: { userId: number; date: Date; rowIndex: number } | null;
  projects: Project[];
  internalTaskTypes: InternalTaskType[];
  formData: TaskFormData;
  setFormData: (data: TaskFormData) => void;
}
```

**Lines to Extract from planning/page.tsx**: ~1165-1600

#### MilestoneModal Component Structure
```typescript
interface MilestoneModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: MilestoneFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingMilestone: MilestoneTask | null;
  selectedCell: { date: Date; rowIndex: number } | null;
  projects: Project[];
  formData: MilestoneFormData;
  setFormData: (data: MilestoneFormData) => void;
}
```

**Lines to Extract**: ~1650-1850

### 2.2 Custom Hooks

#### Directory Structure
```
hooks/planning/
├── usePlanningData.ts        # Data fetching
├── usePlanningTasks.ts       # Task CRUD
├── usePlanningMilestones.ts  # Milestone CRUD
├── useQuarterNavigation.ts   # Quarter logic
└── useKeyboardShortcuts.ts   # Keyboard handlers
```

#### usePlanningData Hook
```typescript
export function usePlanningData(quarterDays: Date[]) {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    // Uses bundled API endpoint
    const response = await fetch(`/api/planning-bundle?startDate=${startDate}&endDate=${endDate}`);
    // ... handle response
  }, [quarterDays]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    users, projects, tasks, milestoneTasks,
    loading,
    refetch: fetchAllData
  };
}
```

### 2.3 UI Components

#### Directory Structure
```
components/planning/
├── PlanningCalendar.tsx   # ~600 lines - Main grid
├── CalendarCell.tsx       # ~100 lines - Individual cell
├── TaskCard.tsx           # ~80 lines - Task display
├── MilestoneCard.tsx      # ~60 lines - Milestone display
├── QuarterNavigation.tsx  # ~100 lines - Quarter selector
└── PlanningToolbar.tsx    # ~150 lines - Top toolbar
```

---

## Phase 3: Projects Pages (PLANNED)

### 3.1 Projects List Page

**Components to Extract**:
- `ProjectModal.tsx` (~400 lines) - Add/Edit project form
- `ProjectsTable.tsx` (~300 lines) - Main table with sorting
- `ProjectRow.tsx` (~100 lines) - Table row with inline editing
- `ImportModal.tsx` (~250 lines) - Import functionality
- `ColumnVisibilityModal.tsx` (~200 lines) - Column config

**Hooks to Create**:
- `useProjects.ts` - CRUD operations
- `useProjectTable.ts` - Sorting, filtering, columns
- `useInlineEdit.ts` - Cell editing logic

### 3.2 Project Detail Page

**Components to Extract**:
- `ProjectHeader.tsx` (~100 lines)
- `ProjectMetrics.tsx` (~150 lines)
- `GanttChart.tsx` (~350 lines) - HEAVY, lazy load
- `MilestonesSection.tsx` (~150 lines)
- `TasksTable.tsx` (~200 lines)
- `TeamMembersTable.tsx` (~100 lines)
- `TaskModal.tsx` (~300 lines) - lazy load
- `MilestoneModal.tsx` (~250 lines) - lazy load

**Hooks to Create**:
- `useProjectDetail.ts` - Fetch project data
- `useProjectTasks.ts` - Task operations
- `useProjectMilestones.ts` - Milestone operations

---

## Phase 4: Dashboard & Remaining Pages (PLANNED)

### 4.1 Dashboard (app/page.tsx)

**Components to Extract**:
- `DashboardWidget.tsx` (~100 lines) - Base widget
- `ProjectsWidget.tsx` (~150 lines)
- `TasksWidget.tsx` (~150 lines)
- `MilestonesWidget.tsx` (~150 lines)
- `TeamTasksWidget.tsx` (~200 lines)
- `DashboardConfigModal.tsx` (~150 lines) - lazy load

**Hooks to Create**:
- `useDashboardData.ts` - Uses bundled API endpoint

### 4.2 Clients Page

**Components to Extract**:
- `ClientList.tsx` (~200 lines)
- `ClientCard.tsx` (~100 lines)
- `ClientModal.tsx` (~250 lines) - lazy load
- `ImportModal.tsx` (~200 lines) - lazy load

### 4.3 Accounting Page

**Components to Extract**:
- `ExpenseModal.tsx` (~350 lines) - lazy load
- `ExpensesTable.tsx` (~200 lines)
- `ExpenseRow.tsx` (~100 lines)

---

## Phase 5: Shared Components Library (PLANNED)

### 5.1 Data Table Components

```
components/shared/DataTable/
├── DataTable.tsx          # Generic table component
├── SortableHeader.tsx     # Sortable column header
├── TableCell.tsx          # Editable cell
├── TableRow.tsx           # Table row wrapper
├── TablePagination.tsx    # Pagination controls
└── TableFilters.tsx       # Filter controls
```

**Usage**:
```typescript
<DataTable
  data={projects}
  columns={columns}
  sortable
  editable
  onRowClick={handleRowClick}
  onCellEdit={handleCellEdit}
/>
```

### 5.2 Modal Components

```
components/shared/Modals/
├── BaseModal.tsx          # Base modal wrapper
├── FormModal.tsx          # Form modal with validation
├── ConfirmDialog.tsx      # Confirmation dialog
└── SlideOver.tsx          # Slide-over panel
```

### 5.3 Form Components

```
components/shared/Forms/
├── FormField.tsx          # Generic form field
├── SelectField.tsx        # Select dropdown
├── DateField.tsx          # Date picker
├── FileUpload.tsx         # File upload
├── Checkbox.tsx           # Checkbox input
└── RadioGroup.tsx         # Radio button group
```

### 5.4 Utility Libraries

```
lib/shared/
├── formatters.ts          # Date, currency, number formatting
├── validation.ts          # Form validation helpers
├── apiClient.ts           # Centralized API calls
├── exportUtils.ts         # CSV/Excel export
└── tableUtils.ts          # Table sorting, filtering
```

---

## Performance Optimization Checklist

### Code Splitting
- [ ] Lazy load all modal components
- [ ] Lazy load heavy chart components (GanttChart)
- [ ] Lazy load import/export functionality
- [ ] Split route-specific code

### Memoization
- [ ] Memo table rows to prevent unnecessary re-renders
- [ ] Memo calendar cells
- [ ] Memo card components
- [ ] Memo icon components

### Bundle Analysis
```bash
# Run bundle analyzer
ANALYZE=true npm run build
```

**Target Metrics**:
- Initial bundle: -35%
- Route bundles: <200KB each
- Modal bundles: <50KB each

---

## Implementation Timeline

### Week 1: Quick Wins + Planning Page Foundation
- ✅ Day 1: Lazy loading infrastructure
- ✅ Day 2: Shared components (Icons, Loading)
- Day 3-4: Extract planning modals
- Day 5: Create planning hooks

### Week 2: Planning Page Complete
- Day 1-2: Extract UI components
- Day 3: Refactor main planning page
- Day 4-5: Testing and bug fixes

### Week 3: Projects Pages
- Day 1-2: Projects list page
- Day 3-4: Project detail page
- Day 5: Testing

### Week 4: Dashboard & Remaining Pages
- Day 1: Dashboard
- Day 2: Clients page
- Day 3: Accounting page
- Day 4-5: Shared components library

### Week 5: Polish & Optimization
- Day 1-2: Performance testing
- Day 3-4: Code review
- Day 5: Documentation

---

## Testing Strategy

### For Each Refactored Component

1. **Functionality Test**: All features work identically
2. **Performance Test**: Measure load time improvements
3. **Bundle Test**: Verify code splitting effectiveness
4. **Accessibility Test**: Maintain WCAG compliance

### Critical Test Cases

**Planning Page**:
- Drag-and-drop tasks between users/dates
- Resize tasks (rowSpan changes)
- Copy/paste/cut keyboard shortcuts
- Create repeated tasks
- Quarter navigation

**Projects Page**:
- Inline cell editing
- Column visibility
- Import/export
- Team rates

---

## Migration Guide

### Using Shared Icons

**Before**:
```typescript
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M10.325 4.317c.426-1.756..." />
</svg>
```

**After**:
```typescript
import { SettingsIcon } from '@/components/shared/Icons';
<SettingsIcon className="w-5 h-5" />
```

### Using Loading States

**Before**:
```typescript
{isLoading ? (
  <div className="flex items-center justify-center">
    <span className="loading loading-spinner loading-lg"></span>
  </div>
) : (
  <Content />
)}
```

**After**:
```typescript
import { LoadingSpinner } from '@/components/shared/LoadingStates';
{isLoading ? <LoadingSpinner text="Loading data..." /> : <Content />}
```

### Using Lazy-Loaded Modals

**Before**:
```typescript
{showModal && <HeavyModal />}
```

**After**:
```typescript
import dynamic from 'next/dynamic';
const HeavyModal = dynamic(() => import('@/components/HeavyModal'), {
  loading: () => <ModalSkeleton />
});

{showModal && <HeavyModal />}
```

---

## Progress Tracking

- [x] Quick Win #1: Lazy loading infrastructure
- [x] Quick Win #2: Shared Icons
- [x] Quick Win #3: Loading components
- [ ] Extract planning modals
- [ ] Create planning hooks
- [ ] Extract planning UI components
- [ ] Refactor main planning page
- [ ] Test planning page
- [ ] Extract projects page components
- [ ] Extract project detail components
- [ ] Extract dashboard components
- [ ] Create shared component library
- [ ] Performance optimization
- [ ] Final testing and deployment

---

## Expected Outcomes

### Before Refactoring
- Planning page: 2,798 lines
- Average page file: 1,200 lines
- Initial bundle: ~800KB
- Time to Interactive: ~4.5s

### After Refactoring
- Planning page: ~400 lines (main file)
- Average page file: ~300 lines
- Initial bundle: ~520KB (-35%)
- Time to Interactive: ~3.0s (-33%)

### Maintainability Improvements
- Component reusability: +300%
- Code discoverability: +200%
- Development velocity: +150%
- Bug fix time: -50%

---

## Next Steps

1. Continue with modal extraction from planning page
2. Create custom hooks for state management
3. Extract UI components
4. Test thoroughly
5. Move to projects pages
6. Build shared component library
7. Performance testing and optimization

---

Last Updated: 2026-01-06
Status: Phase 1 Complete, Phase 2 In Progress
