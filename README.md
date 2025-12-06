# TaskNet User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
   - [System Requirements](#system-requirements)
   - [Creating an Account](#creating-an-account)
   - [Signing In](#signing-in)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Teams](#managing-teams)
   - [Creating a Team](#creating-a-team)
   - [Joining a Team](#joining-a-team)
   - [Team Roles and Permissions](#team-roles-and-permissions)
5. [Working with Projects](#working-with-projects)
   - [Creating a Project](#creating-a-project)
   - [Project Settings](#project-settings)
6. [Task Management](#task-management)
   - [Creating Tasks](#creating-tasks)
   - [Assigning Tasks](#assigning-tasks)
   - [Task Statuses](#task-statuses)
   - [Filtering and Searching Tasks](#filtering-and-searching-tasks)
   - [Task Comments and @Mentions](#task-comments-and-mentions)
7. [Milestones](#milestones)
   - [Creating Milestones](#creating-milestones)
   - [Tracking Progress](#tracking-progress)
8. [Timeline Views](#timeline-views)
   - [Calendar View](#calendar-view)
   - [Gantt Chart View](#gantt-chart-view)
   - [Weekly Breakdown](#weekly-breakdown)
9. [Wellness Features](#wellness-features)
   - [Daily Check-ins](#daily-check-ins)
   - [Streak Tracking](#streak-tracking)
   - [Badges and Achievements](#badges-and-achievements)
   - [Team Pulse](#team-pulse)
10. [Notifications](#notifications)
    - [In-App Notifications](#in-app-notifications)
    - [Email Notifications](#email-notifications)
    - [Setting Reminders](#setting-reminders)
11. [Settings](#settings)
    - [Profile Settings](#profile-settings)
    - [Email Preferences](#email-preferences)
12. [Offline Mode](#offline-mode)
13. [Troubleshooting](#troubleshooting)
14. [FAQ](#faq)

---

## Introduction

**TaskNet** is a task management platform built by students, for students. It's designed to help you and your team plan semester-long projects with confidence through:

- **Shared Task Management** – Create, assign, and track tasks collaboratively
- **Timeline Tracking** – Visualize your project schedule with calendar, Gantt, and weekly views
- **Milestone Planning** – Break large projects into manageable phases
- **Wellness Check-ins** – Track your mood and maintain healthy work habits
- **Gamification** – Earn streaks and badges to stay motivated

---

## Getting Started

### System Requirements

TaskNet is a web application that works in any modern browser:

- **Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Internet Connection**: Required for most features
- **Screen Size**: Optimized for desktop and mobile devices

### Creating an Account

1. Navigate to the TaskNet homepage
2. Click the **"Get Started"** button
3. Enter your **name** and **email address**
4. Click **"Sign Up"**
5. Check your email for a **magic link**
6. Click the link in your email to complete registration

> **Note**: TaskNet uses passwordless authentication. You'll receive a magic link via email each time you sign in.

### Signing In

1. Navigate to the **Sign In** page (`/login`)
2. Enter your **email address**
3. Click **"Send magic link"**
4. Check your email and click the magic link
5. You'll be automatically signed in and redirected to your dashboard

---

## Dashboard Overview

The **Dashboard** is your home base in TaskNet. Here's what you'll find:

### Your Activity Panel
- **Tasks Completed** – Total number of tasks you've finished
- **Active Projects** – Number of projects you're currently working on
- **Teams** – Number of teams you belong to

### Quick Actions
Access common features quickly:
- **My Tasks** – View all tasks assigned to you
- **View Teams** – See and manage your teams
- **Daily Check-in** – Log your daily mood
- **View Timeline** – Access your personal timeline

### Upcoming Tasks
A preview of your next 5 tasks that are due soon, helping you stay on top of deadlines.

### Streak & Badges
Track your current wellness streak and see your unlocked achievements.

---

## Managing Teams

Teams are the foundation of collaboration in TaskNet. A team can represent your study group, project team, or any group working together.

### Creating a Team

1. Navigate to **Teams** from the navigation menu
2. Find the **"Create a Team"** card
3. Enter a **Team Name** (e.g., "CS101 Final Project")
4. Click **"Create Team"**
5. You'll be redirected to your new team page

As the team creator, you automatically become the team **admin**.

### Joining a Team

To join an existing team, you'll need an **invite code** from a team admin:

1. Navigate to **Teams** from the navigation menu
2. Find the **"Join by Invite Code"** card
3. Enter the **invite code** provided by your teammate
4. Click **"Join Team"**

### Team Roles and Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: create/edit projects, manage tasks, invite members, delete team |
| **Member** | Can view projects, complete assigned tasks, add comments |

#### Managing Team Members (Admin Only)
1. Go to your team page
2. View the member list
3. Use the invite code feature to add new members
4. Remove members if needed

---

## Working with Projects

Projects help you organize work within a team. Each project can have its own tasks, milestones, and timeline.

### Creating a Project

1. Navigate to your **Team** page
2. Click **"Create Project from Template"** in the Quick Actions section
3. Enter a **Project Name** and set a **Semester Start Date**
4. Click **"Create Project from Template"**

### Project Settings

Each project includes:
- **Tasks** – Individual work items
- **Milestones** – Major project phases or deliverables
- **Timeline** – Visual schedule of all tasks and milestones

---

## Task Management

Tasks are the core of TaskNet. They represent individual work items that need to be completed.

### Creating Tasks

1. Navigate to a **Project's Tasks** page
2. Click the **"Create Task"** button
3. Fill in the task details:
   - **Title** (required) – Brief description of the task
   - **Description** (optional) – Detailed information
   - **Due Date** (optional) – When the task should be completed
   - **Milestone** (optional) – Associate with a project milestone
   - **Size/Effort** (optional) – Estimate the effort required (1-10)
4. Click **"Create Task"**

### Assigning Tasks

Tasks can be assigned to one or more team members after creation:

1. Find the task in the task list
2. Click the **"Assign to"** dropdown (admin only)
3. Select team members from the dropdown
4. Assignees are updated immediately

### Task Statuses

Tasks progress through three statuses: **Open**, **In Progress**, and **Done**.

To change a task's status:
1. Click the **"✓ Done"** button on the task to quickly mark it complete, or
2. Click **"✎ Edit"** to open the task editor and change the status dropdown

### Filtering and Searching Tasks

The Tasks page provides powerful filtering options:

#### Quick Filters
- **Assigned to Me** – Show only tasks assigned to you
- **This Week** – Tasks due in the next 7 days
- **Overdue** – Tasks past their due date
- **All Tasks** – Show all tasks

#### Advanced Filters
- **Assignee** – Filter by specific team member
- **Milestone** – Filter by project milestone
- **Date Range** – Set a custom date range

### Task Comments and @Mentions

Communicate with your team directly on tasks:

1. Open a task
2. Click on **Comments** to expand the section
3. Type your comment
4. Use **@email** (e.g., `@teammate@email.com`) to mention and notify a teammate
5. Click **"Comment"**

Mentioned users will receive a notification.

---

## Milestones

Milestones help you break down large projects into manageable phases with clear deadlines.

### Creating Milestones

1. Navigate to a project's **Milestones** page
2. Fill in the milestone form:
   - **Title** – Name of the milestone (e.g., "Project Proposal")
   - **Due Date** (optional) – Target completion date
3. Click **"Create Milestone"**

### Tracking Progress

Each milestone shows:
- **Progress Bar** – Percentage of completed tasks
- **Task Count** – Number of completed vs. total tasks
- **Due Date** – Visual indicator if approaching or overdue

The **Overall Progress** section at the top shows combined progress across all milestones.

---

## Timeline Views

TaskNet offers three timeline views to visualize your project schedule.

### Calendar View

A traditional monthly calendar showing tasks on their due dates:

- Navigate months using the arrow buttons
- Click on a task to view details
- Color-coded by status

### Gantt Chart View

A horizontal timeline showing task duration:

- View all tasks and milestones on a timeline
- See task overlap and scheduling
- Best for understanding project flow

> **Note**: Gantt view automatically switches to Weekly view on mobile devices.

### Weekly Breakdown

A week-by-week summary view:

- See tasks grouped by week
- Ideal for sprint planning
- Quick overview of workload distribution

To switch between views, use the view selector at the top of the Timeline page.

---

## Wellness Features

TaskNet includes wellness features to help maintain healthy work habits and team awareness.

### Daily Check-ins

Record how you're feeling each day:

1. Navigate to **Wellness** from the menu
2. Select your current mood from the mood options (1-5 scale)
3. Optionally add a private note
4. Click **"Complete Check-in"**

Your check-ins are **private** -- only you can see your detailed history.

### Streak Tracking

Build consistency with streak tracking:

- **Current Streak** – Number of consecutive days you've checked in
- **Longest Streak** – Your personal best

Checking in daily maintains your streak. Miss a day and it resets to zero.

### Badges and Achievements

Earn badges for accomplishments:

| Badge | Requirement |
|-------|--------------|
| **7-day streak** | Check in 7 consecutive days |
| **30-day streak** | Check in 30 consecutive days |
| **10 on time** | Complete 10 tasks before their due date |
| **Milestone maker** | Complete all tasks in a milestone |

### Team Pulse

View wellness insights:

- Your average mood over the last 14 days (rated out of 5)
- Team-wide aggregate data coming soon
- **Individual mood data is never shared**

---

## Notifications

Stay updated on important events with TaskNet's notification system.

### In-App Notifications

Access notifications via the **bell icon** in the navigation bar:

- Red badge shows unread count
- Click to view all notifications
- Notifications include:
  - Task assignments
  - @mentions in comments
  - Approaching deadlines
  - Manual reminders from admins

Click on a notification to navigate to the related item.

### Email Notifications

Configure email preferences in **Settings**:

| Preference | Description |
|------------|-------------|
| **Mentions** | Get emailed when someone @mentions you |
| **Due Reminders** | Receive emails about upcoming deadlines |
| **Weekly Digest** | Get a weekly summary of activity |

### Setting Reminders

Send reminders to assignees or team members:

1. Open a task or milestone
2. Click the **"Remind"** button (admin only)
3. Choose recipients: assignees, all team members, or custom selection
4. Click **"Send Reminder"** to notify them via email

You can also send bulk reminders for multiple tasks at once using the **Bulk Reminder** feature on the project tasks page.

---

## Settings

Customize your TaskNet experience from the Settings page.

### Profile Settings

Update your personal information:

- **Display Name** – How your name appears to teammates
- **Email Address** – Your login email (read-only)

### Email Preferences

Control which emails you receive:

1. Navigate to **Settings**
2. Find the **"Email Notifications"** section
3. Toggle each preference on/off:
   - Mention Notifications
   - Due Task Reminders
   - Weekly Digest
4. Click **"Save Preferences"**

### Account Information

View your account details:
- Email address
- User ID
- Account statistics (teams, tasks completed, streaks, check-ins)

---

## Offline Mode

TaskNet works offline with limited functionality:

### What Works Offline
- View cached pages and data
- Read previously loaded tasks and projects
- Access your dashboard

### What Requires Internet
- Creating new tasks or projects
- Updating task statuses
- Posting comments
- Wellness check-ins
- Real-time notifications

When you go offline, an **"Offline"** indicator appears. Your actions will sync when connectivity is restored.

---

## Troubleshooting

### Common Issues and Solutions

#### "Magic link not received"

1. Check your **spam/junk** folder
2. Verify you entered the correct email address
3. Wait a few minutes, as emails can be delayed
4. Try requesting a new magic link
5. Check if your email provider blocks automated emails

#### "Page won't load"

1. Check your internet connection
2. Try refreshing the page (Cmd/Ctrl + R)
3. Clear your browser cache
4. Try a different browser
5. Check if TaskNet is experiencing downtime

#### "Task changes not saving"

1. Check your internet connection
2. Refresh the page
3. Try making the change again
4. If persistent, sign out and sign back in

#### "Can't see team/project"

1. Verify you've joined the team
2. Ask a team admin to confirm your membership
3. Check if the invite code was entered correctly
4. Try signing out and back in

#### "Timeline not displaying correctly"

1. Try switching to a different view (Calendar, Weekly, Gantt)
2. On mobile? Gantt view may redirect to Weekly view
3. Refresh the page
4. Clear browser cache

---

## FAQ

### General

**Q: Is TaskNet free to use?**
A: Yes, TaskNet is free for students and teams.

**Q: Do I need to download anything?**
A: No, TaskNet is a web application that runs in your browser. You can optionally install it as a Progressive Web App (PWA) for a more app-like experience.

**Q: Can I use TaskNet on mobile?**
A: Yes, TaskNet is fully responsive and works on mobile devices.

### Account

**Q: Why don't I have a password?**
A: TaskNet uses passwordless authentication via magic links. This is more secure and convenient, as there are no passwords to remember or steal.

**Q: Can I change my email address?**
A: Currently, email addresses cannot be changed. Contact support if you need assistance.

**Q: How do I delete my account?**
A: Contact the TaskNet team for account deletion requests.

### Teams & Projects

**Q: How many teams can I join?**
A: There's no limit to the number of teams you can join.

**Q: Can I be in multiple projects?**
A: Yes, you can participate in all projects within teams you belong to.

**Q: How do I leave a team?**
A: Contact a team admin to be removed from a team.

### Tasks

**Q: Can I assign a task to multiple people?**
A: Yes, tasks can have multiple assignees.

**Q: What happens when I complete a task?**
A: The task status changes to "Done" and counts toward your completion stats and on-time badges.

**Q: Can I un-complete a task?**
A: Yes, you can change a task's status back to "Open" or "In Progress."

### Wellness

**Q: Who can see my wellness check-ins?**
A: Only you can see your individual check-ins. Team Pulse currently shows your personal average, with team-wide aggregates coming soon.

**Q: What happens if I miss a check-in?**
A: Your streak resets to zero, but your longest streak record is preserved.

**Q: Can I backfill missed check-ins?**
A: No, check-ins can only be done for the current day.

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [FAQ](#faq)
3. Contact your team admin for team-specific issues
4. Report bugs via GitHub Issues

---

*Last updated: December 2025*
