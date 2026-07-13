import { supabase } from "@/lib/supabaseClient";

export type PreciseLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

export type UserAccessContext = {
  user_id: string;
  observed_at: string;
  ip_address: string | null;
  ip_provider: string | null;
  device_label: string | null;
  operating_system: string | null;
  browser: string | null;
  device_type: string | null;
  timezone: string | null;
  language: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  location_observed_at: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  street: string | null;
  source: "login" | "precise_location" | "trusted_gateway";
  terms_version: string | null;
  terms_accepted_at: string | null;
  access_context_consent: boolean;
};

export class AccessContextError extends Error {
  code: "UNAVAILABLE" | "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "FAILED";

  constructor(code: AccessContextError["code"], message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "AccessContextError";
    this.code = code;
  }
}

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
};

function getOperatingSystem(userAgent: string, platform: string) {
  if (/windows/i.test(userAgent) || /win/i.test(platform)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os|macintosh/i.test(userAgent) || /mac/i.test(platform)) return "macOS";
  if (/linux/i.test(userAgent) || /linux/i.test(platform)) return "Linux";
  return platform || "Sistema não identificado";
}

function getBrowser(userAgent: string) {
  const edge = userAgent.match(/Edg\/([\d.]+)/i);
  if (edge) return `Microsoft Edge ${edge[1]}`;
  const chrome = userAgent.match(/Chrome\/([\d.]+)/i);
  if (chrome) return `Google Chrome ${chrome[1]}`;
  const firefox = userAgent.match(/Firefox\/([\d.]+)/i);
  if (firefox) return `Mozilla Firefox ${firefox[1]}`;
  const safari = userAgent.match(/Version\/([\d.]+).*Safari/i);
  if (safari) return `Safari ${safari[1]}`;
  return "Navegador não identificado";
}

function getDeviceMetadata() {
  const browserNavigator = navigator as NavigatorWithUserAgentData;
  const userAgent = navigator.userAgent || "";
  const platform = browserNavigator.userAgentData?.platform || navigator.platform || "";
  const operatingSystem = getOperatingSystem(userAgent, platform);
  const browser = getBrowser(userAgent);
  const isMobile =
    browserNavigator.userAgentData?.mobile ?? /mobile|android|iphone|ipad/i.test(userAgent);
  const deviceType = isMobile ? "Dispositivo móvel" : "Computador";

  return {
    userAgent,
    deviceLabel: `${deviceType} · ${operatingSystem}`,
    operatingSystem,
    browser,
    deviceType,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    language: navigator.language || null,
  };
}

function isRpcUnavailable(error: { code?: string; message?: string } | null) {
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "").toLowerCase();
  return code === "PGRST202" || code === "42883" || message.includes("could not find the function");
}

export async function registerOwnAccessContext(
  location?: PreciseLocation,
  consent?: { termsVersion?: string | null; accessContextConsent?: boolean },
): Promise<void> {
  const metadata = getDeviceMetadata();
  const { data: sessionData } = await supabase.auth.getSession();
  const authMetadata = sessionData.session?.user?.user_metadata as
    | { access_context_consent?: unknown; terms_version?: unknown }
    | undefined;
  const consented = consent?.accessContextConsent ?? authMetadata?.access_context_consent === true;
  const termsVersion =
    consent?.termsVersion ??
    (typeof authMetadata?.terms_version === "string" ? authMetadata.terms_version : null);
  let resolvedLocation = location;
  if (!resolvedLocation && consented) {
    try {
      resolvedLocation = await requestPreciseLocation();
    } catch {
      // A permissao do navegador pode ser recusada sem bloquear o login.
    }
  }
  const { error } = await supabase.rpc("register_own_access_context", {
    p_user_agent: metadata.userAgent,
    p_device_label: metadata.deviceLabel,
    p_operating_system: metadata.operatingSystem,
    p_browser: metadata.browser,
    p_device_type: metadata.deviceType,
    p_timezone: metadata.timezone,
    p_language: metadata.language,
    p_latitude: resolvedLocation?.latitude ?? null,
    p_longitude: resolvedLocation?.longitude ?? null,
    p_accuracy_meters: resolvedLocation?.accuracyMeters ?? null,
    p_terms_version: termsVersion,
    p_access_context_consent: consented,
  });

  if (!error) return;
  if (isRpcUnavailable(error)) {
    throw new AccessContextError(
      "UNAVAILABLE",
      "Recurso de contexto de acesso ainda não ativado.",
      error,
    );
  }
  throw new AccessContextError("FAILED", "Não foi possível registrar o contexto de acesso.", error);
}

export async function getLatestUserAccessContext(
  userId: string,
): Promise<UserAccessContext | null> {
  const { data, error } = await supabase
    .rpc("get_latest_user_access_context", { p_user_id: userId })
    .maybeSingle();

  if (!error) return (data as UserAccessContext | null) ?? null;
  if (isRpcUnavailable(error)) {
    throw new AccessContextError(
      "UNAVAILABLE",
      "Recurso de contexto de acesso ainda não ativado.",
      error,
    );
  }
  if (String(error.code ?? "") === "42501") {
    throw new AccessContextError(
      "PERMISSION_DENIED",
      "Sem permissão para consultar este acesso.",
      error,
    );
  }
  throw new AccessContextError("FAILED", "Não foi possível consultar o contexto de acesso.", error);
}

export async function captureNetworkAccessContext(): Promise<void> {
  const { error } = await supabase.functions.invoke("capture-access-context", {
    body: {},
  });
  if (!error) return;
  throw new AccessContextError("FAILED", "Falha ao registrar os dados da rede.", error);
}

export function requestPreciseLocation(): Promise<PreciseLocation> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(
      new AccessContextError(
        "POSITION_UNAVAILABLE",
        "Este dispositivo não oferece geolocalização.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new AccessContextError(
              "PERMISSION_DENIED",
              "Permissão de localização não concedida neste dispositivo.",
              error,
            ),
          );
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new AccessContextError("TIMEOUT", "Tempo limite ao obter a localização.", error));
          return;
        }
        reject(
          new AccessContextError(
            "POSITION_UNAVAILABLE",
            "Localização indisponível neste dispositivo.",
            error,
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
