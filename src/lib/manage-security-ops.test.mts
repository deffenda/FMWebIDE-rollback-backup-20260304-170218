import assert from "node:assert/strict";
import test from "node:test";
import {
  createSecurityRoleEntry,
  duplicateSecurityRoleEntry,
  readPrivilegeSetIdFromAuthProfileNotes,
  writePrivilegeSetIdToAuthProfileNotes
} from "./manage-security-ops.ts";

test("createSecurityRoleEntry generates unique ids and names", () => {
  const existing = [
    { id: "full-access", name: "Full Access", canView: true, canEdit: true, canDelete: true },
    { id: "new-privilege-set", name: "New Privilege Set", canView: true, canEdit: true, canDelete: true }
  ];
  const created = createSecurityRoleEntry(existing);
  assert.equal(created.name, "New Privilege Set 2");
  assert.equal(created.id, "new-privilege-set-2");
});

test("duplicateSecurityRoleEntry copies privileges and increments duplicate suffix", () => {
  const existing = [
    { id: "read-only", name: "Read Only", canView: true, canEdit: false, canDelete: false },
    { id: "read-only-copy", name: "Read Only Copy", canView: true, canEdit: false, canDelete: false }
  ];
  const duplicate = duplicateSecurityRoleEntry(existing, existing[0]);
  assert.equal(duplicate.name, "Read Only Copy 2");
  assert.equal(duplicate.canView, true);
  assert.equal(duplicate.canEdit, false);
  assert.equal(duplicate.canDelete, false);
  assert.ok(duplicate.id.length > 0);
});

test("readPrivilegeSetIdFromAuthProfileNotes extracts mapping line", () => {
  const notes = "Team member account\nPrivilege Set: restricted\nOn-call rotation";
  assert.equal(readPrivilegeSetIdFromAuthProfileNotes(notes), "restricted");
});

test("writePrivilegeSetIdToAuthProfileNotes upserts mapping and preserves other notes", () => {
  const existing = "Privilege Set: old-role\nTeam member account";
  const updated = writePrivilegeSetIdToAuthProfileNotes(existing, "new-role");
  assert.equal(updated, "Privilege Set: new-role\nTeam member account");
  const cleared = writePrivilegeSetIdToAuthProfileNotes(updated, "");
  assert.equal(cleared, "Team member account");
});
