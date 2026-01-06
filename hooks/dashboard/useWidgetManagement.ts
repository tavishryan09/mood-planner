import { useState } from 'react';

interface DashboardWidget {
  id: string;
  name: string;
  width: 'full' | '1/2' | '1/3' | '1/4';
  order: number;
  visible: boolean;
}

export function useWidgetManagement(initialWidgets: DashboardWidget[]) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [showProjectsWithNoTasks, setShowProjectsWithNoTasks] = useState(false);

  const openDashboardConfig = () => {
    setTempWidgets([...widgets]);
    setShowDashboardConfig(true);
  };

  const saveDashboardConfig = async () => {
    try {
      const response = await fetch('/api/dashboard-widget-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets: tempWidgets,
          showAllProjects: showProjectsWithNoTasks
        }),
      });

      if (response.ok) {
        setWidgets(tempWidgets);
        setShowDashboardConfig(false);
      } else {
        console.error('Failed to save widget settings');
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
    }
  };

  const handleShowAllProjectsToggle = async (checked: boolean) => {
    setShowProjectsWithNoTasks(checked);

    try {
      await fetch('/api/dashboard-widget-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets,
          showAllProjects: checked
        }),
      });
    } catch (error) {
      console.error('Error saving show all projects preference:', error);
    }
  };

  const cancelDashboardConfig = () => {
    setTempWidgets([]);
    setShowDashboardConfig(false);
  };

  const handleWidgetDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleWidgetDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (draggedWidget === null || draggedWidget === targetWidgetId) return;

    const draggedIndex = tempWidgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = tempWidgets.findIndex(w => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...tempWidgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      order: index
    }));

    setTempWidgets(reorderedWidgets);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidget(null);
  };

  const updateWidgetWidth = (widgetId: string, width: 'full' | '1/2' | '1/3' | '1/4') => {
    setTempWidgets(tempWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, width } : widget
    ));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setTempWidgets(tempWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ));
  };

  const getWidgetColSpan = (width: 'full' | '1/2' | '1/3' | '1/4') => {
    switch (width) {
      case 'full': return 'col-span-full';
      case '1/2': return 'lg:col-span-6';
      case '1/3': return 'lg:col-span-4';
      case '1/4': return 'lg:col-span-3';
    }
  };

  return {
    widgets,
    setWidgets,
    showDashboardConfig,
    tempWidgets,
    draggedWidget,
    showProjectsWithNoTasks,
    setShowProjectsWithNoTasks,
    openDashboardConfig,
    saveDashboardConfig,
    handleShowAllProjectsToggle,
    cancelDashboardConfig,
    handleWidgetDragStart,
    handleWidgetDragOver,
    handleWidgetDragEnd,
    updateWidgetWidth,
    toggleWidgetVisibility,
    getWidgetColSpan
  };
}
