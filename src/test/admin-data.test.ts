import { describe, expect, it } from "vitest";
import { exportText, prepareImport, readImport, validateRow } from "@/lib/admin-data";

describe("administración de datos", () => {
  it("lee CSV con campos entrecomillados, comas y saltos de línea", () => {
    expect(readImport('nombre,telefono\r\n"Ana, Pérez\nUMA",584141234567', "contactos.csv")).toEqual([{ nombre: "Ana, Pérez\nUMA", telefono: "584141234567" }]);
  });
  it("exporta e importa CSV sin perder los datos", () => {
    const rows = [{ ci: "12345678", nombres: "Ana, María", apellidos: "Pérez", rol_uma: "Alumno" }];
    expect(readImport(exportText(rows, "csv", Object.keys(rows[0] ?? {})), "personas.csv")).toEqual(rows);
  });
  it("exporta JSON reutilizable", () => {
    expect(readImport(exportText([{ nombre: "Biblioteca", activo: false }], "json", []), "departamentos.json")).toEqual([{ nombre: "Biblioteca", activo: false }]);
  });
  it("valida personas antes de guardar", () => {
    expect(prepareImport("personas", [{ ci: "12345678", nombres: "Ana", apellidos: "Pérez", rol_uma: "Alumno" }]).errors).toEqual([]);
    expect(prepareImport("personas", [{ ci: "abc", nombres: "Ana", apellidos: "", rol_uma: "Inventado" }]).errors).toHaveLength(1);
  });
  it("detecta contactos repetidos por nombre normalizado", () => {
    expect(prepareImport("contactos_recepcion", [{ nombre: " Ana   Pérez " }, { nombre: "ANA Pérez" }]).errors).toHaveLength(1);
  });
  it("normaliza WhatsApp al importar contactos", () => {
    expect(validateRow("contactos_recepcion", { nombre: "Ana", telefono: "0414-1234567" })).toEqual({ nombre: "Ana", telefono: "584141234567" });
  });
  it("rechaza filas con ID inválido", () => {
    expect(prepareImport("departamentos", [{ id: "bad", nombre: "Biblioteca" }]).errors).toHaveLength(1);
  });
  it("conserva el valor falso del estado activo", () => {
    expect(validateRow("departamentos", { nombre: "Biblioteca", activo: "false" })['activo']).toBe(false);
  });
});