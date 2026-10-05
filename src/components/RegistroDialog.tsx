import { useEffect, useRef, useState } from "react";
import { Camera, Upload, ScanLine, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTAMENTOS, ROLES, type Estatus, type Persona, type RolUMA } from "@/lib/uma-data";
import { actions, useUMA } from "@/lib/uma-store";
import { cn } from "@/lib/utils";

const NOMBRES = ["Luis Alberto", "Mariana", "Fernando", "Daniela", "Héctor", "Patricia"];
const APELLIDOS = ["Gutiérrez Mora", "Pacheco Ruiz", "Villalobos Ríos", "Contreras León", "Escalona Briceño"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function RegistroDialog({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inicial?: Persona | null;
}) {
  const { personas } = useUMA();
  const [ci, setCi] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [rol, setRol] = useState<RolUMA>("Visitante / Proveedor");
  const [recibe, setRecibe] = useState("");
  const [destino, setDestino] = useState("");
  const [foto, setFoto] = useState<string | undefined>();
  const [estatus, setEstatus] = useState<Estatus>("En espera");
  const [scanning, setScanning] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showSug, setShowSug] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCi(inicial?.ci ?? "");
    setNombres(inicial?.nombres ?? "");
    setApellidos(inicial?.apellidos ?? "");
    setRol(inicial?.rol_uma ?? "Visitante / Proveedor");
    setFoto(inicial?.foto_url);
    setRecibe("");
    setDestino("");
    setEstatus(inicial && inicial.rol_uma !== "Visitante / Proveedor" ? "Permitido" : "En espera");
  }, [open, inicial]);

  useEffect(() => {
    if (!open) stopCam();
  }, [open]);

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = s;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      });
    } catch {
      toast.error("No se pudo acceder a la cámara. Use la carga de imagen.");
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 240;
    c.getContext("2d")!.drawImage(v, 0, 0, 320, 240);
    const data = c.toDataURL("image/jpeg", 0.7);
    stopCam();
    processImage(data);
  }

  function handleFile(f?: File) {
    if (!f || !f.type.startsWith("image/")) return toast.error("Seleccione una imagen válida");
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const scale = 320 / img.width;
        c.width = 320;
        c.height = img.height * scale;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        processImage(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(f);
  }

  // OCR simulado: extrae datos en < 2 s
  function processImage(data: string) {
    setFoto(data);
    setScanning(true);
    setTimeout(() => {
      setCi(String(Math.floor(10_000_000 + Math.random() * 20_000_000)));
      setNombres(pick(NOMBRES));
      setApellidos(pick(APELLIDOS));
      setScanning(false);
      toast.success("Documento leído · campos autocompletados");
    }, 1400);
  }

  const staff = personas.filter((p) => p.rol_uma !== "Visitante / Proveedor" && p.rol_uma !== "Alumno");
  const sug = recibe
    ? staff.filter((p) => `${p.nombres} ${p.apellidos}`.toLowerCase().includes(recibe.toLowerCase())).slice(0, 5)
    : [];

  // Autorrellenar si el CI existe
  function onCi(v: string) {
    const clean = v.replace(/\D/g, "");
    setCi(clean);
    const p = personas.find((x) => x.ci === clean);
    if (p) {
      setNombres(p.nombres);
      setApellidos(p.apellidos);
      setRol(p.rol_uma);
      if (p.foto_url) setFoto(p.foto_url);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ci || !nombres || !apellidos || !destino) return toast.error("Complete los campos obligatorios");
    const p = actions.upsertPersona({ ci, nombres, apellidos, rol_uma: rol, foto_url: foto });
    actions.registrar({
      persona_id: p.id,
      tipo_acceso: rol,
      persona_recibe: recibe || "—",
      departamento_destino: destino,
      estatus,
    });
    toast.success(`${nombres} ${apellidos} · ${estatus}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registro de acceso</DialogTitle>
          <DialogDescription>Escanee la cédula o carnet para autocompletar los datos.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Captura */}
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted",
                drag && "border-primary bg-accent",
              )}
            >
              {camOn ? (
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              ) : foto ? (
                <img src={foto} alt="Captura" className="h-full w-full object-cover" />
              ) : (
                <div className="px-4 text-center text-xs text-muted-foreground">
                  <Upload className="mx-auto mb-2 h-6 w-6" />
                  Arrastre aquí la imagen de la CI o carnet
                </div>
              )}
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/70 text-primary-foreground">
                  <div className="scan-line absolute inset-x-0 h-0.5 bg-success" />
                  <ScanLine className="h-6 w-6" />
                  <span className="text-xs font-medium">Leyendo documento…</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {camOn ? (
                <>
                  <Button type="button" size="sm" onClick={capture}>
                    <Camera /> Capturar
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={stopCam}>
                    <X /> Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={startCam}>
                    <Camera /> Cámara
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload /> Subir
                  </Button>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          {/* Campos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CI *">
              <Input value={ci} onChange={(e) => onCi(e.target.value)} inputMode="numeric" placeholder="V-12345678" autoComplete="off" />
            </Field>
            <Field label="Categoría *">
              <Select value={rol} onValueChange={(v) => setRol(v as RolUMA)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nombres *">
              <Input value={nombres} onChange={(e) => setNombres(e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label="Apellidos *">
              <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} autoComplete="family-name" />
            </Field>
            <Field label="Persona que lo recibe">
              <div className="relative">
                <Input
                  value={recibe}
                  onChange={(e) => {
                    setRecibe(e.target.value);
                    setShowSug(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSug(false), 150)}
                  placeholder="Buscar personal o docente"
                  autoComplete="off"
                />
                {showSug && sug.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                    {sug.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          setRecibe(`${p.nombres} ${p.apellidos}`);
                          setShowSug(false);
                        }}
                        className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {p.nombres} {p.apellidos}
                        <span className="text-xs text-muted-foreground">{p.rol_uma}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Lugar / Departamento *">
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Seleccione destino" /></SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hora de ingreso">
              <Input value={new Date().toLocaleString("es-VE")} readOnly className="bg-muted" />
            </Field>
            <Field label="Estatus de acceso">
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {(["Permitido", "En espera", "Denegado"] as Estatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEstatus(s)}
                    className={cn(
                      "rounded px-1 py-1.5 text-xs font-medium text-muted-foreground transition",
                      estatus === s && s === "Permitido" && "bg-success text-success-foreground",
                      estatus === s && s === "En espera" && "bg-warning text-warning-foreground",
                      estatus === s && s === "Denegado" && "bg-destructive text-destructive-foreground",
                    )}
                  >
                    {s === "En espera" ? "Anunciar" : s}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={scanning}>
                {scanning ? <Loader2 className="animate-spin" /> : <Check />} Registrar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
