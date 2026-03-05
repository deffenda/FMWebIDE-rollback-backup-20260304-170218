import assert from "node:assert/strict";
import test from "node:test";
import type { LayoutDefinition } from "./layout-model.ts";
import {
  applyAutoEnterOnCreate,
  applyAutoEnterOnModify,
  buildFieldEngineConfig,
  validateRecordForCommit
} from "./field-engine.ts";

const layout: LayoutDefinition = {
  id: "asset-details",
  name: "Asset Details",
  defaultTableOccurrence: "Assets",
  canvas: {
    width: 1200,
    height: 900,
    gridSize: 8
  },
  components: [
    {
      id: "f-name",
      type: "field",
      position: { x: 20, y: 20, width: 200, height: 32, z: 1 },
      binding: {
        field: "Name"
      },
      props: {
        validationRequired: true
      }
    },
    {
      id: "f-price",
      type: "field",
      position: { x: 20, y: 70, width: 200, height: 32, z: 2 },
      binding: {
        field: "Price"
      },
      props: {
        strictDataType: true,
        validationRangeMin: 0
      }
    },
    {
      id: "f-created",
      type: "field",
      position: { x: 20, y: 120, width: 200, height: 32, z: 3 },
      binding: {
        field: "CreatedAt"
      },
      props: {
        autoEnterCreationTimestamp: true
      }
    },
    {
      id: "f-modifiedBy",
      type: "field",
      position: { x: 20, y: 170, width: 200, height: 32, z: 4 },
      binding: {
        field: "ModifiedBy"
      },
      props: {
        autoEnterModificationAccountName: true
      }
    },
    {
      id: "f-seq",
      type: "field",
      position: { x: 20, y: 220, width: 200, height: 32, z: 5 },
      binding: {
        field: "Sequence"
      },
      props: {
        autoEnterSerial: true
      }
    }
  ],
  actions: []
};

test("buildFieldEngineConfig derives validation and auto-enter rules", () => {
  const config = buildFieldEngineConfig({
    layout,
    fieldTypeByName: {
      Name: "Text",
      Price: "Number",
      CreatedAt: "Timestamp",
      ModifiedBy: "Text",
      Sequence: "Number"
    }
  });

  assert.ok(config.validationByField.Name);
  assert.ok(config.validationByField.Price);
  assert.ok(config.autoEnterByField.CreatedAt);
  assert.ok(config.autoEnterByField.ModifiedBy);
  assert.ok(config.autoEnterByField.Sequence);
});

test("validateRecordForCommit reports required and strict data-type errors", () => {
  const config = buildFieldEngineConfig({
    layout,
    fieldTypeByName: {
      Name: "Text",
      Price: "Number"
    }
  });
  const errors = validateRecordForCommit({
    record: {
      recordId: "10",
      Name: "",
      Price: "abc"
    },
    dirtyFields: {
      Name: "",
      Price: "abc"
    },
    config,
    currentTableOccurrence: "Assets"
  });

  const codes = errors.map((entry) => entry.code);
  assert.ok(codes.includes("required"));
  assert.ok(codes.includes("type"));
});

test("applyAutoEnterOnCreate sets timestamp/account/serial defaults", () => {
  const config = buildFieldEngineConfig({
    layout,
    fieldTypeByName: {
      CreatedAt: "Timestamp",
      ModifiedBy: "Text",
      Sequence: "Number"
    }
  });
  const now = new Date("2026-03-01T12:00:00.000Z");
  const applied = applyAutoEnterOnCreate({
    baseFieldData: {
      Name: "Asset 1"
    },
    config,
    existingRecords: [
      { recordId: "1", Sequence: 9 },
      { recordId: "2", Sequence: 12 }
    ],
    currentTableOccurrence: "Assets",
    accountName: "tester",
    now
  });

  assert.equal(applied.Sequence, 13);
  assert.equal(applied.ModifiedBy, "tester");
  assert.equal(applied.CreatedAt, "2026-03-01T12:00:00.000Z");
});

test("applyAutoEnterOnModify updates modification metadata", () => {
  const config = buildFieldEngineConfig({
    layout,
    fieldTypeByName: {
      ModifiedBy: "Text"
    }
  });
  const applied = applyAutoEnterOnModify({
    baseFieldData: {
      Name: "Asset Updated"
    },
    record: {
      recordId: "10",
      Name: "Asset Original"
    },
    config,
    currentTableOccurrence: "Assets",
    accountName: "editor"
  });

  assert.equal(applied.ModifiedBy, "editor");
});
