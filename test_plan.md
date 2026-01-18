# EndureStack Test Plan

This document outlines the test scenarios for verifying the functionality of the EndureStack application.

## 1. Admin Role

### User Management
- **View User List**
    - [ ] Login as Admin.
    - [ ] Navigate to "Manage Users".
    - [ ] Verify two tabs/filters exist: "Clients" and "Trainers".
    - [ ] Search for a user by name; verify the list filters correctly.

- **Client Assignment Status**
    - [ ] In "Clients" view, check the "Assigned To" column.
    - [ ] Verify users with trainers show the Trainer's name.
    - [ ] Verify users without trainers show "Unassigned".

- **Promote User**
    - [ ] Identify a "Client" user who is **Unassigned**.
    - [ ] Verify the "Promote" button is visible.
    - [ ] Click "Promote". Verify user moves to the "Trainers" list.
    - [ ] Identify a "Client" user who is **Assigned** to a trainer.
    - [ ] Verify the "Promote" button is **NOT** visible.

- **Demote Trainer**
    - [ ] Identify a "Trainer" with **0 active clients**.
    - [ ] Click "Demote". Verify confirmation modal appears. Confirm.
    - [ ] Verify user moves to the "Clients" list.
    - [ ] Identify a "Trainer" with **1 or more active clients**.
    - [ ] Click "Demote".
    - [ ] Verify an **Alert Modal** appears stating "Cannot Demote Trainer" due to active clients.
    - [ ] Verify the action is blocked.

- **Assign Trainer**
    - [ ] Identify an **Unassigned** client.
    - [ ] Click "Assign Trainer".
    - [ ] Select a trainer from the dropdown.
    - [ ] Click "Assign".
    - [ ] Verify success message and that the client now shows the trainer's name.

- **Transfer Client**
    - [ ] Identify an **Assigned** client.
    - [ ] Click "Transfer".
    - [ ] Select a *different* trainer.
    - [ ] Click "Transfer".
    - [ ] Verify success message and updated assignment.

- **Unassign Client (Admin Side)**
    - [ ] Identify an **Assigned** client.
    - [ ] Click "Transfer".
    - [ ] Click the **"Unassign"** button (red text).
    - [ ] Verify success message.
    - [ ] Verify client status updates to "Unassigned" and "Assign Trainer" button reappears.

---

## 2. Trainer Role

### Client Management
- **View My Clients**
    - [ ] Login as Trainer.
    - [ ] Navigate to "My Clients".
    - [ ] Verify only clients assigned to this trainer are listed.

- **Client Profile**
    - [ ] Click on a client card.
    - [ ] Verify client details (Age, Height, Weight) are displayed.
    - [ ] Verify "Transfer Client" button is available (if implemented in profile view).

- **Transfer Client (Trainer Side)**
    - [ ] Click "Transfer Client".
    - [ ] Verify modal appears warning that access will be lost.
    - [ ] Select another trainer.
    - [ ] Click "Confirm Transfer".
    - [ ] Verify success popup.
    - [ ] Verify redirection to client list, and the transferred client is **gone** from the list.

- **Unassign Client (Trainer Side)**
    - [ ] Click "Transfer Client".
    - [ ] Click the **"Unassign"** button.
    - [ ] Verify success popup.
    - [ ] Verify redirection to client list, and the unassigned client is **gone** from the list.

---

## 3. Client (User) Role

### Dashboard
- **Streak Tile**
    - [ ] Login as Client.
    - [ ] Check the "Streak" tile (Fire icon).
    - [ ] Verify the count matches consecutive days trained (ignoring Sundays).
    - [ ] **Scenario A**: User trained yesterday and today. Streak should increment.
    - [ ] **Scenario B**: User trained Friday, missed Saturday (today is Sunday). Streak should maintain.
    - [ ] **Scenario C**: User missed a weekday. Streak should reset to 0 (or 1 if trained today).

### Workout Logging
- **Log Workout**
    - [ ] Navigate to "Log Workout".
    - [ ] Enter exercises, sets, reps, weight.
    - [ ] Save log. Verify success.

- **Workout History / Details**
    - [ ] Navigate to "Workouts" history.
    - [ ] Click on today's workout.
    - [ ] Verify "Workout Details" page shows grouped exercises (e.g., "Bench Press" header with 3 sets below it).

- **Delete Set (Cleanup Logic)**
    - [ ] In "Workout Details", click the "Delete" (Trash) icon on a set.
    - [ ] Verify **Confirmation Modal** (Red "Delete" button) appears.
    - [ ] Confirm deletion. Verify set is removed.
    - [ ] **Auto-Cleanup Test**: Delete the *last remaining set* of a session.
    - [ ] Verify the user is redirected back to the "Workouts" list.
    - [ ] Verify the empty session date is removed from the history list.

---

## 4. General UI/UX
- **Popups**
    - [ ] Verify all Alerts and Confirmations use the custom dark-themed Modal (glassmorphism style).
    - [ ] Verify no native browser alerts (`window.alert` / `window.confirm`) appear during standard usage.
