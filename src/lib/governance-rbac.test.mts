import assert from "node:assert/strict";
import test from "node:test";
import {
  canGovernanceRolePerform,
  canGovernanceRoleUseCapability,
  listGovernanceRoleActions,
  normalizeGovernanceRole,
  resolveGovernanceRoleFromClaims
} from "./governance-rbac.ts";

test("normalizeGovernanceRole handles aliases", () => {
  assert.equal(normalizeGovernanceRole("admin"), "admin");
  assert.equal(normalizeGovernanceRole("Dev"), "developer");
  assert.equal(normalizeGovernanceRole("release-manager"), "power-user");
  assert.equal(normalizeGovernanceRole("unknown"), "runtime-user");
});

test("resolveGovernanceRoleFromClaims chooses highest privilege", () => {
  assert.equal(resolveGovernanceRoleFromClaims(["runtime-user"]), "runtime-user");
  assert.equal(resolveGovernanceRoleFromClaims(["poweruser"]), "power-user");
  assert.equal(resolveGovernanceRoleFromClaims(["dev", "runtime-user"]), "developer");
  assert.equal(resolveGovernanceRoleFromClaims(["admin", "developer"]), "admin");
});

test("governance action permissions are enforced", () => {
  assert.equal(canGovernanceRolePerform("admin", "promotion.rollback"), true);
  assert.equal(canGovernanceRolePerform("developer", "promotion.promote"), false);
  assert.equal(canGovernanceRolePerform("power-user", "promotion.promote"), true);
  assert.equal(canGovernanceRolePerform("runtime-user", "version.create"), false);
});

test("capability checks deny dangerous app-layer sections for lower roles", () => {
  assert.equal(canGovernanceRoleUseCapability("runtime-user", "manageDatabase"), false);
  assert.equal(canGovernanceRoleUseCapability("runtime-user", "workspaceVersioning"), false);
  assert.equal(canGovernanceRoleUseCapability("power-user", "adminConsole"), false);
  assert.equal(canGovernanceRoleUseCapability("developer", "adminConsole"), true);
  assert.equal(canGovernanceRoleUseCapability("admin", "publishPromote"), true);
});

test("role action list is stable and sorted", () => {
  const actions = listGovernanceRoleActions("admin");
  const sorted = [...actions].sort((left, right) => left.localeCompare(right));
  assert.deepEqual(actions, sorted);
  assert.ok(actions.includes("admin.console.read"));
  assert.ok(actions.includes("version.rollback"));
});
