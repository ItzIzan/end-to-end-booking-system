export type BookingEvidenceType =
  | "POC"
  | "POD";

export interface BookingEvidence {
  id: number;
  bookingId: number;

  type:
    BookingEvidenceType;

  originalFileName:
    string;

  storageKey: string;

  mimeType: string;
  fileSize: number;

  uploadedByUserId:
    number;

  uploadedAt: string;
}