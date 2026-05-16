const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export type ModelStatus = {
  detector_backend: string;
  detector_model_path: string;
  detector_loaded: boolean;
  detector_error: string | null;
  recognition_backend: string;
  recognition_model_path: string | null;
  recognition_loaded: boolean;
  recognition_verification_enabled: boolean;
  recognition_error: string | null;
  face_match_threshold: number;
  allow_fallback_matching: boolean;
  min_enrollment_captures: number;
  enrollment_capture_target: number;
  alert_detection_threshold: number;
  alert_candidate_match_threshold: number;
  alert_candidate_ttl_seconds: number;
  camera_distance_face_width_m: number;
  camera_distance_face_height_m: number;
  camera_distance_horizontal_fov_degrees: number;
  monitoring_burst_max_uploads: number;
  monitoring_temporal_ttl_seconds: number;
  monitoring_temporal_max_samples: number;
  monitoring_temporal_min_samples: number;
  monitoring_field_enrollment_enabled: boolean;
  monitoring_field_enrollment_threshold: number;
  monitoring_field_enrollment_min_confidence: number;
  monitoring_field_enrollment_max_captures: number;
};

export type Passenger = {
  id: number;
  full_name: string;
  identity_number: string | null;
  ticket_code: string;
  route_name: string;
  seat_number: string | null;
  travel_date: string;
  status: "pending" | "approved" | "blocked";
  created_at: string;
  approved_at: string | null;
  capture_count: number;
};

export type FaceCapture = {
  id: number;
  passenger_id: number;
  source: string;
  original_url: string;
  crop_url: string;
  bbox: Record<string, number>;
  face_confidence: number;
  quality_score: number;
  created_at: string;
};

export type Camera = {
  id: number;
  bus_id: number;
  name: string;
  location: string;
  stream_url: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
};

export type Bus = {
  id: number;
  name: string;
  plate_number: string;
  route_name: string;
  status: string;
  created_at: string;
  cameras: Camera[];
  open_alerts: number;
};

export type Alert = {
  id: number;
  bus_id: number;
  camera_id: number;
  passenger_id: number | null;
  status: "open" | "acknowledged" | "resolved";
  severity: string;
  message: string;
  original_url: string;
  crop_url: string;
  bbox: Record<string, number>;
  face_confidence: number;
  match_distance: number | null;
  created_at: string;
  resolved_at: string | null;
  bus_name: string;
  camera_name: string;
};

export type Detection = {
  bbox: Record<string, number>;
  crop_url: string;
  face_confidence: number;
  match_status: "ticketed" | "observing" | "stowaway";
  passenger: Passenger | null;
  match_distance: number | null;
  estimated_distance_m?: number | null;
  alert_id: number | null;
  unknown_detection_count: number | null;
  alert_threshold: number | null;
};

export type ScanResult = {
  camera_id: number;
  bus_id: number;
  detections: Detection[];
  alerts_created: number;
  detector_backend: string;
  recognition_backend: string;
};

export type DashboardSummary = {
  passengers_total: number;
  passengers_approved: number;
  buses_total: number;
  cameras_online: number;
  open_alerts: number;
  recent_alerts: Alert[];
  model_status: ModelStatus;
};

export function mediaUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function realtimeUrl(): string {
  const protocol = API_BASE_URL.startsWith("https://") ? "wss://" : "ws://";
  return `${API_BASE_URL.replace(/^https?:\/\//, protocol)}/ws`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(`Backend tidak bisa dihubungi di ${API_BASE_URL}. Pastikan service backend aktif.`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail ?? `Request gagal (${response.status}).`;
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function upload(path: string, file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  return request(path, { method: "POST", body: formData });
}

function uploadMany(path: string, files: File[]): Promise<unknown> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return request(path, { method: "POST", body: formData });
}

export const api = {
  summary: () => request<DashboardSummary>("/dashboard/summary"),
  passengers: () => request<Passenger[]>("/passengers"),
  createPassenger: (payload: {
    full_name: string;
    identity_number?: string | null;
    route_name: string;
    seat_number?: string | null;
    travel_date: string;
  }) =>
    request<Passenger>("/passengers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  passengerCaptures: (passengerId: number) => request<FaceCapture[]>(`/passengers/${passengerId}/captures`),
  uploadPassengerCapture: (passengerId: number, file: File) =>
    upload(`/passengers/${passengerId}/captures`, file) as Promise<FaceCapture>,
  uploadPassengerCaptureBurst: (passengerId: number, files: File[]) =>
    uploadMany(`/passengers/${passengerId}/captures/burst`, files) as Promise<FaceCapture[]>,
  approvePassenger: (passengerId: number) => request<Passenger>(`/passengers/${passengerId}/approve`, { method: "POST" }),
  deletePassenger: (passengerId: number) => request<void>(`/passengers/${passengerId}`, { method: "DELETE" }),
  buses: () => request<Bus[]>("/buses"),
  createBus: (payload: { name: string; plate_number: string; route_name: string }) =>
    request<Bus>("/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createCamera: (busId: number, payload: { name: string; location: string; stream_url?: string | null }) =>
    request<Camera>(`/buses/${busId}/cameras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  scanCamera: (cameraId: number, file: File) => upload(`/cameras/${cameraId}/scan`, file) as Promise<ScanResult>,
  scanCameraBurst: (cameraId: number, files: File[]) => uploadMany(`/cameras/${cameraId}/scan/burst`, files) as Promise<ScanResult>,
  alerts: (status?: string) => request<Alert[]>(status ? `/alerts?status_filter=${status}` : "/alerts"),
  updateAlert: (alertId: number, status: Alert["status"]) =>
    request<Alert>(`/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  deleteAlert: (alertId: number) => request<void>(`/alerts/${alertId}`, { method: "DELETE" }),
};
