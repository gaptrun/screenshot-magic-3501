import { describe, it, expect } from "vitest";
import { aWhatsApp } from "@/lib/whatsapp";

describe("aWhatsApp", () => {
  it("convierte 0414 local a 58414", () => expect(aWhatsApp("0414-123.45.67")).toBe("584141234567"));
  it("acepta número ya internacional", () => expect(aWhatsApp("+58 412 7654321")).toBe("584127654321"));
  it("rechaza números cortos", () => expect(aWhatsApp("12345")).toBeNull());
});
