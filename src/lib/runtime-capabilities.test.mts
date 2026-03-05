import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeCapabilitiesFromFields,
  canDeleteRuntimePortalRows,
  canEditRuntimeField,
  canViewRuntimeField,
  createPermissiveRuntimeCapabilities,
  normalizeRuntimeCapabilitiesPayload,
  normalizeCapabilityRole,
  resolveRuntimeCapabilityField
} from "./runtime-capabilities.ts";

test("normalizeCapabilityRole maps common tokens", () => {
  assert.equal(normalizeCapabilityRole("read-only"), "readOnly");
  assert.equal(normalizeCapabilityRole("restricted"), "restricted");
  assert.equal(normalizeCapabilityRole("none"), "noAccess");
  assert.equal(normalizeCapabilityRole(""), "fullAccess");
});

test("restricted role hides key fields and blocks edits for summary/timestamp", () => {
  const payload = buildRuntimeCapabilitiesFromFields({
    workspaceId: "assets",
    source: "mock",
    role: "restricted",
    fieldNames: ["PrimaryKey", "Total", "CreationTimestamp", "Name"]
  });

  assert.equal(canViewRuntimeField(payload, "PrimaryKey"), false);
  assert.equal(canEditRuntimeField(payload, "Total"), false);
  assert.equal(canEditRuntimeField(payload, "CreationTimestamp"), false);
  assert.equal(canEditRuntimeField(payload, "Name"), true);
  assert.equal(canDeleteRuntimePortalRows(payload), false);
});

test("full access role allows field visibility/edit and portal delete", () => {
  const payload = buildRuntimeCapabilitiesFromFields({
    workspaceId: "assets",
    source: "mock",
    role: "fullAccess",
    fieldNames: ["Assets::Name"]
  });

  const field = resolveRuntimeCapabilityField(payload, "Name");
  assert.equal(field.visible, true);
  assert.equal(field.editable, true);
  assert.equal(canDeleteRuntimePortalRows(payload), true);
});

test("createPermissiveRuntimeCapabilities returns full-access baseline", () => {
  const payload = createPermissiveRuntimeCapabilities({
    workspaceId: "assets",
    source: "filemaker"
  });

  assert.equal(payload.workspaceId, "assets");
  assert.equal(payload.source, "filemaker");
  assert.equal(payload.role, "fullAccess");
  assert.equal(payload.layout.canView, true);
  assert.equal(payload.layout.canEdit, true);
  assert.equal(payload.layout.canDelete, true);
});

test("normalizeRuntimeCapabilitiesPayload falls back safely for missing payload", () => {
  const payload = normalizeRuntimeCapabilitiesPayload(undefined, {
    workspaceId: "assets",
    fallbackSource: "mock"
  });
  assert.equal(payload.workspaceId, "assets");
  assert.equal(payload.source, "mock");
  assert.equal(payload.role, "fullAccess");
  assert.equal(payload.layout.canEdit, true);
});

test("normalizeRuntimeCapabilitiesPayload indexes qualified and unqualified fields", () => {
  const payload = normalizeRuntimeCapabilitiesPayload(
    {
      role: "readOnly",
      fields: {
        "Assets::Name": {
          visible: true,
          editable: false
        }
      }
    },
    {
      workspaceId: "assets",
      fallbackSource: "mock"
    }
  );

  assert.equal(payload.role, "readOnly");
  assert.equal(payload.layout.canEdit, false);
  assert.equal(canViewRuntimeField(payload, "Name"), true);
  assert.equal(canEditRuntimeField(payload, "Assets::Name"), false);
});
