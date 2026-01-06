import { useState, useEffect } from 'react';

interface Project {
  id: number;
  projectNumber: string;
  projectName: string;
  commonName: string;
  clientName: string;
}

interface Expense {
  id: number;
  userId?: number;
  userName?: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  notes?: string;
  projectId?: number;
  projectName?: string;
  projectNumber?: string;
  receiptImage?: string;
  receiptFilename?: string;
  status: string;
  createdAt: string;
}

export function useAccountingData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsRes = await fetch('/api/my-projects?includeNoTasks=true');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const sortedProjects = projectsData.sort((a: Project, b: Project) => {
            const nameA = (a.commonName || a.projectName).toLowerCase();
            const nameB = (b.commonName || b.projectName).toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setProjects(sortedProjects);
        }

        const expensesRes = await fetch('/api/expenses?limit=10');
        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    projects,
    expenses,
    setExpenses,
    loading
  };
}
