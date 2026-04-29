"use client";

import { useState } from "react";
import TaskKanban from "./TaskKanban";
import DiscussionPanel from "./DiscussionPanel";
import VotePanel from "./VotePanel";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

type Tab = "kanban" | "discussion" | "vote";

const TABS: { key: Tab; label: string }[] = [
  { key: "kanban", label: "看板" },
  { key: "discussion", label: "討論區" },
  { key: "vote", label: "投票" },
];

interface TaskMember {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeId: string | null;
  assignee: TaskMember | null;
  dueAt: string | null;
}

interface Props {
  taskGroupId: string;
  initialTasks: Task[];
  memberUsers: TaskMember[];
  isMember: boolean;
  isLeader: boolean;
  userId: string;
  canCreateVote: boolean;
}

export default function TaskGroupTabs({
  taskGroupId,
  initialTasks,
  memberUsers,
  isMember,
  isLeader,
  userId,
  canCreateVote,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("kanban");

  return (
    <div>
      <div
        className="flex gap-1 border-b mb-6"
        style={{ borderColor: `${SECONDARY}44` }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-semibold transition-all rounded-t-lg"
              style={{
                color: isActive ? PRIMARY : `${PRIMARY}88`,
                borderBottom: isActive ? `2px solid ${PRIMARY}` : "2px solid transparent",
                backgroundColor: isActive ? `${SECONDARY}18` : "transparent",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "kanban" && (
        <TaskKanban
          taskGroupId={taskGroupId}
          initialTasks={initialTasks}
          members={memberUsers}
          isMember={isMember}
          isLeader={isLeader}
        />
      )}

      {activeTab === "discussion" && (
        <DiscussionPanel taskGroupId={taskGroupId} userId={userId} />
      )}

      {activeTab === "vote" && (
        <VotePanel
          taskGroupId={taskGroupId}
          userId={userId}
          canCreate={canCreateVote}
        />
      )}
    </div>
  );
}
