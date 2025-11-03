import React, { useState, useCallback, useMemo, createRef, RefObject } from 'react';
import { Workshop as WorkshopType, HistoryEntry, MaintenanceTask, Equipment } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Workshop from './components/Workshop';
import AddWorkshopModal from './components/AddWorkshopModal';
import HistoryModal from './components/HistoryModal';
import NotificationsPanel, { UpcomingTask } from './components/NotificationsPanel';
import { getTaskStatus } from './utils/taskUtils';
import { PlusIcon, BookOpenIcon } from './components/Icons';

function App() {
  const [workshops, setWorkshops] = useLocalStorage<WorkshopType[]>('productionLines_v3', []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('maintenanceHistory_v3', []);
  const [isAddWorkshopModalOpen, setAddWorkshopModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [highlightedItem, setHighlightedItem] = useState<{ workshopId: string; equipmentId: string; taskId: string } | null>(null);

  const upcomingTasks = useMemo((): UpcomingTask[] => {
    const allTasks: UpcomingTask[] = [];
    workshops.forEach(workshop => {
      workshop.equipment.forEach(equip => {
        equip.tasks.forEach(task => {
          const statusDetails = getTaskStatus(task);
          if (statusDetails.status === 'overdue' || statusDetails.status === 'upcoming') {
            allTasks.push({
              ...task,
              ...statusDetails,
              workshopId: workshop.id,
              equipmentId: equip.id,
              taskId: task.id,
              workshopName: workshop.name,
              equipmentName: equip.name,
              taskName: task.name,
            });
          }
        });
      });
    });
    return allTasks.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [workshops]);


  const addWorkshop = useCallback((name: string) => {
    const newWorkshop: WorkshopType = {
      id: Date.now().toString(),
      name,
      equipment: [],
    };
    setWorkshops(prev => [...prev, newWorkshop]);
  }, [setWorkshops]);

  const updateWorkshop = useCallback((updatedWorkshop: WorkshopType) => {
    setWorkshops(prev => prev.map(workshop => workshop.id === updatedWorkshop.id ? updatedWorkshop : workshop));
  }, [setWorkshops]);

  const deleteWorkshop = useCallback((workshopId: string) => {
    setWorkshops(prev => prev.filter(workshop => workshop.id !== workshopId));
  }, [setWorkshops]);

  const completeMaintenance = useCallback((workshopId: string, equipmentId: string, taskId: string, completionDate: string, notes?: string) => {
    let taskName = '';
    let equipmentName = '';
    let workshopName = '';
    
    const nowISO = new Date().toISOString();

    const updatedWorkshops = workshops.map(workshop => {
      if (workshop.id === workshopId) {
        workshopName = workshop.name;
        return {
          ...workshop,
          equipment: workshop.equipment.map(equip => {
            if (equip.id === equipmentId) {
              equipmentName = equip.name;
              return {
                ...equip,
                tasks: equip.tasks.map(task => {
                  if (task.id === taskId) {
                    taskName = task.name;
                    return { ...task, lastMaintenanceDate: completionDate };
                  }
                  return task;
                })
              };
            }
            return equip;
          }),
        };
      }
      return workshop;
    });

    setWorkshops(updatedWorkshops);
    
    const newHistoryEntry: HistoryEntry = {
      id: Date.now().toString(),
      workshopId,
      equipmentId,
      taskId,
      equipmentName,
      taskName,
      workshopName,
      maintenanceDate: new Date(completionDate).toISOString(),
      originalCompletionDate: nowISO,
      editCount: 0,
      notes: notes,
    };
    setHistory(prev => [newHistoryEntry, ...prev]);
  }, [workshops, setWorkshops, setHistory]);
  
  const updateHistory = useCallback((historyId: string, newDate: string) => {
      setHistory(prev => prev.map(entry => {
          if (entry.id === historyId && entry.editCount < 2) {
              return {
                  ...entry,
                  maintenanceDate: new Date(newDate).toISOString(),
                  editCount: entry.editCount + 1,
              }
          }
          return entry;
      }));
  }, [setHistory]);

  const handleNotificationClick = (ids: { workshopId: string; equipmentId: string; taskId: string }) => {
    setHighlightedItem(ids);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-20 flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400">CÔNG TY CỔ PHẦN PHÂN BÓN VÀ HÓA CHẤT CẦN THƠ</h2>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">
              Bảng theo dõi thiết bị
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setHistoryModalOpen(true)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-colors"
              aria-label="Xem lịch sử"
            >
              <BookOpenIcon />
            </button>
            <button
              onClick={() => setAddWorkshopModalOpen(true)}
              className="flex items-center bg-sky-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
            >
              <PlusIcon className="w-6 h-6" />
              <span className="hidden sm:inline ml-2 font-semibold">Thêm xưởng</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col md:flex-row container mx-auto p-4 sm:p-6 lg:p-8 overflow-hidden gap-8">
        <div className="md:h-full md:w-1/3 flex flex-col">
            <NotificationsPanel tasks={upcomingTasks} onTaskClick={handleNotificationClick} />
        </div>
        <main className="md:h-full md:w-2/3 flex-grow overflow-y-auto pr-2">
            {workshops.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h2 className="text-2xl font-semibold mb-4 text-slate-600 dark:text-slate-300">Chưa có xưởng sản xuất nào.</h2>
                <p className="text-slate-500 dark:text-slate-400">Bắt đầu bằng cách thêm một xưởng mới.</p>
            </div>
            ) : (
            <div className="space-y-4">
                {workshops.map(workshop => (
                <Workshop
                    key={workshop.id}
                    workshop={workshop}
                    history={history}
                    onUpdate={updateWorkshop}
                    onDelete={() => deleteWorkshop(workshop.id)}
                    onCompleteMaintenance={completeMaintenance}
                    highlightedItem={highlightedItem}
                    onHighlightHandled={() => setHighlightedItem(null)}
                />
                ))}
            </div>
            )}
        </main>
      </div>


      {isAddWorkshopModalOpen && (
        <AddWorkshopModal
          onClose={() => setAddWorkshopModalOpen(false)}
          onAdd={addWorkshop}
        />
      )}

      {isHistoryModalOpen && (
         <HistoryModal
           onClose={() => setHistoryModalOpen(false)}
           history={history}
           workshops={workshops}
           onUpdateHistory={updateHistory}
         />
      )}
    </div>
  );
}

export default App;