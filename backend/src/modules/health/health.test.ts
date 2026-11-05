import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { app } from "../../app.js";
import { errorHandler } from "../../middleware/errorHandler.js";
import { HealthController } from "./health.controller.js";
import { HealthRepository } from "./health.repository.js";
import { HealthService } from "./health.service.js";

describe("Health & Liveness/Readiness Endpoints", () => {
  describe("Liveness Check", () => {
    it("should respond with 200 OK and valid envelope on GET /health", async () => {
      const response = await request(app).get("/health");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.statusCode, 200);
      assert.strictEqual(response.body.message, "Application is healthy");
      assert.strictEqual(response.body.data.status, "UP");
      assert.strictEqual(typeof response.body.data.uptime, "number");
      assert.ok(response.body.data.timestamp);
    });

    it("should respond with 200 OK on versioned GET /api/v1/health", async () => {
      const response = await request(app).get("/api/v1/health");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.status, "UP");
    });

    it("should respond with 200 OK on GET /health/live alias", async () => {
      const response = await request(app).get("/health/live");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.status, "UP");
    });

    it("liveness check must not require database connectivity", () => {
      // Mock repository that would fail if called
      const failingRepo: HealthRepository = {
        pingDatabase: async () => {
          throw new Error("DB should not be contacted for liveness");
        },
      };

      const isolatedService = new HealthService(failingRepo);
      const livenessResult = isolatedService.checkLiveness();

      assert.strictEqual(livenessResult.status, "UP");
      assert.strictEqual(typeof livenessResult.uptime, "number");
      assert.ok(livenessResult.timestamp);
    });
  });

  describe("Readiness Check", () => {
    it("should report 200 OK when database is connected", async () => {
      // Mock healthy repository
      const healthyRepo: HealthRepository = {
        pingDatabase: async () => true,
      };

      const healthyService = new HealthService(healthyRepo);
      const healthyController = new HealthController(healthyService);

      const testApp = express();
      testApp.get("/health/ready", healthyController.getReadiness);
      testApp.use(errorHandler);

      const response = await request(testApp).get("/health/ready");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.statusCode, 200);
      assert.strictEqual(response.body.message, "Application is ready");
      assert.strictEqual(response.body.data.status, "UP");
      assert.strictEqual(response.body.data.database, "UP");
    });

    it("should accurately report 503 Service Unavailable when database connection fails", async () => {
      // Mock failing repository
      const brokenRepo: HealthRepository = {
        pingDatabase: async () => {
          throw new Error("Connection refused: 127.0.0.1:5433");
        },
      };

      const brokenService = new HealthService(brokenRepo);
      const brokenController = new HealthController(brokenService);

      const testApp = express();
      testApp.get("/health/ready", brokenController.getReadiness);
      testApp.use(errorHandler);

      const response = await request(testApp).get("/health/ready");

      assert.strictEqual(response.status, 503);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.statusCode, 503);
      assert.strictEqual(
        response.body.message,
        "Database connectivity check failed"
      );
      assert.strictEqual(response.body.errorCode, "SERVICE_UNAVAILABLE");
      assert.strictEqual(response.body.data, null);
      assert.deepStrictEqual(response.body.details, { database: "DOWN" });
    });

    it("should accurately report connectivity using live app on GET /health/ready", async () => {
      const response = await request(app).get("/health/ready");

      if (response.status === 200) {
        assert.strictEqual(response.body.success, true);
        assert.strictEqual(response.body.data.status, "UP");
        assert.strictEqual(response.body.data.database, "UP");
      } else {
        assert.strictEqual(response.status, 503);
        assert.strictEqual(response.body.success, false);
        assert.strictEqual(response.body.errorCode, "SERVICE_UNAVAILABLE");
        assert.strictEqual(response.body.data, null);
        assert.deepStrictEqual(response.body.details, { database: "DOWN" });
      }
    });
  });

  describe("Error Envelope Consistency", () => {
    it("should use the agreed error envelope for unhandled 404 routes", async () => {
      const response = await request(app).get("/api/v1/non-existent-route");

      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.statusCode, 404);
      assert.strictEqual(response.body.errorCode, "NOT_FOUND");
      assert.strictEqual(response.body.data, null);
      assert.strictEqual(response.body.details, null);
      assert.strictEqual(
        response.body.message,
        "Route GET /api/v1/non-existent-route not found"
      );
    });
  });
});
