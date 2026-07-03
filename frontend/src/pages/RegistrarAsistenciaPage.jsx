import { useEffect, useRef, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { CameraOff, CheckCircle2, QrCode } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { registrarAsistencia } from "@/components/reservas/api";

// Prefijo que llevan los QR emitidos por el sistema; cualquier otro código se
// rechaza en el navegador sin llamar a la API.
const QR_PREFIX = "sportcenter:asistencia:";

// Tras procesar un código (bien o mal) se pausa el escaneo un instante: la
// cámara decodifica muchas veces por segundo y sin esto un mismo QR
// dispararía una ráfaga de requests/toasts.
const PAUSA_POST_ESCANEO_MS = 2500;

/**
 * Página de staff (empleado/admin) para registrar asistencia: enciende la
 * cámara, lee el QR del cliente y asienta la asistencia. Los mensajes de
 * error del backend son los toasts a mostrar tal cual.
 */
export default function RegistrarAsistenciaPage() {
  usePageTitle("Registrar Asistencia");
  const { user } = useOutletContext();

  const videoRef = useRef(null);
  // Cola de sesiones de cámara: cada arranque espera a que la sesión anterior
  // haya terminado de arrancar Y de frenar. Sin esto, el doble montaje de
  // StrictMode interrumpe el play() del primer intento (AbortError) y su
  // stop() tardío apaga el video de la sesión nueva.
  const sessionRef = useRef(Promise.resolve());
  const busyRef = useRef(false);
  const [cameraError, setCameraError] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  // Cambiar la key remonta el efecto: es el "Reintentar" tras negar permisos.
  const [intento, setIntento] = useState(0);

  const esStaff = user.role === "admin" || user.role === "employee";

  useEffect(() => {
    if (!esStaff) return undefined;

    let activo = true;
    let controls = null;
    setCameraError(false);

    const onResult = async (result) => {
      if (!result || busyRef.current || !activo) return;
      busyRef.current = true;
      const codigo = result.getText();

      try {
        if (!codigo.startsWith(QR_PREFIX)) {
          toast.error("QR inválido o no reconocido");
          return;
        }
        const data = await registrarAsistencia(codigo);
        if (!activo) return;
        toast.success("Asistencia registrada con éxito");
        setUltimoRegistro(data);
      } catch (err) {
        if (activo) {
          toast.error(err?.message ?? "No se pudo registrar la asistencia.");
        }
      } finally {
        // Reanuda el escaneo después de la pausa (la cámara sigue encendida).
        setTimeout(() => {
          busyRef.current = false;
        }, PAUSA_POST_ESCANEO_MS);
      }
    };

    sessionRef.current = sessionRef.current
      .then(() => {
        if (!activo) return null;
        const reader = new BrowserQRCodeReader();
        // `undefined` deja que el navegador elija la cámara (trasera en móviles).
        return reader.decodeFromVideoDevice(undefined, videoRef.current, onResult);
      })
      .then((c) => {
        if (!c) return;
        if (!activo) c.stop();
        else controls = c;
      })
      .catch(() => {
        if (activo) setCameraError(true);
      });

    return () => {
      activo = false;
      // El stop se encola en la misma cadena: el próximo montaje arranca
      // recién cuando esta sesión quedó apagada del todo.
      sessionRef.current = sessionRef.current.then(() => {
        controls?.stop();
        controls = null;
      });
    };
  }, [esStaff, intento]);

  if (!esStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-3xl mx-auto w-full pb-xl">
      <header className="flex flex-col gap-1">
        <PageHeading>Registrar Asistencia</PageHeading>
        <p className="text-on-surface-variant text-sm">
          Escaneá el código QR del cliente para registrar su asistencia al
          turno.
        </p>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {cameraError ? (
          <div className="flex flex-col items-center justify-center gap-md py-xl px-md text-center text-on-surface-variant">
            <CameraOff className="size-12 opacity-70" aria-hidden="true" />
            <p className="text-body-md">
              No pudimos acceder a la cámara. Revisá los permisos del navegador
              e intentá de nuevo.
            </p>
            <Button variant="outline" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-square md:aspect-video object-cover bg-black"
              muted
              playsInline
            />
            {/* Marco guía sobre el video para centrar el QR. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="size-48 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
              <span className="flex items-center gap-2 bg-black/60 text-white text-label-sm px-3 py-1.5 rounded-full">
                <QrCode className="size-4" aria-hidden="true" />
                Apuntá al código QR del cliente
              </span>
            </div>
          </div>
        )}
      </div>

      {ultimoRegistro && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex items-center gap-md">
          <CheckCircle2
            className="size-8 text-success-green shrink-0"
            aria-hidden="true"
          />
          <div className="flex flex-col">
            <span className="text-label-md text-on-surface">
              {ultimoRegistro.cliente
                ? `${ultimoRegistro.cliente.nombre} ${ultimoRegistro.cliente.apellido}`
                : `Reserva #${ultimoRegistro.reserva_id}`}
            </span>
            <span className="text-label-sm text-on-surface-variant">
              {ultimoRegistro.actividad} · {ultimoRegistro.hora} · Asistencia
              registrada
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
