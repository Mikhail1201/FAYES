"use client";
import ActivityItem from "./RecentActivityItem";

export default function RecentActivity() {
  return (
    <div className="flex flex-col gap-4 text-gray-700 dark:text-gray-300">
      <ActivityItem text="Assigned task 'Fix bug'" user="John" priority="High" />
      <ActivityItem text="Assigned task 'API review'" user="Alex" priority="Medium" />
      <ActivityItem text="Pralyats is tiepe" user="Devromity" priority="Low" />
    </div>
  );
}
