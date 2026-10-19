import { describe, expect, it } from "vitest";
import { claveContacto, contactosDisponibles, datosContacto } from "@/lib/contactos";

describe("contactos de recepción", () => {
  it("guarda el nombre y teléfono en formato WhatsApp", () => {
    expect(datosContacto("  Ana   Pérez ", "0414-1234567")).toEqual({ nombre: "Ana Pérez", telefono: "584141234567" });
  });
  it("reconoce al mismo receptor sin importar espacios o mayúsculas", () => {
    expect(claveContacto("  ANA   Pérez ")).toBe(claveContacto("Ana Pérez"));
  });
  it("conserva el teléfono guardado si no se proporciona uno nuevo", () => {
    expect(datosContacto("Ana Pérez", "", { nombre: "Ana Pérez", telefono: "584141234567" })?.telefono).toBe("584141234567");
  });
  it("permite actualizar el teléfono del contacto existente", () => {
    expect(datosContacto("Ana Pérez", "0412-7654321", { nombre: "Ana Pérez", telefono: "584141234567" })?.telefono).toBe("584127654321");
  });
  it("reutiliza los contactos guardados aunque no estén en el personal", () => {
    expect(contactosDisponibles([{ nombre: "Ana Pérez", telefono: "584141234567" }], [])).toEqual([{ nombre: "Ana Pérez", telefono: "584141234567" }]);
  });
});