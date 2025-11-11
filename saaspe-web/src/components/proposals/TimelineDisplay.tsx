import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WorkItem {
  workItem: string;
  description: string;
  owner: string;
  weeks: string;
}

interface Task {
  task: string;
  description?: string;
}

interface Phase {
  phase: string;
  weeks: string;
  tasks: Task[];
}

interface TimelineData {
  workItems?: WorkItem[];
  phases?: Phase[];
}

interface TimelineDisplayProps {
  timeline: string | TimelineData;
}

export function TimelineDisplay({ timeline }: TimelineDisplayProps) {
  // Parse timeline if it's a string
  let timelineData: TimelineData;

  try {
    if (typeof timeline === 'string') {
      timelineData = JSON.parse(timeline);
    } else {
      timelineData = timeline;
    }
  } catch (error) {
    // If parsing fails, display as plain text
    return (
      <div className="text-gray-800 whitespace-pre-wrap">
        {typeof timeline === 'string' ? timeline : JSON.stringify(timeline, null, 2)}
      </div>
    );
  }

  // If timeline doesn't have the expected structure, display as text
  if (!timelineData.workItems && !timelineData.phases) {
    return (
      <div className="text-gray-800 whitespace-pre-wrap">
        {typeof timeline === 'string' ? timeline : JSON.stringify(timeline, null, 2)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Work Items Section */}
      {timelineData.workItems && timelineData.workItems.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-900">Work Items</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timelineData.workItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.workItem}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.owner}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {item.weeks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phases Section */}
      {timelineData.phases && timelineData.phases.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-900">Project Phases</h4>
          <div className="space-y-4">
            {timelineData.phases.map((phase, phaseIndex) => (
              <Card key={phaseIndex} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="text-base font-semibold text-gray-900">{phase.phase}</h5>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {phase.weeks}
                    </span>
                  </div>

                  {phase.tasks && phase.tasks.length > 0 && (
                    <ul className="space-y-2 mt-3">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="flex items-start">
                          <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3"></span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{task.task}</p>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
